export type IdbOptions = {
  dbName: string;
  storeName: string;
};

type DbHandle = {
  db: IDBDatabase;
  storeName: string;
};

let openPromise: Promise<DbHandle> | null = null;

function openDb(opts: IdbOptions): Promise<DbHandle> {
  if (openPromise) {
    return openPromise;
  }
  openPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('INDEXEDDB_UNAVAILABLE'));
      return;
    }
    const req = indexedDB.open(opts.dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(opts.storeName)) {
        db.createObjectStore(opts.storeName);
      }
    };
    req.onsuccess = () => {
      resolve({ db: req.result, storeName: opts.storeName });
    };
    req.onerror = () => reject(req.error ?? new Error('INDEXEDDB_OPEN_FAILED'));
  });
  return openPromise;
}

export async function idbGet<T>(opts: IdbOptions, key: string): Promise<T | null> {
  const h = await openDb(opts);
  return await new Promise((resolve, reject) => {
    const tx = h.db.transaction(h.storeName, 'readonly');
    const store = tx.objectStore(h.storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result ?? null) as T | null);
    req.onerror = () => reject(req.error ?? new Error('INDEXEDDB_GET_FAILED'));
  });
}

export async function idbSet<T>(opts: IdbOptions, key: string, value: T): Promise<void> {
  const h = await openDb(opts);
  await new Promise<void>((resolve, reject) => {
    const tx = h.db.transaction(h.storeName, 'readwrite');
    const store = tx.objectStore(h.storeName);
    const req = store.put(value as unknown as any, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('INDEXEDDB_SET_FAILED'));
  });
}
