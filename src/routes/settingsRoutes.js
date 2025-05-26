'use strict'

const express = require('express')
const router = express.Router()
const settingsController = require('../controllers/settingsController')

// Middleware to ensure authentication
const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next()
  }
  res.redirect('/login')
}

// Apply authentication middleware to all settings routes
router.use(ensureAuthenticated)

// Settings main page
router.get('/settings', settingsController.getSettings)

// Profile management routes
router.post('/settings/profile', settingsController.updateProfile)

// Password management routes
router.post('/settings/password', settingsController.changePassword)

// Preferences management routes
router.post('/settings/preferences', settingsController.updatePreferences)

// Data export route
router.get('/settings/export', settingsController.exportData)

// Account deletion route
router.post('/settings/delete', settingsController.deleteAccount)

module.exports = router