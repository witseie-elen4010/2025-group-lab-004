'use strict'

const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')

// Registration routes
router.get('/register', authController.getRegister)
router.post('/register', authController.postRegister)

// We'll add login routes later

module.exports = router