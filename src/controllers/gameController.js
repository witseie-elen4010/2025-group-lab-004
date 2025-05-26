'use strict'

const Game = require('../models/Game')
const User = require('../models/user')

// Admin logging function
const logAction = (action, username) => {
  console.log(`[${new Date().toISOString()}] ${action} by ${username}`)
}

// Handle for creating a game session
exports.postGame_Creation = async (req, res) => {
  try {
    const { code } = req.body
    const userId = req.session.userId

    if (!userId) {
      return res.redirect('/login')
    }

    const existingGame = await Game.findOne({ code })
    if (existingGame) {
      return res.render('game_creation', {
        title: 'Create Game',
        Error: 'This game code already exists'
      })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.redirect('/login')
    }

    const game = new Game({
      code,
      players: [{
        userId,
        username: user.username,
        role: 'civilian',
        isEliminated: false
      }],
      status: 'waiting'
    })

    await game.save()
    logAction(`Game ${code} created`, user.username)

    res.redirect(`/game_round?gameId=${game._id}`)
  } catch (error) {
    console.error('Game creation error:', error)
    res.render('game_creation', {
      title: 'Create Game',
      Error: 'An error occurred while creating the game'
    })
  }
}

// Display dashboard
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.session.userId
    if (!userId) {
      return res.redirect('/login')
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.redirect('/login')
    }

    // Ensure stats structure exists
    if (!user.stats) {
      user.stats = {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        winningRate: 0
      }
      await user.save()
    }

    res.render('dashboard', {
      title: 'Dashboard',
      username: user.username,
      stats: {
        gamesPlayed: user.stats.gamesPlayed,
        gamesWon: user.stats.gamesWon,
        gamesLost: user.stats.gamesLost,
        winningRate: user.stats.winningRate.toFixed(2)
      }
    })
  } catch (error) {
    console.error('Error loading dashboard:', error)
    res.status(500).send('Something broke!')
  }
}

// Display Game create page
exports.getGame_Creation = (req, res) => {
  res.render('game_creation', { title: 'Create Game', Error: null })
}

// Get game start page
exports.getStartgame = (req, res) => {
  const gameId = req.query.gameId || 'defaultGameId'
  const playerName = req.query.playerName || 'Guest'

  res.render('start_page', {
    title: 'start game page',
    gameId,
    playerName
  })
}

// Handle joining a game
exports.createJoinGame = async (req, res) => {
  try {
    const { code } = req.body
    const userId = req.session.userId

    if (!userId) {
      return res.redirect('/login')
    }

    const game = await Game.findOne({ code })

    if (!game) {
      return res.render('join-game', {
        userId,
        message: 'Game not found'
      })
    }

    if (game.status !== 'waiting') {
      return res.render('join-game', {
        userId,
        message: 'Game has already started'
      })
    }

    const playerExists = game.players.some(p => p.userId.toString() === userId)

    if (playerExists) {
      return res.redirect(`/game_round?gameId=${game._id}`)
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.redirect('/login')
    }

    game.players.push({
      userId,
      username: user.username,
      role: 'civilian',
      isEliminated: false
    })

    await game.save()
    logAction(`User ${user.username} joined game ${code}`, user.username)

    res.redirect(`/game_round?gameId=${game._id}`)
  } catch (error) {
    console.error('Error joining game:', error)
    res.render('join-game', {
      userId: req.session.userId,
      message: 'An error occurred while joining the game'
    })
  }
}

// Get game round - SIMPLIFIED: Let sockets handle most game logic
exports.getGameRound = async (req, res) => {
  try {
    const gameId = req.query.gameId

    if (!gameId) {
      return res.redirect('/dashboard')
    }

    const userId = req.session.userId
    if (!userId) {
      return res.redirect('/login')
    }

    const game = await Game.findById(gameId)
    if (!game) {
      return res.redirect('/dashboard')
    }

    if (game.status === 'completed') {
      return res.redirect(`/game_results?gameId=${gameId}`)
    }

    const currentPlayer = game.players.find(p => p.userId.toString() === userId)

    if (!currentPlayer) {
      return res.redirect('/dashboard')
    }

    // Allow all players to see the page - socket handles the game flow
    const playerHasVoted = game.votes ? game.votes.some(vote =>
      vote.round === game.currentRound &&
      vote.voterId.toString() === userId
    ) : false

    const activePlayers = game.players.filter(p => !p.isEliminated)
    const votesThisRound = game.votes ? game.votes.filter(v => v.round === game.currentRound) : []
    const allPlayersVoted = votesThisRound.length === activePlayers.length

    // Any active player can control game flow
    const isHost = activePlayers.length > 0 && activePlayers[0].userId.toString() === userId

    res.render('game_round', {
      title: 'Game Round',
      gameData: game,
      userId,
      playerHasVoted,
      allPlayersVoted,
      isHost
    })
  } catch (error) {
    console.error('Error loading game round:', error)
    res.redirect('/dashboard')
  }
}

// SIMPLIFIED: Most game logic handled by sockets in app.js
exports.startGameRound = async (req, res) => {
  // Just redirect back - socket handles the start logic
  const { gameId } = req.body
  res.redirect(`/game_round?gameId=${gameId}`)
}

exports.postVote = async (req, res) => {
  // Socket handles voting - just redirect back
  const { gameId } = req.body
  res.redirect(`/game_round?gameId=${gameId}`)
}

exports.endVoting = async (req, res) => {
  // Socket handles voting end - just redirect back
  const { gameId } = req.body
  res.redirect(`/game_round?gameId=${gameId}`)
}

// Handle word description
exports.getWordDescription = async (req, res) => {
  try {
    const { gameId } = req.query
    const userId = req.session.userId

    if (!userId) return res.redirect('/login')

    const game = await Game.findById(gameId)
    if (!game) return res.status(404).send('Game not found')

    const player = game.players.find(p => p.userId.toString() === userId)
    if (!player) return res.status(404).send('Player not found in game')

    res.render('word_description', {
      gameId,
      playerName: player.username,
      word: player.word || 'No word assigned'
    })
  } catch (error) {
    console.error('Error rendering word description:', error)
    res.redirect('/dashboard')
  }
}

// Handle word description submission
exports.postWordDescription = async (req, res) => {
  try {
    const { gameId, description } = req.body
    const userId = req.session.userId

    if (!userId) return res.redirect('/login')

    const game = await Game.findById(gameId)
    if (!game) return res.redirect('/dashboard')

    const player = game.players.find(p => p.userId.toString() === userId)
    if (!player || player.isEliminated) return res.redirect('/dashboard')

    player.description = description
    await game.save()

    const allDescribed = game.players
      .filter(p => !p.isEliminated)
      .every(p => p.description)

    if (allDescribed) {
      await Game.setGamePhase(gameId, 'voting')
      const io = req.app.get('io')
      io.to(gameId).emit('phaseChanged', {
        phase: 'voting',
        message: 'All players have submitted their descriptions. Voting phase begins now!'
      })
      return res.redirect(`/game_round?gameId=${gameId}`)
    } else {
      return res.redirect(`/word_description?gameId=${gameId}`)
    }
  } catch (error) {
    console.error('Error submitting description:', error)
    return res.redirect('/dashboard')
  }
}

// Show game results - Stats are updated by app.js socket logic
exports.getGameResults = async (req, res) => {
  try {
    const gameId = req.query.gameId

    if (!gameId) {
      return res.redirect('/dashboard')
    }

    const userId = req.session.userId
    if (!userId) {
      return res.redirect('/login')
    }

    const game = await Game.findById(gameId)
    if (!game) {
      return res.redirect('/dashboard')
    }

    if (game.status !== 'completed') {
      return res.redirect(`/game_round?gameId=${gameId}`)
    }

    const playerExists = game.players.some(p => p.userId.toString() === userId)
    if (!playerExists) {
      return res.redirect('/dashboard')
    }

    const remainingCivilians = game.players.filter(
      p => !p.isEliminated && p.role === 'civilian'
    )
    const remainingImposters = game.players.filter(
      p => !p.isEliminated && (p.role === 'undercover' || p.role === 'mrwhite')
    )

    let winningRole, winners
    if (remainingImposters.length > 0 && remainingCivilians.length <= 1) {
      winningRole = 'Imposters (Undercover & Mr. White)'
      winners = remainingImposters
    } else {
      winningRole = 'Civilians'
      winners = game.players.filter(p => p.role === 'civilian')
    }

    res.render('game_results', {
      title: 'Game Results',
      gameData: game,
      winningRole,
      winners
    })
  } catch (error) {
    console.error('Error showing game results:', error)
    res.redirect('/dashboard')
  }
}

// Statistics
exports.getStatistics = async (req, res) => {
  try {
    const userId = req.session.userId
    if (!userId) {
      return res.redirect('/login')
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.redirect('/login')
    }

    const stats = user.stats || {
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

    const isAdmin = user.isAdmin || false
    let allUsers = []
    if (isAdmin) {
      const users = await User.find()
      allUsers = users.map(u => ({
        username: u.username,
        stats: u.stats || {
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
      }))
    }

    res.render('statistics', {
      title: 'Statistics',
      user: user.username,
      stats: {
        gamesPlayed: stats.gamesPlayed,
        gamesWon: stats.gamesWon,
        gamesLost: stats.gamesLost,
        winningRate: stats.winningRate,
        roleDistribution: {
          civilian: stats.roleDistribution.civilian,
          undercover: stats.roleDistribution.undercover,
          mrwhite: stats.roleDistribution.mrwhite
        }
      },
      allUsers,
      isAdmin
    })
  } catch (error) {
    console.error('Error loading statistics:', error)
    res.redirect('/dashboard')
  }
}

// Get leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const userId = req.session.userId
    if (!userId) {
      return res.redirect('/login')
    }

    const currentUser = await User.findById(userId)
    if (!currentUser) {
      return res.redirect('/login')
    }

    let leaderboard = []
    try {
      leaderboard = await User.getLeaderboardData()
      console.log(`Leaderboard loaded with ${leaderboard.length} players`)
    } catch (error) {
      console.error('Error fetching leaderboard data:', error)
      leaderboard = []
    }

    const totalPlayers = leaderboard.length
    const totalGames = leaderboard.reduce((sum, player) => sum + player.stats.gamesPlayed, 0)
    const averageWinRate = totalPlayers > 0 
      ? (leaderboard.reduce((sum, player) => sum + player.stats.winRate, 0) / totalPlayers).toFixed(1)
      : 0

    const currentUserRank = leaderboard.findIndex(player => player.username === currentUser.username) + 1

    res.render('leaderboard', {
      title: 'Leaderboard',
      leaderboard,
      currentUser: currentUser.username,
      currentUserRank: currentUserRank || 'Unranked',
      totalPlayers,
      totalGames,
      averageWinRate
    })
  } catch (error) {
    console.error('Error loading leaderboard:', error)
    res.render('leaderboard', {
      title: 'Leaderboard',
      leaderboard: [],
      currentUser: 'Unknown',
      currentUserRank: 'Unranked',
      totalPlayers: 0,
      totalGames: 0,
      averageWinRate: 0,
      error: 'Unable to load leaderboard data. Please try again later.'
    })
  }
}

// Settings functionality
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

    // Initialize user preferences if they don't exist
    if (!user.preferences) {
      user.preferences = {
        soundEffects: true,
        notifications: true,
        theme: 'light',
        publicProfile: true,
        allowInvites: true
      }
      await user.save()
    }

    res.render('settings', {
      title: 'Settings',
      user: user,
      message: req.query.message || null,
      error: req.query.error || null
    })
  } catch (error) {
    console.error('Error loading settings:', error)
    res.redirect('/dashboard')
  }
}

// Update settings
exports.postSettings = async (req, res) => {
  try {
    const userId = req.session.userId
    if (!userId) {
      return res.redirect('/login')
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.redirect('/login')
    }

    const { 
      soundEffects, 
      notifications, 
      theme, 
      publicProfile, 
      allowInvites,
      newPassword,
      confirmPassword,
      currentPassword
    } = req.body

    // Update preferences
    if (!user.preferences) {
      user.preferences = {}
    }

    user.preferences.soundEffects = soundEffects === 'on'
    user.preferences.notifications = notifications === 'on'
    user.preferences.theme = theme || 'light'
    user.preferences.publicProfile = publicProfile === 'on'
    user.preferences.allowInvites = allowInvites === 'on'

    // Handle password change if requested
    if (newPassword && newPassword.trim() !== '') {
      if (newPassword !== confirmPassword) {
        return res.redirect('/settings?error=' + encodeURIComponent('New passwords do not match'))
      }

      if (newPassword.length < 8) {
        return res.redirect('/settings?error=' + encodeURIComponent('Password must be at least 8 characters long'))
      }

      // Verify current password if provided
      if (currentPassword) {
        const bcrypt = require('bcrypt')
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
        if (!isCurrentPasswordValid) {
          return res.redirect('/settings?error=' + encodeURIComponent('Current password is incorrect'))
        }
      }

      // Set new password (pre-save middleware will hash it)
      user.password = newPassword
      logAction(`Password changed for user ${user.username}`, user.username)
    }

    await user.save()

    // Emit settings update via socket
    const io = req.app.get('io')
    if (io) {
      io.to(`user_${userId}`).emit('settings_updated', {
        preferences: user.preferences
      })
    }

    res.redirect('/settings?message=' + encodeURIComponent('Settings updated successfully'))
  } catch (error) {
    console.error('Error updating settings:', error)
    res.redirect('/settings?error=' + encodeURIComponent('An error occurred while updating settings'))
  }
}