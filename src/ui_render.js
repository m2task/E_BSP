// src/ui_render.js
import { deck, hand, field, trash, burst, lifeCores, reserveCores, countCores, trashCores, selectedCores, cardPositions, countShowCountAsNumber, openArea, handPinned } from './game_data.js';
import { handleCoreClick } from './core_logic.js'; // 修正: event_handlers.js から core_logic.js に変更

export function createCardElement(cardData) {
    const div = document.createElement('div');
    div.className = 'card';
    div.textContent = cardData.name;
    div.draggable = true;
    div.dataset.id = cardData.id;

    const exhaustBtn = document.createElement('button');
    exhaustBtn.className = 'exhaust-button';
    exhaustBtn.textContent = '重疲労';
    exhaustBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardElement = e.target.closest('.card');
        const cardId = cardElement.dataset.id;
        const card = field.find(c => c.id === cardId);
        if (!card) return;

        if (card.isExhausted) {
            card.isExhausted = false;
        } else {
            card.isExhausted = true;
            card.isRotated = false; // 重疲労させたら疲労は解除
        }
        renderAll(); // 状態変更を反映するために再描画
    });
    div.appendChild(exhaustBtn);
    return div;
}

export function renderHand() {
    const handZone = document.getElementById("handZone");
    handZone.innerHTML = "";
    hand.forEach(cardData => {
        const cardElement = createCardElement(cardData);
        handZone.appendChild(cardElement);
    });
    document.getElementById("handCount").textContent = hand.length;

    const handZoneContainer = document.getElementById('handZoneContainer');
    const openHandButton = document.getElementById('openHandButton');

    if (handPinned) {
        handZoneContainer.classList.remove('collapsed');
        openHandButton.classList.add('hidden'); // 固定時は常に非表示
    } else {
        // 固定されていない場合、手札が閉じている時のみopenHandButtonを表示
        if (handZoneContainer.classList.contains('collapsed')) {
            openHandButton.classList.remove('hidden');
        } else {
            openHandButton.classList.add('hidden');
        }
    }
}

export function renderField() {
    const fieldZone = document.getElementById("fieldCards");
    fieldZone.innerHTML = "";
    field.forEach(cardData => {
        const cardElement = createCardElement(cardData);
        cardElement.style.position = 'absolute'; // すべてのフィールドカードに適用
        const pos = cardPositions[cardData.id];
        if (pos) {
            cardElement.style.left = pos.left + 'px';
            cardElement.style.top = pos.top + 'px';
        } else {
            // 位置情報がない場合のデフォルト（左上隅）
            cardElement.style.left = '0px';
            cardElement.style.top = '0px';
        }
        // 回転状態を反映
        if (cardData.isRotated) cardElement.classList.add('rotated');
        if (cardData.isExhausted) cardElement.classList.add('exhausted');

        // カード上のコアを描画
        if (cardData.coresOnCard && cardData.coresOnCard.length > 0) {
            const coresContainer = document.createElement('div');
            coresContainer.className = 'cores-on-card'; // 新しいクラスを追加
            cardData.coresOnCard.forEach((core, index) => {
                const coreDiv = document.createElement('div');
                coreDiv.className = `core ${core.type}`;
                coreDiv.draggable = true;
                coreDiv.dataset.index = index; // カード上のコアのインデックス
                coreDiv.dataset.coreType = core.type;
                coreDiv.dataset.sourceCardId = cardData.id; // コアの親カードID
                coreDiv.style.position = 'absolute';
                coreDiv.style.left = core.x + 'px';
                coreDiv.style.top = core.y + 'px';
                coreDiv.addEventListener('click', (e) => {
                    e.stopPropagation(); // コアのクリックがカードの回転イベントに伝播しないようにする
                    handleCoreClick(e); // ここでhandleCoreClickを呼び出す
                });
                // 選択状態を反映
                const isSelected = selectedCores.some(c => {
                    // selectedCores内の要素がsourceCardIdを持つ場合のみ比較
                    return c.sourceCardId && c.sourceCardId === cardData.id && c.index === index;
                });
                if (isSelected) {
                    coreDiv.classList.add('selected');
                }
                coresContainer.appendChild(coreDiv);
            });
            cardElement.appendChild(coresContainer);
        }

        fieldZone.appendChild(cardElement);
    });
}

export function renderTrash() {
    const trashFrame = document.getElementById("trashCard");
    trashFrame.innerHTML = trash.length > 0 ? `<div class='card'>${trash[trash.length - 1].name}</div>` : "";
}

export function renderBurst() {
    const burstZone = document.getElementById("burstCard");
    burstZone.innerHTML = "";
    burst.forEach((cardData, i) => {
        const div = createCardElement(cardData);
        div.style.position = 'absolute';
        div.style.left = (i * 30) + 'px';
        div.style.zIndex = i + 1;
        burstZone.appendChild(div);
    });
}

export function renderCores(containerId, coreArray) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    coreArray.forEach((coreType, index) => {
        const div = document.createElement("div");
        div.className = `core ${coreType}`;
        div.draggable = true;
        div.dataset.index = index;
        div.dataset.coreType = coreType;
        div.addEventListener('click', handleCoreClick); // ここでhandleCoreClickを呼び出す
        // 選択状態を反映
        const isSelected = selectedCores.some(c => {
            // selectedCores内の要素がsourceArrayNameを持つ場合のみ比較
            return c.sourceArrayName && c.sourceArrayName === containerId && c.index === index;
        });
        if (isSelected) {
            div.classList.add('selected');
        }
        container.appendChild(div);
    });
}

export function renderDeckCore() {
    const countZone = document.getElementById("countZone");
    const countSummary = document.getElementById("countCoreSummary");
    const n = countCores.length;
    if (countShowCountAsNumber) {
        countSummary.textContent = `カウント: ${n}`;
        countSummary.style.display = 'block';
        countZone.style.display = 'none';
        countZone.classList.remove('core-move-mode');
    } else {
        countSummary.style.display = 'none';
        countZone.style.display = 'flex';
        countZone.classList.add('core-move-mode');
        renderCores('countZone', countCores);
    }
}

export function renderTrashCores() {
    const trashListArea = document.getElementById("trashListArea");
    trashListArea.innerHTML = "";
    if (trashCores.length === 0) {
        trashListArea.style.display = "none";
        return;
    }
    trashListArea.style.display = "flex";
    renderCores('trashListArea', trashCores);
}

export function renderDeck() {
    const deckButton = document.getElementById("deckButton");
    deckButton.innerHTML = `デッキ: ${deck.length}枚<div class="deck-zone-overlay top-zone"></div><div class="deck-zone-overlay bottom-zone"></div>`;
}

// --- 全体描画関数 ---
export function renderAll() {
    renderHand();
    renderField();
    renderTrash();
    renderBurst();
    renderCores("lifeCores", lifeCores);
    renderCores("reserveCores", reserveCores);
    renderDeckCore();
    renderTrashCores();
    renderDeck();
    renderOpenArea();

    const pinHandButton = document.getElementById('pinHandButton');
    if (pinHandButton) {
        pinHandButton.textContent = handPinned ? '解除' : '固定';
    }

    if (document.getElementById("trashModal").style.display === "flex") {
        renderTrashModalContent();
    }
}

export function renderOpenArea() {
    const openAreaZone = document.getElementById("openArea");
    openAreaZone.innerHTML = "";
    openArea.forEach(cardData => {
        const cardElement = createCardElement(cardData);
        cardElement.dataset.sourceZoneId = 'openArea';
        openAreaZone.appendChild(cardElement);
    });
}

export function renderTrashModalContent() {
    const content = document.getElementById("trashModalContent");
    content.innerHTML = "";
    if (trash.length === 0) {
        document.getElementById("trashModal").style.display = "none";
        return;
    }
    trash.forEach(cardData => {
        const div = createCardElement(cardData);
        div.dataset.sourceZoneId = 'trashModalContent';
        content.appendChild(div);
    });
}


// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    renderAll();
});
