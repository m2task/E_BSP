let deck = [];
let currentDeck = 'deck1'; // 現在編集中のデッキ
let toastTimeout;

// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    const deckSelector = document.getElementById('deckSelector');
    deckSelector.addEventListener('change', (e) => {
        currentDeck = e.target.value;
        loadDeck();
    });
    loadDeck(); // 初期ロード
});

// --- デッキ操作 ---
function loadDeck() {
    const savedData = localStorage.getItem(currentDeck);
    if (savedData) {
        const { deck: savedDeck, includeFirstCard } = JSON.parse(savedData);
        deck = savedDeck || [];
        document.getElementById('includeFirstCard').checked = includeFirstCard || false;
    } else {
        deck = [];
        document.getElementById('includeFirstCard').checked = false;
    }
    updateList();
}

function saveDeck() {
    const includeFirstCard = document.getElementById('includeFirstCard').checked;
    const dataToSave = {
        deck: deck,
        includeFirstCard: includeFirstCard
    };
    localStorage.setItem(currentDeck, JSON.stringify(dataToSave));
    showToast(`${currentDeck} を保存しました。`);
}

function showToast(message) {
    const toastElement = document.getElementById("toast");
    toastElement.textContent = message;
    toastElement.className = "toast show";
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toastElement.className = toastElement.className.replace("show", "");
    }, 3000);
}

function addCard() {
    const input = document.getElementById("cardName").value.trim();
    if (!input) return;

    const match = input.match(/^(.+?)(?:[×\*xX](\d+))?$/);
    if (match) {
        const name = match[1].trim();
        const count = parseInt(match[2] || "1", 10);
        for (let i = 0; i < count; i++) {
            deck.push(name);
        }
        updateList();
        document.getElementById("cardName").value = "";
    }
}

function updateList() {
    const ul = document.getElementById("deckList");
    ul.innerHTML = "";

    const cardCounts = {};
    deck.forEach(card => {
        cardCounts[card] = (cardCounts[card] || 0) + 1;
    });

    const uniqueCardsInOrder = [...new Set(deck)];

    for (const card of uniqueCardsInOrder) {
        const li = document.createElement("li");
        li.className = "card-item";

        li.innerHTML = `
<span>${card}</span>
<div style="display: flex; align-items: center;">
    <button onclick="decrementCard('${card}')" style="margin-right: 5px;">-</button>
    <span style="min-width: 20px; text-align: center;">${cardCounts[card]}</span>
    <button onclick="incrementCard('${card}')" style="margin-left: 5px; margin-right: 10px;">+</button>
    <button onclick="deleteAllOfCard('${card}')">削除</button>
</div>
`;
        ul.appendChild(li);
    }

    document.getElementById("cardCount").textContent = `現在のデッキ枚数: ${deck.length}枚`;
}

function incrementCard(name) {
    deck.push(name);
    updateList();
}

function decrementCard(name) {
    const index = deck.indexOf(name);
    if (index > -1) {
        deck.splice(index, 1);
        updateList();
    }
}

function deleteAllOfCard(name) {
    deck = deck.filter(card => card !== name);
    updateList();
}

function exportDeck() {
    document.getElementById("deckData").value = JSON.stringify(deck, null, 2);
    alert("デッキをコピーしておくと、別の端末でも再利用できます！");
}

function importDeck() {
    try {
        const input = document.getElementById("deckData").value;
        const imported = JSON.parse(input);
        if (Array.isArray(imported)) {
            deck = imported;
            updateList();
        } else {
            alert("形式が正しくありません！");
        }
    } catch (e) {
        alert("インポートに失敗しました（JSON形式が正しいか確認してください）");
    }
}

function goToBattle(deckId) {
    const includeFirstCard = document.getElementById('includeFirstCard').checked;
    window.open(`battle.html?deck=${deckId}&contract=${includeFirstCard}`, '_blank');
}