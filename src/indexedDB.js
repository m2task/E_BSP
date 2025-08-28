
const DB_NAME = 'CardGameDB';
const DB_VERSION = 1;
const DECK_STORE_NAME = 'decks';

let db = null;

/**
 * データベースを開き、オブジェクトストアを作成します。
 * @returns {Promise<IDBDatabase>} データベースインスタンス
 */
function openDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains(DECK_STORE_NAME)) {
                dbInstance.createObjectStore(DECK_STORE_NAME, { keyPath: 'name' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('Database error:', event.target.errorCode);
            reject(event.target.error);
        };
    });
}

/**
 * デッキをIndexedDBに保存します。
 * @param {string} deckName - 保存するデッキの名前
 * @param {Array} deckData - 保存するデッキのカードデータ
 * @returns {Promise<void>}
 */
async function saveDeck(deckName, deckData) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DECK_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DECK_STORE_NAME);
        const request = store.put({ name: deckName, data: deckData });

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error('Save deck error:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * 指定された名前のデッキをIndexedDBから読み込みます。
 * @param {string} deckName - 読み込むデッキの名前
 * @returns {Promise<Array|null>} デッキデータ、または存在しない場合はnull
 */
async function loadDeck(deckName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DECK_STORE_NAME], 'readonly');
        const store = transaction.objectStore(DECK_STORE_NAME);
        const request = store.get(deckName);

        request.onsuccess = (event) => {
            if (event.target.result) {
                resolve(event.target.result.data);
            } else {
                resolve(null); // デッキが見つからない場合
            }
        };

        request.onerror = (event) => {
            console.error('Load deck error:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * 保存されているすべてのデッキの名前を取得します。
 * @returns {Promise<string[]>} デッキ名の配列
 */
async function getAllDeckNames() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DECK_STORE_NAME], 'readonly');
        const store = transaction.objectStore(DECK_STORE_NAME);
        const request = store.getAllKeys(); // 主キー（デッキ名）をすべて取得

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('Get all deck names error:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * 保存されているすべてのデッキを取得します。
 * @returns {Promise<Object[]>} デッキオブジェクトの配列
 */
async function getAllDecks() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DECK_STORE_NAME], 'readonly');
        const store = transaction.objectStore(DECK_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('Get all decks error:', event.target.error);
            reject(event.target.error);
        };
    });
}


/**
 * 指定された名前のデッキをIndexedDBから削除します。
 * @param {string} deckName - 削除するデッキの名前
 * @returns {Promise<void>}
 */
async function deleteDeck(deckName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DECK_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DECK_STORE_NAME);
        const request = store.delete(deckName);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error('Delete deck error:', event.target.error);
            reject(event.target.error);
        };
    });
}

// グローバルスコープにエクスポート
window.cardGameDB = {
    saveDeck,
    loadDeck,
    getAllDeckNames,
    getAllDecks,
    deleteDeck
};
