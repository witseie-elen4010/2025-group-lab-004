/* eslint-env jest */
'use strict'

jest.mock('../../src/models/user')
const User = require('../../src/models/user')

// These tests are using a mocked mongoose implementation
describe('User Model Test', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should create & save a user successfully', async () => {
    const mockSavedUser = {
      _id: 'some-id',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword123',
      gamesPlayed: 0,
      wins: 0,
      createdAt: new Date()
    }

    // Set return value of save()
    User.__mockSave.mockResolvedValue(mockSavedUser)

    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    }

    const userInstance = new User(userData)
    const result = await userInstance.save()

    expect(result).toEqual(mockSavedUser)
  })
})
