'use strict'

// controller/gameController.js
const createJoinGame = (GameModel) => {
  return async (req, res) => {
    const { code, userId } = req.body
    const game = await GameModel.findOne({ code })

    if (!game) return res.status(404).json({ error: 'Game not found' })

    if (game.players.includes(userId))
      return res.status(400).json({ error: 'User already in game' })

    game.players.push(userId)
    await game.save()

    res.status(200).json({ message: 'Joined successfully', game })
  }
}

module.exports = { createJoinGame }

