export function initDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open("MusitechneDB", 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("custom_tracks")) {
                db.createObjectStore("custom_tracks", { keyPath: "id" });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
    });
}

export async function loadCustomTracks() {
    try {
        const db = await initDB();
        return new Promise((resolve) => {
            const req = db.transaction("custom_tracks", "readonly").objectStore("custom_tracks").getAll();
            req.onsuccess = () => resolve(req.result || []);
        });
    } catch (e) { return []; }
}

export async function removeCustomTrack(track) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction("custom_tracks", "readwrite");
            const store = transaction.objectStore("custom_tracks");
            
            const req = store.delete(track.id);

            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        return false;
    }
}

export async function saveCustomTrack(t) {
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction("custom_tracks", "readwrite");
        tx.objectStore("custom_tracks").put(t);
        tx.oncomplete = () => resolve();
    });
}

export async function getTracks() {
    try {
        const res = await fetch('data/tracks.json');
        const data = await res.json();
        return data.defaultTracks.filter(t => t.notes.length > 0);
    } 
    catch (error) {
        return [{}];
    }
}

export function setStarsData(trackId, value){
    console.log(`Save for: ${trackId} (${typeof trackId}) | Value: ${value} (${typeof value})`);
    localStorage.setItem(trackId.toString(), value.toString());
}

export function getStarsData(trackId) {
    const data = localStorage.getItem(trackId.toString());
    return Number(data);
}