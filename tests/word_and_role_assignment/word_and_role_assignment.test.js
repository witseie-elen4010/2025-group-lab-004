const { assignRolesAndWords, wordPairs } = require('../../src/utils/word_role_assignment')

describe('assignRolesAndWords', () => {
  test('assigns roles correctly for 3 players', () => {
    const players = ['Alice', 'Bob', 'Charlie']
    const assignments = assignRolesAndWords(players, wordPairs)

    const roles = Object.values(assignments).map(a => a.role)
    expect(roles.filter(r => r === 'civilian').length).toBe(2)
    expect(
      roles.includes('undercover') || roles.includes('mr white')
    ).toBe(true)
  })

  test('assigns 1 mr white, at least 1 undercover, and rest civilians for 6 players', () => {
    const players = ['A', 'B', 'C', 'D', 'E', 'F']
    const assignments = assignRolesAndWords(players, wordPairs)

    const roles = Object.values(assignments).map(a => a.role)
    expect(roles.filter(r => r === 'mr white').length).toBe(1)
    expect(roles.filter(r => r === 'undercover').length).toBeGreaterThanOrEqual(1)
    expect(roles.filter(r => r === 'civilian').length + roles.filter(r => r === 'undercover').length + 1).toBe(6)
  })

  test('words assigned correctly', () => {
    const players = ['Ann', 'Ben', 'Cara']
    const assignments = assignRolesAndWords(players, [['Sun', 'Moon']])

    for (const { role, word } of Object.values(assignments)) {
      if (role === 'mr white') {
        expect(word).toContain('Mr white')
      } else {
        expect(['Sun', 'Moon']).toContain(word)
      }
    }
  })
})
