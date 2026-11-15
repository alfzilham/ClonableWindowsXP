import { useStore, createStore } from './store';
import { VFS, type VfsSnapshot } from './vfsCore';

export * from './vfsCore';

/** App-wide file system singleton, persisted to IndexedDB. */
export const vfs = new VFS();

const vfsStore = createStore({ version: 0 });

/** Re-renders the calling component whenever the file system changes. */
export function useVfsVersion(): number {
  return useStore(vfsStore, (s) => s.version);
}

const DB_NAME = 'xp-clone';
const STORE = 'kv';
const KEY = 'vfs';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readSnapshot(): Promise<VfsSnapshot | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result as VfsSnapshot | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function writeSnapshot(snapshot: VfsSnapshot): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(snapshot, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let persistTimer: number | undefined;
let loaded = false;

function schedulePersist(): void {
  if (!loaded) return;
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    writeSnapshot(vfs.toSnapshot()).catch(() => {
      /* storage unavailable (private mode): the session still works in memory */
    });
  }, 400);
}

vfs.onChange = () => {
  vfsStore.set((s) => ({ version: s.version + 1 }));
  schedulePersist();
};

/** Load the saved file system (if any). Safe to call once at startup. */
export async function initVfs(): Promise<void> {
  try {
    const snapshot = await readSnapshot();
    if (snapshot) vfs.load(snapshot);
  } catch {
    /* ignore: fall back to the freshly seeded file system */
  } finally {
    loaded = true;
  }
}

/** Wipe the saved file system and reseed (used by the "reset" command). */
export function resetVfs(): void {
  vfs.load(new VFS().toSnapshot());
  schedulePersist();
}
