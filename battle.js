// main.js
import { deck, hand, field, cardIdCounter, setDeck, setHand, setCardIdCounter, setSelectedCores, setLifeCores, setReserveCores, setCountCores, setTrashCores } from './src/game_data.js';
import { setupEventListeners } from './src/event_handlers.js';
import { renderAll } from './src/ui_render.js';
import { shuffle } from './src/utils.js';
import { cancelPayment } from './src/core_logic.js';

function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        deckName: params.get("deck") || "deck1",
        useContract: params.get("contract") === "true"
    };
}

async function initializeGame() {
    setSelectedCores([]);
    setLifeCores(["blue", "blue", "blue", "blue", "blue"]);
    setReserveCores(["blue", "blue", "blue", "soul"]);
    setCountCores([]);
    setTrashCores([]);
    setHand([]); // Clear hand at the beginning

    const params = new URLSearchParams(window.location.search);
    const deckName = params.get('deckName');
    const useContract = params.get('useContract') === 'true';

    if (!deckName) {
        console.error("No deck name found in URL.");
        renderAll();
        return;
    }

    const loadedDeck = await window.cardGameDB.loadDeck(deckName);

    if (!loadedDeck) {
        console.error("No battle deck found in IndexedDB.");
        // Optionally, load a default deck or show an error
        renderAll();
        return;
    }

    // Set contract card flag if needed
    if (useContract && loadedDeck.length > 0) {
        // Clear any existing contract card flags first
        loadedDeck.forEach(card => {
            if (card.isContractCard) {
                delete card.isContractCard;
            }
        });
        // Mark the first card as the contract card
        loadedDeck[0].isContractCard = true;
    }

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
    document.getElementById('cancelPaymentButton').addEventListener('click', cancelPayment);
});
