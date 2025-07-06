let deck = [];
let field = [];
let hand = [];
let trash = [];
let burst = [];

let lifeCores = ["blue", "blue", "blue", "blue", "blue"];
let reserveCores = ["blue", "blue", "blue", "soul"];
let deckCores = [];
let trashCores = [];

let voidChargeCount = 0;
let toastTimeout = null;

let handVisible = true;
let deckShowCountAsNumber = true;
let cardIdCounter = 0;

// --- ドラッグ情報とカード位置 ---
let draggedElement = null;
let offsetX = 0;
let offsetY = 0;
let cardPositions = {}; // { cardId: { left, top } }

// --- コア選択・ドラッグ関連 ---
let selectedCores = []; // 選択されたコアの情報を保持 { type: 'blue', sourceArrayName: 'lifeCores', index: 0 }
let draggedCoreData = null; // ドラッグ中のコアデータ（複数選択対応）

function getDeckNameFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("deck") || "deck1"; // デフォルトは deck1
}

document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    setupEventListeners();
});

function initializeGame() {
    selectedCores = []; // 選択されたコアを初期化
    const deckName = getDeckNameFromURL();
    const loadedDeck = JSON.parse(localStorage.getItem(deckName)) || [];
    const fixedCardName = localStorage.getItem("fixedCardName");
    const initialDeck = loadedDeck;

    deck = initialDeck.map(name => ({ id: `card-${cardIdCounter++}`, name, isRotated: false, isExhausted: false, coresOnCard: [] })); // coresOnCard: [] を追加
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

    renderAll();
}

function setupEventListeners() {
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', handleDrop);

    // デッキボタンのドラッグイベントリスナーを追加
    const deckButton = document.querySelector('.deck-button');
    deckButton.addEventListener('dragenter', handleDeckDragEnter);
    deckButton.addEventListener('dragleave', handleDeckDragLeave);
    deckButton.addEventListener('dragover', handleDeckDragOver);
    deckButton.addEventListener('drop', handleDeckDrop);

    // コアのクリックイベント（選択用）

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
    // このイベントリスナーを修正
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('core')) {
            clearSelectedCores();
        }
        // ボイドアイコン以外の場所をクリックしたらチャージ数をリセット
        if (e.target.id !== 'voidCore') {
            voidChargeCount = 0;
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

    // handZoneContainer にマウスイベントを追加
    const handZoneContainer = document.getElementById('handZoneContainer');
    const openHandButton = document.getElementById('openHandButton');

    handZoneContainer.addEventListener('mouseover', () => {
        handZoneContainer.classList.remove('collapsed');
        openHandButton.classList.add('hidden');
    });

    handZoneContainer.addEventListener('mouseleave', () => {
        handZoneContainer.classList.add('collapsed');
        openHandButton.classList.remove('hidden');
    });

    // openHandButton にマウスイベントを追加
    openHandButton.addEventListener('mouseover', () => {
        handZoneContainer.classList.remove('collapsed');
        openHandButton.classList.add('hidden');
    });

    openHandButton.addEventListener('mouseleave', () => {
        handZoneContainer.classList.add('collapsed');
        openHandButton.classList.remove('hidden');
    });

    // ドラッグ中のカードが「手札を開く」ボタンの上に来たら手札を開く
    openHandButton.addEventListener('dragover', () => {
        const type = draggedElement.dataset.type;
        if (draggedElement.classList.contains('card')) {
            handZoneContainer.classList.remove('collapsed');
            openHandButton.classList.add('hidden');
        }
    });

    document.getElementById('trashZoneTitle').addEventListener('click', openTrashModal);
    document.getElementById('addDeckCoreBtn').addEventListener('click', addDeckCore);
    document.getElementById('toggleDeckCoreBtn').addEventListener('click', toggleDeckCoreCount);
    document.getElementById('refreshButton').addEventListener('click', refreshAll);

    // ボイドアイコンのクリックイベント
    document.getElementById('voidCore').addEventListener('click', (e) => {
        e.stopPropagation(); // ドキュメント全体のクリックイベントが発火しないようにする
        voidChargeCount++;
        showToast('voidToast', ` ${voidChargeCount}個増やせます`);
    });

    // 「デッキ登録画面へ」ボタンのクリックイベント
    document.getElementById('goToDeckRegisterButton').addEventListener('click', () => {
        if (confirm("デッキ登録画面に移動しますか？\n現在のゲーム状態は保存されません。")) {
            window.location.href = "index.html";
        }
    });
}


// --- イベントハンドラ ---
function handleDragStart(e) {
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

function handleDragEnd() {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement = null;
    }
    draggedCoreData = null;
    clearSelectedCores(); // ドラッグ終了時に選択を解除
}

// 新しいデッキドラッグイベントハンドラ
function handleDeckDragEnter(e) {
    e.preventDefault();
    const deckButton = e.currentTarget;
    deckButton.classList.add('drag-over');
}

function handleDeckDragLeave(e) {
    e.preventDefault();
    const deckButton = e.currentTarget;
    // 関連要素への移動の場合はクラスを削除しない
    if (!deckButton.contains(e.relatedTarget)) {
        deckButton.classList.remove('drag-over', 'highlight-top-zone', 'highlight-bottom-zone');
    }
}

function handleDeckDragOver(e) {
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
function handleDeckDrop(e) {
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

function handleDrop(e) {
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

function handleCardDrop(e) {
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

function handleCoreDropOnCard(e, targetCardElement) {
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

function handleCoreInternalMoveOnCard(e, targetCardElement) {
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

function handleCoreDropOnZone(e, targetElement) {
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

// --- データ操作 ---
function moveCardData(cardId, sourceZoneId, targetZoneName, dropEvent = null, dropTargetElement = null) {
    const sourceArray = getArrayByZoneName(sourceZoneId);
    if (!sourceArray) return;
    const cardIndex = sourceArray.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const [cardData] = sourceArray.splice(cardIndex, 1); // カードを一時的にソースから削除

    let shouldTransferCoresToReserve = false; // コアをリザーブに移動するかどうかのフラグ

    if (targetZoneName === 'deck') {
        let putOnBottom = false;
        if (dropEvent && dropTargetElement) { // ドロップイベントとターゲット要素が渡された場合
            const rect = dropTargetElement.getBoundingClientRect();
            const clickY = dropEvent.clientY - rect.top; // ドロップされたY座標
            const buttonHeight = rect.height;
            const twoThirdsHeight = buttonHeight * (2 / 3);

            if (clickY > twoThirdsHeight) {
                putOnBottom = true; // 下1/3にドロップされたら下に戻す
            }
        } else {
            // ドロップイベントがない場合は、従来の確認ダイアログを表示
            if (confirm(`${cardData.name}をデッキの下に戻しますか？`)) {
                putOnBottom = true;
            }
        }

        if (putOnBottom) {
            deck.push(cardData);
            showToast('cardMoveToast', `${cardData.name}をデッキの下に戻しました`);
        } else {
            deck.unshift(cardData);
            showToast('cardMoveToast', `${cardData.name}をデッキの上に戻しました`);
        }

        // デッキへの配置が確定した場合のみ、コア移動のフラグを立てる
        if (getZoneName({ id: sourceZoneId }) === 'field' && cardData.coresOnCard && cardData.coresOnCard.length > 0) {
            shouldTransferCoresToReserve = true;
        }
    } else if (targetZoneName === 'void') {
        // カードをボイドに移動する場合、単にソースから削除し、どこにも追加しない
        // フィールドからボイドに移動する場合、その上のコアをリザーブに移動
        if (getZoneName({ id: sourceZoneId }) === 'field' && cardData.coresOnCard && cardData.coresOnCard.length > 0) {
            shouldTransferCoresToReserve = true;
        }
        if (!confirm(`${cardData.name}をゲームから除外していいですか？`)) {
            // ユーザーがキャンセルした場合、カードを元の場所に戻す
            sourceArray.splice(cardIndex, 0, cardData);
            renderAll(); // 元に戻した状態を反映
            return; // 処理を中断
        }
        // ユーザーがOKした場合、カードは既にソースから削除されているので何もしない
    } else { // This 'else' block handles all other target zones (hand, field, trash, burst, life, reserve, count)
        // デッキ以外のエリアへの移動の場合
        // フィールドから別のエリアにカードが移動する場合、その上のコアをリザーブに移動
        if (getZoneName({ id: sourceZoneId }) === 'field' && targetZoneName !== 'field' && cardData.coresOnCard && cardData.coresOnCard.length > 0) {
            shouldTransferCoresToReserve = true;
        }

        // 手札に戻す場合は回転状態をリセット
        if (targetZoneName === 'hand') {
            cardData.isRotated = false;
            cardData.isExhausted = false;
        }
        const targetArray = getArrayByZoneName(targetZoneName);
        if (targetArray) targetArray.push(cardData);
    }

    // コア移動のフラグが立っている場合のみ、コアをリザーブに移動し、カード上のコアを空にする
    if (shouldTransferCoresToReserve) {
        cardData.coresOnCard.forEach(core => {
            reserveCores.push(core.type);
        });
        cardData.coresOnCard = [];
    }

    renderAll();
}

function moveCoresToZone(cores, targetZoneName) {
    const targetArray = (targetZoneName === 'trash') ? trashCores : getArrayByZoneName(targetZoneName);

    for (const core of cores) { // coresはコアのタイプ（"blue"や"soul"）の配列を想定
        if (targetZoneName === "void") {
            if (core.type === 'soul') {
                if (!confirm("ソウルドライブしますか？")) {
                    // ソウルドライブをキャンセルした場合、コアを元の場所に戻す
                    // このロジックは複雑になるため、今回は省略。必要であれば別途実装
                }
            }
        } else if (targetArray) {
            // ゾーンにはコアのタイプのみ追加
            targetArray.push(core.type);
        }
    }
    renderAll();
    clearSelectedCores(); // コア移動後に選択状態をクリア
}

function removeCoresFromSource(cores) {
    // Group cores by their source (array or card)
    const groupedCores = {};
    for (const coreInfo of cores) {
        let sourceKey;
        if (coreInfo.sourceArrayName) {
            sourceKey = `array:${coreInfo.sourceArrayName}`;
        } else if (coreInfo.sourceCardId) {
            sourceKey = `card:${coreInfo.sourceCardId}`;
        } else {
            continue;
        }
        if (!groupedCores[sourceKey]) {
            groupedCores[sourceKey] = [];
        }
        groupedCores[sourceKey].push(coreInfo);
    }

    for (const sourceKey in groupedCores) {
        const coresToRemoveFromThisSource = groupedCores[sourceKey];

        // Sort cores to remove from this source by index in descending order
        // This is crucial for splicing multiple elements from the same array
        coresToRemoveFromThisSource.sort((a, b) => b.index - a.index);

        if (sourceKey.startsWith('array:')) {
            const sourceArrayName = sourceKey.substring(6); // "array:".length
            const sourceArray = getArrayByZoneName(sourceArrayName);
            if (!sourceArray) {
                continue;
            }

            for (const coreInfo of coresToRemoveFromThisSource) {
                // Find the actual current index of the core in the array
                // This is the key change: don't rely on coreInfo.index directly for removal
                const actualIndex = coreInfo.index; // Assuming coreInfo.type is the actual core value
                if (actualIndex > -1 && actualIndex < sourceArray.length) {
                    sourceArray.splice(actualIndex, 1);
                } else {
                }
            }

        } else if (sourceKey.startsWith('card:')) {
            const sourceCardId = sourceKey.substring(5); // "card:".length
            const sourceCard = field.find(card => card.id === sourceCardId);
            if (!sourceCard || !sourceCard.coresOnCard) {
                continue;
            }

            for (const coreInfo of coresToRemoveFromThisSource) {
                // For cores on cards, we need to match by type and potentially position if multiple of same type
                // For now, let's assume we remove the first matching type, or if we need exact match, we need unique IDs for cores.
                // Given the current structure, matching by type and then splicing the first one found is the most direct.
                const actualIndex = coreInfo.index; // Assuming coreInfo.type is the actual core value
                if (actualIndex > -1 && actualIndex < sourceCard.coresOnCard.length) {
                    sourceCard.coresOnCard.splice(actualIndex, 1);
                } else {
                }
            }
        }
    }
}

// --- コア選択ロジック ---
function handleCoreClick(e) {
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

function clearSelectedCores() {
    selectedCores = [];
    renderAll(); // 選択状態をクリアしたら再描画してDOMを更新
}

// --- ヘルパー関数 ---
function getZoneName(element) {
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

function getArrayByZoneName(zoneName) {
    switch (zoneName) {
        case 'hand': case 'handZone': return hand;
        case 'field': case 'fieldCards': return field;
        case 'trash': case 'trashZoneFrame': case 'trashModalContent': return trash;
        case 'burst': case 'burstZone': case 'burstCard': return burst;
        case 'life': case 'lifeCores': return lifeCores;
        case 'reserve': case 'reserveCores': return reserveCores;
        case 'count': case 'countZone': return deckCores;
        case 'trashcore': case 'trashListArea': return trashCores;
        default: return null;
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- 描画関数 ---
function renderAll() {
    renderHand();
    renderField();
    renderTrash();
    renderBurst();
    renderCores("lifeCores", lifeCores);
    renderCores("reserveCores", reserveCores);
    renderDeckCore();
    renderTrashCores();

    if (document.getElementById("trashModal").style.display === "flex") {
        renderTrashModalContent();
    }
}

function createCardElement(cardData) {
    const div = document.createElement('div');
    div.className = 'card';
    div.textContent = cardData.name;
    div.draggable = true;
    div.dataset.id = cardData.id;

    // カード個別のクリックイベントリスナーは削除

    const exhaustBtn = document.createElement('button');
    exhaustBtn.className = 'exhaust-button';
    exhaustBtn.textContent = '重疲労';
    exhaustBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardElement = e.target.closest('.card');
        const cardId = cardElement.dataset.id;
        const cardData = field.find(card => card.id === cardId);
        if (!cardData) return;

        if (cardData.isExhausted) {
            cardData.isExhausted = false;
        } else {
            cardData.isExhausted = true;
            cardData.isRotated = false; // 重疲労させたら疲労は解除
        }
        renderAll(); // 状態変更を反映するために再描画
    });
    div.appendChild(exhaustBtn);
    return div;
}

function renderHand() {
    const handZone = document.getElementById("handZone");
    handZone.innerHTML = "";
    hand.forEach(cardData => {
        const cardElement = createCardElement(cardData);
        handZone.appendChild(cardElement);
    });
    document.getElementById("handCount").textContent = hand.length;
}

function renderField() {
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
                } else {
                }
                coresContainer.appendChild(coreDiv);
            });
            cardElement.appendChild(coresContainer);
        }

        fieldZone.appendChild(cardElement);
    });
}

function renderTrash() {
    const trashFrame = document.getElementById("trashCard");
    trashFrame.innerHTML = trash.length > 0 ? `<div class='card'>${trash[trash.length - 1].name}</div>` : "";
}

function renderBurst() {
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

function renderCores(containerId, coreArray) {
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

function renderDeckCore() {
    const countZone = document.getElementById("countZone");
    const countSummary = document.getElementById("deckCoreSummary");
    const n = deckCores.length;
    if (deckShowCountAsNumber) {
        countSummary.textContent = `カウント: ${n}`;
        countSummary.style.display = 'block';
        countZone.style.display = 'none';
        countZone.classList.remove('core-move-mode');
    } else {
        countSummary.style.display = 'none';
        countZone.style.display = 'flex';
        countZone.classList.add('core-move-mode');
        renderCores('countZone', deckCores);
    }
}

function renderTrashCores() {
    const trashListArea = document.getElementById("trashListArea");
    trashListArea.innerHTML = "";
    if (trashCores.length === 0) {
        trashListArea.style.display = "none";
        return;
    }
    trashListArea.style.display = "flex";
    renderCores('trashListArea', trashCores);
}

// --- UI関数 ---
function drawCard(fromBottom = false) {
    if (deck.length > 0) {
        let cardToDraw;
        if (fromBottom) {
            if (!confirm("デッキの下からドローしますか？")) {
                return; // キャンセルされたらドローしない
            }
            cardToDraw = deck.pop(); // デッキの下からドロー
        } else {
            cardToDraw = deck.shift(); // デッキの上からドロー
        }
        hand.push(cardToDraw);
        // ドローしたら手札を開く
        const handZoneContainer = document.getElementById('handZoneContainer');
        const openHandButton = document.getElementById('openHandButton');
        handZoneContainer.classList.remove('collapsed');
        openHandButton.classList.add('hidden');
        renderAll();
    } else {
        alert("デッキが空です");
    }
}

function toggleHand() {
    const container = document.getElementById("handZoneContainer");
    const openBtn = document.getElementById("openHandButton");

    if (container.classList.contains("collapsed")) {
        container.classList.remove("collapsed");
        openBtn.classList.add("hidden");
    } else {
        container.classList.add("collapsed");
        openBtn.classList.remove("hidden");
    }
}

function renderTrashModalContent() {
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

function openTrashModal() {
    const modal = document.getElementById("trashModal");
    renderTrashModalContent();
    modal.style.display = "flex";

    const closeModalOnClick = e => {
        if (!document.getElementById("trashModalContent").contains(e.target)) {
            modal.style.display = "none";
            document.removeEventListener('mousedown', closeModalOnClick);
        }
    };
    setTimeout(() => document.addEventListener('mousedown', closeModalOnClick), 0);
}

function addDeckCore() {
    deckCores.push("blue");
    renderDeckCore();
}

function toggleDeckCoreCount() {
    deckShowCountAsNumber = !deckShowCountAsNumber;
    renderDeckCore();
}

function refreshAll() {
    selectedCores = []; // 選択されたコアをクリア
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

function showToast(toastId, message, hide = false) {
    const toastElement = document.getElementById(toastId);
    if (!toastElement) return;

    clearTimeout(toastTimeout); // 既存のタイマーをクリア

    if (hide || message === '') {
        toastElement.classList.remove('show');
        toastElement.textContent = '';
    } else {
        toastElement.textContent = message;
        toastElement.classList.add('show');
        toastTimeout = setTimeout(() => {
            toastElement.classList.remove('show');
            toastElement.textContent = '';
        }, 1000); // 1秒後に非表示
    }
}