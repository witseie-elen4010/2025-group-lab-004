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

router.post('/join', gameController.createJoinGame)

// dashboard route
router.get('/dashboard', gameController.getDashboard) 

// Game Creation routes
router.get('/game_creation', gameController.getGame_Creation)
router.post('/create_game', gameController.postGame_Creation)


module.exports = router

