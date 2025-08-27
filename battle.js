// main.js
import { deck, hand, field, cardIdCounter, setDeck, setHand, setCardIdCounter, setSelectedCores, setLifeCores, setReserveCores, setCountCores, setTrashCores } from './src/game_data.js';
import { setupEventListeners } from './src/event_handlers.js';
import { renderAll } from './src/ui_render.js';
import { shuffle } from './src/utils.js';

function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        deckName: params.get("deck") || "deck1",
        useContract: params.get("contract") === "true"
    };
}

function initializeGame() {
    setSelectedCores([]); // 選択されたコアを初期化
    setLifeCores(["blue", "blue", "blue", "blue", "blue"]); // ライフコアを初期化
    setReserveCores(["blue", "blue", "blue", "soul"]); // リザーブコアを初期化
    setCountCores([]); // カウントコアを初期化
    setTrashCores([]); // トラッシュコアを初期化

    let loadedDeck = [];
    let useContract = false; // Initialize useContract
    const currentBattleDeckJson = localStorage.getItem('currentBattleDeck');

    if (currentBattleDeckJson) {
        // deck_viewer.htmlから渡されたデッキデータを使用
        loadedDeck = JSON.parse(currentBattleDeckJson);
        localStorage.removeItem('currentBattleDeck'); // 使用後は削除
        console.log("Loaded Deck from currentBattleDeck (localStorage):", loadedDeck);
        // For decks loaded from deck_viewer, assume no contract card unless explicitly passed
        useContract = false; // Or get from loadedDeck if it contains this info
    } else {
        // URLパラメータからデッキ名を読み込み、既存の保存済みデッキを使用
        const urlParams = getURLParams(); // Get params here
        const deckName = urlParams.deckName;
        useContract = urlParams.useContract; // Assign useContract from URL params

        const savedData = JSON.parse(localStorage.getItem(deckName)) || {};
        loadedDeck = savedData.deck || [];
        console.log("Loaded Deck from localStorage (via URL param):", loadedDeck);
    }
    
    // カードデータをオブジェクトに変換
    let currentCardId = cardIdCounter;
    let newDeck = [];
    loadedDeck.forEach(cardData => {
        for (let i = 0; i < cardData.quantity; i++) {
            newDeck.push({
                id: `card-${currentCardId++}`,
                name: cardData.name,
                imgDataUrl: cardData.imgDataUrl,
                isRotated: false,
                isExhausted: false,
                coresOnCard: []
            });
        }
    });
    setCardIdCounter(currentCardId);
    console.log("New Deck (after mapping):", newDeck); // 追加

    // 契約カードの処理
    let initialHandSize = 4;
    if (useContract && newDeck.length > 0) {
        const contractCard = newDeck.shift(); // デッキの最初のカードを契約カードとして取得
        hand.push(contractCard); // 手札に加える
    }
    
    setDeck(newDeck);
    shuffle(deck);

    // 初期手札を引く
    while (hand.length < initialHandSize && deck.length > 0) {
        hand.push(deck.shift());
    }

    console.log("Initialized Deck:", deck);
    console.log("Initialized Hand:", hand);
    console.log("Field:", field);

    renderAll();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    setupEventListeners();
});
