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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const Game = mongoose.model('Game', gameSchema)
module.exports = Game

