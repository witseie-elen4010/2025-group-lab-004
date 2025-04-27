/* eslint-env jest */
'use strict'

// This is a simple mock for mongoose to use during testing
jest.mock('mongoose', () => {
  const mMongooose = {
    connect: jest.fn().mockResolvedValue(true),
    connection: {
      dropDatabase: jest.fn().mockResolvedValue(true),
      close: jest.fn().mockResolvedValue(true)
    },
    Schema: jest.fn().mockReturnValue({
      pre: jest.fn().mockReturnThis(),
      methods: {}
    }),
    model: jest.fn().mockReturnValue({
      findOne: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue(true)
    })
  }
  return mMongooose
})