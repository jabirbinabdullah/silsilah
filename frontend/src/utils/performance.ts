/**
 * Performance utilities for optimization
 */

/**
 * Debounce function - delays execution until after X ms of inactivity
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {}
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  let lastArgs: any[] | null = null;
  let lastThis: any;
  let result: any;
  let leading = options.leading || false;
  let trailing = options.trailing ?? true;
  let maxWait = options.maxWait || 0;

  function invokeFunc(time: number) {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = lastThis = null;
    lastInvokeTime = time;
    result = func.apply(thisArg, args || []);
    return result;
  }

  function leadingEdge(time: number) {
    lastInvokeTime = time;
    timeout = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }

    const timeWaiting = lastCallTime !== null ? time - lastCallTime : 0;
    const timeToWait = wait - timeWaiting;
    timeout = setTimeout(timerExpired, timeToWait);
  }

  function trailingEdge(time: number) {
    timeout = null;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = null;
    return result;
  }

  function shouldInvoke(time: number) {
    const timeWaiting = lastCallTime !== null ? time - lastCallTime : 0;
    return (
      !timeout ||
      timeWaiting >= wait ||
      (maxWait > 0 && time - lastInvokeTime >= maxWait)
    );
  }

  function debounced(this: any, ...args: any[]) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (!timeout) {
        return leadingEdge(lastCallTime);
      }
      if (maxWait) {
        timeout = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (!timeout) {
      timeout = setTimeout(timerExpired, wait);
    }
    return result;
  }

  debounced.cancel = function () {
    if (timeout) {
      clearTimeout(timeout);
    }
    lastInvokeTime = 0;
    lastArgs = null;
    lastCallTime = null;
    lastThis = null;
    timeout = null;
  };

  return debounced as any;
}

/**
 * Throttle function - limits execution to once per X ms
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastResult: any;
  let lastArgs: any[] | null = null;
  let lastThis: any;
  let timeout: NodeJS.Timeout | null = null;
  const leading = options.leading ?? true;
  const trailing = options.trailing ?? true;

  function throttled(this: any, ...args: any[]) {
    lastArgs = args;
    lastThis = this;

    if (!inThrottle) {
      if (leading) {
        lastResult = func.apply(this, args);
      }
      inThrottle = true;

      timeout = setTimeout(() => {
        inThrottle = false;
        if (trailing && lastArgs) {
          lastResult = func.apply(lastThis, lastArgs);
        }
        lastArgs = lastThis = null;
      }, limit);
    }

    return lastResult;
  }

  throttled.cancel = function () {
    if (timeout) {
      clearTimeout(timeout);
    }
    inThrottle = false;
    lastArgs = lastThis = timeout = null;
  };

  return throttled as any;
}

/**
 * Request animation frame with debounce
 */
export function rafDebounce<T extends (...args: any[]) => void>(callback: T): (...args: Parameters<T>) => void {
  let rafId: number | null = null;

  return function rafDebounced(...args: Parameters<T>) {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      callback(...args);
      rafId = null;
    });
  };
}

/**
 * Batch multiple operations into single render frame
 */
export function batchUpdates(callback: () => void): void {
  if ('unstable_batchedUpdates' in require('react-dom')) {
    require('react-dom').unstable_batchedUpdates(callback);
  } else {
    callback();
  }
}

/**
 * Measure performance of a function
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  if (duration > 16.67) { // Longer than one frame
    console.warn(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
  } else if (duration > 50) {
    console.info(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
  }
  
  return result;
}

/**
 * Memory usage tracking
 */
export function getMemoryUsage(): { used: number; limit: number; percentage: number } | null {
  if ((performance as any).memory) {
    const mem = (performance as any).memory;
    return {
      used: mem.usedJSHeapSize,
      limit: mem.jsHeapSizeLimit,
      percentage: (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100,
    };
  }
  return null;
}

/**
 * Deferred value - compute value asynchronously
 */
export class DeferredValue<T> {
  private value: T | undefined;
  private promise: Promise<T> | null = null;
  private resolver: ((value: T) => void) | null = null;

  constructor(computeFn: () => Promise<T>) {
    this.promise = computeFn().then((v) => {
      this.value = v;
      this.resolver?.(v);
      return v;
    });
  }

  async get(): Promise<T> {
    if (this.value !== undefined) {
      return this.value;
    }
    return this.promise!;
  }

  onReady(callback: (value: T) => void): void {
    if (this.value !== undefined) {
      callback(this.value);
    } else if (this.promise) {
      this.promise.then(callback);
    } else {
      this.resolver = callback;
    }
  }
}

/**
 * Request idle callback with fallback
 */
export function scheduleIdleTask(callback: IdleRequestCallback): void {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback, { timeout: 2000 });
  } else {
    setTimeout(callback as any, 1);
  }
}

/**
 * Priority queue for scheduling work
 */
export class PriorityQueue<T> {
  private queue: Array<{ item: T; priority: number }> = [];

  enqueue(item: T, priority: number = 0): void {
    const entry = { item, priority };
    let added = false;

    for (let i = 0; i < this.queue.length; i++) {
      if (priority > this.queue[i].priority) {
        this.queue.splice(i, 0, entry);
        added = true;
        break;
      }
    }

    if (!added) {
      this.queue.push(entry);
    }
  }

  dequeue(): T | undefined {
    return this.queue.shift()?.item;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}
