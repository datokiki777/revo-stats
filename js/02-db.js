import { DB_NAME, DB_VERSION, STORES } from './01-config.js';

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.transactions)) {
        const txStore = db.createObjectStore(STORES.transactions, { keyPath: 'id' });
        txStore.createIndex('importId', 'importId', { unique: false });
        txStore.createIndex('dateCompleted', 'dateCompleted', { unique: false });
        txStore.createIndex('type', 'type', { unique: false });
        txStore.createIndex('currency', 'currency', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('rules')) {
  db.createObjectStore('rules', { keyPath: 'key' });
}

      if (!db.objectStoreNames.contains(STORES.imports)) {
        const importStore = db.createObjectStore(STORES.imports, { keyPath: 'id' });
        importStore.createIndex('importedAt', 'importedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function dbGetAll(storeName) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut(storeName, value) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);

    req.onsuccess = () => resolve(value);
    req.onerror = () => reject(req.error);
  });
}

export async function dbBulkPut(storeName, values) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    for (const value of values) {
      store.put(value);
    }

    tx.oncomplete = () => resolve(values);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function dbClear(storeName) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllAppData() {
  await dbClear(STORES.transactions);
  await dbClear(STORES.imports);
  await dbClear(STORES.settings);
}

export async function dbDelete(storeName, key) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDeleteByIndex(storeName, indexName, value) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const req = index.openCursor(IDBKeyRange.only(value));

    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}