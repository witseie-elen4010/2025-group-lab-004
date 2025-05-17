'use strict'

const games = {} // In-memory game store

module.exports = (io, socket) => {
  socket.on('joinGame', ({ gameId, playerName }) => {
    if (!games[gameId]) {
      games[gameId] = { players: [], clues: [], turnIndex: 0, phase: 'waiting' }
    }
    const game = games[gameId]

    // Prevent duplicate players (based on socket.id)
    if (!game.players.some(p => p.id === socket.id)) {
      const player = {
        id: socket.id,
        name: playerName,
        word: 'apple', // replace with word assignment logic later
        clue: null
      }

      game.players.push(player)
      socket.join(gameId)
    }

    // Notify all players in the room of new player list
    io.to(gameId).emit('playerJoined', game.players)
    io.to(gameId).emit('gameUpdate', game)
  })
  // Start the description phase manually
  socket.on('startDescriptionPhase', ({ gameId }) => {
    const game = games[gameId]
    if (!game) return

    game.phase = 'description'
    game.turnIndex = 0
    io.to(gameId).emit('phaseChange', 'description')
    io.to(gameId).emit('nextTurn', game.players[game.turnIndex])
    io.to(gameId).emit('gameUpdate', game)
  })
  socket.on('submitClue', ({ gameId, clue }) => {
    const game = games[gameId]
    if (!game) return

    const player = game.players[game.turnIndex]
    if (!player) return

    if (clue.toLowerCase().includes(player.word.toLowerCase())) {
      socket.emit('error', 'Clue contains the word!')
      return
    }

    player.clue = clue
    game.clues.push({ playerName: player.name, text: clue })
    game.turnIndex++

    if (game.turnIndex >= game.players.length) {
      game.phase = 'voting'
      io.to(gameId).emit('phaseChange', 'voting')
    } else {
      io.to(gameId).emit('nextTurn', game.players[game.turnIndex])
    }

    io.to(gameId).emit('gameUpdate', game)
  })
}
