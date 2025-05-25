// file for testing role and word assignment functionality

const wordPairs = [
  ['Laptop', 'Computer'],
  ['Beach', 'Desert'],
  ['Pizza', 'Burger'],
  ['Doctor', 'Nurse'],
  ['Football', 'Rugby']
]

function getRandomWordPair (pairs) {
  const randomIndex = Math.floor(Math.random() * pairs.length)
  return pairs[randomIndex]
}

function assignRolesAndWords (players, wordPairsInput = wordPairs) {
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5)
  const assignments = {}
  const [civilianWord, undercoverWord] = getRandomWordPair(wordPairsInput)
  const numPlayers = players.length

  if (numPlayers === 3) {
    const specialRole = Math.random() < 0.5 ? 'mr white' : 'undercover'
    const specialPlayer = shuffledPlayers.pop()

    assignments[specialPlayer] = {
      role: specialRole,
      word: specialRole === 'mr white' ? 'you are Mr white (no word assigned for you)' : undercoverWord
    }

    for (const player of shuffledPlayers) {
      assignments[player] = {
        role: 'civilian',
        word: civilianWord
      }
    }
    return assignments
  }

  const mrWhitePlayer = shuffledPlayers.pop()
  assignments[mrWhitePlayer] = {
    role: 'mr white',
    word: 'you are Mr white (no word assigned for you)'
  }

  const remaining = shuffledPlayers.length
  let numUndercovers = Math.floor(remaining * 0.25)
  if (remaining >= 4 && numUndercovers < 1) numUndercovers = 1

  for (let i = 0; i < numUndercovers; i++) {
    const undercoverPlayer = shuffledPlayers.pop()
    assignments[undercoverPlayer] = { role: 'undercover', word: undercoverWord }
  }

  for (const player of shuffledPlayers) {
    assignments[player] = {
      role: 'civilian',
      word: civilianWord
    }
  }

  return assignments
}

module.exports = { assignRolesAndWords, wordPairs }
