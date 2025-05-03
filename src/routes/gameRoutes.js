const express = require('express')
const { joinGame } = require('../controllers/gameController')
const router = express.Router()

// Render the join game page
router.get('/join', (req, res) => {
  res.render('join-game', {
    userId: req.session?.userId || null,  
    message: null
  })
})

router.post('/join', joinGame)

module.exports = router

