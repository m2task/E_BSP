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

// --- イベントハンドラ --- 
export function handleDragStart(e) {
    setDraggedElement(e.target);
    setTimeout(() => draggedElement.classList.add('dragging'), 0);

    if (draggedElement.classList.contains('card')) {
        e.dataTransfer.setData("type", "card");
        e.dataTransfer.setData("cardId", draggedElement.dataset.id);
        e.dataTransfer.setData("sourceZoneId", draggedElement.parentElement.id);
        const rect = draggedElement.getBoundingClientRect();
        setOffsetX(e.clientX - rect.left);
        setOffsetY(e.clientY - rect.top);
    } else if (draggedElement.classList.contains('core')) {
        const coreType = draggedElement.dataset.coreType;
        const index = parseInt(draggedElement.dataset.index);
        const sourceCardId = draggedElement.dataset.sourceCardId;

        let currentDraggedCoreIdentifier = {
            type: coreType,
            index: index
        };
        if (sourceCardId) {
            currentDraggedCoreIdentifier.sourceCardId = sourceCardId;
        } else {
            currentDraggedCoreIdentifier.sourceArrayName = draggedElement.parentElement.id;
        }

        // 現在ドラッグされているコアが選択されたコアのリストに含まれているかを確認
        const isDraggedCoreSelected = selectedCores.some(c => {
            if (c.sourceCardId && currentDraggedCoreIdentifier.sourceCardId) {
                return c.sourceCardId === currentDraggedCoreIdentifier.sourceCardId && c.index === currentDraggedCoreIdentifier.index;
            } else if (c.sourceArrayName && currentDraggedCoreIdentifier.sourceArrayName) {
                return c.sourceArrayName === currentDraggedCoreIdentifier.sourceArrayName && c.index === currentDraggedCoreIdentifier.index;
            }
            return false;
        });

        if (isDraggedCoreSelected && selectedCores.length > 1) {
            // 複数のコアが選択されており、ドラッグされたコアがそのうちの1つである場合
            setDraggedCoreData(selectedCores.map(c => {
                const coreData = { type: c.type, index: c.index };
                if (c.sourceCardId) {
                    coreData.sourceCardId = c.sourceCardId;
                } else {
                    coreData.sourceArrayName = c.sourceArrayName;
                }
                return coreData;
            }));
            e.dataTransfer.setData("type", "multiCore");
            e.dataTransfer.setData("cores", JSON.stringify(draggedCoreData));
        } else { // 単一コアのドラッグ（選択されていない場合、または1つだけ選択されていてそれがドラッグされた場合）
            const parentCardElement = draggedElement.closest('.card'); // 親がカードかどうかを再確認
            if (parentCardElement) {
                // カード上のコアのドラッグ
                const rect = draggedElement.getBoundingClientRect();
                setOffsetX(e.clientX - rect.left);
                setOffsetY(e.clientY - rect.top);
                e.dataTransfer.setData("offsetX", offsetX);
                e.dataTransfer.setData("offsetY", offsetY);

                setDraggedCoreData([{ type: coreType, sourceCardId: sourceCardId, index: index, x: parseFloat(draggedElement.style.left), y: parseFloat(draggedElement.style.top) }]);
                e.dataTransfer.setData("type", "coreFromCard");
                e.dataTransfer.setData("cores", JSON.stringify(draggedCoreData));
            } else {
                // ゾーンのコアのドラッグ
                setDraggedCoreData([{ type: coreType, sourceArrayName: draggedElement.parentElement.id, index: index }]);
                e.dataTransfer.setData("type", "core");
                e.dataTransfer.setData("coreType", coreType);
                e.dataTransfer.setData("coreIndex", index);
                e.dataTransfer.setData("cores", JSON.stringify(draggedCoreData));
            }
        }
    }
    else if (draggedElement.id === 'voidCore') {
        // ボイドコアのドラッグ
        const coresToMoveCount = voidChargeCount > 0 ? voidChargeCount : 1; // チャージ数が0でも1個は移動可能
        setDraggedCoreData(Array(coresToMoveCount).fill({ type: "blue", sourceArrayName: 'void', index: -1 }));
        e.dataTransfer.setData("type", "voidCore");
        e.dataTransfer.setData("cores", JSON.stringify(draggedCoreData));
        showToast('voidToast', '', true); // ドラッグ開始時にトーストを非表示
    }
}

export function handleDragEnd() {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        setDraggedElement(null);
    }
    setDraggedCoreData(null);
    clearSelectedCores(); // ドラッグ終了時に選択を解除
}

// 新しいデッキドラッグイベントハンドラ
export function handleDeckDragEnter(e) {
    e.preventDefault();
    const deckButton = e.currentTarget;
    deckButton.classList.add('drag-over');
}

export function handleDeckDragLeave(e) {
    e.preventDefault();
    const deckButton = e.currentTarget;
    // 関連要素への移動の場合はクラスを削除しない
    if (!deckButton.contains(e.relatedTarget)) {
        deckButton.classList.remove('drag-over', 'highlight-top-zone', 'highlight-bottom-zone');
    }
}

export function handleDeckDragOver(e) {
    e.preventDefault(); // ドロップを許可するために必要
    const deckButton = e.currentTarget;
    const rect = deckButton.getBoundingClientRect();
    const clientY = e.clientY;

    // デッキボタン内の相対Y座標
    const relativeY = clientY - rect.top;

    // デッキボタンの高さの2/3を計算
    const twoThirdsHeight = rect.height * (2 / 3);

    deckButton.classList.add('drag-over'); // ドラッグオーバー中は常に全体を発光

    if (relativeY <= twoThirdsHeight) {
        // 上2/3にいる場合
        deckButton.classList.add('highlight-top-zone');
        deckButton.classList.remove('highlight-bottom-zone');
    } else {
        // 下1/3にいる場合
        deckButton.classList.add('highlight-bottom-zone');
        deckButton.classList.remove('highlight-top-zone');
    }
}

// handleDrop からデッキボタンへのドロップ処理を分離
export function handleDeckDrop(e) {
    e.preventDefault();
    const deckButton = e.currentTarget;
    deckButton.classList.remove('drag-over', 'highlight-top-zone', 'highlight-bottom-zone'); // ドロップ後にクラスを削除

    const type = e.dataTransfer.getData("type");
    if (type === 'card') {
        const cardId = e.dataTransfer.getData("cardId");
        const sourceZoneId = e.dataTransfer.getData("sourceZoneId");
        moveCardData(cardId, sourceZoneId, 'deck', e, deckButton); // ドロップイベントとターゲット要素を渡す
    }
}

export function handleDrop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    const targetCardElement = e.target.closest('.card'); // ドロップ先がカードかどうか
    const targetZoneElement = e.target.closest('.zone, .special-zone'); // ドロップ先がゾーンかどうか

    if (type === 'card') {
        handleCardDrop(e);
    } else if (type === 'voidCore' || type === 'core' || type === 'multiCore' || type === 'coreFromCard') {
        const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
        if (targetCardElement) {
            // Check if it's an internal move within the same card
            const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
            if (coresToMove.length === 1 && coresToMove[0].sourceCardId === targetCardElement.dataset.id) {
                handleCoreInternalMoveOnCard(e, targetCardElement);
            } else {
                handleCoreDropOnCard(e, targetCardElement);
            }
        } else if (targetZoneElement) {
            handleCoreDropOnZone(e, targetZoneElement);
        }
    }
    clearSelectedCores(); // ドロップ処理の最後に選択状態をクリア
}

export function handleCardDrop(e) {
    const cardId = e.dataTransfer.getData("cardId");
    const sourceZoneIdFromDataTransfer = e.dataTransfer.getData("sourceZoneId"); // 'fieldCards' など
    // sourceZoneIdFromDataTransfer を DOM 要素として取得し、そのゾーン名を正規化
    const sourceElement = document.getElementById(sourceZoneIdFromDataTransfer);
    const sourceZoneName = getZoneName(sourceElement);

    const targetElement = e.target.closest('#fieldZone, #handZone, #trashZoneFrame, #burstZone, .deck-button, #voidZone, #openArea');
    console.log("targetElement:", targetElement);
    if (!targetElement) return;

    const targetZoneName = getZoneName(targetElement);
    console.log("targetZoneName:", targetZoneName);

    if (targetZoneName === 'deck') {
        // デッキへのドロップは handleDeckDrop で処理するため、ここでは何もしない
        return;
    }

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

export function openTrashModal() {
    openModal('trashModal', 'trashModalContent', renderTrashModalContent);
}

export function openModal(modalId, contentId, renderContent) {
    const modal = document.getElementById(modalId);
    renderContent();
    modal.style.display = "flex";

    // オープンエリアのモーダルはカードがなくなるまで閉じない
    if (modalId === 'openAreaModal') {
        return;
    }

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
    setSelectedCores([]); // 選択されたコアをクリア
    field.forEach(card => {
        if (card.isExhausted) {
            card.isExhausted = false;
            card.isRotated = true; // 重疲労から疲労へ
        } else {
            card.isRotated = false;
            card.isExhausted = false;
        }
    });

    // トラッシュのコアをすべてリザーブに移動
    while (trashCores.length > 0) {
        reserveCores.push(trashCores.shift());
    }

    renderAll();
}

// --- タッチイベントハンドラ --- 
let touchedElement = null; // タッチ開始時の要素を保持
const DRAG_THRESHOLD = 10; // ドラッグ開始と判定する移動量（ピクセル）

function handleTouchStart(e) {
    if (e.touches.length !== 1) return; // シングルタッチのみを処理

    touchedElement = e.target.closest('.card, .core, #voidCore');
    if (!touchedElement) return; // カード、コア、ボイドコア以外は無視

    e.preventDefault(); // デフォルトのスクロールなどを抑制

    // 初期タッチ位置を記録
    setInitialTouchX(e.touches[0].clientX);
    setInitialTouchY(e.touches[0].clientY);
    setCurrentTouchX(e.touches[0].clientX); // 初期値として設定
    setCurrentTouchY(e.touches[0].clientY); // 初期値として設定

    setIsDragging(false); // ドラッグ開始フラグをリセット

    // touchmove と touchend イベントリスナーを動的に追加
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
}

function startTouchDrag(e, elementToDrag) {
    // ドラッグ開始時の処理
    // e.preventDefault(); // handleTouchStart で既に preventDefault しているため不要

    const clone = elementToDrag.cloneNode(true);
    clone.classList.add('dragging'); // ドラッグ中のスタイルを適用
    clone.style.position = 'fixed';
    clone.style.zIndex = '1000';
    clone.style.transition = 'none'; // ドラッグ中はトランジションを無効にする
    document.body.appendChild(clone);
    setTouchDraggedElement(clone);

    const rect = elementToDrag.getBoundingClientRect();
    setTouchOffsetX(e.touches[0].clientX - rect.left);
    setTouchOffsetY(e.touches[0].clientY - rect.top);

    // クローンの初期位置を設定
    clone.style.left = `${e.touches[0].clientX - touchOffsetX}px`;
    clone.style.top = `${e.touches[0].clientY - touchOffsetY}px`;

    setIsDragging(true); // ドラッグ開始
}

function handleTouchMove(e) {
    if (e.touches.length !== 1) return; // シングルタッチのみを処理

    setCurrentTouchX(e.touches[0].clientX);
    setCurrentTouchY(e.touches[0].clientY);

    if (!isDragging) {
        // ドラッグがまだ開始されていない場合、移動量をチェック
        const deltaX = Math.abs(currentTouchX - initialTouchX);
        const deltaY = Math.abs(currentTouchY - initialTouchY);

        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
            // 一定の移動量を超えたらドラッグ開始
            if (touchedElement) {
                startTouchDrag(e, touchedElement);
            }
        }
    }

    if (isDragging && touchDraggedElement) {
        e.preventDefault(); // スクロールなどのデフォルト動作を抑制
        // クローンを指の位置に合わせて移動
        touchDraggedElement.style.left = `${currentTouchX - touchOffsetX}px`;
        touchDraggedElement.style.top = `${currentTouchY - touchOffsetY}px`;

        // ドロップ先のハイライト処理（オプション）
        // ここにドロップ可能なゾーンをハイライトするロジックを追加できます
    }
}

function handleTouchEnd(e) {
    // イベントリスナーを削除
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);

    if (isDragging) {
        // ドラッグが終了した場合の処理
        if (touchDraggedElement) {
            touchDraggedElement.remove(); // クローンを削除
            setTouchDraggedElement(null);
        }

        // ドロップ先の要素を特定
        // `document.elementFromPoint` を使用して、ドロップされた位置の要素を取得
        const dropTarget = document.elementFromPoint(currentTouchX, currentTouchY);

        if (dropTarget) {
            const originalElement = touchedElement; // タッチ開始時の要素
            const cardElement = originalElement.closest('.card');
            const coreElement = originalElement.closest('.core, #voidCore');

            if (cardElement) { // カードのドラッグの場合
                const cardId = cardElement.dataset.id;
                // sourceZoneId を正規化して取得
                const sourceZoneName = getZoneName(cardElement.parentElement);

                const targetCardElement = dropTarget.closest('.card');
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
                } else if (targetCardElement) {
                    // カードからカードへのドロップは現在未対応
                    console.log("Card dropped on another card (not yet supported)");
                }
            } else if (coreElement) { // コアのドラッグの場合
                // コアのドラッグ処理をここに実装
                console.log("Core dropped (needs implementation)");
                // 例: handleCoreDropOnZone(e, targetZoneElement); または handleCoreDropOnCard(e, targetCardElement);
            }
        }
    } else {
        // 短いタップの場合（ドラッグと判定されなかった場合）
        // ここで元の要素に対するクリックイベントを再トリガーする
        if (touchedElement) {
            touchedElement.click();
        }
    }
    setIsDragging(false); // ドラッグフラグをリセット
    touchedElement = null; // タッチ開始要素をリセット
}