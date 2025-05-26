'use strict'

const express = require('express')
const router = express.Router()
const gameController = require('../controllers/gameController')

// Middleware to ensure authentication
const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next()
  }
  res.redirect('/login')
}

// Apply authentication middleware to all game routes
router.use(ensureAuthenticated)

// Render the join game page
router.get('/join', (req, res) => {
  res.render('join-game', {
    userId: req.session?.userId || null,
    message: null
  })
})

// Game flow routes
router.post('/join', gameController.createJoinGame)

// Game Creation routes
router.get('/dashboard', gameController.getDashboard)
router.get('/game_creation', gameController.getGame_Creation)
router.post('/create_game', gameController.postGame_Creation)
router.get('/start_game', gameController.getStartgame)

// Game round and voting routes
router.get('/game_round', gameController.getGameRound)
router.post('/start-game-round', gameController.startGameRound)
router.get('/word-description', gameController.getWordDescription)
router.post('/submit_description', gameController.postWordDescription)
router.post('/vote', gameController.postVote)
router.post('/end-voting', gameController.endVoting)
router.get('/game_results', gameController.getGameResults)

// Player Statistics and Leaderboard routes
router.get('/statistics', gameController.getStatistics)
router.get('/leaderboard', gameController.getLeaderboard)

// Settings route (placeholder for future implementation)
router.get('/settings', (req, res) => {
  res.render('settings', {
    title: 'Settings',
    message: 'Settings page coming soon!'
  })
})

module.exports = router
