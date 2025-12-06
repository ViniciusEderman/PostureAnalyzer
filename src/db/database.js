let db;
const DB_NAME = "PostureAnalyzerDB";
const DB_VERSION = 1;
const STORE_NAME = "postureRecords";

// Initialize IndexedDB
export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("postureStatus", "postureStatus", { unique: false });
      }
    };
  });
}

// Store posture record in IndexedDB
export async function storePostureRecord(postureStatus, imageBlob, keypointData) {
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  const record = {
    timestamp: Date.now(),
    postureStatus: postureStatus,
    imageBlob: imageBlob,
    keypointData: keypointData,
    date: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const request = store.add(record);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createImageUrlFromRecord(record) {
  if (!record || !record.imageBlob) return null;
  return URL.createObjectURL(record.imageBlob);
}

// Get posture history
export async function getPostureHistory(limit = 10) {
  const transaction = db.transaction([STORE_NAME], "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index("timestamp");

  return new Promise((resolve, reject) => {
    const request = index.openCursor(null, "prev");
    const results = [];

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// Clean old records (older than 30 days)
export async function cleanOldRecords() {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index("timestamp");

  return new Promise((resolve, reject) => {
    const request = index.openCursor();

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.timestamp < thirtyDaysAgo) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
}
