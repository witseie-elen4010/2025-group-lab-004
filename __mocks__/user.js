const save = jest.fn()

const User = jest.fn().mockImplementation(() => ({
  save
}))

User.__mockSave = save

module.exports = User
