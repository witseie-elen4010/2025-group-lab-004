const express = require('express')
const router = express.Router()
const inviteController = require('../controllers/inviteController')

const ensureAuthenticated = (req, res, next) => {
  console.log('Session Username:', req.session.username)
  if (req.session.username) {
    req.user = { username: req.session.username } // Manually set req.user for consistency
    return next()
  }
  res.redirect('/login')
}

// Protect invite routes with this middleware
router.get('/invite', ensureAuthenticated, inviteController.renderInvitePage)
router.post('/invite', ensureAuthenticated, inviteController.sendInvite)

router.post('/invite/accept/:id', ensureAuthenticated, inviteController.acceptInvite)
router.post('/invite/decline/:id', ensureAuthenticated, inviteController.declineInvite)
router.post('/invite/revoke/:id', ensureAuthenticated, inviteController.revokeInvite)

module.exports = router
