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
  res.render('game_creation', {title: 'create game', Error: null})
}

// Handle for creating a game session
exports.postGame_Creation = async (req, res) => {

  const {code} = req.body
  console.log(code)

  const game = await Game.findOne({ code })
  if (game){
    return res.render('game_creation', {title: 'create game', Error: 'The session already exist' })
  } 
  
  // Create new user
  const sess = new Game({
    code
  })
  
  await sess.save()

  res.redirect('/start_game')
}

exports.getStartgame =  (req, res) => {
  res.render('start_page', {title: 'start game page'})
}
