interface ClientCacheEntry<T> {
  data: T;
  timestamp: number;
}

class ClientCache {
  private cache = new Map<string, ClientCacheEntry<any>>();

  public get<T>(key: string, maxAgeMs: number = 30000): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    return {
      data: entry.data as T,
      isStale: age > maxAgeMs,
    };
  }

  public set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public deletePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const clientCache = new ClientCache();
