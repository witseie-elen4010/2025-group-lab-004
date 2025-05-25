const mongoose = require('mongoose')
const User = require('./src/models/user')

mongoose.connect('mongodb://localhost/findmrwhite', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

(async () => {
  try {
    const users = await User.find()
    for (const user of users) {
      if (!user.stats) {
        user.stats = {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          winningRate: 0,
          roleDistribution: {
            civilian: 0,
            undercover: 0,
            mrwhite: 0
          }
        }
      } else if (!user.stats.roleDistribution) {
        user.stats.roleDistribution = {
          civilian: 0,
          undercover: 0,
          mrwhite: 0
        }
      }
      await user.save()
      console.log(`Updated stats for user: ${user.username}`)
    }
    console.log('User stats migration complete')
  } catch (error) {
    console.error('Migration error:', error)
  } finally {
    mongoose.connection.close()
  }
})()
