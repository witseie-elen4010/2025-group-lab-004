'use strict'

const app = require('./app')
const mongoose = require('mongoose')
const session = require('express-session')

// MongoDB connection
//const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/findmrwhite'
//mongoose.connect(dbURI)
  //.then(() => console.log('MongoDB connected'))
  //.catch(err => console.error('MongoDB connection error:', err))

// Handling app use
app.use(session({
  secret: 'your-secret-key', // Replace with a strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set `secure: true` if using HTTPS
}))
