
function mostFrequentString (arr) {
    const freq = {}
    let maxCount = 0
    let mostCommon = null
  
    for (const str of arr) {
      freq[str] = (freq[str] || 0) + 1;
      if (freq[str] > maxCount) {
        maxCount = freq[str];
      }
    }
  
    mostCommon = Object.keys(freq).filter(str => freq[str] === maxCount);
  
    return mostCommon;
  }

describe('mostFrequentString', () => {
    test('returns single most frequent string as array', () => {
      const result = mostFrequentString(['apple', 'banana', 'apple', 'orange']);
      expect(result).toEqual(['apple']);
    });
  
    test('returns multiple strings if there is a tie', () => {
      const result = mostFrequentString(['apple', 'banana', 'apple', 'banana']);
      expect(result.sort()).toEqual(['apple', 'banana'].sort());
    });
  
    test('returns all strings if all have same frequency', () => {
      const result = mostFrequentString(['apple', 'banana', 'orange']);
      expect(result.sort()).toEqual(['apple', 'banana', 'orange'].sort());
    });
  
    test('returns empty array when input is empty', () => {
      const result = mostFrequentString([]);
      expect(result).toEqual([]);
    });
  
    test('works with one string in input', () => {
      const result = mostFrequentString(['apple']);
      expect(result).toEqual(['apple']);
    });
  });