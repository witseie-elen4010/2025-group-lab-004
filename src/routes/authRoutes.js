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

module.exports = router
