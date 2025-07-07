// main.js
import { deck, hand, cardIdCounter, setDeck, setHand, setCardIdCounter, setSelectedCores } from './src/game_data.js';
import { setupEventListeners } from './src/event_handlers.js';
import { renderAll } from './src/ui_render.js';
import { shuffle } from './src/utils.js';

function getDeckNameFromURL() {
    const params = new URLSearchParams(window.location.search);
    return {
        deckName: params.get("deck") || "deck1",
        includeFirstCard: params.get("includeFirstCard") === "true"
    };
}

function initializeGame() {
    setSelectedCores([]); // 選択されたコアを初期化
    const { deckName, includeFirstCard } = getDeckNameFromURL();
    const savedData = JSON.parse(localStorage.getItem(deckName));
    const loadedDeck = savedData ? savedData.cards || [] : [];

    let currentCardId = cardIdCounter; // 現在のカウンター値を取得
    let newDeck = loadedDeck.map(name => {
        const card = { id: `card-${currentCardId++}`, name, isRotated: false, isExhausted: false, coresOnCard: [] };
        return card;
    });
    setCardIdCounter(currentCardId); // map処理後にグローバルカウンターを更新

    setDeck(newDeck);
    shuffle(deck);

    if (includeFirstCard && deck.length > 0) {
        hand.push(deck.shift());
    }

    const initialHandSize = 4;
    while (hand.length < initialHandSize && deck.length > 0) {
        hand.push(deck.shift()); // handは直接pushでOK
    }

    console.log("Initialized Deck:", deck);
    console.log("Initialized Hand:", hand);

    renderAll();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    setupEventListeners();
});
