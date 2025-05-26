'use strict'

const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  stats: {
    gamesPlayed: {
      type: Number,
      default: 0
    },
    gamesWon: {
      type: Number,
      default: 0
    },
    gamesLost: {
      type: Number,
      default: 0
    },
    winningRate: {
      type: Number,
      default: 0
    },
    survivedCount: {
      type: Number,
      default: 0
    },
    eliminatedCount: {
      type: Number,
      default: 0
    },
    roleDistribution: {
      civilian: {
        type: Number,
        default: 0
      },
      undercover: {
        type: Number,
        default: 0
      },
      mrwhite: {
        type: Number,
        default: 0
      }
    },
    roleWins: {
      civilian: {
        type: Number,
        default: 0
      },
      undercover: {
        type: Number,
        default: 0
      },
      mrwhite: {
        type: Number,
        default: 0
      }
    }
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
})

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Method to validate password
userSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password)
}

// Method to update game stats
userSchema.methods.updateGameStats = function (role, isWinner, wasSurvivor) {
  if (!this.stats) {
    this.stats = {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      winningRate: 0,
      survivedCount: 0,
      eliminatedCount: 0,
      roleDistribution: { civilian: 0, undercover: 0, mrwhite: 0 },
      roleWins: { civilian: 0, undercover: 0, mrwhite: 0 }
    }
  }

  this.stats.gamesPlayed += 1
  this.stats.roleDistribution[role] += 1

  if (isWinner) {
    this.stats.gamesWon += 1
    this.stats.roleWins[role] += 1
  } else {
    this.stats.gamesLost += 1
  }

  if (wasSurvivor) {
    this.stats.survivedCount += 1
  } else {
    this.stats.eliminatedCount += 1
  }

  this.stats.winningRate = this.stats.gamesPlayed > 0
    ? (this.stats.gamesWon / this.stats.gamesPlayed) * 100
    : 0

  this.lastActive = new Date()
}

// Static method to get leaderboard data
userSchema.statics.getLeaderboardData = async function () {
  const users = await this.find({ 'stats.gamesPlayed': { $gt: 0 } })
    .select('username stats')
    .lean()

  return users.map(user => ({
    username: user.username,
    stats: {
      gamesPlayed: user.stats?.gamesPlayed || 0,
      wins: user.stats?.gamesWon || 0,
      losses: user.stats?.gamesLost || 0,
      winRate: Math.round(user.stats?.winningRate || 0),
      survivedCount: user.stats?.survivedCount || 0,
      eliminatedCount: user.stats?.eliminatedCount || 0,
      gamesAsCivilian: user.stats?.roleDistribution?.civilian || 0,
      gamesAsUndercover: user.stats?.roleDistribution?.undercover || 0,
      gamesAsMrWhite: user.stats?.roleDistribution?.mrwhite || 0,
      winsAsCivilian: user.stats?.roleWins?.civilian || 0,
      winsAsUndercover: user.stats?.roleWins?.undercover || 0,
      winsAsMrWhite: user.stats?.roleWins?.mrwhite || 0
    }
  })).sort((a, b) => {
    // Primary sort: by wins
    if (b.stats.wins !== a.stats.wins) {
      return b.stats.wins - a.stats.wins
    }
    // Secondary sort: by win rate
    if (b.stats.winRate !== a.stats.winRate) {
      return b.stats.winRate - a.stats.winRate
    }
    // Tertiary sort: by games played
    return b.stats.gamesPlayed - a.stats.gamesPlayed
  })
}

const User = mongoose.model('User', userSchema)
module.exports = User
