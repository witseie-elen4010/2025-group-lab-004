'use strict'

const mongoose = require('mongoose')
require('dotenv').config()

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://group04:test12345@cluster0.dkupoft.mongodb.net/MrWHiteDb?retryWrites=true&w=majority&appName=Cluster0')
    console.log('✅ MongoDB connected')
    
    // Handle connection events for better debugging
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err)
    })

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected')
    })

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      console.log('✅ MongoDB connection closed')
      process.exit(0)
    })

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message)
    process.exit(1)
  }
}

module.exports = connectDB