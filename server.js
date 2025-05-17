'use strict'

// const app = require('./app')
const mongoose = require('mongoose')

// MongoDB connection
const dbURI = 'mongodb+srv://group04:test12345@cluster0.dkupoft.mongodb.net/MrWHiteDb?retryWrites=true&w=majority&appName=Cluster0'
mongoose.connect(dbURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err))
