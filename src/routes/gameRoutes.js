const express = require('express')
const { joinGame } = require('../controllers/gameController')
const router = express.Router()

router.post('/join', joinGame)

module.exports = router

