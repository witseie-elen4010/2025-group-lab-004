'use strict'

const express = require('express')
const router = express.Router()
const gameController = require('../controllers/gameController')

// Render the join game page
router.get('/join', (req, res) => {
  res.render('join-game', {
    userId: req.session?.userId || null,
    message: null
  })
})

// Game flow routes
router.post('/join', gameController.createJoinGame)

// dashboard route
router.get('/dashboard', gameController.getDashboard)

// Game Creation routes
router.get('/dashboard', gameController.getDashboard)
router.get('/game_creation', gameController.getGame_Creation)
router.post('/create_game', gameController.postGame_Creation)
router.get('/start_game', gameController.getStartgame)

// render word description phase
router.get('/:gameId', (req, res) => {
  const { gameId } = req.params
  const { playerName } = req.query

  res.render('word_description', {
    gameId,
    playerName,
    word: 'apple' // Later: pass real word from game state
  })
})

module.exports = router
// Game round and voting routes
router.get('/game_round', gameController.getGameRound)
router.post('/start-game-round', gameController.startGameRound)
router.post('/vote', gameController.postVote)
router.post('/end-voting', gameController.endVoting)
router.get('/game_results', gameController.getGameResults)
