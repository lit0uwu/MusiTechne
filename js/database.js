const DB_NAME = 'TracksDB';
const DB_VERSION = 2;
let dbInstance = null;

const TRACKS_JSON_URL = 'tracks.json'; 

export function initDB() {
  return new Promise(async (resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    try {
      const response = await fetch(TRACKS_JSON_URL);
      const fileData = await response.json();

      const allTracks = fileData.defaultTracks || [];

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('levels')) {
          db.createObjectStore('levels', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('scores')) {
          db.createObjectStore('scores', { keyPath: 'trackId' });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;

        const transaction = dbInstance.transaction('levels', 'readwrite');
        const store = transaction.objectStore('levels');

        allTracks.forEach(track => {
          if (track && track.id) {
            store.put(track);
          }
        });

        transaction.oncomplete = () => {
          console.log(`Успешно импортировано треков в БД: ${allTracks.length} шт.`);
          resolve(dbInstance);
        };
      };

      request.onerror = (event) => reject(event.target.error);

    } catch (error) {
      console.error('Ошибка инициализации базы данных или загрузки JSON:', error);
      reject(error);
    }
  });
}

export async function loadTrackFromDB(trackId) {
  const db = await initDB(); 
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('levels', 'readonly');
    const store = transaction.objectStore('levels');
    const request = store.get(trackId);

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(request.error);
  });
}

/**
 * Получает массив вообще всех треков из базы данных
 */
export async function getAllTracksFromDB() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('levels', 'readonly');
    const store = transaction.objectStore('levels');
    const request = store.getAll(); 

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Получает рекорд для конкретного трека
 */
export async function getHighScore(trackId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('scores', 'readonly');
    const store = transaction.objectStore('scores');
    const request = store.get(trackId);

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Сохраняет новый рекорд, если он больше предыдущего
 */
export async function saveHighScore(trackId, newScore) {
  const db = await initDB();
  
  return new Promise(async (resolve, reject) => {
    const currentRecord = await getHighScore(trackId);
    
    if (currentRecord && currentRecord.score >= newScore) {
      return resolve({ updated: false, bestScore: currentRecord.score });
    }

    const transaction = db.transaction('scores', 'readwrite');
    const store = transaction.objectStore('scores');

    const recordData = {
      trackId: trackId,
      score: newScore,
      date: new Date().toLocaleDateString()
    };

    const request = store.put(recordData);
    
    request.onsuccess = () => resolve({ updated: true, bestScore: newScore });
    request.onerror = (event) => reject(event.target.error);
  });
}
