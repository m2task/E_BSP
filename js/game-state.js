
export let deck = [];
export let field = [];
export let hand = [];
export let trash = [];
export let burst = [];

export let lifeCores = ["blue", "blue", "blue", "blue", "blue"];
export let reserveCores = ["blue", "blue", "blue", "soul"];
export let deckCores = [];
export let trashCores = [];

export let voidChargeCount = 0;
export let cardIdCounter = 0;
export let cardPositions = {}; // { cardId: { left, top } }
export let deckShowCountAsNumber = true; // game-state.js で管理

export function initializeGame() {
    console.log('game-state.js: initializeGame called.');
    const loadedDeck = JSON.parse(localStorage.getItem("deck"));
    const fixedCardName = localStorage.getItem("fixedCardName");

    let initialDeck = loadedDeck && loadedDeck.length > 0 ? loadedDeck : ["カードA", "カードB", "カードC", "カードD", "カードE", "カードF", "カードG", "カードH"]; // デフォルトのカード名

    deck = initialDeck.map(name => ({ id: `card-${cardIdCounter++}`, name, isRotated: false, isExhausted: false, coresOnCard: [] }));
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
    console.log('game-state.js: Deck after initialization:', deck);
    console.log('game-state.js: Hand after initialization:', hand);
}

export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 状態更新関数 (必要に応じて追加)
export function updateVoidChargeCount(count) {
    voidChargeCount = count;
}

export function incrementCardIdCounter() {
    cardIdCounter++;
}
