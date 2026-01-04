/**
 * Debounce utility for performance optimization
 * Useful for expensive operations triggered frequently (zoom, pan, resize)
 */

export interface DebounceOptions {
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Creates a debounced function that delays its execution
 * @param func The function to debounce
 * @param wait The delay in milliseconds
 * @param options Configuration options
 * @returns The debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: DebounceOptions = {}
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  let leading = options.leading ?? false;
  let trailing = options.trailing ?? true;
  let maxWait = options.maxWait;

  function invokeFunc(time: number) {
    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = lastThis = null;
    lastInvokeTime = time;
    return func.apply(thisArg, args || []);
  }

  function shouldInvoke(time: number) {
    if (lastCallTime == null) return true;
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    return (
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait != null && timeSinceLastInvoke >= maxWait)
    );
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      trailingEdge(time);
    } else {
      const timeSinceLastCall = Date.now() - (lastCallTime || 0);
      const remaining = wait - timeSinceLastCall;
      timeout = setTimeout(timerExpired, remaining);
    }
  }

  function trailingEdge(time: number) {
    timeout = null;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = null;
  }

  function debounced(this: any, ...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeout == null && leading) {
        invokeFunc(time);
      }
      if (timeout == null) {
        timeout = setTimeout(timerExpired, wait);
      }
    }
    return undefined;
  }

  return debounced;
}

/**
 * Creates a throttled function that enforces a minimum time between invocations
 * @param func The function to throttle
 * @param limit The minimum time in milliseconds between invocations
 * @returns The throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastRun = 0;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      lastRun = Date.now();
      inThrottle = true;
    }
    
    setTimeout(() => {
      inThrottle = false;
    }, limit);
  };
}

/**
 * Request animation frame debounce - schedules function on next animation frame
 * Useful for visual updates and DOM manipulation
 * @param func The function to schedule
 * @returns The debounced function
 */
export function rafDebounce<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  return function (this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs != null) {
          func.apply(lastThis, lastArgs);
        }
        rafId = null;
        lastArgs = null;
        lastThis = null;
      });
    }
  };
}

/**
 * Immediate debounce - function is called immediately, then debounced on subsequent calls
 * Useful for search, filtering, and other interactive operations
 * @param func The function to debounce
 * @param wait The delay in milliseconds
 * @returns The debounced function
 */
export function debounceImmediate<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const callNow = timeout == null;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
    }, wait);

    if (callNow) {
      func.apply(this, args);
    }
  };
}

/**
 * Cancel a debounced function - stops any pending execution
 * @param debounced The debounced function to cancel
 */
export function cancel(debounced: any) {
  if (debounced && debounced.cancel) {
    debounced.cancel();
  }
}

/**
 * Flush a debounced function - immediately executes any pending operation
 * @param debounced The debounced function to flush
 */
export function flush(debounced: any) {
  if (debounced && debounced.flush) {
    return debounced.flush();
  }
}
