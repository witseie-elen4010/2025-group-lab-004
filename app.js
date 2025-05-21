'use strict'

const express = require('express')
const connectDB = require('./config/db')
connectDB()
const bodyParser = require('body-parser')
const path = require('path')
const ejsMate = require('ejs-mate')
const session = require('express-session')
const http = require('http')
const socketIo = require('socket.io')
const sharedSession = require('express-socket.io-session')

const app = express()
const server = http.createServer(app)
const io = socketIo(server)

// Configure middlewares
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// View engine setup
app.engine('ejs', ejsMate)
app.set('views', path.join(__dirname, 'src/views'))
app.set('view engine', 'ejs')

const sessionMiddleware = session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
})

app.use(sessionMiddleware)
io.use(sharedSession(sessionMiddleware, { autoSave: true }))

// Game state
const players = []
let player_turn = 0
let wordAssignments = {}
let currentWords = { civilian: '', undercover: '' }

const wordPairs = [
  { civilian: 'Laptop', undercover: 'Computer' },
  { civilian: 'Beach', undercover: 'Desert' },
  { civilian: 'Pizza', undercover: 'Burger' },
  { civilian: 'Doctor', undercover: 'Nurse' },
  { civilian: 'Football', undercover: 'Rugby' }
]

io.on('connection', socket => {
  const username = socket.handshake.session.username
  console.log(`New player connected - ${username}`)

  socket.on('joinGame', (gameId) => {
    socket.join(gameId)
    socket.data.gameId = gameId
    players.push(socket.id)

    console.log(`User joined room: ${gameId}, socket ID: ${socket.id}`)
    socket.to(gameId).emit('message', username)
  })

  socket.on('start', () => {
    console.log('Game starting...')
    player_turn = 0
    wordAssignments = {}

    // Pick a random word pair
    const wordPair = wordPairs[Math.floor(Math.random() * wordPairs.length)]
    currentWords = wordPair

    // Assign roles
    const undercoverIndex = Math.floor(Math.random() * players.length)

    players.forEach((sockid, index) => {
      const isUndercover = index === undercoverIndex
      const word = isUndercover ? wordPair.undercover : wordPair.civilian

      wordAssignments[sockid] = {
        role: isUndercover ? 'undercover' : 'civilian',
        word
      }

      io.to(sockid).emit('your_info', {
        word,
        round: '1',
        isMyTurn: index === player_turn
      })
    })

    // Let the first player take their turn
    io.to(players[player_turn]).emit('myTurn')
  })

  socket.on('description', descrip => {
    const gameId = socket.data.gameId
    const currentSocketId = players[player_turn]

    if (socket.id !== currentSocketId) {
      socket.emit('errorMessage', 'Not your turn!')
      return
    }

    const username = socket.handshake.session.username
    players.forEach(sockid => {
      io.to(sockid).emit('description', `Clue from ${username}: ${descrip}`)
    })

    player_turn++

    if (player_turn < players.length) {
      io.to(players[player_turn]).emit('myTurn')
    } else {
      io.to(gameId).emit('phaseChanged', {
        phase: 'voting',
        message: 'All players have submitted their clues. Voting starts now!'
      })
      player_turn = 0
    }
  })
})

// Routes
const authRoutes = require('./src/routes/authRoutes')
app.use('/', authRoutes)

const gameRoutes = require('./src/routes/gameRoutes')
app.use('/', gameRoutes)

app.get('/', (req, res) => {
  res.render('home', { title: 'FindMrWhite' })
})

app.use((req, res) => {
  res.status(404).send('Page Not Found')
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log(`FindMrWhite server running on port ${port}`)
})

module.exports = app
