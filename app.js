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
const passport = require('passport')
const User = require('./src/models/user')

const app = express()
const server = http.createServer(app)
const io = socketIo(server)

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Configure middlewares
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// View engine setup
app.engine('ejs', ejsMate)
app.set('views', path.join(__dirname, 'src/views'))
app.set('view engine', 'ejs')

const sessionMiddleware = session({
  secret: 'your-secret-key', // Replace with a strong, unique secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
})

app.use(sessionMiddleware)
app.use(passport.initialize())
app.use(passport.session())
io.use(sharedSession(sessionMiddleware, { autoSave: true }))

// Passport Local Strategy setup
const LocalStrategy = require('passport-local').Strategy
passport.use(new LocalStrategy(
  (username, password, done) => {
    User.findOne({ username }, (err, user) => {
      if (err) return done(err)
      if (!user) return done(null, false, { message: 'User not found' })
      if (user.password !== password) return done(null, false, { message: 'Incorrect password' }) // Use bcrypt in production
      return done(null, user)
    })
  }
))

passport.serializeUser((user, done) => {
  done(null, user._id)
})

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user)
  })
})

// Game state
const games = {} // {gameId: {players: {}, player_turn: 0, game_round: 1, voted: []}}
const assignment = {}

// Word pairs
const wordPairs = [
  ['Laptop', 'Computer'],
  ['Beach', 'Desert'],
  ['Pizza', 'Burger'],
  ['Doctor', 'Nurse'],
  ['Football', 'Rugby']
]

// Role and word assignment algorithms
function getRandomWordPair (pairs) {
  const randomIndex = Math.floor(Math.random() * pairs.length)
  return pairs[randomIndex]
}

function assignRolesAndWords (players, wordPairs) {
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5)
  const assignments = {}

  const [civilianWord, undercoverWord] = getRandomWordPair(wordPairs)

  const mrWhitePlayer = shuffledPlayers.pop()
  assignments[mrWhitePlayer] = { role: 'mr white', word: 'you are Mr white (no word assigned for you)' }

  const remaining = shuffledPlayers.length
  const half = Math.floor(remaining / 2)

  for (let i = 0; i < half; i++) {
    const undercoverPlayer = shuffledPlayers.pop()
    assignments[undercoverPlayer] = { role: 'undercover', word: undercoverWord }
  }

  for (const player of shuffledPlayers) {
    assignments[player] = { role: 'civilian', word: civilianWord }
  }

  return assignments
}

// Returns the string with highest frequency
function mostFrequentString (arr) {
  const freq = {}
  let maxCount = 0
  let mostCommon = null

  for (const str of arr) {
    freq[str] = (freq[str] || 0) + 1
    if (freq[str] > maxCount) {
      maxCount = freq[str]
      mostCommon = str
    }
  }

  return mostCommon
}

// Socket.IO logic
io.on('connection', (socket) => {
  const username = socket.handshake.session.username
  console.log(`New player connected - ${username}`)

  socket.on('joinGame', (gameId) => {
    socket.join(gameId)
    socket.data.gameId = gameId
    console.log(socket.id)

    if (!games[gameId]) {
      games[gameId] = {
        players: { [username]: socket.id },
        player_turn: 0,
        game_round: 1,
        voted: []
      }
    } else {
      games[gameId].players[username] = socket.id
    }

    socket.to(gameId).emit('message', username)
  })

  socket.on('description', (descrip) => {
    const gameId = socket.data.gameId
    let player_turn = games[gameId].player_turn
    player_turn++

    Object.values(games[gameId].players).forEach((socketid, index) => {
      if (index == player_turn) {
        io.to(socketid).emit('description', `Clue from ${username}: ${descrip}`)
        io.to(socketid).emit('myTurn')
      } else {
        io.to(socketid).emit('description', `clue from ${username}: ${descrip}`)
      }
    })

    if (player_turn == Object.values(games[gameId].players).length) {
      Object.values(games[gameId].players).forEach((socketid) => {
        io.to(socketid).emit('voteplayer')
      })
    }

    games[gameId].player_turn = player_turn
  })

  socket.on('start', () => {
    const gameId = socket.data.gameId
    if (Object.values(games[gameId].players).length >= 3) {
      assignment[gameId] = assignRolesAndWords(Object.keys(games[gameId].players), wordPairs)

      Object.keys(games[gameId].players).forEach((user, index) => {
        if (index == games[gameId].player_turn) {
          io.to(games[gameId].players[user]).emit('word', assignment[gameId][user].word)
          io.to(games[gameId].players[user]).emit('myTurn')
          io.to(games[gameId].players[user]).emit('next_round', { round: games[gameId].game_round })
        } else {
          io.to(games[gameId].players[user]).emit('word', assignment[gameId][user].word)
          io.to(games[gameId].players[user]).emit('next_round', { round: games[gameId].game_round })
        }
      })
    } else {
      socket.emit('alert', 'players must be at least 3')
    }
  })

  socket.on('eliminate', (user) => {
    const gameId = socket.data.gameId
    games[gameId].voted.push(user)

    if (games[gameId].voted.length == Object.keys(games[gameId].players).length) {
      const mostfre = mostFrequentString(games[gameId].voted)
      games[gameId].player_turn = 0
      games[gameId].game_round += 1
      games[gameId].voted = []

      Object.values(games[gameId].players).forEach((socketid) => {
        io.to(socketid).emit('eliminated', mostfre)
      })
    }
  })

  socket.on('removed', (user) => {
    const gameId = socket.data.gameId
    if (games[gameId].players[user]) {
      delete games[gameId].players[user]
    }

    // Winning condition to be implemented
    Object.values(games[gameId].players).forEach((sockid, index) => {
      if (index == games[gameId].player_turn) {
        io.to(sockid).emit('next_round', { round: games[gameId].game_round })
        io.to(sockid).emit('myTurn')
      } else {
        io.to(sockid).emit('next_round', { round: games[gameId].game_round })
      }
    })
  })

  socket.on('register', (userId) => {
    userSockets.set(userId, socket)
    socket.join(userId)
  })

  socket.on('disconnect', () => {
    userSockets.forEach((sock, id) => {
      if (sock === socket) userSockets.delete(id)
    })
  })
})

// Routes
const authRoutes = require('./src/routes/authRoutes')
app.use('/', authRoutes)

const inviteRoutes = require('./src/routes/inviteRoutes')
app.use('/', inviteRoutes)

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

const port = process.env.PORT || 5000
server.listen(port, () => {
  console.log(`FindMrWhite server running on port ${port}`)
})

app.set('io', io)

const userSockets = new Map()

module.exports = app
