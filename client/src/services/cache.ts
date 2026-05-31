interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class CacheService {
  private store = new Map<string, CacheEntry>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set(key: string, data: any, ttlMs = 30000) {
    this.store.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  }

  invalidate(keyPrefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(keyPrefix)) this.store.delete(key);
    }
  }

  clear() {
    this.store.clear();
  }
}

export const cache = new CacheService();
