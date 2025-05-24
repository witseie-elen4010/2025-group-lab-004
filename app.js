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

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

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

// Handling app and password use************
const passport = require('passport')
app.use(sessionMiddleware)
app.use(passport.initialize())
app.use(passport.session())
// Handling app use
// app.use(sessionMiddleware)

const LocalStrategy = require('passport-local').Strategy
const User = require('./src/models/user')

passport.use(new LocalStrategy(
  (username, password, done) => {
    User.findOne({ username }, (err, user) => {
      if (err) return done(err)
      if (!user) return done(null, false, { message: 'User not found' })
      if (user.password !== password) return done(null, false, { message: 'Incorrect password' }) // Use proper hashing in production
      return done(null, user)
    })
  }
))

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user)
  })
})

// socket.IO setup for session cookie

io.use(sharedSession(sessionMiddleware, {
  autoSave: true
}))

// socket.io handlers

const players = []
let player_turn = 0

io.on('connect', socket => {
  const username = socket.handshake.session.username
  console.log(`new player connected - ${username}`)

  // New player joining handler
  socket.on('joinGame', (gameId) => {
    socket.join(gameId)
    socket.data.gameId = gameId
    players.push(socket.id)
    console.log(socket.id)

    console.log(`User joined room: ${players[0]}`)
    socket.to(gameId).emit('message', username)
  })

  // Word Description handler
  socket.on('description', descrip => {
    player_turn++
    players.forEach((sockid, index) => {
      if (index == player_turn) {
        io.to(sockid).emit('description', `clue from ${username}: ${descrip}`)
        io.to(sockid).emit('myTurn')
      } else io.to(sockid).emit('description', `clue from ${username}: ${descrip}`)
    })
  })

  // start game handler
  socket.on('start', () => {
    console.log('starting the game')
    // need an algorithm to assign words based on roles
    // code here
    // Sending ifomation to players  for UI update
    players.forEach((sockid, index) => {
      if (index == player_turn) {
        io.to(sockid).emit('your_info', { word: 'Laptop', round: '1', isMyTurn: true })
      } else io.to(sockid).emit('your_info', { word: 'Laptop', round: '1', isMyTurn: false })
    })
  })
})

// Routes
const authRoutes = require('./src/routes/authRoutes')
app.use('/', authRoutes)

// Invite Routes
const inviteRoutes = require('./src/routes/inviteRoutes')
app.use('/', inviteRoutes)

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
const port = process.env.PORT || 5000
require('./config/db')()
server.listen(port, () => {
  console.log(`FindMrWhite server running on port ${port}`)
})

app.use((err, req, res, next) => {
  console.error(err.stack) // log the error to terminal
  res.status(500).send('Something broke!')
})

app.set('io', io)

const userSockets = new Map()

io.on('connection', (socket) => {
  socket.on('register', (userId) => {
    userSockets.set(userId, socket)
    socket.join(userId) // Allow .to(userId).emit()
  })

  socket.on('disconnect', () => {
    userSockets.forEach((sock, id) => {
      if (sock === socket) userSockets.delete(id)
    })
  })
})

module.exports = app
