'use strict'

const { createJoinGame } = require('../../src/controllers/gameController')
const { mockGameModel, mockGameInstance } = require('../mocks/GameModelMock')
describe('joinGame controller with DI', () => {
  let req, res

  beforeEach(() => {
    req = {
      body: {
        code: 'ABC123',
        userId: 'user123'
      }
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    // Reset players and mock behavior for each test
    mockGameInstance.players = ['user456']
    mockGameModel.findOne.mockResolvedValue(mockGameInstance)
  })

  it('should return 404 if game not found', async () => {
    mockGameModel.findOne.mockResolvedValue(null)

    const joinGame = createJoinGame(mockGameModel)
    await joinGame(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Game not found' })
  })

  it('should return 400 if user already in the game', async () => {
    mockGameInstance.players = ['user123']
    mockGameModel.findOne.mockResolvedValue(mockGameInstance)

    const joinGame = createJoinGame(mockGameModel)
    await joinGame(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'User already in game' })
  })

  it('should add user to game and return success', async () => {
    mockGameInstance.players = ['user456'] // some other user
    mockGameModel.findOne.mockResolvedValue(mockGameInstance)

    const joinGame = createJoinGame(mockGameModel)
    await joinGame(req, res)

    expect(mockGameInstance.players).toContain('user123')
    expect(mockGameInstance.save).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Joined successfully',
      game: mockGameInstance
    })
  })
})
