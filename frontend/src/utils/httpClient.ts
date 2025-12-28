import { friendlyMessage } from './errorMessages';
import { enqueue } from './offlineQueue';

export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  requestTimeoutMs?: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function doFetch(url: string, init?: RequestInit, timeoutMs?: number) {
  if (!timeoutMs) {
    return fetch(url, init);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function httpRequest(url: string, init: RequestInit = {}, retry: RetryOptions = {}): Promise<Response> {
  const { retries = 3, baseDelayMs = 300, maxDelayMs = 2000, requestTimeoutMs = 10000 } = retry;

  // Offline: queue and resolve when back online
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return enqueue(url, init);
  }

  let attempt = 0;
  let lastError: any = null;
  while (attempt <= retries) {
    try {
      const res = await doFetch(url, init, requestTimeoutMs);
      if (!res.ok) {
        // Retry on 502/503/504
        if ([502, 503, 504].includes(res.status) && attempt < retries) {
          const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
          await sleep(delay);
          attempt++;
          continue;
        }
        const txt = await res.text().catch(() => '');
        const msg = friendlyMessage(res.status, txt);
        const err = new Error(msg);
        (err as any).status = res.status;
        throw err;
      }
      return res;
    } catch (e: any) {
      lastError = e;
      // Network error or timeout: retry
      const isNetworkErr = e && (e.name === 'TypeError' || /network|timed out/i.test(e.message || ''));
      if (isNetworkErr && attempt < retries) {
        const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
        await sleep(delay);
        attempt++;
        continue;
      }
      // No more retries
      const msg = friendlyMessage((e as any)?.status, e?.message);
      const err = new Error(msg);
      (err as any).cause = e;
      throw err;
    }
  }
  // Fallback
  throw lastError || new Error('Request failed');
}

export async function httpJson<T>(url: string, init: RequestInit = {}, retry?: RetryOptions): Promise<T> {
  const res = await httpRequest(url, init, retry);
  return res.json();
}
