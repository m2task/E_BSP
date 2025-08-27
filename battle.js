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
    setSelectedCores([]);
    setLifeCores(["blue", "blue", "blue", "blue", "blue"]);
    setReserveCores(["blue", "blue", "blue", "soul"]);
    setCountCores([]);
    setTrashCores([]);
    setHand([]); // Clear hand at the beginning

    const currentBattleDeckJson = localStorage.getItem('currentBattleDeck');
    if (!currentBattleDeckJson) {
        console.error("No battle deck found in localStorage.");
        // Optionally, load a default deck or show an error
        renderAll();
        return;
    }

    const loadedDeck = JSON.parse(currentBattleDeckJson);
    localStorage.removeItem('currentBattleDeck'); // Clean up

    // Expand deck from quantities and preserve isContractCard flag
    let currentCardId = cardIdCounter;
    let fullDeck = [];
    loadedDeck.forEach(cardData => {
        for (let i = 0; i < cardData.quantity; i++) {
            const newCard = {
                id: `card-${currentCardId++}`,
                name: cardData.name,
                imgDataUrl: cardData.imgDataUrl,
                isRotated: false,
                isExhausted: false,
                coresOnCard: []
            };
            // If this is the first instance of a contract card, mark it.
            if (cardData.isContractCard && i === 0) {
                newCard.isContractCard = true;
            }
            fullDeck.push(newCard);
        }
    });
    setCardIdCounter(currentCardId);

    // Separate contract card from the deck
    const contractCardIndex = fullDeck.findIndex(card => card.isContractCard);
    let deckToShuffle = [...fullDeck];
    let initialHand = [];

    if (contractCardIndex > -1) {
        // If contract card is found
        const contractCard = deckToShuffle.splice(contractCardIndex, 1)[0];
        initialHand.push(contractCard); // Add contract card to hand first
    }

    // Shuffle the rest of the deck
    shuffle(deckToShuffle);
    setDeck(deckToShuffle);

    // Draw cards until hand size is 4
    const initialHandSize = 4;
    while (initialHand.length < initialHandSize && deck.length > 0) {
        initialHand.push(deck.shift());
    }
    setHand(initialHand);

    console.log("Initialized Deck:", deck);
    console.log("Initialized Hand:", hand);
    console.log("Field:", field);

    renderAll();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    setupEventListeners();
});
