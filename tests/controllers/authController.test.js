/* eslint-env jest */
'use strict'

// Inline User & bcrypt mock setup
const mockUserInstance = { save: jest.fn() }
const mockFindOne = jest.fn()
const mockUserConstructor = jest.fn(() => mockUserInstance)
const mockBcryptCompare = jest.fn()

jest.mock('../../src/models/user', () =>
  Object.assign(mockUserConstructor, {
    findOne: mockFindOne
  })
)
jest.mock('bcrypt', () => ({
  compare: mockBcryptCompare
}))

const authController = require('../../src/controllers/authController')
const User = require('../../src/models/user')
const bcrypt = require('bcrypt')

describe('Auth Controller', () => {
  let req, res

  beforeEach(() => {
    jest.clearAllMocks()

    req = {
      body: {},
      session: {
        save: jest.fn(cb => cb()),
      }
    }

    res = {
      render: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis()
    }
  })

  describe('getLogin', () => {
    it('should render login page', () => {
      authController.getLogin(req, res)
      expect(res.render).toHaveBeenCalledWith('login', { title: 'Login', error: null })
    })
  })

  describe('postRegister', () => {
    it('should return error if fields are missing', async () => {
      req.body = { username: 'testuser' } // Missing email/password
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
        password: 'pass1',
        confirmPassword: 'pass2'
      }
      await authController.postRegister(req, res)
      expect(res.render).toHaveBeenCalledWith('register', {
        title: 'Register',
        error: 'Passwords do not match'
      })
    })

    it('should return error if user already exists', async () => {
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'pass123',
        confirmPassword: 'pass123'
      }
      mockFindOne.mockResolvedValue({}) // Simulate existing user
      await authController.postRegister(req, res)
      expect(res.render).toHaveBeenCalledWith('register', {
        title: 'Register',
        error: 'Username or email already in use'
      })
    })

    it('should save new user and redirect to login', async () => {
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'pass123',
        confirmPassword: 'pass123'
      }
      mockFindOne.mockResolvedValue(null)
      mockUserInstance.save.mockResolvedValue(true)

      await authController.postRegister(req, res)
      expect(mockUserInstance.save).toHaveBeenCalled()
      expect(res.redirect).toHaveBeenCalledWith('/login')
    })
  })

  describe('postLogin', () => {
    it('should return error if fields are missing', async () => {
      req.body = { username: 'testuser' } // Missing password
      await authController.postLogin(req, res)
      expect(res.render).toHaveBeenCalledWith('login', {
        title: 'Login',
        error: 'All fields are required'
      })
    })

    it('should return error if user is not found', async () => {
      req.body = { username: 'testuser', password: 'secret' }
      mockFindOne.mockResolvedValue(null)
      await authController.postLogin(req, res)
      expect(res.render).toHaveBeenCalledWith('login', {
        title: 'Login',
        error: 'Invalid credentials'
      })
    })

    it('should return error if password is incorrect', async () => {
      req.body = { username: 'testuser', password: 'wrongpass' }
      mockFindOne.mockResolvedValue({ password: 'hashed', username: 'testuser' })
      mockBcryptCompare.mockResolvedValue(false)
      await authController.postLogin(req, res)
      expect(res.render).toHaveBeenCalledWith('login', {
        title: 'Login',
        error: 'Invalid credentials'
      })
    })

    it('should store session and redirect on success', async () => {
      req.body = { username: 'testuser', password: 'correctpass' }
      const userData = { _id: 'id123', username: 'testuser', password: 'hashed' }
      mockFindOne.mockResolvedValue(userData)
      mockBcryptCompare.mockResolvedValue(true)

      await authController.postLogin(req, res)

      expect(req.session.userId).toBe(userData._id)
      expect(req.session.username).toBe(userData.username)
      expect(res.redirect).toHaveBeenCalledWith('/dashboard')
    })
  })
})
