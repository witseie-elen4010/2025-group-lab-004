'use strict'

const User = require('../models/user')
const bcrypt = require('bcrypt')

// Admin logging function
const logAction = (action) => {
  console.log(`[${new Date().toISOString()}] ${action}`)
  // In a real application, you would store this in a database
}

// Display the registration form
exports.getRegister = (req, res) => {
  res.render('register', { title: 'Register', error: null })
}

// Handle user registration
exports.postRegister = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body

    // Validate input
    if (!username || !email || !password || !confirmPassword) {
      return res.render('register', {
        title: 'Register',
        error: 'All fields are required'
      })
    }

    if (password !== confirmPassword) {
      return res.render('register', {
        title: 'Register',
        error: 'Passwords do not match'
      })
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.render('register', {
        title: 'Register',
        error: 'Username or email already in use'
      })
    }

    // Create new user
    const user = new User({
      username,
      email,
      password
    })

    await user.save()

    // Log registration in admin log
    logAction(`New user registered: ${username} (${email})`)

    // Redirect to login page (we'll create this later)
    res.redirect('/login')
  } catch (error) {
    console.error('Registration error:', error)
    res.render('register', {
      title: 'Register',
      error: 'An error occurred during registration'
    })
  }
}

// Display login form
exports.getLogin = (req, res) => {
  res.render('login', { title: 'Login', error: null })
}

// Handle login POST
exports.postLogin = async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.render('login', {
        title: 'Login',
        error: 'All fields are required'
      })
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    })

    if (!user) {
      return res.render('login', {
        title: 'Login',
        error: 'Invalid credentials'
      })
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.render('login', {
        title: 'Login',
        error: 'Invalid credentials'
      })
    }

    // Save user info to session
    req.session.userId = user._id
    req.session.username = user.username

    console.log(`User logged in: ${user.username}`)

    // Redirect to a main page
    res.redirect('/dashboard')
  } catch (error) {
    console.error('Login error:', error)
    res.render('login', {
      title: 'Login',
      error: 'An error occurred during login'
    })
  }
}

// display dashboard
exports.getDashboard =  (req, res) => {
  res.render('dashboard', {title: 'dashboard'})
}

// display Game create page
exports.getGame_Creation =  (req, res) => {
  res.render('game_creation', {title: 'create game'})
}
