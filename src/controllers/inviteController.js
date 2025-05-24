const Invite = require('../models/Invite')
const User = require('../models/user')
const { sendInvitationEmail } = require('../utils/emailService')

exports.renderInvitePage = async (req, res) => {
  console.log('User in req:', req.user)
  if (!req.user) {
    return res.redirect('/login')
  }

  try {
    const invites = await Invite.find({ toUser: req.user.username })
    const sentInvites = await Invite.find({ fromUser: req.user.username })

    res.render('invite', {
      title: 'Invite Friends',
      user: req.user,
      invites,
      sentInvites,
      error: null // Default to null if no error
    })
  } catch (err) {
    console.error('Error fetching invites:', err)
    res.render('invite', {
      title: 'Invite Friends',
      user: req.user,
      invites: [],
      sentInvites: [],
      error: 'An error occurred while loading invites'
    })
  }
}

exports.sendInvite = async (req, res) => {
  const { toUserId, gameId } = req.body
  const fromUser = req.user.username

  try {
    // Find user by username or email
    const toUser = await User.findOne({
      $or: [{ username: toUserId }, { email: toUserId }]
    })

    if (!toUser) {
      const invites = await Invite.find({ toUser: req.user.username })
      const sentInvites = await Invite.find({ fromUser: req.user.username })
      return res.render('invite', {
        title: 'Invite Friends',
        user: req.user,
        invites,
        sentInvites,
        error: 'User not found'
      })
    }

    const invite = new Invite({
      fromUser,
      toUser: toUser.username,
      gameId,
      status: 'pending',
      createdAt: new Date()
    })

    await invite.save()

    try {
      await sendInvitationEmail(toUser.email, fromUser, gameId)
    } catch (err) {
      console.error('Email failed:', err.message)
    }

    const io = req.app.get('io')
    io.to(toUser._id.toString()).emit('newInvite', { fromUser, gameId })

    res.redirect('/invite')
  } catch (err) {
    console.error('Error sending invite:', err)
    const invites = await Invite.find({ toUser: req.user.username })
    const sentInvites = await Invite.find({ fromUser: req.user.username })
    res.render('invite', {
      title: 'Invite Friends',
      user: req.user,
      invites,
      sentInvites,
      error: 'An error occurred while sending the invite'
    })
  }
}

exports.acceptInvite = async (req, res) => {
  const invite = await Invite.findById(req.params.id)
  if (!invite || invite.toUser !== req.user.username) return res.status(403).send('Unauthorized')

  invite.status = 'accepted'
  await invite.save()

  res.redirect('/dashboard')
}

exports.declineInvite = async (req, res) => {
  const invite = await Invite.findById(req.params.id)
  if (!invite || invite.toUser !== req.user.username) return res.status(403).send('Unauthorized')

  invite.status = 'declined'
  await invite.save()

  res.redirect('/invite')
}

exports.revokeInvite = async (req, res) => {
  const invite = await Invite.findById(req.params.id)
  if (!invite || invite.fromUser !== req.user.username) return res.status(403).send('Unauthorized')

  invite.status = 'revoked'
  await invite.save()

  res.redirect('/invite')
}
