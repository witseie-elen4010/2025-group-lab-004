const mongoose = require('mongoose')
const User = require('../models/user')

// Use your database connection string
const dbURI = process.env.MONGO_URI || 'mongodb+srv://group04:test12345@cluster0.dkupoft.mongodb.net/MrWHiteDb?retryWrites=true&w=majority&appName=Cluster0'

mongoose.connect(dbURI)
  .then(() => console.log('✅ Connected to MongoDB for migration'))
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message)
    process.exit(1)
  })

async function migrateUsers() {
  try {
    console.log('🔄 Starting user migration...')
    
    const users = await User.find()
    console.log(`Found ${users.length} users to migrate`)
    
    let updatedCount = 0
    
    for (const user of users) {
      let hasUpdates = false
      
      // Initialize stats if missing
      if (!user.stats) {
        user.stats = {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          winningRate: 0,
          survivedCount: 0,
          eliminatedCount: 0,
          roleDistribution: {
            civilian: 0,
            undercover: 0,
            mrwhite: 0
          },
          roleWins: {
            civilian: 0,
            undercover: 0,
            mrwhite: 0
          }
        }
        hasUpdates = true
      } else {
        // Ensure all stats fields exist
        if (!user.stats.roleDistribution) {
          user.stats.roleDistribution = {
            civilian: 0,
            undercover: 0,
            mrwhite: 0
          }
          hasUpdates = true
        }
        
        if (!user.stats.roleWins) {
          user.stats.roleWins = {
            civilian: 0,
            undercover: 0,
            mrwhite: 0
          }
          hasUpdates = true
        }
        
        if (typeof user.stats.survivedCount === 'undefined') {
          user.stats.survivedCount = 0
          hasUpdates = true
        }
        
        if (typeof user.stats.eliminatedCount === 'undefined') {
          user.stats.eliminatedCount = 0
          hasUpdates = true
        }
      }
      
      // Initialize preferences if missing
      if (!user.preferences) {
        user.preferences = {
          soundEffects: true,
          notifications: true,
          theme: 'light',
          publicProfile: true,
          allowInvites: true
        }
        hasUpdates = true
      }
      
      // Ensure lastActive exists
      if (!user.lastActive) {
        user.lastActive = user.createdAt || new Date()
        hasUpdates = true
      }
      
      if (hasUpdates) {
        await user.save()
        updatedCount++
        console.log(`✅ Updated user: ${user.username}`)
      }
    }
    
    console.log(`🎉 Migration complete! Updated ${updatedCount} users.`)
    
  } catch (error) {
    console.error('❌ Migration error:', error)
  } finally {
    mongoose.connection.close()
    console.log('✅ Database connection closed')
  }
}

// Run migration
migrateUsers()