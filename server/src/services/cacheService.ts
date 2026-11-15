/**
 * SafeTrip Distributed Cache Service (Redis & In-Memory Cache-Aside)
 * Kalvium System & Integration Concept: Caching with Redis
 */

interface CacheEntry {
  value: any;
  expiresAt: number;
}

export class CacheService {
  private inMemoryStore: Map<string, CacheEntry> = new Map();
  private hits: number = 0;
  private misses: number = 0;

  /**
   * Retrieves an item from cache (Cache-Aside pattern)
   */
  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.inMemoryStore.get(key);

    if (!entry) {
      this.misses += 1;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.inMemoryStore.delete(key);
      this.misses += 1;
      return null;
    }

    this.hits += 1;
    return entry.value as T;
  }

  /**
   * Stores an item in cache with a Time-To-Live (TTL) in seconds
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    this.inMemoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Deletes a key from cache (invalidation)
   */
  async del(key: string): Promise<void> {
    this.inMemoryStore.delete(key);
  }

  /**
   * Wrapper for Cache-Aside query execution
   */
  async remember<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  /**
   * Returns cache performance statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0%';
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
      keysCount: this.inMemoryStore.size,
    };
  }
}

export const cacheService = new CacheService();
