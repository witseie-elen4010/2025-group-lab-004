const Game = require('../models/Game')

exports.joinGame = async (req, res) => {
  const { code, userId } = req.body

  try {
    const game = await Game.findOne({ code })
    if (!game) {
      return res.status(404).json({ message: 'Game not found' })
    }

    if (game.players.includes(userId)) {
      return res.status(400).json({ message: 'User already joined' })
    }

    game.players.push(userId)
    await game.save()

    res.status(200).json({ message: 'Joined game successfully', game })
  } catch (err) {
    console.error('Join error:', err)
    res.status(500).json({ message: 'Server error' })
  }
}

