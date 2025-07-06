// src/ui_render.js
import { deck, hand, field, trash, burst, lifeCores, reserveCores, countCores, trashCores, selectedCores, cardPositions, countShowCountAsNumber, openArea, handPinned, paymentState, moveState } from './game_data.js';
import { handleCoreClick } from './core_logic.js';
import { updateMagnifierEventListeners } from './magnify_logic.js';
import { showToast } from './utils.js';

let maintainCoreTimeoutTimer = null; // setTimeout用のタイマーID
let maintainCoreIntervalTimer = null; // setInterval用のタイマーID
let maintainCoreButtonHandler = null; // イベントハンドラを保持する変数
let maintainCoreCancelHandler = null; // キャンセルボタンのイベントハンドラ

export function createCardElement(cardData) {
    const div = document.createElement('div');
    div.className = 'card';
    div.draggable = true;
    div.dataset.id = cardData.id;

    if (cardData.isSpecial) {
        // Add the special-card class for tensei and tokens
        if (cardData.specialType === 'tensei' || cardData.specialType === 'token') {
            div.classList.add('special-card');
        }
        // Still add the data-attribute for both, as it's used for sizing and other logic
        if (cardData.specialType) {
            div.dataset.cardType = cardData.specialType;
        }
    }

    if (cardData.imgDataUrl) {
        const img = document.createElement('img');
        img.src = cardData.imgDataUrl;
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
        const pos = cardPositions[cardData.id];
        if (pos) {
            cardElement.style.position = 'absolute';
            cardElement.style.left = pos.left + 'px';
            cardElement.style.top = pos.top + 'px';
        }
        // 回転状態を反映
        if (cardData.isRotated) cardElement.classList.add('rotated');
        if (cardData.isExhausted) cardElement.classList.add('exhausted');

        // コスト支払い中のスタイルを適用
        if (paymentState.isPaying && paymentState.source === 'field' && cardData.coresOnCard.length > 0) {
            cardElement.classList.add('payable');
        }

        // 維持コアシステムの移動元選択中のスタイルを適用
        if (moveState.isMoving && cardData.coresOnCard.length > 0 && (!moveState.targetCard || moveState.targetCard.id !== cardData.id)) {
            cardElement.classList.add('payable'); // 同じハイライトスタイルを流用
        }

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

    // 支払いキャンセルボタンの表示制御
    const cancelButton = document.getElementById('cancelPaymentButton');
    if (paymentState.isPaying && paymentState.source === 'field') {
        cancelButton.classList.remove('hidden');
    } else {
        cancelButton.classList.add('hidden');
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

    const hideInfoToast = () => showToast('infoToast', '', { hide: true }); // ★追加

    // 1-8 のコストボタン
    for (let i = 1; i <= 8; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.addEventListener('click', () => {
            hideInfoToast(); // ★追加
            costModal.style.display = 'none';
            callback(i);
        });
        costGrid.appendChild(button);
    }

    // n のコストボタン
    const nButton = document.createElement('button');
    nButton.textContent = 'n';
    nButton.addEventListener('click', () => {
        hideInfoToast(); // ★追加
        const customCost = prompt('支払うコストの数を入力してください。', '0');
        const cost = parseInt(customCost, 10);
        if (!isNaN(cost) && cost >= 0) {
            costModal.style.display = 'none';
            callback(cost);
        }
    });
    costGrid.appendChild(nButton);

    costModal.style.display = 'flex';
    showToast('infoToast', 'モーダル外をクリックでコストを支払わない', { duration: 1500 }); // ★追加

    const closeModalOnClickOutside = (e) => {
        // モーダルコンテンツ自体がクリックされた場合は閉じない
        if (e.target.closest('.modal-content')) {
            return;
        }
        // モーダルの背景がクリックされた場合のみ閉じる
        if (e.target === costModal) {
            hideInfoToast(); // ★追加
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

export function showConfirmationModal(message, onConfirm, onCancel) {
  const modal = document.getElementById('confirmationModal');
  const messageElement = document.getElementById('confirmationMessage');
  const confirmButton = document.getElementById('confirmButton');
  const cancelButton = document.getElementById('cancelButton');

  messageElement.textContent = message;

  // --- イベントリスナーのクリーンアップと再設定 ---
  const newConfirmButton = confirmButton.cloneNode(true);
  confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

  const newCancelButton = cancelButton.cloneNode(true);
  cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

  // --- リスナーの定義 ---
  const handleConfirm = () => {
    closeModal();
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    closeModal();
    if (onCancel) onCancel();
  };

  const handleClickOutside = (e) => {
    if (e.target === modal) { // 背景部分がクリックされた場合のみ
      handleCancel();
    }
  };

  const closeModal = () => {
    modal.style.display = 'none';
    // イベントリスナーを削除
    modal.removeEventListener('click', handleClickOutside);
    newConfirmButton.removeEventListener('click', handleConfirm);
    newCancelButton.removeEventListener('click', handleCancel);
  };

  // --- リスナーの設定 ---
  newConfirmButton.addEventListener('click', handleConfirm);
  newCancelButton.addEventListener('click', handleCancel);
  modal.addEventListener('click', handleClickOutside);

  // --- モーダルの表示 ---
  modal.style.display = 'flex';
}

export function showMaintainCoreButton(onYes, onNo) {
    const container = document.getElementById('maintainCoreContainer');
    const button = document.getElementById('maintainCoreButton');
    const originalText = '維持コアを置く';
    let remainingTime = 3;

    // 既存のタイマーやリスナーがあればクリア
    cancelMaintainCore();

    container.style.display = 'block';
    button.textContent = `${originalText} (${remainingTime})`;

    // 1秒ごとにテキストを更新するインターバルを開始
    maintainCoreIntervalTimer = setInterval(() => {
        remainingTime--;
        if (remainingTime >= 0) {
            button.textContent = `${originalText} (${remainingTime})`;
        }
    }, 1000);

    // イベントハンドラを定義
    maintainCoreButtonHandler = () => {
        cancelMaintainCore();
        if (onYes) onYes();
    };

    button.addEventListener('click', maintainCoreButtonHandler);

    // 3秒後に実行されるタイムアウト
    maintainCoreTimeoutTimer = setTimeout(() => {
        cancelMaintainCore();
        if (onNo) onNo();
    }, 3000);
}

export function cancelMaintainCore() {
    if (maintainCoreTimeoutTimer) {
        clearTimeout(maintainCoreTimeoutTimer);
        maintainCoreTimeoutTimer = null;
    }
    if (maintainCoreIntervalTimer) {
        clearInterval(maintainCoreIntervalTimer);
        maintainCoreIntervalTimer = null;
    }

    const container = document.getElementById('maintainCoreContainer');
    if (container) {
        container.style.display = 'none';
    }

    const button = document.getElementById('maintainCoreButton');
    if (button && maintainCoreButtonHandler) {
        button.removeEventListener('click', maintainCoreButtonHandler);
        maintainCoreButtonHandler = null;
        button.textContent = '維持コアを置く';
    }
}

let summonActionTimeoutTimer = null;
let summonButtonHandler = null;
let placeCoreButtonHandler = null;

export function showSummonActionChoice({ onSummon, onPlaceCore, onCancel }) {
    hideSummonActionChoice(); // 既存のタイマーやリスナーをクリア

    const container = document.getElementById('summonActionContainer');
    const summonButton = document.getElementById('summonButton');
    const placeCoreButton = document.getElementById('placeCoreButton');
    if (!container || !summonButton || !placeCoreButton) return;

    // 念のため、強制表示処理を維持
    container.remove();
    document.body.appendChild(container);

    // 「コストを支払う」ボタンの設定
    if (onSummon) {
        summonButton.style.display = 'block';
        summonButtonHandler = () => {
            hideSummonActionChoice();
            onSummon();
        };
        summonButton.addEventListener('click', summonButtonHandler);
    } else {
        summonButton.style.display = 'none';
    }

    // 「維持コアを置く」ボタンの設定
    if (onPlaceCore) {
        placeCoreButton.style.display = 'block';
        placeCoreButtonHandler = () => {
            hideSummonActionChoice();
            onPlaceCore();
        };
        placeCoreButton.addEventListener('click', placeCoreButtonHandler);
    } else {
        placeCoreButton.style.display = 'none';
    }

    // コンテナを表示し、タイムアウトを設定
    container.style.display = 'flex';
    summonActionTimeoutTimer = setTimeout(() => {
        hideSummonActionChoice();
        if (onCancel) onCancel();
    }, 3000);
}

export function hideSummonActionChoice() {
    if (summonActionTimeoutTimer) {
        clearTimeout(summonActionTimeoutTimer);
        summonActionTimeoutTimer = null;
    }

    const container = document.getElementById('summonActionContainer');
    if (container) {
        container.style.display = 'none';
    }

    const summonButton = document.getElementById('summonButton');
    if (summonButton && summonButtonHandler) {
        summonButton.removeEventListener('click', summonButtonHandler);
        summonButtonHandler = null;
    }

    const placeCoreButton = document.getElementById('placeCoreButton');
    if (placeCoreButton && placeCoreButtonHandler) {
        placeCoreButton.removeEventListener('click', placeCoreButtonHandler);
        placeCoreButtonHandler = null;
    }
}

