'use strict'

const express = require('express')
const connectDB = require('./config/db')
connectDB()
const Game = require('./src/models/Game')
const User = require('./src/models/user')
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
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
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
  ['Football', 'Rugby'],
  ['Coffee', 'Tea'],
  ['Car', 'Bus'],
  ['Cat', 'Dog'],
  ['Mountain', 'Hill'],
  ['Ocean', 'Sea']
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

// Socket.IO connection handling
io.on('connect', socket => {
  const username = socket.handshake.session.username
  console.log(`New player connected - ${username}`)

  // New player joining handler
  socket.on('joinGame', (gameId) => {
    socket.join(gameId)
    socket.data.gameId = gameId
    console.log(`${username} joined game ${gameId}`)

    // construct game
    if (!games[gameId]) {
      games[gameId] = {}
      games[gameId].players = {}
      games[gameId].players[username] = socket.id
      games[gameId].player_turn = 0
      games[gameId].game_round = 1
      games[gameId].voted = []
      eliminatedPlayers[gameId] = []
      socket.to(gameId).emit('message', username)
    } else {
      // Only add if not eliminated
      if (!eliminatedPlayers[gameId].includes(username)) {
        games[gameId].players[username] = socket.id
        socket.to(gameId).emit('message', username)
      }
    }
  })

  // Word Description handler
  socket.on('description', descrip => {
    const gameId = socket.data.gameId
    if (!games[gameId]) return

    // Check if player is eliminated
    if (eliminatedPlayers[gameId].includes(username)) {
      socket.emit('alert', 'You are eliminated and cannot participate!')
      return
    }

    let player_turn = games[gameId].player_turn
    player_turn++

    // Send to active (non-eliminated) players only
    Object.keys(games[gameId].players).forEach((playerName, index) => {
      if (!eliminatedPlayers[gameId].includes(playerName)) {
        const socketId = games[gameId].players[playerName]
        if (index == player_turn) {
          io.to(socketId).emit('description', `Clue from ${username}: ${descrip}`)
          io.to(socketId).emit('myTurn')
        } else {
          io.to(socketId).emit('description', `clue from ${username}: ${descrip}`)
        }
      }
    })

    // Check if all active players have given descriptions
    const activePlayers = Object.keys(games[gameId].players).filter(p => !eliminatedPlayers[gameId].includes(p))
    if (player_turn >= activePlayers.length) {
      // Enable voting for all active players
      Object.keys(games[gameId].players).forEach((playerName) => {
        if (!eliminatedPlayers[gameId].includes(playerName)) {
          const socketId = games[gameId].players[playerName]
          io.to(socketId).emit('voteplayer')
        }
      })
    }

    games[gameId].player_turn = player_turn
  })

  // start game handler
  socket.on('start', () => {
    const gameId = socket.data.gameId
    if (!games[gameId]) return

    const activePlayers = Object.keys(games[gameId].players).filter(p => !eliminatedPlayers[gameId].includes(p))
    if (activePlayers.length >= 3) {
      // need an algorithm to assign words based on roles
      assignment[gameId] = assignRolesAndWords(activePlayers, wordPairs)

      // Sending information to players for UI update
      activePlayers.forEach((user, index) => {
        const socketId = games[gameId].players[user]
        if (index == games[gameId].player_turn) {
          io.to(socketId).emit('word', assignment[gameId][user].word)
          io.to(socketId).emit('myTurn')
          io.to(socketId).emit('next_round', { round: games[gameId].game_round })
        } else {
          io.to(socketId).emit('word', assignment[gameId][user].word)
          io.to(socketId).emit('next_round', { round: games[gameId].game_round })
        }
      })
    } else {
      socket.emit('alert', 'players must be at least 3')
    }
  })

  socket.on('eliminate', user => {
    const gameId = socket.data.gameId
    if (!games[gameId]) return

    // Check if voting player is eliminated
    if (eliminatedPlayers[gameId].includes(username)) {
      socket.emit('alert', 'You are eliminated and cannot vote!')
      return
    }

    games[gameId].voted.push(user)

    if (games[gameId].voted.length === Object.keys(games[gameId].players).length) {
      const mostfre = mostFrequentString(games[gameId].voted)
      if (mostfre.length == 1) {
        games[gameId].player_turn = 0
        games[gameId].game_round += 1
        games[gameId].voted = []

        Object.values(games[gameId].players).forEach((socketid, index) => {
          io.to(socketid).emit('eliminated', mostfre)
        })
      } else {
        // repeat round
        games[gameId].player_turn = 0
        games[gameId].voted = []
        Object.keys(games[gameId].players).forEach((user, index) => {
          if (index == games[gameId].player_turn) {
            io.to(games[gameId].players[user]).emit('myTurn')
            io.to(games[gameId].players[user]).emit('repeat_round', { round: games[gameId].game_round })
          } else {
            io.to(games[gameId].players[user]).emit('repeat_round', { round: games[gameId].game_round })
          }
        })
      }
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
      const game = games[gameId]
      if (!game) {
        console.error(`Game not found for ID: ${gameId}`)
        return
      }
      io.to(gameId).emit('game_over', {
        winner: result.winner,
        players: Object.keys(game.players).map(username => ({
          username,
          role: assignment[gameId][username]?.role || 'unknown',
          word: assignment[gameId][username]?.role === 'mr white' ? 'N/A' : assignment[gameId][username]?.word || 'N/A'
        }))
      })

      // clean up
      delete games[gameId]
      delete assignment[gameId]
      delete eliminatedPlayers[gameId]
    } else {
      // Continue to next round - only send to active players
      const activePlayers = Object.keys(games[gameId].players).filter(p => !eliminatedPlayers[gameId].includes(p))
      activePlayers.forEach((playerName, index) => {
        const socketId = games[gameId].players[playerName]
        if (index === games[gameId].player_turn) {
          io.to(socketId).emit('next_round', { round: games[gameId].game_round })
          io.to(socketId).emit('myTurn')
        } else {
          io.to(socketId).emit('next_round', { round: games[gameId].game_round })
        }
      })
    }
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected - ${username}`)
    const gameId = socket.data.gameId
    if (gameId && games[gameId] && games[gameId].players && games[gameId].players[username]) {
      // Remove player from game on disconnect
      delete games[gameId].players[username]

      // Notify other players
      socket.to(gameId).emit('playerDisconnected', username)

      // If no players left, clean up game
      if (Object.keys(games[gameId].players).length === 0) {
        delete games[gameId]
        delete assignment[gameId]
        delete eliminatedPlayers[gameId]
      }
    }
  })
})

// Helper functions
function mostFrequentString (arr) {
  const freq = {}
  let maxCount = 0
  let mostCommon = null

  for (const str of arr) {
    freq[str] = (freq[str] || 0) + 1
    if (freq[str] > maxCount) {
      maxCount = freq[str]
    }
  }

  mostCommon = Object.keys(freq).filter(str => freq[str] === maxCount)

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack)

  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production'

  res.status(err.status || 500).render('error', {
    title: 'Error',
    error: {
      status: err.status || 500,
      message: err.message || 'Something went wrong!',
      stack: isDevelopment ? err.stack : null
    }
  })
})

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
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard')
  }
  res.render('home', { title: 'FindMrWhite' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    error: {
      status: 404,
      message: 'The page you are looking for does not exist.',
      stack: null
    }
  })
})

// Server configuration
const port = process.env.PORT || 5000
require('./config/db')()
server.listen(port, () => {
  console.log(`FindMrWhite server running on port ${port}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

app.set('io', io)

module.exports = app
