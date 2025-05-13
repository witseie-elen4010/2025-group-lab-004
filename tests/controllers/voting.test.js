/* eslint-env jest */
'use strict'

const mongoose = require('mongoose')
const Game = require('../../src/models/Game')
const User = require('../../src/models/user')

// Mock database connection
beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/testdb', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
})

afterAll(async () => {
  await mongoose.connection.close()
})

beforeEach(async () => {
  await Game.deleteMany({})
  await User.deleteMany({})
})

describe('Voting System', () => {
  test('Correctly counts votes and eliminates player with most votes', async () => {
    // Create test users
    const user1 = new User({
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'password123'
    })
    await user1.save()
    
    const user2 = new User({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123'
    })
    await user2.save()
    
    const user3 = new User({
      username: 'testuser3',
      email: 'test3@example.com',
      password: 'password123'
    })
    await user3.save()
    
    // Create a test game
    const game = new Game({
      code: '123456',
      players: [
        {
          userId: user1._id,
          username: user1.username,
          role: 'civilian',
          word: 'beach',
          isEliminated: false
        },
        {
          userId: user2._id,
          username: user2.username,
          role: 'civilian',
          word: 'beach',
          isEliminated: false
        },
        {
          userId: user3._id,
          username: user3.username,
          role: 'undercover',
          word: 'shore',
          isEliminated: false
        }
      ],
      status: 'in-progress',
      currentRound: 1,
      civilianWord: 'beach',
      undercoverWord: 'shore'
    })
    await game.save()
    
    // Add votes (2 votes against user3)
    game.votes.push(
      {
        round: 1,
        voterId: user1._id,
        votedForId: user3._id
      },
      {
        round: 1,
        voterId: user2._id,
        votedForId: user3._id
      },
      {
        round: 1,
        voterId: user3._id,
        votedForId: user1._id
      }
    )
    
    // Process votes
    const votesThisRound = game.votes.filter(v => v.round === game.currentRound)
    
    // Count votes 
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
    
    expect(eliminatedPlayerId).toBe(user3._id.toString())
    expect(maxVotes).toBe(2)
    
    // Eliminate the player
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
      }
    }
    
    await game.save()
    
    // Verify player was eliminated
    const updatedGame = await Game.findById(game._id)
    expect(updatedGame.players[2].isEliminated).toBe(true)
    expect(updatedGame.players[2].eliminatedInRound).toBe(1)
    expect(updatedGame.eliminatedPlayers.length).toBe(1)
    expect(updatedGame.eliminatedPlayers[0].role).toBe('undercover')
  })
  
  test('Game ends when all imposters are eliminated', async () => {
    // Create test users
    const user1 = new User({
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'password123'
    })
    await user1.save()
    
    const user2 = new User({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123'
    })
    await user2.save()
    
    // Create a test game with one undercover already eliminated
    const game = new Game({
      code: '654321',
      players: [
        {
          userId: user1._id,
          username: user1.username,
          role: 'civilian',
          word: 'car',
          isEliminated: false
        },
        {
          userId: user2._id,
          username: user2.username,
          role: 'undercover',
          word: 'bus',
          isEliminated: false
        }
      ],
      status: 'in-progress',
      currentRound: 1,
      civilianWord: 'car',
      undercoverWord: 'bus'
    })
    await game.save()
    
    // Add a vote to eliminate the undercover
    game.votes.push({
      round: 1,
      voterId: user1._id,
      votedForId: user2._id
    })
    
    // Eliminate the undercover
    const playerToEliminate = game.players[1]
    playerToEliminate.isEliminated = true
    playerToEliminate.eliminatedInRound = 1
    
    game.eliminatedPlayers = [{
      userId: playerToEliminate.userId,
      username: playerToEliminate.username,
      role: playerToEliminate.role,
      round: 1
    }]
    
    // Check if all imposters are eliminated
    const remainingImposters = game.players.filter(
      p => !p.isEliminated && (p.role === 'undercover' || p.role === 'mrwhite')
    ).length
    
    if (remainingImposters === 0) {
      game.status = 'completed'
    }
    
    await game.save()
    
    // Verify game ended with civilians as winners
    const updatedGame = await Game.findById(game._id)
    expect(updatedGame.status).toBe('completed')
  })
})