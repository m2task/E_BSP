import { getZoneName } from './utils.js';
import { renderAll } from './renderers.js';
import { draggedElement, offsetX, offsetY, cardPositions, selectedCores, draggedCoreData, moveCardData, removeCoresFromSource, showToast, clearSelectedCores, voidChargeCount, field } from './gameLogic.js';

export function handleDragStart(e) {
    draggedElement = e.target;
    setTimeout(() => draggedElement.classList.add('dragging'), 0);

    if (draggedElement.classList.contains('card')) {
        e.dataTransfer.setData("type", "card");
        e.dataTransfer.setData("cardId", draggedElement.dataset.id);
        e.dataTransfer.setData("sourceZoneId", draggedElement.parentElement.id);
        const rect = draggedElement.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
    } else if (draggedElement.classList.contains('core')) {
        const coreType = draggedElement.dataset.coreType;
        const index = parseInt(draggedElement.dataset.index);
        const sourceCardId = draggedElement.dataset.sourceCardId;
        const sourceArrayName = draggedElement.parentElement.id;

        let currentDraggedCoreIdentifier = {
            type: coreType,
            index: index
        };
        if (sourceCardId) {
            currentDraggedCoreIdentifier.sourceCardId = sourceCardId;
        } else {
            currentDraggedCoreIdentifier.sourceArrayName = sourceArrayName;
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
            draggedCoreData = selectedCores.map(c => {
                const coreData = { type: c.type, index: c.index };
                if (c.sourceCardId) {
                    coreData.sourceCardId = c.sourceCardId;
                } else {
                    coreData.sourceArrayName = c.sourceArrayName;
                }
                return coreData;
            });
            e.dataTransfer.setData("type", "multiCore");
            e.dataTransfer.setData("cores", JSON.stringify(draggedCoreData));
        } else { // 単一コアのドラッグ（選択されていない場合、または1つだけ選択されていてそれがドラッグされた場合）
            const parentCardElement = draggedElement.closest('.card'); // 親がカードかどうかを再確認
            if (parentCardElement) {
                // カード上のコアのドラッグ
                const rect = draggedElement.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                e.dataTransfer.setData("offsetX", offsetX);
                e.dataTransfer.setData("offsetY", offsetY);

                draggedCoreData = [{ type: coreType, sourceCardId: sourceCardId, index: index, x: parseFloat(draggedElement.style.left), y: parseFloat(draggedElement.style.top) }];
                e.dataTransfer.setData("type", "coreFromCard");
                e.dataTransfer.setData("cores", JSON.stringify(draggedCoreData));
            } else {
                // ゾーンのコアのドラッグ
                draggedCoreData = [{ type: coreType, sourceArrayName: sourceArrayName, index: index }];
                e.dataTransfer.setData("type", "core");
                e.dataTransfer.setData("coreType", coreType);
                e.dataTransfer.setData("coreIndex", index);
                e.dataTransfer.setData("cores", JSON.stringify(draggedCoreData));
            }
        }
    } else if (draggedElement.id === 'voidCore') {
        // ボイドコアのドラッグ
        const coresToMoveCount = voidChargeCount > 0 ? voidChargeCount : 1; // チャージ数が0でも1個は移動可能
        draggedCoreData = Array(coresToMoveCount).fill({ type: "blue", sourceArrayName: 'void', index: -1 });
        e.dataTransfer.setData("type", "voidCore");
        e.dataTransfer.setData("cores", JSON.stringify(draggedCoreData));
        showToast('voidToast', '', true); // ドラッグ開始時にトーストを非表示
    }
}

export function handleDragEnd() {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement = null;
    }
    draggedCoreData = null;
    clearSelectedCores(); // ドラッグ終了時に選択を解除
}

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
    const sourceZoneId = e.dataTransfer.getData("sourceZoneId");
    const targetElement = e.target.closest('#fieldZone, #handZone, #trashZoneFrame, #burstZone, .deck-button, #voidZone');
    if (!targetElement) return;

    const targetZoneName = getZoneName(targetElement);

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
    moveCardData(cardId, sourceZoneId, targetZoneName);
}

export function handleCoreDropOnCard(e, targetCardElement) {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
    const targetCardId = targetCardElement.dataset.id;
    const targetCard = field.find(card => card.id === targetCardId);

    if (!targetCard) return;

    const cardRect = targetCardElement.getBoundingClientRect();
    const dropX = e.clientX - cardRect.left;
    const dropY = e.clientY - cardRect.top;

    if (type === 'voidCore') {
        // ボイドコアの場合、チャージ数分の新しい青コアを生成してカードに追加
        const coresToAddCount = coresToMove.length; // coresToMoveにはチャージ数分のダミーコアが入っている
        const coreOffsetX = 10; // コアの水平方向オフセット
        const coreOffsetY = 10; // コアの垂直方向オフセット

        for (let i = 0; i < coresToAddCount; i++) {
            const currentCoresOnCardCount = targetCard.coresOnCard.length; // 現在のコア数を取得
            targetCard.coresOnCard.push({
                type: "blue",
                x: dropX + (currentCoresOnCardCount * coreOffsetX), // オフセットを適用
                y: dropY + (currentCoresOnCardCount * coreOffsetY)  // オフセットを適用
            });
        }
        voidChargeCount = 0; // ボイドコア移動後はチャージをリセット
        showToast('voidToast', '', true); // ボイドトーストを非表示
    } else {
        // 通常のコア移動の場合
        // 移動元からコアを削除
        removeCoresFromSource(coresToMove);

        const coreOffsetX = 10; // コアの水平方向オフセット
        const coreOffsetY = 10; // コアの垂直方向オフセット

        // カードにコアを追加
        for (const coreInfo of coresToMove) {
            const currentCoresOnCardCount = targetCard.coresOnCard.length; // 現在のコア数を取得
            targetCard.coresOnCard.push({
                type: coreInfo.type,
                x: dropX + (currentCoresOnCardCount * coreOffsetX), // オフセットを適用
                y: dropY + (currentCoresOnCardCount * coreOffsetY)  // オフセットを適用
            });
        }
    }
    renderAll();

    // 最後にトーストを表示（ボイドからの場合のみ）
    if (type === 'voidCore') {
        const movedCount = coresToMove.length;
        const toastMessage = `${movedCount}個増やしました`;
        showToast('voidToast', toastMessage);
    }
}

export function handleCoreInternalMoveOnCard(e, targetCardElement) {
    e.preventDefault();
    const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
    const targetCardId = targetCardElement.dataset.id;
    const targetCard = field.find(card => card.id === targetCardId);

    if (!targetCard || coresToMove.length !== 1) return; // 複数コアの内部移動は未対応

    const coreInfo = coresToMove[0];
    const coreIndexOnCard = coreInfo.index;

    if (coreIndexOnCard === undefined || coreIndexOnCard < 0 || coreIndexOnCard >= targetCard.coresOnCard.length) {
        return; // 無効なインデックス
    }

    const cardRect = targetCardElement.getBoundingClientRect();
    const offsetX = parseFloat(e.dataTransfer.getData("offsetX"));
    const offsetY = parseFloat(e.dataTransfer.getData("offsetY"));

    // ドロップされたカード内の相対座標を計算
    const newX = e.clientX - cardRect.left - offsetX;
    const newY = e.clientY - cardRect.top - offsetY;

    // コアのデータを更新
    targetCard.coresOnCard[coreIndexOnCard].x = newX;
    targetCard.coresOnCard[coreIndexOnCard].y = newY;

    renderAll();
}

export function handleCoreDropOnZone(e, targetElement) {
    const targetZoneName = getZoneName(targetElement);
    const type = e.dataTransfer.getData("type");

    if (type === 'voidCore') {
        const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
        voidChargeCount = 0;
        showToast('voidToast', '', true);

        const movedCount = coresToMove.length;
        for (let i = 0; i < movedCount; i++) {
            if (targetZoneName === 'trash') trashCores.push("blue");
            else if (targetZoneName === 'reserve') reserveCores.push("blue");
            else if (targetZoneName === 'life') lifeCores.push("blue");
            else if (targetZoneName === 'count') deckCores.push("blue");
        }
        const toastMessage = `${movedCount}個増やしました`;
        showToast('voidToast', toastMessage);
        renderAll();
        return;
    }

    let coresToMove = [];
    if (type === 'multiCore' || type === 'coreFromCard' || type === 'core') {
        coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
    }

    const coresToActuallyMove = [];
    // ボイドへの移動の場合、ソウルコアの確認を行う
    if (targetZoneName === 'void') {
        for (const coreInfo of coresToMove) {
            if (coreInfo.type === 'soul') {
                if (confirm("ソウルドライブしますか？")) {
                    coresToActuallyMove.push(coreInfo); // OKなら移動リストに追加
                }
                // キャンセルの場合は何もしない（＝元の位置に残る）
            } else {
                coresToActuallyMove.push(coreInfo); // ソウルコア以外は無条件で移動
            }
        }
    } else {
        // ボイド以外への移動は、すべてのコアを移動リストに含める
        coresToActuallyMove.push(...coresToMove);
    }

    // 実際に移動するコアだけをソースから削除
    removeCoresFromSource(coresToActuallyMove);

    // 移動先へコアを追加
    const targetArray = (targetZoneName === 'trash') ? trashCores : getArrayByZoneName(targetZoneName);
    if (targetArray) {
        for (const coreInfo of coresToActuallyMove) {
            targetArray.push(coreInfo.type);
        }
    }

    renderAll();
}

export function handleCoreClick(e) {
    e.stopPropagation(); // イベントの伝播を停止
    const coreElement = e.target.closest('.core');
    if (!coreElement) {
        return;
    }

    const coreType = coreElement.dataset.coreType;
    const index = parseInt(coreElement.dataset.index);
    const sourceCardId = coreElement.dataset.sourceCardId;


    let coreIdentifier = {
        type: coreType,
        index: index
    };

    if (sourceCardId) {
        coreIdentifier.sourceCardId = sourceCardId;
    } else {
        coreIdentifier.sourceArrayName = coreElement.parentElement.id;
    }


    const existingIndex = selectedCores.findIndex(c => {
        if (c.sourceCardId && coreIdentifier.sourceCardId) {
            return c.sourceCardId === coreIdentifier.sourceCardId && c.index === coreIdentifier.index;
        } else if (c.sourceArrayName && coreIdentifier.sourceArrayName) {
            return c.sourceArrayName === coreIdentifier.sourceArrayName && c.index === coreIdentifier.index;
        }
        return false;
    });


    // Ctrl/Metaキーの有無に関わらず、選択をトグル
    if (existingIndex > -1) {
        selectedCores.splice(existingIndex, 1);
    } else {
        selectedCores.push(coreIdentifier);
    }
    renderAll();
}