'use strict'

const Game = require('../models/Game')

// controller/gameController.js
exports.createJoinGame = async (req, res) => {
  
  const { code, userId } = req.body
  const game = await Game.findOne({ code })

  if (!game) return res.status(404).json({ error: 'Game not found' })

  if (game.players.includes(userId))
    return res.status(400).json({ error: 'User already in game' })

  game.players.push(userId)
  await game.save()

  res.status(200).json({ message: 'Joined successfully', game })
  
}

// display dashboard
exports.getDashboard =  (req, res) => {
  res.render('dashboard', {title: 'dashboard'})
}

// display Game create page
exports.getGame_Creation =  (req, res) => {
  res.render('game_creation', {title: 'create game'})
}

exports.postGame_Creation = async (req, res) => {
  const {code} = req.body
  res.redirect('/start_game')
}


