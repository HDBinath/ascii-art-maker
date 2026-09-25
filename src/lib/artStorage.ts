import { AppOptions } from './types';

export interface SavedArtwork {
  id: string;
  title: string;
  timestamp: number;
  mode: 'ascii' | 'dither' | 'hybrid';
  thumbnailDataUrl: string;
  fullDataUrl?: string;
  plainText?: string;
  stats: {
    width: number;
    height: number;
    count: number;
    unitName: string;
  };
  options: AppOptions;
}

const DB_NAME = 'OrbitArtVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'saved_artworks';

// Open / initialize IndexedDB
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('mode', 'mode', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save an artwork to the IndexedDB Art Vault
 */
export async function saveArtworkToVault(artwork: Omit<SavedArtwork, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): Promise<SavedArtwork> {
  const item: SavedArtwork = {
    ...artwork,
    id: artwork.id || `art_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: artwork.timestamp || Date.now(),
  };

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put(item);

      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB write failed, fallback to localStorage', err);
    try {
      const existing = JSON.parse(localStorage.getItem('orbit_saved_art') || '[]');
      const updated = [item, ...existing.filter((a: SavedArtwork) => a.id !== item.id)].slice(0, 30);
      localStorage.setItem('orbit_saved_art', JSON.stringify(updated));
      return item;
    } catch {
      return item;
    }
  }
}

/**
 * Retrieve all saved artworks ordered newest first
 */
export async function getAllSavedArtworks(): Promise<SavedArtwork[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const req = index.openCursor(null, 'prev');
      const items: SavedArtwork[] = [];

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          items.push(cursor.value);
          cursor.continue();
        } else {
          resolve(items);
        }
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB read failed, reading from localStorage fallback', err);
    try {
      return JSON.parse(localStorage.getItem('orbit_saved_art') || '[]');
    } catch {
      return [];
    }
  }
}

/**
 * Delete a specific artwork by ID
 */
export async function deleteArtworkFromVault(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const existing = JSON.parse(localStorage.getItem('orbit_saved_art') || '[]');
      localStorage.setItem('orbit_saved_art', JSON.stringify(existing.filter((a: SavedArtwork) => a.id !== id)));
    } catch {}
  }
}
