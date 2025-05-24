const mongoose = require('mongoose')

const inviteSchema = new mongoose.Schema({
  fromUser: String,
  toUser: String,
  gameId: String,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'revoked'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Invite', inviteSchema)
