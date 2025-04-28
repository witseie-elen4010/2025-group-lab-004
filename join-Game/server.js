const express = require('express')
const app = express()
const http = require('http').createServer(app)
const { Server } = require('socket.io')
const io = new Server(http)

const players = {} // store players name

app.use(express.static('public')) // Serve frontend files from

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id)

  socket.on('joinGame', (playerName) => {
    players[socket.id] = playerName
    console.log(`${playerName} joined the game.`)
    io.emit('updatePlayers', Object.values(players))
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id)
    delete players[socket.id]
    io.emit('updatePlayers', Object.values(players))
  })
})

http.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
