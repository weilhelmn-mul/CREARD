// Lightweight IndexedDB cache layer for AdminDashboard
// Caches courts, users, and settings to avoid repeated Firebase calls on slow connections

const DB_NAME = 'creard-cache';
const DB_VERSION = 1;
const STORES = {
  courts: 'courts',
  users: 'users',
  settings: 'settings',
  bookings: 'bookings',
} as const;

const CACHE_TTL = {
  courts: 30 * 60 * 1000,    // 30 min — courts rarely change
  users: 10 * 60 * 1000,     // 10 min
  settings: 60 * 60 * 1000,  // 1 hour
  bookings: 2 * 60 * 1000,   // 2 min — bookings change frequently
} as const;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      Object.values(STORES).forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function get<T>(store: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get('data');
      req.onsuccess = () => {
        const entry = req.result as CacheEntry<T> | undefined;
        if (!entry) { resolve(null); return; }
        const ttl = CACHE_TTL[store as keyof typeof CACHE_TTL] ?? 5 * 60 * 1000;
        if (Date.now() - entry.timestamp > ttl) {
          resolve(null); // expired
        } else {
          resolve(entry.data);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function set<T>(store: string, data: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put({ data, timestamp: Date.now() }, 'data');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB not available — silent fail
  }
}

async function invalidate(store: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete('data');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // silent
  }
}

// --- Public API ---

/** Fetch with cache: returns cached data instantly, updates in background */
export async function cachedFetch<T>(
  store: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Return cache immediately if valid
  const cached = await get<T>(store);
  if (cached) {
    // Background refresh
    fetcher().then((fresh) => set(store, fresh)).catch(() => {});
    return cached;
  }

  // No cache — fetch and store
  const data = await fetcher();
  await set(store, data);
  return data;
}

/** Fetch with cache but always refresh (for data that changes often, like bookings) */
export async function cachedFetchFresh<T>(
  store: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await get<T>(store);

  try {
    const fresh = await fetcher();
    await set(store, fresh);
    return fresh;
  } catch {
    // Network failed — return stale cache if available
    if (cached) return cached;
    throw new Error('Sin conexión y sin datos en caché');
  }
}

/** Invalidate a specific cache store */
export function invalidateCache(store: string): void {
  invalidate(store);
}

/** Invalidate all caches (e.g. after a write mutation) */
export function invalidateAllCaches(): void {
  Object.values(STORES).forEach(invalidate);
}