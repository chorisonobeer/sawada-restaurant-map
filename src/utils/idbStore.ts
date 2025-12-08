// IndexedDB-based JSON key-value store with localStorage fallback
// 各エントリにタイムスタンプを含めて有効期限管理を行う

const DB_NAME = 'app-cache';
const STORE_NAME = 'data';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export async function getJSON<T>(key: string, maxAgeMinutes: number = 0): Promise<T | null> {
  try {
    const db = await openDB();
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result;
        if (!result) {
          resolve(null);
          return;
        }
        
        // 有効期限チェック
        if (maxAgeMinutes > 0 && result.timestamp) {
          const now = Date.now();
          const ageMinutes = (now - result.timestamp) / (1000 * 60);
          if (ageMinutes > maxAgeMinutes) {
            // 有効期限切れの場合はキャッシュを無効とみなし、削除はベストエフォートで別Txにする
            // （read-onlyトランザクションでdeleteするとReadOnlyErrorになるため）
            try {
              const cleanTx = db.transaction(STORE_NAME, 'readwrite');
              const cleanStore = cleanTx.objectStore(STORE_NAME);
              cleanStore.delete(key);
            } catch {
              // 削除に失敗しても無視し、nullを返す
            }
            resolve(null);
            return;
          }
        }
        
        resolve((result.value ?? null) as T | null);
      };
      req.onerror = () => {
        // 読み取り失敗時はキャッシュなし扱いにし、後段がネットワークへ進めるようnullで返す
        resolve(null);
      };
    });
  } catch (e) {
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        
        // 有効期限チェック
        if (maxAgeMinutes > 0 && parsed.timestamp) {
          const now = Date.now();
          const ageMinutes = (now - parsed.timestamp) / (1000 * 60);
          if (ageMinutes > maxAgeMinutes) {
            // 有効期限切れの場合は削除してnullを返す（ベストエフォート）
            try {
              localStorage.removeItem(key);
            } catch {
              // ignore
            }
            return null;
          }
        }
        
        return parsed.value ? (parsed.value as T) : null;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      // タイムスタンプ付きで保存
      const data = {
        value: value,
        timestamp: Date.now()
      };
      const req = store.put(data as any, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    // Fallback to localStorage
    try {
      const data = {
        value: value,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // ignore
    }
  }
}