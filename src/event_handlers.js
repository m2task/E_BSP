// src/event_handlers.js
import { draggedElement, offsetX, offsetY, cardPositions, voidChargeCount, selectedCores, draggedCoreData, setDraggedElement, setOffsetX, setOffsetY, setVoidChargeCount, setSelectedCores, setDraggedCoreData, field, countCores, countShowCountAsNumber, setCountShowCountAsNumber, reserveCores, trashCores, handPinned, setHandPinned, touchDraggedElement, initialTouchX, initialTouchY, currentTouchX, currentTouchY, touchOffsetX, touchOffsetY, setTouchDraggedElement, setInitialTouchX, setInitialTouchY, setCurrentTouchX, setCurrentTouchY, setTouchOffsetX, setTouchOffsetY, isDragging, setIsDragging } from './game_data.js';
import { renderAll, renderTrashModalContent } from './ui_render.js';
import { showToast, getZoneName, isMobileDevice } from './utils.js'; // isMobileDevice をインポート
import { drawCard, moveCardData, openDeck, discardDeck } from './card_logic.js';
import { handleCoreClick, clearSelectedCores, handleCoreDropOnCard, handleCoreInternalMoveOnCard, handleCoreDropOnZone } from './core_logic.js';

export function setupEventListeners() {
    // デッキボタンのドラッグイベントリスナーを追加
    const deckButton = document.querySelector('.deck-button');
    deckButton.addEventListener('dragenter', handleDeckDragEnter);
    deckButton.addEventListener('dragleave', handleDeckDragLeave);
    deckButton.addEventListener('dragover', handleDeckDragOver);
    deckButton.addEventListener('drop', handleDeckDrop);

    // フィールドのカードクリックイベント（回転用）
    document.getElementById('fieldCards').addEventListener('click', (e) => {
        const cardElement = e.target.closest('.card');
        if (cardElement && !e.target.classList.contains('exhaust-button')) {
            const cardId = cardElement.dataset.id;
            const cardData = field.find(card => card.id === cardId);
            if (!cardData) return; // データが見つからない場合は何もしない

            if (cardData.isRotated) {
                cardData.isRotated = false;
            } else {
                cardData.isRotated = true;
                cardData.isExhausted = false; // 疲労させたら重疲労は解除
            }
            renderAll(); // 状態変更を反映するために再描画
        }
    });

    // 画面のどこかをクリックしたらコアの選択を解除
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('core')) {
            clearSelectedCores();
        }
        // ボイドアイコン以外の場所をクリックしたらチャージ数をリセット
        if (e.target.id !== 'voidCore') {
            setVoidChargeCount(0);
            showToast('voidToast', '', true); // トーストを非表示にする
        }
    });

    document.querySelector('.deck-button').addEventListener('click', (e) => {
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
        showToast('voidToast', ` ${voidChargeCount}個増やせます`);
    });

    // 「デッキ登録画面へ」ボタンのクリックイベント
    document.getElementById('goToDeckRegisterButton').addEventListener('click', () => {
        if (confirm("デッキ登録画面に移動しますか？\n現在のゲーム状態は保存されません。")) {
            window.location.href = "index.html";
        }
    });

    document.getElementById('deckDiscardBtn').addEventListener('click', discardDeck);
    document.getElementById('deckOpenBtn').addEventListener('click', openDeck);
}

// --- 共通コア情報取得関数 ---
function getDraggedCoresInfo(draggedElement) {
    // ボイドコアの場合
    if (draggedElement.id === 'voidCore') {
        const count = voidChargeCount > 0 ? voidChargeCount : 1;
        // setVoidChargeCount(0); // ここでリセットするのが早すぎたため削除
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
    setDraggedElement(e.target);
    setTimeout(() => e.target.classList.add('dragging'), 0);

    if (e.target.classList.contains('card')) {
        e.dataTransfer.setData("type", "card");
        e.dataTransfer.setData("cardId", e.target.dataset.id);
        e.dataTransfer.setData("sourceZoneId", e.target.parentElement.id);
        const rect = e.target.getBoundingClientRect();
        setOffsetX(e.clientX - rect.left);
        setOffsetY(e.clientY - rect.top);
    } else if (e.target.classList.contains('core') || e.target.id === 'voidCore') {
        const coresToMove = getDraggedCoresInfo(e.target);
        setDraggedCoreData(coresToMove); // 念のため保持

        e.dataTransfer.setData("type", "core");
        e.dataTransfer.setData("cores", JSON.stringify(coresToMove));

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
    const type = e.dataTransfer.getData("type");

    if (type === 'card') {
        handleCardDrop(e);
    } else if (type === 'core' || type === 'voidCore') { // voidCoreも考慮
        handleCoreDrop(e);
    }
    clearSelectedCores();
}

function handleCardDrop(e) {
    const cardId = e.dataTransfer.getData("cardId");
    const sourceZoneId = e.dataTransfer.getData("sourceZoneId");
    const sourceZoneName = getZoneName(document.getElementById(sourceZoneId));
    const targetElement = e.target.closest('#fieldZone, #handZone, #trashZoneFrame, #burstZone, .deck-button, #voidZone, #openArea');
    if (!targetElement) return;

    const targetZoneName = getZoneName(targetElement);
    if (targetZoneName === 'deck') return; // デッキへのドロップは専用ハンドラで処理

    if (targetZoneName === 'field') {
        const fieldRect = document.getElementById('fieldCards').getBoundingClientRect();
        cardPositions[cardId] = {
            left: e.clientX - fieldRect.left - offsetX,
            top: e.clientY - fieldRect.top - offsetY
        };
    } else {
        delete cardPositions[cardId];
    }
    moveCardData(cardId, sourceZoneName, targetZoneName);
}

function handleCoreDrop(e) {
    const targetCardElement = e.target.closest('.card');
    alert(`Target Card Element is null: ${targetCardElement === null}`);

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
                }
            } else if (touchedElement.classList.contains('core') || touchedElement.id === 'voidCore') {
                // コアのタッチドロップ処理
                const coresToMove = getDraggedCoresInfo(touchedElement);
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
            }
        }
    }

    setIsDragging(false);
    touchedElement = null;
    clearSelectedCores();
}

// --- 汎用モーダルおよびその他 ---
export function openTrashModal() {
    openModal('trashModal', 'trashModalContent', renderTrashModalContent);
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
        } else {
            card.isRotated = false;
            card.isExhausted = false;
        }
    });
    while (trashCores.length > 0) {
        reserveCores.push(trashCores.shift());
    }
    renderAll();
}
