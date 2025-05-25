// tests/controllers/gameController.test.js
const gameController = require('../../src/controllers/gameController')

// Mocks
const mockSave = jest.fn()
const mockGameInstance = {
  _id: 'mockGameId',
  code: 'TEST123',
  players: [],
  status: 'waiting',
  save: mockSave
}

// Mock User and Game models
jest.mock('../../src/models/User', () => ({
  findById: jest.fn()
}))
jest.mock('../../src/models/Game', () => {
  const mockGame = jest.fn(() => mockGameInstance)
  mockGame.findOne = jest.fn()
  return mockGame
})

const Game = require('../../src/models/Game')
const User = require('../../src/models/user')

describe('gameController.postGame_Creation', () => {
  let req, res

  beforeEach(() => {
    req = {
      body: { code: 'TEST123' },
      session: {}
    }

    res = {
      render: jest.fn(),
      redirect: jest.fn()
    }

    mockSave.mockClear()
    Game.findOne.mockReset()
    User.findById.mockReset()
  })

  it('should redirect to login if user is not logged in', async () => {
    await gameController.postGame_Creation(req, res)
    expect(res.redirect).toHaveBeenCalledWith('/login')
  })

  it('should render error if game code already exists', async () => {
    req.session.userId = 'user123'
    Game.findOne.mockResolvedValue({ code: 'TEST123' })

    await gameController.postGame_Creation(req, res)

    expect(res.render).toHaveBeenCalledWith('game_creation', {
      title: 'Create Game',
      Error: 'This game code already exists'
    })
  })

  it('should redirect if user not found', async () => {
    req.session.userId = 'user123'
    Game.findOne.mockResolvedValue(null)
    User.findById.mockResolvedValue(null)

    await gameController.postGame_Creation(req, res)

    expect(res.redirect).toHaveBeenCalledWith('/login')
  })

  it('should save game and redirect to game_round', async () => {
    req.session.userId = 'user123'
    Game.findOne.mockResolvedValue(null)
    User.findById.mockResolvedValue({ username: 'testuser' })

    await gameController.postGame_Creation(req, res)

    expect(mockSave).toHaveBeenCalled()
    expect(res.redirect).toHaveBeenCalledWith('/game_round?gameId=mockGameId')
  })
})

describe('gameController.createJoinGame', () => {
  let req, res

  beforeEach(() => {
    req = {
      body: { code: 'TEST123' },
      session: {}
    }

    res = {
      render: jest.fn(),
      redirect: jest.fn()
    }

    mockSave.mockClear()
    Game.findOne.mockReset()
    User.findById.mockReset()
    mockGameInstance.players = []
    mockGameInstance.status = 'waiting'
  })

  it('should redirect to login if user not logged in', async () => {
    await gameController.createJoinGame(req, res)
    expect(res.redirect).toHaveBeenCalledWith('/login')
  })

  it('should render error if game not found', async () => {
    req.session.userId = 'user123'
    Game.findOne.mockResolvedValue(null)

    await gameController.createJoinGame(req, res)
    expect(res.render).toHaveBeenCalledWith('join-game', {
      userId: 'user123',
      message: 'Game not found'
    })
  })

  it('should render error if game already started', async () => {
    req.session.userId = 'user123'
    mockGameInstance.status = 'started'
    Game.findOne.mockResolvedValue(mockGameInstance)

    await gameController.createJoinGame(req, res)
    expect(res.render).toHaveBeenCalledWith('join-game', {
      userId: 'user123',
      message: 'Game has already started'
    })
  })

  it('should redirect if user already in game', async () => {
    req.session.userId = 'user123'
    mockGameInstance.status = 'waiting'
    mockGameInstance.players = [{ userId: 'user123' }]
    Game.findOne.mockResolvedValue(mockGameInstance)

    await gameController.createJoinGame(req, res)
    expect(res.redirect).toHaveBeenCalledWith('/game_round?gameId=mockGameId')
  })

  it('should add user and redirect to game_round', async () => {
    req.session.userId = 'user123'
    mockGameInstance.status = 'waiting'
    mockGameInstance.players = []
    Game.findOne.mockResolvedValue(mockGameInstance)
    User.findById.mockResolvedValue({ username: 'testuser' })

    await gameController.createJoinGame(req, res)

    expect(mockGameInstance.players).toContainEqual({
      userId: 'user123',
      username: 'testuser',
      role: 'civilian',
      isEliminated: false
    })
    expect(mockSave).toHaveBeenCalled()
    expect(res.redirect).toHaveBeenCalledWith('/game_round?gameId=mockGameId')
  })
})
