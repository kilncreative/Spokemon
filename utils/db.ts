const DB_NAME = 'SpokemonDB';
const STORE_NAME = 'gameData';
const ASSET_STORE = 'assets'; // New store for images/text
const CONFIG_STORE = 'config'; // New store for custom species lists
const DB_VERSION = 2; // Bump version

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // 1. Setup a safety timeout. If DB doesn't open in 2s, fail so App doesn't hang forever.
    const hangTimeout = setTimeout(() => {
        reject(new Error("DB_OPEN_TIMEOUT"));
    }, 2000);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
        clearTimeout(hangTimeout);
        console.error("IDB Error:", request.error);
        reject(request.error);
    };

    request.onsuccess = () => {
        clearTimeout(hangTimeout);
        resolve(request.result);
    };

    request.onblocked = () => {
        clearTimeout(hangTimeout);
        console.warn("IDB Blocked: Close other tabs.");
        reject(new Error("DB_BLOCKED"));
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Game State Store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      
      // Asset Store (files)
      if (!db.objectStoreNames.contains(ASSET_STORE)) {
        db.createObjectStore(ASSET_STORE);
      }

      // Config Store (lists, settings)
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE);
      }
    };
  });
};

export const saveGameData = async (key: string, data: any) => {
  try {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(data, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Save failed", e);
  }
};

export const loadGameData = async (key: string) => {
  try {
    const db = await initDB();
    return new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("Load failed (fallback to default):", e);
    return null;
  }
};

// --- ASSET MANAGEMENT (Images/Text) ---

export const saveAsset = async (path: string, blob: Blob | string) => {
    try {
        const db = await initDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(ASSET_STORE, 'readwrite');
            const store = tx.objectStore(ASSET_STORE);
            const request = store.put(blob, path);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch(e) { console.error("Asset save failed", e); }
};

export const loadAsset = async (path: string): Promise<Blob | string | undefined> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(ASSET_STORE, 'readonly');
            const store = tx.objectStore(ASSET_STORE);
            const request = store.get(path);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(undefined); // Don't reject, just return undefined
        });
    } catch(e) { return undefined; }
};

/**
 * Lists all keys in the asset store that start with the given prefix.
 * Useful for finding all files belonging to a specific species folder.
 */
export const listAssetKeys = async (prefix: string): Promise<string[]> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(ASSET_STORE, 'readonly');
            const store = tx.objectStore(ASSET_STORE);
            // Create a range for keys starting with prefix
            const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
            const request = store.getAllKeys(range);
            request.onsuccess = () => resolve(request.result.map(k => String(k)));
            request.onerror = () => resolve([]);
        });
    } catch(e) { return []; }
};

export const saveConfig = async (key: string, data: any) => {
    try {
        const db = await initDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(CONFIG_STORE, 'readwrite');
            const store = tx.objectStore(CONFIG_STORE);
            const request = store.put(data, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch(e) {}
};

export const loadConfig = async (key: string) => {
    try {
        const db = await initDB();
        return new Promise<any>((resolve, reject) => {
            const tx = db.transaction(CONFIG_STORE, 'readonly');
            const store = tx.objectStore(CONFIG_STORE);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(undefined);
        });
    } catch(e) { return undefined; }
};