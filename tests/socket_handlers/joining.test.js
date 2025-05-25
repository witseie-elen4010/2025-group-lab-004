const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const socketIoClient = require('socket.io-client')
const session = require('express-session')
const sharedSession = require('express-socket.io-session')
const request = require('supertest')

let app, server, io, httpServer
let client1, client2
let port
const games = {}

describe('Socket.IO joinGame tests with session', () => {
  const gameId = 'test-room'
  const username1 = 'Alice'
  const username2 = 'Bob'

  beforeAll((done) => {
    app = express()

    const sessionMiddleware = session({
      secret: 'test_secret',
      resave: false,
      saveUninitialized: true
    })

    app.use(sessionMiddleware)

    app.get('/set-session', (req, res) => {
      req.session.username = req.query.u
      res.send('Session set')
    })

    httpServer = http.createServer(app)
    io = new socketIo.Server(httpServer, {
      cors: {
        origin: '*'
      }
    })

    io.use(sharedSession(sessionMiddleware, { autoSave: true }))

    io.on('connection', socket => {
      const username = socket.handshake.session.username
      console.log(`Connected: ${username}`)
      socket.on('joinGame', (gameId) => {
        socket.join(gameId)
        socket.data.gameId = gameId

        if (!games[gameId]) {
          games[gameId] = {
            players: {},
            player_turn: 0,
            game_round: 1,
            voted: []
          }
        }

        games[gameId].players[username] = socket.id
        socket.to(gameId).emit('message', username)
      })
    })

    httpServer.listen(() => {
      port = httpServer.address().port

      // Set sessions
      Promise.all([
        request(app).get(`/set-session?u=${username1}`),
        request(app).get(`/set-session?u=${username2}`)
      ]).then(async ([res1, res2]) => {
        const cookie1 = res1.headers['set-cookie'][0].split(';')[0]
        const cookie2 = res2.headers['set-cookie'][0].split(';')[0]

        client1 = socketIoClient(`http://localhost:${port}`, {
          transports: ['websocket'],
          extraHeaders: {
            Cookie: cookie1
          }
        })

        client2 = socketIoClient(`http://localhost:${port}`, {
          transports: ['websocket'],
          extraHeaders: {
            Cookie: cookie2
          }
        })

        let connected = 0
        client1.on('connect', () => { if (++connected === 2) done() })
        client2.on('connect', () => { if (++connected === 2) done() })
      })
    })
  })

  afterAll(() => {
    client1.close()
    client2.close()
    io.close()
    httpServer.close()
  })

  test('players join game and message is emitted', (done) => {
    client2.emit('joinGame', gameId) // Ensure client2 joins first

    // Give client2 some time to join and listen
    setTimeout(() => {
      client2.once('message', (msg) => {
        expect(msg).toBe(username1)
        done()
      })

      client1.emit('joinGame', gameId) // Emit after listener is set
    }, 200)
  }, 10000)

  test('game state is updated correctly', (done) => {
    setTimeout(() => {
      const game = games[gameId]
      expect(game).toBeDefined()
      expect(Object.keys(game.players)).toContain(username1)
      expect(Object.keys(game.players)).toContain(username2)
      expect(game.player_turn).toBe(0)
      expect(game.game_round).toBe(1)
      done()
    }, 500)
  }, 10000)
})
