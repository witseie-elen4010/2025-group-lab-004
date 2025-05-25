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

// Get game round
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

    const playerIndex = game.players.findIndex(p =>
      p.userId.toString() === userId
    )

    if (playerIndex === -1) {
      return res.redirect('/dashboard')
    }

    const playerHasVoted = game.votes.some(vote =>
      vote.round === game.currentRound &&
      vote.voterId.toString() === userId
    )

    const activePlayers = game.players.filter(p => !p.isEliminated)
    const votesThisRound = game.votes.filter(v => v.round === game.currentRound)
    const allPlayersVoted = votesThisRound.length === activePlayers.length

    const isHost = game.players[0].userId.toString() === userId

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

// Start game with role assignment
exports.startGameRound = async (req, res) => {
  try {
    const { gameId } = req.body
    const userId = req.session.userId

    if (!userId) {
      return res.redirect('/login')
    }

    const game = await Game.findById(gameId)
    if (!game) {
      return res.redirect('/dashboard')
    }

    if (game.players[0].userId.toString() !== userId) {
      return res.redirect(`/game_round?gameId=${gameId}`)
    }

    if (game.status !== 'waiting') {
      return res.redirect(`/game_round?gameId=${gameId}`)
    }

    const playerCount = game.players.length
    const roles = Array(playerCount).fill('civilian')

    if (playerCount >= 4) {
      const undercoverIndex = Math.floor(Math.random() * playerCount)
      roles[undercoverIndex] = 'undercover'

      if (playerCount >= 5) {
        let mrWhiteIndex
        do {
          mrWhiteIndex = Math.floor(Math.random() * playerCount)
        } while (mrWhiteIndex === undercoverIndex)

        roles[mrWhiteIndex] = 'mrwhite'
      }
    }

    const wordPairs = [
      { civilian: 'Beach', undercover: 'Shore' },
      { civilian: 'Pizza', undercover: 'Pasta' },
      { civilian: 'Car', undercover: 'Bus' },
      { civilian: 'Cat', undercover: 'Dog' },
      { civilian: 'Coffee', undercover: 'Tea' }
    ]

    const wordPair = wordPairs[Math.floor(Math.random() * wordPairs.length)]

    for (let i = 0; i < game.players.length; i++) {
      const player = game.players[i]
      player.role = roles[i]

      if (player.role === 'civilian') {
        player.word = wordPair.civilian
      } else if (player.role === 'undercover') {
        player.word = wordPair.undercover
      } else {
        player.word = 'unknown'
      }
    }

    game.status = 'in-progress'
    game.currentRound = 1
    game.civilianWord = wordPair.civilian
    game.undercoverWord = wordPair.undercover

    await game.save()
    logAction(`Game ${game.code} started`, req.session.username)

    res.redirect(`/game_round?gameId=${gameId}`)
  } catch (error) {
    console.error('Error starting game:', error)
    res.redirect('/dashboard')
  }
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

// Handle player vote
exports.postVote = async (req, res) => {
  try {
    const { gameId, votedForId } = req.body
    const voterId = req.session.userId

    if (!voterId) {
      return res.redirect('/login')
    }

    const game = await Game.findById(gameId)
    if (!game || game.status !== 'in-progress') {
      return res.redirect('/dashboard')
    }

    const voter = game.players.find(p =>
      p.userId.toString() === voterId && !p.isEliminated
    )

    if (!voter) {
      return res.redirect(`/game_round?gameId=${gameId}`)
    }

    const votedPlayer = game.players.find(p =>
      p.userId.toString() === votedForId && !p.isEliminated
    )

    if (!votedPlayer) {
      return res.redirect(`/game_round?gameId=${gameId}`)
    }

    const existingVote = game.votes.find(v =>
      v.round === game.currentRound && v.voterId.toString() === voterId
    )

    if (existingVote) {
      return res.redirect(`/game_round?gameId=${gameId}`)
    }

    game.votes.push({
      round: game.currentRound,
      voterId,
      votedForId
    })

    await game.save()
    logAction(`Player voted in game ${game.code}`, req.session.username)

    res.redirect(`/game_round?gameId=${gameId}`)
  } catch (error) {
    console.error('Error processing vote:', error)
    res.redirect('/dashboard')
  }
}

// End voting and process results
exports.endVoting = async (req, res) => {
  try {
    const { gameId } = req.body
    const userId = req.session.userId

    if (!userId) {
      return res.redirect('/login')
    }

    const game = await Game.findById(gameId)
    if (!game || game.status !== 'in-progress') {
      return res.redirect('/dashboard')
    }

    // Allow any active (non-eliminated) player to end voting, not just host
    const activePlayer = game.players.find(p => 
      p.userId.toString() === userId && !p.isEliminated
    )
    
    if (!activePlayer) {
      return res.redirect(`/game_round?gameId=${gameId}`)
    }

    const votesThisRound = game.votes.filter(v => v.round === game.currentRound)
    const voteCount = {}
    votesThisRound.forEach(vote => {
      const id = vote.votedForId.toString()
      voteCount[id] = (voteCount[id] || 0) + 1
    })

    let maxVotes = 0
    let eliminatedPlayerId = null

    for (const [playerId, votes] of Object.entries(voteCount)) {
      if (votes > maxVotes) {
        maxVotes = votes
        eliminatedPlayerId = playerId
      }
    }

    if (eliminatedPlayerId) {
      const playerIndex = game.players.findIndex(
        p => p.userId.toString() === eliminatedPlayerId
      )

      if (playerIndex !== -1) {
        const eliminatedPlayer = game.players[playerIndex]
        eliminatedPlayer.isEliminated = true
        eliminatedPlayer.eliminatedInRound = game.currentRound

        game.eliminatedPlayers = game.eliminatedPlayers || []
        game.eliminatedPlayers.push({
          userId: eliminatedPlayer.userId,
          username: eliminatedPlayer.username,
          role: eliminatedPlayer.role,
          round: game.currentRound
        })

        // Check win conditions with original logic
        const remainingCivilians = game.players.filter(
          p => !p.isEliminated && p.role === 'civilian'
        ).length

        const remainingImposters = game.players.filter(
          p => !p.isEliminated && (p.role === 'undercover' || p.role === 'mrwhite')
        ).length

        if (remainingCivilians <= 1 || remainingImposters === 0) {
          game.status = 'completed'
        } else {
          game.currentRound += 1
        }

        logAction(`Player ${eliminatedPlayer.username} eliminated in game ${game.code}`, req.session.username)
      }
    }

    await game.save()
    res.redirect(`/game_round?gameId=${gameId}`)
  } catch (error) {
    console.error('Error ending voting:', error)
    res.redirect('/dashboard')
  }
}

// Show game results
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

    // Update player stats using the new method
    for (const player of game.players) {
      try {
        const user = await User.findById(player.userId)
        if (user) {
          const isWinner = winners.some(w => w.userId.toString() === player.userId.toString())
          const wasSurvivor = !player.isEliminated
          user.updateGameStats(player.role, isWinner, wasSurvivor)
          await user.save()
        }
      } catch (error) {
        console.error(`Error updating stats for player ${player.username}:`, error)
      }
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

    const leaderboard = await User.getLeaderboardData()

    res.render('leaderboard', {
      title: 'Leaderboard',
      leaderboard
    })
  } catch (error) {
    console.error('Error loading leaderboard:', error)
    res.redirect('/dashboard')
  }
}