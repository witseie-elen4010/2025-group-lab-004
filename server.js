'use strict'

const app = require('./app')
const mongoose = require('mongoose')

// MongoDB connection
const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/findmrwhite'
mongoose.connect(dbURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err))