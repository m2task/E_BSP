// main.js
import { deck, hand, field, cardIdCounter, setDeck, setHand, setCardIdCounter, setSelectedCores } from './src/game_data.js';
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
    const { deckName, useContract } = getURLParams();

    // ローカルストレージからデッキデータを読み込む
    const savedData = JSON.parse(localStorage.getItem(deckName)) || {};
    const loadedDeck = savedData.deck || [];
    
    // カードデータをオブジェクトに変換
    let currentCardId = cardIdCounter;
    let newDeck = loadedDeck.map(name => {
        return { id: `card-${currentCardId++}`, name, isRotated: false, isExhausted: false, coresOnCard: [] };
    });
    setCardIdCounter(currentCardId);

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
