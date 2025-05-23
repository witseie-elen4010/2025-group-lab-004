// config/db.js
'use strict'
const mongoose = require('mongoose')
require('dotenv').config()
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://group04:test12345@cluster0.dkupoft.mongodb.net/MrWHiteDb?retryWrites=true&w=majority&appName=Cluster0')
    console.log('✅ MongoDB connected')
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message)
    process.exit(1)
  }
}

module.exports = connectDB
