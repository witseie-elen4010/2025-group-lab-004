const mongoose = require('mongoose')
const Schema = mongoose.Schema

const invitationSchema = new Schema({
  fromUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  toUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  gameId: { type: Schema.Types.ObjectId, ref: 'Game' },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  }
}, { timestamps: true })

module.exports = mongoose.model('Invitation', invitationSchema)
