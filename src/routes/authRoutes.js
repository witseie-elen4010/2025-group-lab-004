'use strict'

const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const { ensureAuthenticated } = require('../middleware/auth')

// Registration routes
router.get('/register', authController.getRegister)
router.post('/register', authController.postRegister)

// login routes

router.get('/login', authController.getLogin)
router.post('/login', authController.postLogin)

// Logout routes

router.get('/logout', ensureAuthenticated, authController.logout)

module.exports = router
