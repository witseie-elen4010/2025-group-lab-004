const games = {} // In-memory game store

module.exports = (io, socket) => {
  socket.on('joinGame', ({ gameId, playerName }) => {
    if (!games[gameId]) {
      games[gameId] = { players: [], clues: [], turnIndex: 0, phase: 'description' }
    }

    const player = { id: socket.id, name: playerName, word: 'apple', clue: null }
    games[gameId].players.push(player)
    socket.join(gameId)

    io.to(gameId).emit('gameUpdate', games[gameId])
  })

  socket.on('submitClue', ({ gameId, clue }) => {
    const game = games[gameId]
    const player = game.players[game.turnIndex]

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
