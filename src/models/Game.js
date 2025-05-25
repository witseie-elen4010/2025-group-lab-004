'use strict'

const mongoose = require('mongoose')
const { Schema, Types } = mongoose

const gameSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    length: 6
  },
  players: [{
    userId: {
      type: Types.ObjectId,
      ref: 'User'
    },
    username: String,
    role: {
      type: String,
      enum: ['civilian', 'undercover', 'mrwhite'],
      default: 'civilian'
    },
    word: String,
    isEliminated: {
      type: Boolean,
      default: false
    },
    eliminatedInRound: Number
  }],
  currentRound: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['waiting', 'in-progress', 'completed'],
    default: 'waiting'
  },
  phase: {
    type: String,
    enum: ['description', 'voting', 'results'],
    default: 'description'
  },
  votes: [{
    round: Number,
    voterId: Types.ObjectId,
    votedForId: Types.ObjectId
  }],
  eliminatedPlayers: [{
    userId: Types.ObjectId,
    username: String,
    role: String,
    round: Number
  }],
  civilianWord: String,
  undercoverWord: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
})
// models/Game.js

gameSchema.statics.setGamePhase = async function (gameId, phase) {
  const game = await this.findById(gameId)
  if (!game) throw new Error('Game not found')

  if (phase === 'voting') {
    game.players.forEach(player => {
      // Clear descriptions for the next round if needed
      player.description = player.description || ''
    })
    game.phase = 'voting'
  } else {
    throw new Error('Unsupported game phase')
  }

  await game.save()
}

const Game = mongoose.model('Game', gameSchema)
module.exports = Game
