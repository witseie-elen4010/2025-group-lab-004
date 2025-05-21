'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const ejsMate = require('ejs-mate')
const session = require('express-session')
const sharedSession = require('express-socket.io-session')
const socketIO = require('socket.io')
const http = require('http')
const cors = require('cors')
const app = express()
const server = http.createServer(app)
const io = socketIO(server)

// Configure middlewares
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(cors())
//
// View engine setup
app.engine('ejs', ejsMate)
app.set('views', path.join(__dirname, 'src/views'))
app.set('view engine', 'ejs')

const sessionMiddleware = session({
  secret: 'your-secret-key', // Replace with a strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set `secure: true` if using HTTPS
})

// Handling app use
app.use(sessionMiddleware)

// socket.IO setup for session cookie

io.use(sharedSession(sessionMiddleware, {
  autoSave: true
}))

// socket.io handlers

const players = []
<<<<<<< Updated upstream
let player_turn = 0
=======
// const player_turn = 0
const games = new Map()
const wordPairs = [
  { civilian: 'Laptop', undercover: 'Tablet' },
  { civilian: 'Apple', undercover: 'Orange' },
  { civilian: 'Train', undercover: 'Subway' },
  { civilian: 'Coffee', undercover: 'Tea' },
  { civilian: 'Ocean', undercover: 'Lake' },
  { civilian: 'Pencil', undercover: 'Pen' },
  { civilian: 'Panda', undercover: 'Bear' },
  { civilian: 'Moon', undercover: 'Sun' }
]
>>>>>>> Stashed changes

io.on('connect', socket => {
  const username = socket.handshake.session.username
  console.log(`new player connected - ${username}`)

  // player joining handler
  socket.on('joinGame', (gameId) => {
    socket.join(gameId)
    socket.data.gameId = gameId

    if (!games.has(gameId)) {
      games.set(gameId, {
        players: [],
        turn: 0,
        roles: {}
      })
    }

    const game = games.get(gameId)
    game.players.push(socket.id)

    console.log(`User ${socket.id} joined room ${gameId}`)
    socket.to(gameId).emit('message', username)
  })

  // Word Description handler

  socket.on('description', descrip => {
    const gameId = socket.data.gameId
    const game = games.get(gameId)
    const username = socket.handshake.session.username

    if (!game.descriptions) {
      game.descriptions = new Map()
    }

    game.descriptions.set(socket.id, descrip)

    // Broadcast the description
    game.players.forEach((sockid, index) => {
      io.to(sockid).emit('description', `clue from ${username}: ${descrip}`)
    })

    // Check if all players have described
    if (game.descriptions.size === game.players.length) {
      io.to(gameId).emit('phaseChanged', {
        phase: 'voting',
        message: 'All players have submitted their descriptions. Voting starts now!'
      })

      // Advance turn
      game.turn = (game.turn + 1) % game.players.length

      // Optionally reset descriptions
      game.descriptions = new Map()

      // Notify next player it’s their turn
      const nextPlayerSocketId = game.players[game.turn]
      io.to(nextPlayerSocketId).emit('myTurn')
    }
  })

  // start game handler

  socket.on('start', () => {
    const gameId = socket.data.gameId
    const game = games.get(gameId)

    if (!game || game.players.length < 2) {
      return socket.emit('error', 'Not enough players to start.')
    }

    game.turn = 0
    const playerSockets = game.players

    // 1. Randomly select one word pair
    const randomIndex = Math.floor(Math.random() * wordPairs.length)
    const { civilian: wordCivilian, undercover: wordUndercover } = wordPairs[randomIndex]

    // 2. Randomly assign one player as undercover
    const undercoverIndex = Math.floor(Math.random() * playerSockets.length)
    const undercoverSocketId = playerSockets[undercoverIndex]

    // 3. Send word info to each player
    game.roles = {}
    playerSockets.forEach((sockid, index) => {
      const isUndercover = sockid === undercoverSocketId
      const isMyTurn = index === game.turn

      game.roles[sockid] = isUndercover ? 'undercover' : 'civilian'

      io.to(sockid).emit('your_info', {
        word: isUndercover ? wordUndercover : wordCivilian,
        round: 1,
        isMyTurn
      })

      if (isMyTurn) {
        io.to(sockid).emit('myTurn')
      }
    })

    console.log(`Undercover is: ${undercoverSocketId}, Word Pair: ${wordCivilian} / ${wordUndercover}`)
  })
})

// Routes
const authRoutes = require('./src/routes/authRoutes')
app.use('/', authRoutes)

// Game routes
const gameRoutes = require('./src/routes/gameRoutes')
app.use('/', gameRoutes)

//
// Update default route to render home page
app.get('/', (req, res) => {
  res.render('home', { title: 'FindMrWhite' })
})

// 404 handler
app.use(function (req, res, next) {
  res.status(404).send('Page Not Found')
})

// Error handler
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

// Server configuration
const port = process.env.PORT || 3000
require('./config/db')()
server.listen(port, () => {
  console.log(`FindMrWhite server running on port ${port}`)
})

const mongoose = require('mongoose')

const dbURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/localdb'

mongoose.connect(dbURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err))

module.exports = app
