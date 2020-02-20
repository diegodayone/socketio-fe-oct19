import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import io from "socket.io-client"
import Moment from 'react-moment';

class App extends React.Component {

  socket = null;

  state = {
    messages: [],
    messageText: "",
    username: "",
    password: "",
    token: "",
    to: "",
    connectedUsers: []
  }

  configSocketIO = () => {
    this.socket = io('http://localhost:8080', {
      transports: ['websocket']
    })

    this.socket.on("message", payload => {
      this.setState({
        messages: this.state.messages.concat(payload)
      })
    })

    this.socket.on("login", (user) => {
      console.log(user.newUser + " is connected")
      this.setState({
        connectedUsers: user.connectedUsers
      })
    })
  }

  handleToken = async () => {
    if (localStorage.getItem("token")) { // if we have a token
      const resp = await fetch("http://localhost:8080/auth/refresh", {  //we test it 
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + localStorage.getItem("token")
        }
      })
      if (resp.ok){ //if it's valid, we fetch messages
        const json = await resp.json();
        this.setState({ token: json.access_token, username: json.user.username })
        this.socket.emit("login", { token: localStorage.getItem("token")  })
        const respMessages = await fetch("http://localhost:8080/message", {
          headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
          }
        })
        
        const msgs = await respMessages.json()
        this.setState({
          messages: msgs
        })

      }
      else{ //else, we remove the token (it's probably expired!)
        localStorage.removeItem("token")
      }
  }
}

  componentDidMount = async () => {
    this.configSocketIO()
    this.handleToken()
  }

  sendMessage = () => {
    const payload = {
      message: this.state.messageText,
      from: this.state.username,
      to: this.state.to,
      date: new Date()
    }
    this.socket.emit("message", payload)
    this.setState({
      messageText: "",
      messages: this.state.messages.concat(payload)
    })
  }

  login = async () => {
    const resp = await fetch("http://localhost:8080/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: this.state.username,
        password: this.state.password
      }),
      headers: {
        "Content-Type": "application/json"
      }
    })
    const json = await resp.json();
    this.setState({ token: json.access_token })
    localStorage.setItem("token", json.access_token)

    this.socket.emit("login", { token: json.access_token })
  }

  render() {
    return (
      <div>
        <div>
          <input type="text" value={this.state.username} onChange={(e) => this.setState({ username: e.currentTarget.value })} />
          <input type="password" value={this.state.password} onChange={(e) => this.setState({ password: e.currentTarget.value })} />
          <input type="button" onClick={this.login} value="Login" />
        </div>

        <div>
          {this.state.messages.map((m, i) => <div key={i}><Moment fromNow>{m.date}</Moment> - {m.from}: {m.message} </div>)}
        </div>

        <div className="chat-input">
          <input type="text" value={this.state.messageText} onChange={(e) => this.setState({ messageText: e.currentTarget.value })} />
          <select onChange={e => this.setState({ to: e.currentTarget.value })}>
            {this.state.connectedUsers.map((user,i) => <option key={i} value={user}>{user}</option>)}
          </select>
          {/* <input type="text" placeholder="to" value={this.state.to} onChange={(e) => this.setState({ to: e.currentTarget.value })} /> */}
          <input type="button" onClick={this.sendMessage} value="send" />
        </div>
      </div>
    );
  }
}

export default App;
