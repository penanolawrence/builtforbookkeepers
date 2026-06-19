import { localCache } from '../localCache'

describe('localCache', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('get / set', () => {
    it('returns null for a missing key', () => {
      expect(localCache.get('missing')).toBeNull()
    })

    it('returns stored data within TTL', () => {
      localCache.set('key', { value: 42 }, 60_000)
      expect(localCache.get('key')).toEqual({ value: 42 })
    })

    it('returns null after TTL expires', () => {
      localCache.set('key', 'hello', 1_000)
      jest.advanceTimersByTime(2_000)
      expect(localCache.get('key')).toBeNull()
    })

    it('removes the expired entry from localStorage on read', () => {
      localCache.set('key', 'hello', 1_000)
      jest.advanceTimersByTime(2_000)
      localCache.get('key')
      expect(localStorage.getItem('b4b_cache_key')).toBeNull()
    })
  })

  describe('invalidate', () => {
    it('removes the entry', () => {
      localCache.set('key', 'hello', 60_000)
      localCache.invalidate('key')
      expect(localCache.get('key')).toBeNull()
    })
  })

  describe('invalidatePrefix', () => {
    it('removes all keys starting with prefix and leaves others', () => {
      localCache.set('accounts_abc', [1], 60_000)
      localCache.set('accounts_def', [2], 60_000)
      localCache.set('subtypes', [3], 60_000)
      localCache.invalidatePrefix('accounts_')
      expect(localCache.get('accounts_abc')).toBeNull()
      expect(localCache.get('accounts_def')).toBeNull()
      expect(localCache.get('subtypes')).toEqual([3])
    })
  })

  describe('error handling', () => {
    it('returns null when localStorage.getItem throws', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })
      expect(localCache.get('key')).toBeNull()
    })

    it('silently no-ops when localStorage.setItem throws', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      expect(() => localCache.set('key', 'data', 60_000)).not.toThrow()
    })
  })
})
