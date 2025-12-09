// src/event_handlers.js
import { draggedElement, offsetX, offsetY, cardPositions, voidChargeCount, selectedCores, draggedCoreData, setDraggedElement, setOffsetX, setOffsetY, setVoidChargeCount, setSelectedCores, setDraggedCoreData, field, countCores, countShowCountAsNumber, setCountShowCountAsNumber, reserveCores, trashCores, hand, trash, handPinned, setHandPinned, touchDraggedElement, initialTouchX, initialTouchY, currentTouchX, currentTouchY, touchOffsetX, touchOffsetY, setTouchDraggedElement, setInitialTouchX, setInitialTouchY, setCurrentTouchX, setCurrentTouchY, setTouchOffsetX, setTouchOffsetY, isDragging, setIsDragging, paymentState, moveState } from './game_data.js';
import { renderAll, renderTrashModalContent, showSummonActionChoice, showCostModal } from './ui_render.js';
import { showToast, getZoneName, isMobileDevice, getArrayByZoneName } from './utils.js';
import { hideMagnifier } from './magnify_logic.js';
import { drawCard, moveCardData, openDeck, discardDeck, createSpecialCardOnField, discardAllOpenCards, startPaymentProcess } from './card_logic.js';
import { handleCoreClick, clearSelectedCores, handleCoreDropOnCard, handleCoreInternalMoveOnCard, handleCoreDropOnZone, payCost, payCostFromField, cancelPayment, moveCoreFromField, cancelCoreMove, placeCoreOnSummonedCard } from './core_logic.js';

export function setupEventListeners() {
    // デッキボタンのドラッグイベントリスナーを追加
    const deckButton = document.querySelector('.deck-button');
    deckButton.addEventListener('dragenter', handleDeckDragEnter);
    deckButton.addEventListener('dragleave', handleDeckDragLeave);
    deckButton.addEventListener('dragover', handleDeckDragOver);
    deckButton.addEventListener('drop', handleDeckDrop);

    // フィールドのカードクリックイベント（回転またはコスト支払い）
    document.getElementById('fieldCards').addEventListener('click', (e) => {
        const cardElement = e.target.closest('.card');
        if (!cardElement || e.target.classList.contains('exhaust-button')) {
            return;
        }
        
        showToast('infoToast', '', { hide: true });

        const cardId = cardElement.dataset.id;
        const cardData = field.find(card => card.id === cardId);
        if (!cardData) return;

        // 維持コアシステムのコア移動中の処理
        if (moveState.isMoving) {
            const sourceCard = cardData;
            const targetCard = moveState.targetCard;

            // 移動先と同じカードをクリックしたらキャンセル
            if (sourceCard.id === targetCard.id) {
                cancelCoreMove();
                return;
            }

            // コアがないカードをクリックしたらエラー
            if (sourceCard.coresOnCard.length === 0) {
                showToast('errorToast', 'このカードには移動できるコアがありません。', { duration: 1000 });
                return;
            }

            // コアを移動
            moveCoreFromField(sourceCard, targetCard);
            return; // 移動処理の後は回転処理を行わない
        }

        // コスト支払い中の処理
        if (paymentState.isPaying && paymentState.source === 'field') {
            if (cardData.coresOnCard.length === 0) {
                showToast('errorToast', 'このカードには支払えるコアがありません。', { duration: 1000 });
                return;
            }

            const amountToPayStr = prompt(`このカードから支払うコアの数を入力してください (最大: ${cardData.coresOnCard.length})`, "1");

            if (amountToPayStr === null) {
                // プロンプトのキャンセルは何もしない（ユーザーが別のカードを選び直せるように）
                return;
            }

            const amount = parseInt(amountToPayStr, 10);

            if (isNaN(amount) || amount <= 0) {
                showToast('errorToast', '無効な値です。', { duration: 1000 });
                return;
            }

            if (amount <= cardData.coresOnCard.length) {
                payCostFromField(cardId, amount);
            } else {
                showToast('errorToast', '指定された数のコアはありません。', { duration: 1000 });
            }
            return; // 支払い処理の後は回転処理を行わない
        }

        // 通常の回転処理
        if (cardData.isRotated) {
            cardData.isRotated = false;
        } else {
            cardData.isRotated = true;
            cardData.isExhausted = false; // 疲労させたら重疲労は解除
        }
        renderAll(); // 状態変更を反映するために再描画
    });

    // 画面のどこかをクリックしたらコアの選択を解除
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.core')) {
            clearSelectedCores();
        }
        // ボイドアイコン以外の場所をクリックしたらチャージ数をリセット
        if (e.target.id !== 'voidCore') {
            setVoidChargeCount(0);
            showToast('voidToast', '', { hide: true }); // トーストを非表示にする
        }
    });

    document.querySelector('.deck-button').addEventListener('click', (e) => {
        e.stopPropagation(); // イベントの伝播を停止
        const deckButton = e.currentTarget;
        const rect = deckButton.getBoundingClientRect();
        const clickY = e.clientY - rect.top; // ボタン内でのクリックY座標
        const buttonHeight = rect.height;

        // ボタンの高さの2/3を計算
        const twoThirdsHeight = buttonHeight * (2 / 3);

        if (clickY <= twoThirdsHeight) {
            // 上2/3をクリックした場合
            drawCard(false); // 上からドロー
        } else {
            // 下1/3をクリックした場合
            drawCard(true); // 下からドロー
        }
    });

    const handZoneContainer = document.getElementById('handZoneContainer');
    const openHandButton = document.getElementById('openHandButton');
    const handToggle = document.getElementById('handToggle');

    if (isMobileDevice()) {
        // モバイルデバイスの場合：タッチイベントによるドラッグ＆ドロップ
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        // touchmove と touchend は handleTouchStart 内で動的に追加・削除する

        // モバイルデバイスの場合：タップで開閉
        // handToggle (手札を閉じるボタン) にクリックイベントを追加
        handToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // イベントの伝播を停止
            if (!handPinned) {
                handZoneContainer.classList.add('collapsed');
                openHandButton.classList.remove('hidden');
            }
        });

        // openHandButton (手札を開くボタン) にクリックイベントを追加
        openHandButton.addEventListener('click', (e) => {
            e.stopPropagation(); // イベントの伝播を停止
            if (!handPinned) {
                handZoneContainer.classList.remove('collapsed');
                openHandButton.classList.add('hidden');
            }
        });

        // 手札以外のエリアをタップで手札を閉じる
        document.addEventListener('click', (e) => {
            // クリックされた要素が手札コンテナ内、または openHandButton でない場合
            if (!handZoneContainer.contains(e.target) && e.target !== openHandButton) {
                // 手札が開いていて、かつ固定されていない場合のみ閉じる
                if (!handZoneContainer.classList.contains('collapsed') && !handPinned) {
                    handZoneContainer.classList.add('collapsed');
                    openHandButton.classList.remove('hidden');
                }
            }
        });
    } else {
        // PCの場合：マウスエンター/リーブで開閉
        openHandButton.addEventListener('mouseenter', () => {
            if (!handPinned) {
                handZoneContainer.classList.remove('collapsed');
                openHandButton.classList.add('hidden');
            }
        });

        handZoneContainer.addEventListener('mouseleave', () => {
            if (!handPinned) {
                handZoneContainer.classList.add('collapsed');
                openHandButton.classList.remove('hidden');
            }
        });
        // PCの場合のみ標準のドラッグ＆ドロップイベントを有効にする
        document.addEventListener('dragstart', handleDragStart);
        document.addEventListener('dragend', handleDragEnd);
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', handleDrop);
    }

    // ドラッグ中のカードが「手札を開く」ボタンの上に来たら手札を開く (これはデバイス共通で維持)
    openHandButton.addEventListener('dragover', (e) => {
        e.preventDefault(); // ドロップを許可するために必要
        if (draggedElement && draggedElement.classList.contains('card') && !handPinned) {
            handZoneContainer.classList.remove('collapsed');
            openHandButton.classList.add('hidden');
        }
    });

    // 手札固定ボタンのイベントリスナー
    document.getElementById('pinHandButton').addEventListener('click', (e) => {
        setHandPinned(!handPinned);
        const pinButton = e.currentTarget;
        if (handPinned) {
            pinButton.textContent = '解除';
            handZoneContainer.classList.remove('collapsed'); // 固定したら手札を開く
            openHandButton.classList.add('hidden'); // 固定中は開くボタンを非表示
        } else {
            pinButton.textContent = '固定';
            // 固定解除時は、手札が閉じている状態であれば開くボタンを表示
            if (handZoneContainer.classList.contains('collapsed')) {
                openHandButton.classList.remove('hidden');
            }
        }
    });

    document.getElementById('trashZoneTitle').addEventListener('click', openTrashModal);
    document.getElementById('addDeckCoreBtn').addEventListener('click', addDeckCore);
    document.getElementById('toggleDeckCoreBtn').addEventListener('click', toggleDeckCoreCount);
    document.getElementById('refreshButton').addEventListener('click', refreshAll);

    // ボイドアイコンのクリックイベント
    document.getElementById('voidCore').addEventListener('click', (e) => {
        e.stopPropagation(); // ドキュメント全体のクリックイベントが発火しないようにする
        setVoidChargeCount(voidChargeCount + 1);
        showToast('voidToast', ` ${voidChargeCount}個増やせます`, { duration: 1000 });
    });

    // 「デッキ登録画面へ」ボタンのクリックイベント
    document.getElementById('goToDeckRegisterButton').addEventListener('click', () => {
        if (confirm("デッキ登録画面に移動しますか？\n現在のゲーム状態は保存されません。")) {
            window.location.href = "index.html";
        }
    });

    document.getElementById('deckDiscardBtn').addEventListener('click', discardDeck);
    document.getElementById('deckOpenBtn').addEventListener('click', openDeck);
    document.getElementById('deckGaiButton').addEventListener('click', openDeckGaiModal);

    // 支払いキャンセルボタンのイベントリスナー
    document.getElementById('cancelPaymentButton').addEventListener('click', () => {
        cancelPayment();
    });

    // オープンエリアの全破棄ボタン
    document.getElementById('discardAllOpenBtn').addEventListener('click', discardAllOpenCards);
}

// --- 共通コア情報取得関数 ---
function getDraggedCoresInfo(draggedElement) {
    // ボイドコアの場合
    if (draggedElement.id === 'voidCore') {
        const count = voidChargeCount > 0 ? voidChargeCount : 1;
        return Array(count).fill({ type: "blue", sourceArrayName: 'void', index: -1 });
    }

    // 通常のコアの場合
    const coreType = draggedElement.dataset.coreType;
    const sourceCardId = draggedElement.dataset.sourceCardId;
    const sourceArrayName = draggedElement.parentElement.id;
    const index = parseInt(draggedElement.dataset.index);

    // ドラッグされたコアが複数選択されているかチェック
    const isDraggedCoreSelected = selectedCores.some(c =>
        (c.sourceCardId && c.sourceCardId === sourceCardId && c.index === index) ||
        (c.sourceArrayName && c.sourceArrayName === sourceArrayName && c.index === index)
    );

    if (selectedCores.length > 1 && isDraggedCoreSelected) {
        // 複数選択されている場合は、選択されたすべてのコアを返す
        return selectedCores.map(c => ({ ...c }));
    } else {
        // 単一のコア、または選択されていないコアをドラッグした場合
        const coreData = { type: coreType, index: index };
        if (sourceCardId) {
            coreData.sourceCardId = sourceCardId;
        } else {
            coreData.sourceArrayName = sourceArrayName;
        }
        return [coreData];
    }
}

// --- PC ドラッグ＆ドロップイベントハンドラ ---
export function handleDragStart(e) {
    const target = e.target.closest('.card, .core, #voidCore');

    // ドラッグ対象でない要素は無視
    if (!target) {
        e.preventDefault();
        return;
    }

    setDraggedElement(target);
    setTimeout(() => target.classList.add('dragging'), 0);

    if (target.classList.contains('card')) {
        // If it's a special card from the modal (it won't have a cardId yet)
        if (target.classList.contains('special-card') && !target.dataset.id) {
            const cardType = target.dataset.cardType;
            e.dataTransfer.setData("type", "special-card");
            e.dataTransfer.setData("cardType", cardType);
            const rect = e.target.getBoundingClientRect();
            setOffsetX(e.clientX - rect.left);
            setOffsetY(e.clientY - rect.top);
        } else { // It's a normal card or a special card already on the field
            e.dataTransfer.setData("type", "card");
            e.dataTransfer.setData("cardId", e.target.dataset.id);
            e.dataTransfer.setData("sourceZoneId", e.target.parentElement.id);
            const rect = e.target.getBoundingClientRect();
            setOffsetX(e.clientX - rect.left);
            setOffsetY(e.clientY - rect.top);
        }
    } else if (e.target.classList.contains('core') || e.target.id === 'voidCore') {
        const coresToMove = getDraggedCoresInfo(e.target);
        setDraggedCoreData(coresToMove); // 念のため保持

        e.dataTransfer.setData("type", "core");
        e.dataTransfer.setData("cores", JSON.stringify(coresToMove));

        // オフセット情報を設定
        const rect = e.target.getBoundingClientRect();
        e.dataTransfer.setData("offsetX", e.clientX - rect.left);
        e.dataTransfer.setData("offsetY", e.clientY - rect.top);

        // 複数コアのドラッグ時にカスタムイメージを設定
        if (coresToMove.length > 1) {
            const dragImage = document.createElement('div');
            dragImage.style.cssText = `
                background-color: rgba(0, 123, 255, 0.8); color: white; border-radius: 50%;
                width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
                font-weight: bold; font-size: 16px; position: absolute; top: -1000px;
            `;
            dragImage.textContent = coresToMove.length;
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, 15, 15);
            setTimeout(() => document.body.removeChild(dragImage), 0);
        }
    }
}

export function handleDragEnd(e) {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        setDraggedElement(null);
    }
    setDraggedCoreData(null);
    clearSelectedCores();
}

export function handleDeckDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

export function handleDeckDragLeave(e) {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over', 'highlight-top-zone', 'highlight-bottom-zone');
    }
}

export function handleDeckDragOver(e) {
    e.preventDefault();
    const deckButton = e.currentTarget;
    const rect = deckButton.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const twoThirdsHeight = rect.height * (2 / 3);

    deckButton.classList.add('drag-over');
    if (relativeY <= twoThirdsHeight) {
        deckButton.classList.add('highlight-top-zone');
        deckButton.classList.remove('highlight-bottom-zone');
    } else {
        deckButton.classList.add('highlight-bottom-zone');
        deckButton.classList.remove('highlight-top-zone');
    }
}

export function handleDeckDrop(e) {
    e.preventDefault();
    const deckButton = e.currentTarget;
    deckButton.classList.remove('drag-over', 'highlight-top-zone', 'highlight-bottom-zone');
    if (e.dataTransfer.getData("type") === 'card') {
        moveCardData(e.dataTransfer.getData("cardId"), e.dataTransfer.getData("sourceZoneId"), 'deck', e, deckButton);
    }
}

export function handleDrop(e) {
    e.preventDefault();

    // ドラッグ中の要素を一時的に非表示にして、ドロップ先の要素を正確に取得する
    let dropTarget = null;
    if (draggedElement) {
        draggedElement.style.pointerEvents = 'none';
        dropTarget = document.elementFromPoint(e.clientX, e.clientY);
        draggedElement.style.pointerEvents = 'auto'; // 元に戻す
    } else {
        dropTarget = e.target;
    }

    // 新しいイベントオブジェクトを作成して、ターゲットを差し替える
    const mockEvent = {
        target: dropTarget,
        preventDefault: () => e.preventDefault(),
        dataTransfer: e.dataTransfer,
        clientX: e.clientX,
        clientY: e.clientY
    };

    const type = e.dataTransfer.getData("type");

    if (type === 'card') {
        handleCardDrop(mockEvent);
    } else if (type === 'core' || type === 'voidCore') {
        handleCoreDrop(mockEvent);
    } else if (type === 'special-card') {
        handleSpecialCardDrop(mockEvent);
    }
    clearSelectedCores();
    setDraggedElement(null); // ドロップ直後にドラッグ状態を強制的にクリア
}

function handleCardDrop(e) {
    const cardId = e.dataTransfer.getData("cardId");
    const sourceZoneId = e.dataTransfer.getData("sourceZoneId");
    const sourceZoneName = getZoneName(document.getElementById(sourceZoneId));

    const targetElement = e.target.closest('#fieldZone, #handZone, #trashZoneFrame, #burstZone, .deck-button, #voidZone, #openArea, .card');
    if (!targetElement) return;

    let actualTargetZoneElement = targetElement;
    if (targetElement.classList.contains('card')) {
        actualTargetZoneElement = targetElement.parentElement.closest('#fieldZone, #handZone, #trashZoneFrame, #burstZone, .deck-button, #voidZone, #openArea');
    }
    if (!actualTargetZoneElement) return;

    const targetZoneName = getZoneName(actualTargetZoneElement);
    if (targetZoneName === 'deck') return;

    // --- 召喚、マジック使用、またはその他の移動 ---
    if (targetZoneName === 'field' && ['hand', 'trash', 'burst'].includes(sourceZoneName)) {
        // --- 召喚フロー ---
        const sourceArray = getArrayByZoneName(sourceZoneName);
        if (!sourceArray) return;
        const cardIndex = sourceArray.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;
        
        const [movedCardData] = sourceArray.splice(cardIndex, 1);
        field.push(movedCardData);

        const fieldRect = document.getElementById('fieldCards').getBoundingClientRect();
        cardPositions[cardId] = {
            left: e.clientX - fieldRect.left - offsetX,
            top: e.clientY - fieldRect.top - offsetY
        };
        renderAll();
        hideMagnifier();

        showSummonActionChoice({
            onSummon: () => startPaymentProcess(movedCardData, sourceZoneName),
            onPlaceCore: () => placeCoreOnSummonedCard(movedCardData),
            onCancel: () => {}
        });

    } else if (targetZoneName === 'trash' && sourceZoneName === 'hand') {
        // --- マジック使用フロー ---
        const cardData = hand.find(c => c.id === cardId);
        if (!cardData) return;

        hideMagnifier();

        // 1. 共通関数を使ってカードをトラッシュに移動し、UIに反映
        moveCardData(cardId, sourceZoneName, targetZoneName);

        // 2. コストを支払うかの選択肢を表示
        showSummonActionChoice({
            onSummon: () => { // 「コストを支払う」ボタンが押された場合
                showCostModal(cardData, (cost) => {
                    payCost(cost, null, () => {
                        // メッセージを削除
                    });
                }, () => {}); // コストモーダルがキャンセルされた場合は何もしない
            },
            onPlaceCore: null, // 「維持コアを置く」ボタンは非表示
            onCancel: () => {}  // タイムアウトした場合は何もしない
        });
    } else {
        // --- その他の移動 ---
        const position = {
            left: e.clientX - document.getElementById('fieldCards').getBoundingClientRect().left - offsetX,
            top: e.clientY - document.getElementById('fieldCards').getBoundingClientRect().top - offsetY
        };
        if (targetZoneName === 'field') {
            cardPositions[cardId] = position;
        } else {
            delete cardPositions[cardId];
        }
        moveCardData(cardId, sourceZoneName, targetZoneName);
        hideMagnifier();
    }
}

function handleCoreDrop(e) {
    const targetCardElement = e.target.closest('.card');

    // ★ カードへのドロップを最優先で処理
    if (targetCardElement) {
        const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));

        const isInternalMove = (coresToMove.length === 1 && coresToMove[0].sourceCardId === targetCardElement.dataset.id);

        if (isInternalMove) {
            handleCoreInternalMoveOnCard(e, targetCardElement);
        } else {
            handleCoreDropOnCard(e, targetCardElement);
        }
        return; // カードにドロップしたら、ここで処理を終了する
    }

    // ★ カード以外の場合、ゾーンへのドロップを試みる
    const targetZoneElement = e.target.closest('.zone, .special-zone');
    if (targetZoneElement) {
        handleCoreDropOnZone(e, targetZoneElement);
    }
}

function handleSpecialCardDrop(e) {
    const cardType = e.dataTransfer.getData("cardType");
    const targetElement = e.target.closest('#fieldZone');

    if (targetElement) {
        const targetZoneName = getZoneName(targetElement);
        if (targetZoneName === 'field') {
            const fieldRect = document.getElementById('fieldCards').getBoundingClientRect();
            const position = {
                left: e.clientX - fieldRect.left - offsetX,
                top: e.clientY - fieldRect.top - offsetY
            };
            createSpecialCardOnField(cardType, position);
        }
    }
}


// --- タッチイベントハンドラ ---
let touchedElement = null;
const DRAG_THRESHOLD = 20;

let longPressTimer = null;
const LONG_PRESS_DURATION = 300; // 300ms

function handleTouchStart(e) {
    // 重疲労ボタンが押された場合は、ドラッグ処理を開始せずに通常のクリックイベントに任せる
    if (e.target.classList.contains('exhaust-button')) {
        return;
    }

    if (e.touches.length !== 1) return;
    const target = e.target.closest('.card, .core, #voidCore');
    if (!target) return;

    touchedElement = target;
    // e.preventDefault(); // クリックイベントを発火させるために一旦コメントアウト

    setInitialTouchX(e.touches[0].clientX);
    setInitialTouchY(e.touches[0].clientY);
    setCurrentTouchX(e.touches[0].clientX);
    setCurrentTouchY(e.touches[0].clientY);
    setIsDragging(false);

    // 長押しタイマーを開始
    longPressTimer = setTimeout(() => {
        // 長押し時間が経過したら、ドラッグを開始する準備ができたことを示す
        // 実際のドラッグ開始は touchmove で行う
        longPressTimer = null; // タイマーをクリア
        // ここでドラッグの準備ができたことを示すフラグを立てても良い
        // 例: canStartDrag = true;
    }, LONG_PRESS_DURATION);

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
}

function startTouchDrag(e) {
    let displayElement = touchedElement;
    let customDragElement = null;

    if (touchedElement.classList.contains('core') || touchedElement.id === 'voidCore') {
        const coresInfo = getDraggedCoresInfo(touchedElement);
        setDraggedCoreData(coresInfo); // draggedCoreData をセット
        if (coresInfo.length > 1) {
            customDragElement = document.createElement('div');
            customDragElement.style.cssText = `
                background-color: rgba(0, 123, 255, 0.8); color: white; border-radius: 50%;
                width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
                font-weight: bold; font-size: 16px; pointer-events: none;
            `;
            customDragElement.textContent = coresInfo.length;
            displayElement = customDragElement;
        }
    }

    const clone = displayElement.cloneNode(true);
    clone.classList.add('dragging');
    clone.style.position = 'fixed';
    clone.style.zIndex = '1000';
    clone.style.transition = 'none';
    document.body.appendChild(clone);
    setTouchDraggedElement(clone);

    const rect = touchedElement.getBoundingClientRect();
    setTouchOffsetX(e.touches[0].clientX - rect.left);
    setTouchOffsetY(e.touches[0].clientY - rect.top);

    clone.style.left = `${e.touches[0].clientX - touchOffsetX}px`;
    clone.style.top = `${e.touches[0].clientY - touchOffsetY}px`;

    setIsDragging(true);
}

function handleTouchMove(e) {
    if (e.touches.length !== 1) return;

    setCurrentTouchX(e.touches[0].clientX);
    setCurrentTouchY(e.touches[0].clientY);

    const deltaX = Math.abs(currentTouchX - initialTouchX);
    const deltaY = Math.abs(currentTouchY - initialTouchY);

    if (isDragging) {
        // すでにドラッグ中なら、要素を追従させる
        e.preventDefault();
        if (touchDraggedElement) {
            touchDraggedElement.style.left = `${currentTouchX - touchOffsetX}px`;
            touchDraggedElement.style.top = `${currentTouchY - touchOffsetY}px`;
        }
        return;
    }

    // ドラッグ開始判定
    if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
        // 閾値を超えて動いたら、長押しタイマーをクリア（ドラッグではない）
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }

        // 長押しが完了した後（タイマーがnull）に動き始めたらドラッグ開始
        // ただし、現状の実装では長押しタイマー完了＝即ドラッグ開始ではないため、
        // ここでドラッグを開始するロジックが必要。
        // しかし、今回は「長押ししないとドラッグできない」ようにするため、
        // タイマーがあるうちはドラッグを開始しない、というロジックに変更する。
    }

    // 長押しタイマーが完了し、かつ、指が閾値以上動いた場合にドラッグを開始する
    if (!longPressTimer && !isDragging && (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD)) {
        startTouchDrag(e);
    }
}

function handleTouchEnd(e) {
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);

    // 長押しタイマーが残っているかチェック
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        // ドラッグが開始されていなければ、これはタップと見なす
        if (!isDragging && touchedElement) {
            touchedElement.click();
            // タップ処理後は、後続のドロップ処理や状態リセットを行わないようにする
            setIsDragging(false);
            touchedElement = null;
            return; // ここで処理を終了
        }
    }

    if (isDragging) {
        let dropTarget = null;
        if (touchDraggedElement) {
            touchDraggedElement.style.pointerEvents = 'none';
            dropTarget = document.elementFromPoint(currentTouchX, currentTouchY);
            touchDraggedElement.remove();
            setTouchDraggedElement(null);
        }

        if (dropTarget) {
            if (touchedElement.classList.contains('card')) {
                // カードのタッチドロップ処理
                const cardId = touchedElement.dataset.id;
                const sourceZoneName = getZoneName(touchedElement.parentElement);
                const targetZoneElement = dropTarget.closest('#fieldZone, #handZone, #trashZoneFrame, #burstZone, .deck-button, #voidZone, #openArea');

                if (targetZoneElement) {
                    const targetZoneName = getZoneName(targetZoneElement);
                    if (targetZoneName === 'field') {
                        const fieldRect = document.getElementById('fieldCards').getBoundingClientRect();
                        cardPositions[cardId] = {
                            left: currentTouchX - fieldRect.left - touchOffsetX,
                            top: currentTouchY - fieldRect.top - touchOffsetY
                        };
                    } else {
                        delete cardPositions[cardId];
                    }
                    moveCardData(cardId, sourceZoneName, targetZoneName);
                    hideMagnifier();
                }
            } else if (touchedElement.classList.contains('core') || touchedElement.id === 'voidCore') {
                // コアのタッチドロップ処理
                // draggedCoreData を使用する
                const coresToMove = draggedCoreData; 
                const mockEvent = {
                    clientX: currentTouchX,
                    clientY: currentTouchY,
                    target: dropTarget,
                    dataTransfer: {
                        getData: (key) => {
                            if (key === "cores") return JSON.stringify(coresToMove);
                            if (key === "type") return touchedElement.id === 'voidCore' ? 'voidCore' : 'core';
                            if (key === "offsetX") return touchOffsetX;
                            if (key === "offsetY") return touchOffsetY;
                            return "";
                        }
                    }
                };
                handleCoreDrop(mockEvent);
                hideMagnifier();
            }
        }
    }

    // ドラッグ終了後の後処理
    if (touchedElement) {
        touchedElement.style.opacity = '1'; // 元の要素の透明度を戻す
    }

    setIsDragging(false);
    touchedElement = null;
    setDraggedCoreData(null); // ドラッグ終了時にデータをリセット
    clearSelectedCores();
}

// --- 汎用モーダルおよびその他 ---
export function openTrashModal() {
    openModal('trashModal', 'trashModalContent', renderTrashModalContent);
}

export function openDeckGaiModal() {
    openModal('deckGaiModal', 'deckGaiModalContent', () => {}); // Empty render function for now
}

export function openModal(modalId, contentId, renderContent) {
    const modal = document.getElementById(modalId);
    renderContent();
    modal.style.display = "flex";

    if (modalId === 'openAreaModal') return;

    const closeModalOnClick = e => {
        if (!document.getElementById(contentId).contains(e.target)) {
            modal.style.display = "none";
            document.removeEventListener('mousedown', closeModalOnClick);
        }
    };
    document.addEventListener('mousedown', closeModalOnClick);
}

export function addDeckCore() {
    countCores.push("blue");
    renderAll();
}

export function toggleDeckCoreCount() {
    setCountShowCountAsNumber(!countShowCountAsNumber);
    renderAll();
}

export function refreshAll() {
    setSelectedCores([]);
    field.forEach(card => {
        if (card.isExhausted) {
            card.isExhausted = false;
            card.isRotated = true;
        }
 else {
            card.isRotated = false;
            card.isExhausted = false;
        }
    });
    while (trashCores.length > 0) {
        reserveCores.push(trashCores.shift());
    }
    renderAll();
}