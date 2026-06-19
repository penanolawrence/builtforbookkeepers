const PREFIX = 'b4b_cache_'

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

export const localCache = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (!raw) return null
      const entry: CacheEntry<T> = JSON.parse(raw)
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(PREFIX + key)
        return null
      }
      return entry.data
    } catch {
      return null
    }
  },

  set<T>(key: string, data: T, ttlMs: number): void {
    try {
      const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlMs }
      localStorage.setItem(PREFIX + key, JSON.stringify(entry))
    } catch {
      // localStorage full or unavailable — silent no-op
    }
  },

  invalidate(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key)
    } catch {
      // silent no-op
    }
  },

  invalidatePrefix(prefix: string): void {
    try {
      const fullPrefix = PREFIX + prefix
      Object.keys(localStorage)
        .filter((k) => k.startsWith(fullPrefix))
        .forEach((k) => localStorage.removeItem(k))
    } catch {
      // silent no-op
    }
  },
}
