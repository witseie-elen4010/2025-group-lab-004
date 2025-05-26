'use strict'

const User = require('../models/user')
const bcrypt = require('bcrypt')

// Admin logging function
const logAction = (action, username) => {
  console.log(`[${new Date().toISOString()}] ${action} by ${username}`)
}

// Display settings page
exports.getSettings = async (req, res) => {
  try {
    const userId = req.session.userId
    if (!userId) {
      return res.redirect('/login')
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.redirect('/login')
    }

    res.render('settings', {
      title: 'Settings',
      user: {
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        settings: user.settings || {
          soundEffects: true,
          notifications: true,
          theme: 'light',
          publicProfile: true,
          allowInvites: true,
          autoJoinInvites: false
        },
        stats: user.stats || {
          gamesPlayed: 0,
          gamesWon: 0,
          winningRate: 0
        }
      },
      message: null,
      error: null
    })
  } catch (error) {
    console.error('Error loading settings:', error)
    res.redirect('/dashboard')
  }
}

// Update profile settings
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.userId
    const { email } = req.body

    if (!userId) {
      return res.redirect('/login')
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.redirect('/login')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.render('settings', {
        title: 'Settings',
        user: {
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          lastActive: user.lastActive,
          settings: user.settings || {},
          stats: user.stats || {}
        },
        message: null,
        error: 'Please enter a valid email address'
      })
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email, 
      _id: { $ne: userId } 
    })

    if (existingUser) {
      return res.render('settings', {
        title: 'Settings',
        user: {
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          lastActive: user.lastActive,
          settings: user.settings || {},
          stats: user.stats || {}
        },
        message: null,
        error: 'This email is already in use by another account'
      })
    }

    // Update email
    user.email = email
    user.lastActive = new Date()
    await user.save()

    logAction(`Profile updated - email changed`, user.username)

    res.render('settings', {
      title: 'Settings',
      user: {
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        settings: user.settings || {},
        stats: user.stats || {}
      },
      message: 'Profile updated successfully!',
      error: null
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    res.redirect('/settings')
  }
}

// Change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.session.userId
    const { currentPassword, newPassword, confirmPassword } = req.body

    if (!userId) {
      return res.redirect('/login')
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.redirect('/login')
    }

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.render('settings', {
        title: 'Settings',
        user: {
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          lastActive: user.lastActive,
          settings: user.settings || {},
          stats: user.stats || {}
        },
        message: null,
        error: 'All password fields are required'
      })
    }

    if (newPassword !== confirmPassword) {
      return res.render('settings', {
        title: 'Settings',
        user: {
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          lastActive: user.lastActive,
          settings: user.settings || {},
          stats: user.stats || {}
        },
        message: null,
        error: 'New passwords do not match'
      })
    }

    if (newPassword.length < 8) {
      return res.render('settings', {
        title: 'Settings',
        user: {
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          lastActive: user.lastActive,
          settings: user.settings || {},
          stats: user.stats || {}
        },
        message: null,
        error: 'New password must be at least 8 characters long'
      })
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return res.render('settings', {
        title: 'Settings',
        user: {
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          lastActive: user.lastActive,
          settings: user.settings || {},
          stats: user.stats || {}
        },
        message: null,
        error: 'Current password is incorrect'
      })
    }

    // Update password
    user.password = newPassword // Will be hashed by the pre-save middleware
    user.lastActive = new Date()
    await user.save()

    logAction(`Password changed`, user.username)

    res.render('settings', {
      title: 'Settings',
      user: {
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        settings: user.settings || {},
        stats: user.stats || {}
      },
      message: 'Password changed successfully!',
      error: null
    })
  } catch (error) {
    console.error('Error changing password:', error)
    res.redirect('/settings')
  }
}

// Update game preferences
exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.session.userId
    const { 
      soundEffects, 
      notifications, 
      theme, 
      publicProfile, 
      allowInvites, 
      autoJoinInvites 
    } = req.body

    if (!userId) {
      return res.redirect('/login')
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.redirect('/login')
    }

    const oldSettings = { ...user.settings }

    // Initialize settings if they don't exist
    if (!user.settings) {
      user.settings = {}
    }

    // Update preferences (checkboxes return 'on' or undefined)
    user.settings.soundEffects = soundEffects === 'on'
    user.settings.notifications = notifications === 'on'
    user.settings.theme = theme || 'light'
    user.settings.publicProfile = publicProfile === 'on'
    user.settings.allowInvites = allowInvites === 'on'
    user.settings.autoJoinInvites = autoJoinInvites === 'on'
    user.lastActive = new Date()

    await user.save()

    logAction(`Game preferences updated`, user.username)

    // Emit settings update via socket for real-time features
    const io = req.app.get('io')
    if (io) {
      io.to(`user_${userId}`).emit('settings_updated', {
        settings: user.settings,
        changed: {
          notifications: oldSettings.notifications !== user.settings.notifications,
          publicProfile: oldSettings.publicProfile !== user.settings.publicProfile,
          allowInvites: oldSettings.allowInvites !== user.settings.allowInvites
        }
      })
    }

    res.render('settings', {
      title: 'Settings',
      user: {
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        settings: user.settings,
        stats: user.stats || {}
      },
      message: 'Preferences updated successfully!',
      error: null
    })
  } catch (error) {
    console.error('Error updating preferences:', error)
    res.redirect('/settings')
  }
}

// Delete account
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.session.userId
    const { confirmPassword } = req.body

    if (!userId) {
      return res.redirect('/login')
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.redirect('/login')
    }

    if (!confirmPassword) {
      return res.render('settings', {
        title: 'Settings',
        user: {
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          lastActive: user.lastActive,
          settings: user.settings || {},
          stats: user.stats || {}
        },
        message: null,
        error: 'Password confirmation is required to delete account'
      })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(confirmPassword, user.password)
    if (!isPasswordValid) {
      return res.render('settings', {
        title: 'Settings',
        user: {
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          lastActive: user.lastActive,
          settings: user.settings || {},
          stats: user.stats || {}
        },
        message: null,
        error: 'Password is incorrect'
      })
    }

    // Delete the user
    await User.findByIdAndDelete(userId)

    logAction(`Account deleted`, user.username)

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err)
      }
      res.redirect('/?message=Account deleted successfully')
    })
  } catch (error) {
    console.error('Error deleting account:', error)
    res.redirect('/settings')
  }
}

// Export user data (GDPR compliance)
exports.exportData = async (req, res) => {
  try {
    const userId = req.session.userId
    if (!userId) {
      return res.redirect('/login')
    }

    const user = await User.findById(userId).select('-password')
    if (!user) {
      return res.redirect('/login')
    }

    const userData = {
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastActive: user.lastActive,
      stats: user.stats,
      settings: user.settings,
      isAdmin: user.isAdmin,
      exportedAt: new Date().toISOString()
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${user.username}_data.json"`)
    res.send(JSON.stringify(userData, null, 2))

    logAction(`Data exported`, user.username)
  } catch (error) {
    console.error('Error exporting data:', error)
    res.redirect('/settings')
  }
}