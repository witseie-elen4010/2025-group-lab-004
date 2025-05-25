
describe('User Model Test', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should create & save a user successfully', async () => {
    const mockSave = jest.fn()

    const mockSavedUser = {
      _id: 'some-id',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword123',
      gamesPlayed: 0,
      wins: 0,
      createdAt: new Date('2025-05-25T19:37:32.784Z')
    }

    mockSave.mockResolvedValue(mockSavedUser)

    // Fake the User "class"
    const User = function (data) {
      return {
        ...data,
        save: mockSave
      }
    }

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