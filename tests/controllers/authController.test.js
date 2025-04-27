/* eslint-env jest */
'use strict'

const authController = require('../../src/controllers/authController')
const User = require('../../src/models/user')

// Mock the User model
jest.mock('../../src/models/user')

describe('Auth Controller', () => {
  let req
  let res
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Mock request and response objects
    req = {
      body: {}
    }
    
    res = {
      render: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis()
    }
  })
  
  describe('getRegister', () => {
    it('should render register page', () => {
      authController.getRegister(req, res)
      
      expect(res.render).toHaveBeenCalledWith('register', {
        title: 'Register',
        error: null
      })
    })
  })
  
  describe('postRegister', () => {
    it('should return error if fields are missing', async () => {
      req.body = { username: 'testuser' } // Missing email and password
      
      await authController.postRegister(req, res)
      
      expect(res.render).toHaveBeenCalledWith('register', {
        title: 'Register',
        error: 'All fields are required'
      })
    })
    
    it('should return error if passwords do not match', async () => {
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'differentpassword'
      }
      
      await authController.postRegister(req, res)
      
      expect(res.render).toHaveBeenCalledWith('register', {
        title: 'Register',
        error: 'Passwords do not match'
      })
    })
    
    it('should redirect to login page on successful registration', async () => {
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      }
      
      // Mock User.findOne to return null (no existing user)
      User.findOne.mockResolvedValue(null)
      
      // Mock User constructor
      const mockUser = {
        save: jest.fn().mockResolvedValue(true)
      }
      User.mockImplementation(() => mockUser)
      
      await authController.postRegister(req, res)
      
      expect(mockUser.save).toHaveBeenCalled()
      expect(res.redirect).toHaveBeenCalledWith('/login')
    })
  })
})