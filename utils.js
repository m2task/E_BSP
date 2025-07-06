export function getDeckNameFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("deck") || "deck1"; // デフォルトは deck1
}

export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export function getZoneName(element) {
    const id = element.id;
    if (id.includes('field')) return 'field';
    if (id.includes('hand')) return 'hand';
    if (id.includes('trash')) return 'trash';
    if (id.includes('burst')) return 'burst';
    if (element.classList.contains('deck-button')) return 'deck';
    if (id.includes('life')) return 'life';
    if (id.includes('reserve')) return 'reserve';
    if (id.includes('count') || id.includes('deckCore')) return 'count';
    if (id.includes('void')) return 'void';
    return null;
}

// getArrayByZoneName はグローバル変数に依存するため、後で battle.js からインポートするように調整します
// 現時点では、battle.js に残しておきます。

// showToast はグローバル変数 toastTimeout に依存するため、後で battle.js からインポートするように調整します
// 現時点では、battle.js に残しておきます。

// clearSelectedCores はグローバル変数 selectedCores に依存するため、後で battle.js からインポートするように調整します
// 現時点では、battle.js に残しておきます。
