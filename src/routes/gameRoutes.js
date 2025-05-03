'use strict'

const express = require('express')
const Game = require('../models/Game')
const { createJoinGame } = require('../controllers/gameController')
const router = express.Router()

// Render the join game page
router.get('/join', (req, res) => {
  res.render('join-game', {
    userId: req.session?.userId || null,  
    message: null
  })
})

router.post('/join', createJoinGame(Game))

module.exports = router

