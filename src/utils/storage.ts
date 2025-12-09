const DB_NAME = 'CanvasAppDB';
const STORE_NAME = 'canvas-data';
const KEY = 'elements';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveCanvasData = async (data: any): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      // We clone the data to avoid "DataCloneError" if it contains non-clonable objects (though it shouldn't from Pinia)
      // But Pinia state is a Proxy, so we should unwrap it or JSON stringify/parse it.
      // IndexedDB can store objects directly, but Proxies might be an issue.
      // The safest way for simple data is structuredClone or JSON.
      // Since we were using JSON.stringify before, let's stick to raw object but ensure it's plain.
      const plainData = JSON.parse(JSON.stringify(data));
      const request = store.put(plainData, KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('IndexedDB save error:', error);
    throw error;
  }
};

export const loadCanvasData = async (): Promise<any> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('IndexedDB load error:', error);
    return null;
  }
};

const CLIPBOARD_KEY = 'clipboard';

export const saveClipboard = async (data: any): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const plainData = JSON.parse(JSON.stringify(data));
      const request = store.put(plainData, CLIPBOARD_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('IndexedDB clipboard save error:', error);
  }
};

export const loadClipboard = async (): Promise<any> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(CLIPBOARD_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('IndexedDB clipboard load error:', error);
    return null;
  }
};

export const clearCanvasData = async (): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('IndexedDB clear error:', error);
  }
};
