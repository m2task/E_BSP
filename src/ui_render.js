// src/ui_render.js
import { deck, hand, field, trash, burst, lifeCores, reserveCores, countCores, trashCores, selectedCores, cardPositions, countShowCountAsNumber, openArea, handPinned } from './game_data.js';
import { handleCoreClick } from './core_logic.js'; // 修正: event_handlers.js から core_logic.js に変更
import { updateMagnifierEventListeners } from './magnify_logic.js';

export function updateCardState(cardElement, cardData) {
    if (cardData.isRotated) {
        cardElement.classList.add('rotated');
    } else {
        cardElement.classList.remove('rotated');
    }

    if (cardData.isExhausted) {
        cardElement.classList.add('exhausted');
    } else {
        cardElement.classList.remove('exhausted');
    }
}

export function createCardElement(cardData) {
    const div = document.createElement('div');
    div.className = 'card';
    div.draggable = true;
    div.dataset.id = cardData.id;

    if (cardData.isSpecial) {
        // Only add the special-card class for tensei, not for tokens
        if (cardData.specialType === 'tensei') {
            div.classList.add('special-card');
        }
        // Still add the data-attribute for both, as it's used for sizing and other logic
        if (cardData.specialType) {
            div.dataset.cardType = cardData.specialType;
        }
    }

    if (cardData.imgDataUrl) {
        const img = document.createElement('img');
        img.dataset.src = cardData.imgDataUrl; // srcをdata-srcに変更
        img.src = ''; // srcを空に設定
        img.classList.add('lazy-load'); // lazy-loadクラスを追加
        img.alt = cardData.name || 'Card Image';
        img.draggable = false; // 画像自体のドラッグを禁止する
        div.appendChild(img);
    } else {
        // Fallback for cards without imgDataUrl (e.g., if only name is provided)
        const nameDiv = document.createElement('div');
        nameDiv.className = 'card-name-fallback';
        nameDiv.textContent = cardData.name;
        div.appendChild(nameDiv);
    }

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
        updateCardState(cardElement, card); // renderAll() の代わりに個別の状態更新関数を呼ぶ
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
        const pos = cardPositions[cardData.id];
        if (pos) {
            cardElement.style.position = 'absolute';
            cardElement.style.left = pos.left + 'px';
            cardElement.style.top = pos.top + 'px';
        }
        // 回転状態を反映
        updateCardState(cardElement, cardData);

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

export function renderCardCores(cardId) {
    const cardData = field.find(c => c.id === cardId);
    if (!cardData) return;

    const cardElement = document.querySelector(`.card[data-id="${cardId}"]`);
    if (!cardElement) return;

    // Remove existing cores container
    const existingCoresContainer = cardElement.querySelector('.cores-on-card');
    if (existingCoresContainer) {
        existingCoresContainer.remove();
    }

    // Re-render cores if any
    if (cardData.coresOnCard && cardData.coresOnCard.length > 0) {
        const coresContainer = document.createElement('div');
        coresContainer.className = 'cores-on-card';
        cardData.coresOnCard.forEach((core, index) => {
            const coreDiv = document.createElement('div');
            coreDiv.className = `core ${core.type}`;
            coreDiv.draggable = true;
            coreDiv.dataset.index = index;
            coreDiv.dataset.coreType = core.type;
            coreDiv.dataset.sourceCardId = cardData.id;
            coreDiv.style.position = 'absolute';
            coreDiv.style.left = core.x + 'px';
            coreDiv.style.top = core.y + 'px';
            coreDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                handleCoreClick(e);
            });
            const isSelected = selectedCores.some(c => c.sourceCardId === cardData.id && c.index === index);
            if (isSelected) {
                coreDiv.classList.add('selected');
            }
            coresContainer.appendChild(coreDiv);
        });
        cardElement.appendChild(coresContainer);
    }
}

export function renderTrash() {
    const trashFrame = document.getElementById("trashCard");
    trashFrame.innerHTML = ""; // Clear it
    if (trash.length > 0) {
        const topCardData = trash[trash.length - 1];
        if (topCardData) { // Check if the card data exists
            const cardElement = createCardElement(topCardData);
            // The card in the trash pile view is just a preview, not interactive.
            cardElement.draggable = false;
            cardElement.style.cursor = 'default'; // Change cursor to indicate not interactive
            trashFrame.appendChild(cardElement);
        }
    }
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
    if (!container) {
        alert(`Error: Container with ID '${containerId}' not found.`);
        return;
    }
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

    // Update magnifier listeners on all cards after every render
    updateMagnifierEventListeners();
}

export function renderOpenArea() {
    const openAreaZone = document.getElementById("openArea");
    const openAreaModal = document.getElementById('openAreaModal');
    openAreaZone.innerHTML = "";

    if (openArea.length === 0) {
        openAreaModal.style.display = 'none'; // カードがなければモーダルを非表示
        return;
    }

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

export function showCostModal(cardData, callback, cancelCallback) {
    const costModal = document.getElementById('costModal');
    const costGrid = document.getElementById('costGrid');
    costGrid.innerHTML = '';

    for (let i = 1; i <= 8; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.addEventListener('click', () => {
            costModal.style.display = 'none';
            callback(i);
        });
        costGrid.appendChild(button);
    }

    const nButton = document.createElement('button');
    nButton.textContent = 'n';
    nButton.addEventListener('click', () => {
        const customCost = prompt('支払うコストの数を入力してください。', '0');
        const cost = parseInt(customCost, 10);
        if (!isNaN(cost) && cost >= 0) {
            costModal.style.display = 'none';
            callback(cost);
        }
    });
    costGrid.appendChild(nButton);

    costModal.style.display = 'flex';

    const closeModalOnClickOutside = (e) => {
        // モーダルコンテンツ自体がクリックされた場合は閉じない
        if (e.target.closest('.modal-content')) {
            return;
        }
        // モーダルの背景がクリックされた場合のみ閉じる
        if (e.target === costModal) {
            costModal.style.display = 'none';
            if (cancelCallback) cancelCallback();
            costModal.removeEventListener('click', closeModalOnClickOutside);
        }
    };
    costModal.addEventListener('click', closeModalOnClickOutside);
}


// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    renderAll();
});
