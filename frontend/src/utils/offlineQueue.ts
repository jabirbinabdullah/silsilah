type QueuedRequest = {
  url: string;
  init?: RequestInit;
  resolve: (value: Response | PromiseLike<Response>) => void;
  reject: (reason?: any) => void;
};

const queue: QueuedRequest[] = [];
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;
  window.addEventListener('online', flushQueue);
}

export function enqueue(url: string, init?: RequestInit): Promise<Response> {
  init();
  return new Promise<Response>((resolve, reject) => {
    queue.push({ url, init, resolve, reject });
  });
}

export async function flushQueue() {
  while (queue.length && navigator.onLine) {
    const item = queue.shift()!;
    try {
      const res = await fetch(item.url, item.init);
      item.resolve(res);
    } catch (e) {
      item.reject(e);
    }
  }
}

export function hasQueue() {
  return queue.length > 0;
}
