'use strict'

const Game = require('../models/Game')
const User = require('../models/user')

// Admin logging function
const logAction = (action, username) => {
  console.log(`[${new Date().toISOString()}] ${action} by ${username}`)
  // In a real application, you would store this in a database
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

    // Get user details
    const user = await User.findById(userId)
    if (!user) {
      return res.redirect('/login')
    }

    // Create new game
    const game = new Game({
      code,
      players: [{
        userId,
        username: user.username,
        role: 'civilian', // Default role until game starts
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

// display dashboard
exports.getDashboard = (req, res) => {
  res.render('dashboard', { title: 'Dashboard' })
}

// display Game create page
exports.getGame_Creation = (req, res) => {
  res.render('game_creation', { title: 'Create Game', Error: null })
}

// Get game start page
exports.getStartgame = (req, res) => {
  const gameId = req.query.gameId || 'defaultGameId' // will automaticll generate one later
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

    // Check if player is already in the game
    const playerExists = game.players.some(p => p.userId.toString() === userId)

    if (playerExists) {
      return res.redirect(`/game_round?gameId=${game._id}`)
    }

    // Get user details
    const user = await User.findById(userId)
    if (!user) {
      return res.redirect('/login')
    }

    // Add player to game
    game.players.push({
      userId,
      username: user.username,
      role: 'civilian', // Default role until game starts
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

    // Redirect to results if game is over
    if (game.status === 'completed') {
      return res.redirect(`/game_results?gameId=${gameId}`)
    }

    // Check if user is in this game
    const playerIndex = game.players.findIndex(p =>
      p.userId.toString() === userId
    )

    if (playerIndex === -1) {
      return res.redirect('/dashboard')
    }

    // Check if player has already voted in this round
    const playerHasVoted = game.votes.some(vote =>
      vote.round === game.currentRound &&
      vote.voterId.toString() === userId
    )

    // Check if all active players have voted
    const activePlayers = game.players.filter(p => !p.isEliminated)
    const votesThisRound = game.votes.filter(v => v.round === game.currentRound)
    const allPlayersVoted = votesThisRound.length === activePlayers.length

    // Determine if user is the host (first player)
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

    // Check if user is the host
    if (game.players[0].userId.toString() !== userId) {
      return res.redirect(`/game_round?gameId=${gameId}`)
    }

    // Only start the game if it's in waiting state
    if (game.status !== 'waiting') {
      return res.redirect(`/game_round?gameId=${gameId}`)
    }

    // Assign roles
    const playerCount = game.players.length

    // Assign Mr. White and Undercover if enough players
    const roles = Array(playerCount).fill('civilian')

    if (playerCount >= 4) {
      // Assign one undercover
      const undercoverIndex = Math.floor(Math.random() * playerCount)
      roles[undercoverIndex] = 'undercover'

      if (playerCount >= 5) {
        // Assign Mr. White
        let mrWhiteIndex
        do {
          mrWhiteIndex = Math.floor(Math.random() * playerCount)
        } while (mrWhiteIndex === undercoverIndex)

        roles[mrWhiteIndex] = 'mrwhite'
      }
    }

    // Sample word pairs
    const wordPairs = [
      { civilian: 'Beach', undercover: 'Shore' },
      { civilian: 'Pizza', undercover: 'Pasta' },
      { civilian: 'Car', undercover: 'Bus' },
      { civilian: 'Cat', undercover: 'Dog' },
      { civilian: 'Coffee', undercover: 'Tea' }
    ]

    // Select a random word pair
    const wordPair = wordPairs[Math.floor(Math.random() * wordPairs.length)]

    // Assign roles and words to players
    for (let i = 0; i < game.players.length; i++) {
      const player = game.players[i]
      player.role = roles[i]

      if (player.role === 'civilian') {
        player.word = wordPair.civilian
      } else if (player.role === 'undercover') {
        player.word = wordPair.undercover
      } else {
        player.word = 'unknown' // Mr. White gets no word
      }
    }

    // Update game status
    game.status = 'in-progress'
    game.currentRound = 1
    game.civilianWord = wordPair.civilian
    game.undercoverWord = wordPair.undercover

    await game.save()

    logAction(`Game ${game.code} started`, req.session.username)

    res.redirect(`/word_description?gameId=${gameId}&playerName=${req.session.username}`)
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

// Post description
// Handle word description submission
exports.postWordDescription = async (req, res) => {
  try {
    const { gameId, description } = req.body
    const userId = req.session.userId

    if (!userId) return res.redirect('/login')

    const game = await Game.findById(gameId)
    if (!game) return res.redirect('/dashboard')

    // Find player
    const player = game.players.find(p => p.userId.toString() === userId)
    if (!player || player.isEliminated) return res.redirect('/dashboard')

    // Save the description
    player.description = description

    // Save the updated game
    await game.save()

    // Check if all active (non-eliminated) players submitted a description
    const allDescribed = game.players
      .filter(p => !p.isEliminated)
      .every(p => p.description)

    if (allDescribed) {
      return res.redirect(`/game_round?gameId=${gameId}`)
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

    // Check if voter is in this game and not eliminated
    const voter = game.players.find(p =>
      p.userId.toString() === voterId && !p.isEliminated
    )

    if (!voter) {
      return res.redirect(`/game_round?gameId=${gameId}`)
    }

    // Check if voted player is in this game and not eliminated
    const votedPlayer = game.players.find(p =>
      p.userId.toString() === votedForId && !p.isEliminated
    )

    if (!votedPlayer) {
      return res.redirect(`/game_round?gameId=${gameId}`)
    }

    // Check if player already voted in this round
    const existingVote = game.votes.find(v =>
      v.round === game.currentRound && v.voterId.toString() === voterId
    )

    if (existingVote) {
      return res.redirect(`/game_round?gameId=${gameId}`)
    }

    // Add the vote
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

    // Check if user is the host
    if (game.players[0].userId.toString() !== userId) {
      return res.redirect(`/game_round?gameId=${gameId}`)
    }

    // Count votes for current round
    const votesThisRound = game.votes.filter(v => v.round === game.currentRound)

    // Group votes by votedForId
    const voteCount = {}
    votesThisRound.forEach(vote => {
      const id = vote.votedForId.toString()
      voteCount[id] = (voteCount[id] || 0) + 1
    })

    // Find player with most votes
    let maxVotes = 0
    let eliminatedPlayerId = null

    for (const [playerId, votes] of Object.entries(voteCount)) {
      if (votes > maxVotes) {
        maxVotes = votes
        eliminatedPlayerId = playerId
      }
    }

    if (eliminatedPlayerId) {
      // Find the player to eliminate
      const playerIndex = game.players.findIndex(
        p => p.userId.toString() === eliminatedPlayerId
      )

      if (playerIndex !== -1) {
        const eliminatedPlayer = game.players[playerIndex]

        // Mark player as eliminated
        eliminatedPlayer.isEliminated = true
        eliminatedPlayer.eliminatedInRound = game.currentRound

        // Add to eliminated players list
        game.eliminatedPlayers = game.eliminatedPlayers || []
        game.eliminatedPlayers.push({
          userId: eliminatedPlayer.userId,
          username: eliminatedPlayer.username,
          role: eliminatedPlayer.role,
          round: game.currentRound
        })

        // Check if game is over
        const remainingCivilians = game.players.filter(
          p => !p.isEliminated && p.role === 'civilian'
        ).length

        const remainingImposters = game.players.filter(
          p => !p.isEliminated && (p.role === 'undercover' || p.role === 'mrwhite')
        ).length

        if (remainingCivilians <= 1 || remainingImposters === 0) {
          // Game is over
          game.status = 'completed'
        } else {
          // Move to next round
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

    // Check if user was in this game
    const playerExists = game.players.some(p => p.userId.toString() === userId)
    if (!playerExists) {
      return res.redirect('/dashboard')
    }

    // Determine winners
    const remainingCivilians = game.players.filter(
      p => !p.isEliminated && p.role === 'civilian'
    )

    const remainingImposters = game.players.filter(
      p => !p.isEliminated && (p.role === 'undercover' || p.role === 'mrwhite')
    )

    let winningRole, winners

    if (remainingImposters.length > 0 && remainingCivilians.length <= 1) {
      // Imposters win
      winningRole = 'Imposters (Undercover & Mr. White)'
      winners = remainingImposters
    } else {
      // Civilians win
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
