/**
 * Offline-first API client.
 *
 * - GET requests: network-first, falls back to IndexedDB cache when offline.
 *   Responses are cached for online use too (instant loads).
 * - Write requests (POST/PUT/DELETE): when online they go straight to the
 *   server; when offline they're queued in IndexedDB and flushed when the
 *   connection returns.
 */

const CACHE_DB = 'leafsolar-cache';
const CACHE_STORE = 'responses';
const OUTBOX_STORE = 'outbox';
const CACHE_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no-idb'));
    const req = indexedDB.open(CACHE_DB, CACHE_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE);
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const os = db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
        os.createIndex('created', 'created_at');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function cacheGet(key: string): Promise<any> {
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const tx = db.transaction(CACHE_STORE, 'readonly');
      const r = tx.objectStore(CACHE_STORE).get(key);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function cacheSet(key: string, value: any) {
  try {
    const db = await openDB();
    const tx = db.transaction(CACHE_STORE, 'readwrite');
    tx.objectStore(CACHE_STORE).put(value, key);
  } catch {
    /* ignore */
  }
}

export async function outboxAdd(item: { id: string; type: string; payload: any }) {
  try {
    const db = await openDB();
    const tx = db.transaction(OUTBOX_STORE, 'readwrite');
    tx.objectStore(OUTBOX_STORE).put({
      ...item,
      created_at: new Date().toISOString(),
      attempts: 0,
    });
  } catch {
    /* ignore */
  }
}

export async function outboxAll(): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const tx = db.transaction(OUTBOX_STORE, 'readonly');
      const r = tx.objectStore(OUTBOX_STORE).getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function outboxRemove(id: string) {
  try {
    const db = await openDB();
    const tx = db.transaction(OUTBOX_STORE, 'readwrite');
    tx.objectStore(OUTBOX_STORE).delete(id);
  } catch {
    /* ignore */
  }
}

export async function outboxCount(): Promise<number> {
  const items = await outboxAll();
  return items.length;
}

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Fetch with offline fallback for GET requests.
 */
export async function offlineFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<{ data: T; fromCache: boolean }> {
  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = `GET:${url}`;

  if (method === 'GET') {
    if (isOnline()) {
      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        await cacheSet(cacheKey, data);
        return { data, fromCache: false };
      } catch {
        const cached = await cacheGet(cacheKey);
        if (cached) return { data: cached, fromCache: true };
        throw new Error('Network unavailable and no cached data');
      }
    } else {
      const cached = await cacheGet(cacheKey);
      if (cached) return { data: cached, fromCache: true };
      throw new Error('You are offline and no cached data is available.');
    }
  }

  // Non-GET: if offline, queue in outbox
  if (!isOnline()) {
    let payload: any = {};
    try {
      payload = options.body ? JSON.parse(options.body as string) : {};
    } catch {
      payload = {};
    }
    const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await outboxAdd({ id, type: inferType(url), payload });
    return { data: { queued: true, id } as any, fromCache: true };
  }

  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return { data, fromCache: false };
}

function inferType(url: string): string {
  if (url.includes('/api/send')) return 'send_email';
  if (url.includes('/api/contacts')) return 'add_contacts';
  return 'unknown';
}

let flushInProgress = false;

export async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  if (flushInProgress || !isOnline()) return { sent: 0, failed: 0 };
  flushInProgress = true;
  let sent = 0, failed = 0;
  try {
    const items = await outboxAll();
    for (const item of items) {
      try {
        const endpoint = item.type === 'send_email'
          ? '/api/send'
          : item.type === 'add_contacts'
            ? '/api/contacts'
            : null;
        if (!endpoint) {
          await outboxRemove(item.id);
          continue;
        }
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });
        if (res.ok) {
          await outboxRemove(item.id);
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
  } finally {
    flushInProgress = false;
  }
  return { sent, failed };
}
