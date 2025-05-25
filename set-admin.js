const mongoose = require('mongoose')
const User = require('./src/models/user');

(async () => {
  try {
    console.log('Connecting to MongoDB...')
    const connection = await mongoose.connect(
      'mongodb+srv://group04:test12345@cluster0.dkupoft.mongodb.net/MrWHiteDb?retryWrites=true&w=majority&appName=Cluster0',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    )
    console.log('MongoDB connected successfully to:', connection.connection.db.databaseName)

    console.log('Attempting to update user with ID: 682a617e0fc7d572b3197d49')
    const user = await User.findOne({ _id: new mongoose.Types.ObjectId('682a617e0fc7d572b3197d49') })
    if (!user) {
      console.log('User not found in database')
      return
    }
    console.log('User before update:', user)

    const updatedUser = await User.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId('682a617e0fc7d572b3197d49') },
      { $set: { isAdmin: true } },
      { new: true }
    )
    console.log('Updated user:', updatedUser)
  } catch (error) {
    console.error('Error updating user:', error.message)
    console.error('Full error:', error)
  } finally {
    console.log('Closing MongoDB connection...')
    await mongoose.connection.close()
    console.log('MongoDB connection closed')
  }
})()
