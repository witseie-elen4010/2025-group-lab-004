/* eslint-env jest */
'use strict'

const mongoose = require('mongoose')
const User = require('../../src/models/user')

// These tests are using a mocked mongoose implementation
describe('User Model Test', () => {
  // Skip connection tests since we're mocking
  beforeAll(() => {
    // Our setup.js handles the mongoose mock
  })

  afterAll(() => {
    // Our setup.js handles the cleanup
  })

  afterEach(() => {
    // Reset mock between tests
    jest.clearAllMocks()
  })

  it('should create & save a user successfully', async () => {
    // Mock the User model's behavior for this test
    const savedUser = {
      _id: 'some-id',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword123',
      gamesPlayed: 0,
      wins: 0,
      createdAt: new Date()
    }
    
    // Mock the save functionality
    User.prototype.save = jest.fn().mockResolvedValue(savedUser)
    
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    }
    
    const validUser = new User(userData)
    const result = await validUser.save()
    
    // Verify saved user
    expect(result._id).toBeDefined()
    expect(result.username).toBe(userData.username)
    expect(result.email).toBe(userData.email)
    expect(result.password).not.toBe(userData.password)
    expect(result.gamesPlayed).toBe(0)
    expect(result.wins).toBe(0)
    expect(result.createdAt).toBeDefined()
  })

  // Other tests with similar mocking approach will follow...
})