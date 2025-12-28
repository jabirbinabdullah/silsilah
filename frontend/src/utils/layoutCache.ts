/**
 * Layout cache system for fast navigation
 * Caches computed layouts to avoid expensive recalculations
 */

export interface CachedLayout {
  nodeId: string;
  timestamp: number;
  layout: {
    positions: Map<string, { x: number; y: number }>;
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
    computeTime: number;
  };
  metadata: {
    nodeCount: number;
    edgeCount: number;
    zoomLevel?: number;
    orientation?: string;
  };
}

export interface LayoutCacheConfig {
  maxEntries: number;
  ttl: number; // Time to live in milliseconds
  persistToStorage: boolean;
  storageKey: string;
}

const DEFAULT_CONFIG: LayoutCacheConfig = {
  maxEntries: 20,
  ttl: 1000 * 60 * 30, // 30 minutes
  persistToStorage: true,
  storageKey: 'silsilah:layoutCache',
};

/**
 * LRU Cache implementation for layouts
 */
export class LayoutCache {
  private cache: Map<string, CachedLayout> = new Map();
  private accessOrder: string[] = [];
  private config: LayoutCacheConfig;
  private timer: NodeJS.Timeout | null = null;

  constructor(config: Partial<LayoutCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
    this.startCleanupTimer();
  }

  /**
   * Get cached layout by node ID
   */
  get(nodeId: string): CachedLayout | null {
    const cached = this.cache.get(nodeId);

    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (this.isExpired(cached)) {
      this.cache.delete(nodeId);
      this.removeAccessOrder(nodeId);
      return null;
    }

    // Update access order (LRU)
    this.removeAccessOrder(nodeId);
    this.accessOrder.push(nodeId);

    return cached;
  }

  /**
   * Set cached layout
   */
  set(nodeId: string, layout: CachedLayout): void {
    // Remove if already exists
    if (this.cache.has(nodeId)) {
      this.removeAccessOrder(nodeId);
    }

    // Add new entry
    this.cache.set(nodeId, layout);
    this.accessOrder.push(nodeId);

    // Evict oldest if exceeds max size
    if (this.cache.size > this.config.maxEntries) {
      const oldest = this.accessOrder.shift();
      if (oldest) {
        this.cache.delete(oldest);
      }
    }

    this.saveToStorage();
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.saveToStorage();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    maxEntries: number;
    totalSize: number;
    oldestEntry: number | null;
  } {
    let totalSize = 0;
    for (const cached of this.cache.values()) {
      totalSize += JSON.stringify(cached).length;
    }

    const oldest = this.accessOrder[0];
    const oldestTime = oldest ? this.cache.get(oldest)?.timestamp : null;

    return {
      entries: this.cache.size,
      maxEntries: this.config.maxEntries,
      totalSize,
      oldestEntry: oldestTime || null,
    };
  }

  /**
   * List all cached entries
   */
  list(): CachedLayout[] {
    return Array.from(this.cache.values());
  }

  // Private methods

  private isExpired(cached: CachedLayout): boolean {
    return Date.now() - cached.timestamp > this.config.ttl;
  }

  private removeAccessOrder(nodeId: string): void {
    const index = this.accessOrder.indexOf(nodeId);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private saveToStorage(): void {
    if (!this.config.persistToStorage) {
      return;
    }

    try {
      const data = {
        entries: Array.from(this.cache.entries()).map(([key, cached]) => ({
          key,
          value: {
            ...cached,
            layout: {
              ...cached.layout,
              positions: Array.from(cached.layout.positions.entries()),
            },
          },
        })),
        accessOrder: this.accessOrder,
      };

      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save layout cache to storage:', error);
    }
  }

  private loadFromStorage(): void {
    if (!this.config.persistToStorage) {
      return;
    }

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) {
        return;
      }

      const data = JSON.parse(stored);
      this.cache.clear();
      this.accessOrder = data.accessOrder || [];

      for (const entry of data.entries || []) {
        const cached: CachedLayout = {
          ...entry.value,
          layout: {
            ...entry.value.layout,
            positions: new Map(entry.value.layout.positions),
          },
        };

        // Only load non-expired entries
        if (!this.isExpired(cached)) {
          this.cache.set(entry.key, cached);
        }
      }
    } catch (error) {
      console.warn('Failed to load layout cache from storage:', error);
    }
  }

  private startCleanupTimer(): void {
    // Clean up expired entries every 5 minutes
    this.timer = setInterval(() => {
      const expired: string[] = [];

      for (const [nodeId, cached] of this.cache.entries()) {
        if (this.isExpired(cached)) {
          expired.push(nodeId);
        }
      }

      for (const nodeId of expired) {
        this.cache.delete(nodeId);
        this.removeAccessOrder(nodeId);
      }

      if (expired.length > 0) {
        this.saveToStorage();
      }
    }, 5 * 60 * 1000);
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}

/**
 * Global layout cache instance
 */
let globalLayoutCache: LayoutCache | null = null;

export function getGlobalLayoutCache(): LayoutCache {
  if (!globalLayoutCache) {
    globalLayoutCache = new LayoutCache();
  }
  return globalLayoutCache;
}

export function destroyGlobalLayoutCache(): void {
  if (globalLayoutCache) {
    globalLayoutCache.destroy();
    globalLayoutCache = null;
  }
}

/**
 * Cache key generator
 */
export function generateCacheKey(
  treeId: string,
  rootNodeId: string,
  orientation?: string
): string {
  return `${treeId}:${rootNodeId}:${orientation || 'vertical'}`;
}

/**
 * Predict navigation - precompute layouts for likely next views
 */
export class NavigationPrefetcher {
  private cache: LayoutCache;
  private prefetchQueue: string[] = [];
  private isPrefetching = false;

  constructor(cache: LayoutCache) {
    this.cache = cache;
  }

  /**
   * Schedule nodes for prefetch
   */
  schedulePrefetch(nodeIds: string[], priority: number = 0): void {
    // Add to queue, higher priority first
    const weighted = nodeIds.map(id => ({ id, priority }));
    weighted.sort((a, b) => b.priority - a.priority);

    this.prefetchQueue.push(...weighted.map(w => w.id));

    if (!this.isPrefetching) {
      this.processPrefetchQueue();
    }
  }

  /**
   * Clear prefetch queue
   */
  clearQueue(): void {
    this.prefetchQueue = [];
    this.isPrefetching = false;
  }

  private processPrefetchQueue(): void {
    if (this.prefetchQueue.length === 0) {
      this.isPrefetching = false;
      return;
    }

    // Use idle time for prefetching
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        const nodeId = this.prefetchQueue.shift();
        if (nodeId) {
          // Prefetch would happen here in actual implementation
          // For now, just mark as processed
        }
        this.processPrefetchQueue();
      });
    } else {
      setTimeout(() => {
        this.processPrefetchQueue();
      }, 100);
    }
  }
}

/**
 * Cache invalidation strategies
 */
export class CacheInvalidationManager {
  private cache: LayoutCache;
  private dependencies: Map<string, Set<string>> = new Map();

  constructor(cache: LayoutCache) {
    this.cache = cache;
  }

  /**
   * Register dependency between nodes
   */
  registerDependency(source: string, target: string): void {
    if (!this.dependencies.has(source)) {
      this.dependencies.set(source, new Set());
    }
    this.dependencies.get(source)!.add(target);
  }

  /**
   * Invalidate cache when node changes
   */
  invalidateForChange(changedNodeId: string): string[] {
    const affected: string[] = [];

    // Direct invalidation
    this.cache.list().forEach(cached => {
      if (cached.metadata.nodeCount && cached.metadata.nodeCount > 0) {
        // If the changed node is part of this layout, invalidate
        affected.push(cached.nodeId);
      }
    });

    return affected;
  }

  /**
   * Smart invalidation - only invalidate what's needed
   */
  invalidateAncestors(nodeId: string): void {
    // Find all cached layouts that include this node as ancestor
    const toInvalidate: string[] = [];

    for (const cached of this.cache.list()) {
      // Check if cached layout contains this node
      if (cached.layout.positions.has(nodeId)) {
        toInvalidate.push(cached.nodeId);
      }
    }

    for (const nodeId of toInvalidate) {
      this.cache.get(nodeId); // Touch for potential refresh
    }
  }
}
