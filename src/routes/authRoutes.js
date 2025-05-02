'use strict'

const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')

// Registration routes
router.get('/register', authController.getRegister)
router.post('/register', authController.postRegister)

// login routes

router.get('/login', authController.getRegister)
router.post('/login', authController.postRegister)

// dashboard route
router.get('/dashboard', authController.getDashboard) 

// Game Creation routes
router.get('/game_creation', authController.getGame_Creation)


// Logout routes (in Progress)

// exports.logout = (req, res) => {
// req.session.destroy(() => {
// res.redirect('/login')
// })
// }

// router.get('/logout', authController.logout)

module.exports = router
