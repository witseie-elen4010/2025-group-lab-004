const mongoose = require('mongoose')

const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  action: { type: String, required: true },
  username: { type: String, required: true }
}, { timestamps: true })

module.exports = mongoose.model('Log', logSchema)
