// src/db.js

const DB_NAME = 'DeckDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'decks';

let db;

/**
 * IndexedDBをオープンし、必要であればオブジェクトストアを作成します。
 * @returns {Promise<IDBDatabase>} IndexedDBデータベースインスタンス
 */
export function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'name' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.errorCode);
            reject('IndexedDB open error');
        };
    });
}

/**
 * デッキをIndexedDBに保存または更新します。
 * @param {string} deckName - デッキ名
 * @param {Array<Object>} deckData - デッキのカードデータ配列
 * @returns {Promise<void>}
 */
export function saveDeck(deckName, deckData) {
    return new Promise(async (resolve, reject) => {
        if (!db) {
            try {
                db = await openDb();
            } catch (error) {
                return reject(error);
            }
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.put({ name: deckName, data: deckData });

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error('Error saving deck:', event.target.errorCode);
            reject('Error saving deck');
        };
    });
}

/**
 * 全てのデッキをIndexedDBから取得します。
 * @returns {Promise<Object.<string, Array<Object>>>} デッキ名とデッキデータのオブジェクト
 */
export function getAllDecks() {
    return new Promise(async (resolve, reject) => {
        if (!db) {
            try {
                db = await openDb();
            } catch (error) {
                return reject(error);
            }
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = (event) => {
            const decks = {};
            event.target.result.forEach(item => {
                decks[item.name] = item.data;
            });
            resolve(decks);
        };

        request.onerror = (event) => {
            console.error('Error getting all decks:', event.target.errorCode);
            reject('Error getting all decks');
        };
    });
}

/**
 * 指定されたデッキをIndexedDBから削除します。
 * @param {string} deckName - 削除するデッキ名
 * @returns {Promise<void>}
 */
export function deleteDeck(deckName) {
    return new Promise(async (resolve, reject) => {
        if (!db) {
            try {
                db = await openDb();
            } catch (error) {
                return reject(error);
            }
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(deckName);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error('Error deleting deck:', event.target.errorCode);
            reject('Error deleting deck');
        };
    });
}
