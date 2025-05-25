const express = require('express');
const http = require('http');
const session = require('express-session');
const sharedSession = require('express-socket.io-session');
const socketIo = require('socket.io');
const socketIoClient = require('socket.io-client');
const request = require('supertest');

// In-memory game state to mimic your server globals
const games = {};
const eliminatedPlayers = {};
const assignment = {};

// Dummy wordPairs and assignRolesAndWords for the test
const wordPairs = [
  ['apple', 'fruit'],
  ['cat', 'animal']
];

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

  describe('Socket.IO start game tests with session', () => {
    const gameId = 'test-start-game';
    const username1 = 'Alice';
    const username2 = 'Bob';
  
    beforeAll((done) => {
      app = express();
  
      const sessionMiddleware = session({
        secret: 'test_secret',
        resave: false,
        saveUninitialized: true
      });
  
      app.use(sessionMiddleware);
  
      app.get('/set-session', (req, res) => {
        req.session.username = req.query.u;
        res.send('Session set');
      });
  
      httpServer = http.createServer(app);
      io = new socketIo.Server(httpServer, {
        cors: {
          origin: '*'
        }
      });
  
      io.use(sharedSession(sessionMiddleware, { autoSave: true }));
  
      io.on('connection', (socket) => {
        const username = socket.handshake.session.username;
        console.log(`[CONNECT] ${username}`);
  
        socket.on('joinGame', (gameId) => {
          socket.join(gameId);
          socket.data.gameId = gameId;
  
          if (!games[gameId]) {
            games[gameId] = {
              players: {},
              player_turn: 0,
              game_round: 1,
              voted: []
            };
          }
  
          games[gameId].players[username] = socket.id;
          socket.to(gameId).emit('message', username);
        });
  
        socket.on('start', () => {
          const gameId = socket.data.gameId;
          console.log('[START] Triggered by socket:', socket.id);
          console.log('[START] Game ID:', gameId);
          console.log('[START] Players:', games[gameId].players);
  
          if (Object.values(games[gameId].players).length >= 2) {
            assignment[gameId] = assignRolesAndWords(Object.keys(games[gameId].players), wordPairs);
  
            Object.keys(games[gameId].players).forEach((user, index) => {
              if (index === games[gameId].player_turn) {
                io.to(games[gameId].players[user]).emit('word', assignment[gameId][user].word);
                io.to(games[gameId].players[user]).emit('myTurn');
                io.to(games[gameId].players[user]).emit('next_round', { round: games[gameId].game_round });
              } else {
                io.to(games[gameId].players[user]).emit('word', assignment[gameId][user].word);
                io.to(games[gameId].players[user]).emit('next_round', { round: games[gameId].game_round });
              }
            });
          } else {
            console.log('[START] Not enough players');
            socket.emit('alert', 'players must be atleast 3');
          }
        });
      });
  
      httpServer.listen(() => {
        port = httpServer.address().port;
  
        Promise.all([
          request(app).get(`/set-session?u=${username1}`),
          request(app).get(`/set-session?u=${username2}`)
        ]).then(([res1, res2]) => {
          const cookie1 = res1.headers['set-cookie'][0].split(';')[0];
          const cookie2 = res2.headers['set-cookie'][0].split(';')[0];
  
          client1 = socketIoClient(`http://localhost:${port}`, {
            transports: ['websocket'],
            extraHeaders: {
              Cookie: cookie1
            }
          });
  
          client2 = socketIoClient(`http://localhost:${port}`, {
            transports: ['websocket'],
            extraHeaders: {
              Cookie: cookie2
            }
          });
  
          let connected = 0;
          client1.on('connect', () => { if (++connected === 2) done(); });
          client2.on('connect', () => { if (++connected === 2) done(); });
        });
      });
    });
  
    afterAll(() => {
      client1.close();
      client2.close();
      io.close();
      httpServer.close();
    });
  
    test('start emits word, myTurn, next_round correctly', (done) => {
      let wordCount = 0;
      let roundCount = 0;
      let turnCount = 0;
  
      function checkDone() {
        if (wordCount === 2 && roundCount === 2 && turnCount === 1) {
          done();
        }
      }
  
      client1.on('word', (word) => {
        expect(wordPairs.flat().includes(word) || word == 'you are Mr white (no word assigned for you)').toBe(true);
        wordCount++;
        checkDone();
      });
  
      client2.on('word', (word) => {
        expect(wordPairs.flat().includes(word) || word == 'you are Mr white (no word assigned for you)').toBe(true);
        wordCount++;
        checkDone();
      });
  
      client1.on('myTurn', () => {
        turnCount++;
        checkDone();
      });
  
      client2.on('myTurn', () => {
        turnCount++;
        checkDone(); // Should not be called for both, test fails if it is
      });
  
      client1.on('next_round', (data) => {
        expect(data.round).toBe(1);
        roundCount++;
        checkDone();
      });
  
      client2.on('next_round', (data) => {
        expect(data.round).toBe(1);
        roundCount++;
        checkDone();
      });
  
      // Join game first
      client1.emit('joinGame', gameId);
      setTimeout(() => {
        client2.emit('joinGame', gameId);
  
        setTimeout(() => {
          client1.emit('start');
        }, 200); // small delay to ensure join completion
      }, 200);
    }, 10000);
  });