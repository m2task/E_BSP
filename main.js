// main.js
import { deck, hand, cardIdCounter, setDeck, setHand, setCardIdCounter, setSelectedCores } from './src/game_data.js';
import { setupEventListeners } from './src/event_handlers.js';
import { renderAll } from './src/ui_render.js';
import { shuffle } from './src/utils.js';

function getDeckNameFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("deck") || "deck1"; // デフォルトは deck1
}

function initializeGame() {
    setSelectedCores([]); // 選択されたコアを初期化
    const deckName = getDeckNameFromURL();
    const loadedDeck = JSON.parse(localStorage.getItem(deckName)) || [];
    const fixedCardName = localStorage.getItem("fixedCardName");

    setDeck(loadedDeck.map(name => ({ id: `card-${cardIdCounter++}`, name, isRotated: false, isExhausted: false, coresOnCard: [] }))); // coresOnCard: [] を追加
    shuffle(deck);

    if (fixedCardName) {
        const fixedCardIndex = deck.findIndex(card => card.name === fixedCardName);
        if (fixedCardIndex > -1) {
            const [fixedCard] = deck.splice(fixedCardIndex, 1);
            hand.push(fixedCard);
        }
    }

    const initialHandSize = 4;
    while (hand.length < initialHandSize && deck.length > 0) {
        hand.push(deck.shift());
    }

    renderAll();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    setupEventListeners();
});
