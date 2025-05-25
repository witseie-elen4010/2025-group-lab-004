'use strict'

const express = require('express')
const connectDB = require('./config/db')
connectDB()
const bodyParser = require('body-parser')
const path = require('path')
const ejsMate = require('ejs-mate')
const session = require('express-session')
const http = require('http')
const socketIO = require('socket.io')
const sharedSession = require('express-socket.io-session')

const app = express()
const server = http.createServer(app)
const io = socketIO(server)

// Configure middlewares
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

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

app.use(sessionMiddleware)
io.use(sharedSession(sessionMiddleware, { autoSave: true }))

// Game state
const games = {} // {gameId: {players:{}, player_turn: 0, game_round:1}}
const assignment = {}
const eliminatedPlayers = {}

const wordPairs = [
  ['Laptop', 'Computer'],
  ['Beach', 'Desert'],
  ['Pizza', 'Burger'],
  ['Doctor', 'Nurse'],
  ['Football', 'Rugby']
]

// // Role and word assignment algorithms

function getRandomWordPair (pairs) {
  const randomIndex = Math.floor(Math.random() * pairs.length)
  return pairs[randomIndex]
}

function assignRolesAndWords (players, wordPairs) {
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5)
  const assignments = {}

  const [civilianWord, undercoverWord] = getRandomWordPair(wordPairs)

  const numPlayers = players.length

  if (numPlayers === 3) {
    // Always assign 2 civilians and randomly assign either Mr. White or Undercover
    const specialRole = Math.random() < 0.5 ? 'mr white' : 'undercover'
    // Assign special role
    const specialPlayer = shuffledPlayers.pop()
    if (specialRole === 'mr white') {
      assignments[specialPlayer] = {
        role: 'mr white',
        word: 'you are Mr white (no word assigned for you)'
      }
    } else {
      assignments[specialPlayer] = {
        role: 'undercover',
        word: undercoverWord
      }
    }

    // Remaining 2 are civilians
    for (const player of shuffledPlayers) {
      assignments[player] = {
        role: 'civilian',
        word: civilianWord
      }
    }

    return assignments
  }

  // General case (4+ players)
  const mrWhitePlayer = shuffledPlayers.pop()
  assignments[mrWhitePlayer] = {
    role: 'mr white',
    word: 'you are Mr white (no word assigned for you)'
  }

  const remaining = shuffledPlayers.length
  let numUndercovers = Math.floor(remaining * 0.25)
  if (remaining >= 4 && numUndercovers < 1) numUndercovers = 1

  // Step 3: Assign Undercover
  for (let i = 0; i < numUndercovers; i++) {
    const undercoverPlayer = shuffledPlayers.pop()
    assignments[undercoverPlayer] = { role: 'undercover', word: undercoverWord }
  }

  // Assign Civilians
  for (const player of shuffledPlayers) {
    assignments[player] = {
      role: 'civilian',
      word: civilianWord
    }
  }

  return assignments
}

io.on('connect', socket => {
  const username = socket.handshake.session.username
  console.log(`new player connected - ${username}`)

  // New player joining handler
  socket.on('joinGame', (gameId) => {
    socket.join(gameId)
    socket.data.gameId = gameId
    console.log(socket.id)

    // construct game
    if (!games[gameId]) {
      games[gameId] = {}
      games[gameId].players = {}
      games[gameId].players[username] = socket.id
      games[gameId].player_turn = 0
      games[gameId].game_round = 1
      games[gameId].voted = []
      eliminatedPlayers[gameId] = []
    } else {
      games[gameId].players[username] = socket.id
    }
    socket.to(gameId).emit('message', username)
  })

  // Word Description handler
  socket.on('description', descrip => {
    const gameId = socket.data.gameId
    let player_turn = games[gameId].player_turn
    player_turn++

    Object.values(games[gameId].players).forEach((socketid, index) => {
      if (index == player_turn) {
        io.to(socketid).emit('description', `Clue from ${username}: ${descrip}`)
        io.to(socketid).emit('myTurn')
      } else io.to(socketid).emit('description', `clue from ${username}: ${descrip}`)
    })

    if (player_turn == Object.values(games[gameId].players).length) {
      Object.values(games[gameId].players).forEach((socketid, index) => {
        io.to(socketid).emit('voteplayer')
      })
    }

    games[gameId].player_turn = player_turn
  })

  // start game handler
  socket.on('start', () => {
    const gameId = socket.data.gameId
    if (Object.values(games[gameId].players).length >= 2) {
      // need an algorithm to assign words based on roles
      assignment[gameId] = assignRolesAndWords(Object.keys(games[gameId].players), wordPairs)

      // Sending information to players  for UI update

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
    } else socket.emit('alert', 'players must be atleast 3')
  })

  socket.on('eliminate', user => {
    const gameId = socket.data.gameId
    games[gameId].voted.push(user)
    console.log(games[gameId].voted.length)
    if (games[gameId].voted.length === Object.keys(games[gameId].players).length) {
      const mostfre = mostFrequentString(games[gameId].voted)
      games[gameId].player_turn = 0
      games[gameId].game_round += 1
      games[gameId].voted = []

      Object.values(games[gameId].players).forEach((socketid, index) => {
        io.to(socketid).emit('eliminated', mostfre)
      })
    }
  })

  socket.on('removed', user => {
    const gameId = socket.data.gameId
    if (!games[gameId]) return

    if (games[gameId] && games[gameId].players && games[gameId].players[user]) {
      eliminatedPlayers[gameId].push(user)
      delete games[gameId].players[user]
    }

    // winning condition here
    // Check win condition
    const result = checkWinCondition(gameId)
    if (result) {
      io.to(gameId).emit('game_over', { winner: result.winner })

      // Optionally clear game data to reset
      delete games[gameId]
      delete assignment[gameId]
      delete eliminatedPlayers[gameId]
    } else {
      Object.values(games[gameId].players).forEach((sockid, index) => {
        if (index === games[gameId].player_turn) {
          io.to(sockid).emit('next_round', { round: games[gameId].game_round })
          io.to(sockid).emit('myTurn')
        } else {
          io.to(sockid).emit('next_round', { round: games[gameId].game_round })
        }
      })
    }
  })
})

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

function checkWinCondition (gameId) {
  if (!games[gameId] || !assignment[gameId]) return null
  const alivePlayers = Object.keys(games[gameId].players)

  if (alivePlayers.length === 2) {
    const roles = alivePlayers.map(player => assignment[gameId][player]?.role)

    const civilians = roles.filter(role => role === 'civilian').length

    if (civilians === 2) {
      return { winner: 'civilians' }
    }

    if (roles.includes('mr white')) return { winner: 'mr white' }
    if (roles.includes('undercover')) return { winner: 'undercovers' }
  }

  return null // No winner yet
}

// Routes
const authRoutes = require('./src/routes/authRoutes')
app.use('/', authRoutes)

// Invitation Routes
const inviteRoutes = require('./src/routes/inviteRoutes')
app.use('/', inviteRoutes)

// Game routes
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

// Server configuration
const port = process.env.PORT || 5000
require('./config/db')()
server.listen(port, () => {
  console.log(`FindMrWhite server running on port ${port}`)
})

app.set('io', io)

const userSockets = new Map()

module.exports = app
