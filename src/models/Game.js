'use strict'

const mongoose = require('mongoose')

const gameSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    length: 6
  },
  players: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
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
  votes: [{
    round: Number,
    voterId: mongoose.Schema.Types.ObjectId,
    votedForId: mongoose.Schema.Types.ObjectId
  }],
  eliminatedPlayers: [{
    userId: mongoose.Schema.Types.ObjectId,
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

const Game = mongoose.model('Game', gameSchema)
module.exports = Game