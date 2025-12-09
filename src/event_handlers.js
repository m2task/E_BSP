

// =====================================================================
// ★★★ ブラシ選択とコア移動の新ロジック ★★★
// =====================================================================

function handleBrushMouseDown(e) {
    // ボタン、カード、既存コアの上で開始された場合は、それぞれの要素のイベントに任せる
    if (e.target.closest('#coreActionContainer button, .card, .core, .zone-title, .deck-button, #handZone')) {
        return;
    }

    // アクションボタンが表示されている状態で、ボタン以外をクリックしたら選択解除
    if (selectedCores.length > 0 && !e.target.closest('#coreActionContainer')) {
        clearSelectedCores();
        hideCoreActionButtons();
        renderAll();
    }

    // ブラシ選択を開始
    setBrushSelectState({ isSelecting: true });
    // 既に選択されているものがあればクリア
    if (selectedCores.length > 0) {
        clearSelectedCores();
        renderAll();
    }

    document.addEventListener('mousemove', handleBrushMouseMove);
    document.addEventListener('mouseup', handleBrushMouseUp);
}

function handleBrushMouseMove(e) {
    if (!brushSelectState.isSelecting) return;

    // マウス下の要素を取得
    const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
    if (!elementUnderMouse) return;

    const coreElement = elementUnderMouse.closest('.core');
    if (coreElement) {
        const coreType = coreElement.dataset.coreType;
        const index = parseInt(coreElement.dataset.index, 10);
        const sourceCardId = coreElement.dataset.sourceCardId;
        const sourceArrayName = sourceCardId ? null : coreElement.parentElement.id;

        const coreIdentifier = { type: coreType, index };
        if (sourceCardId) {
            coreIdentifier.sourceCardId = sourceCardId;
        } else {
            coreIdentifier.sourceArrayName = sourceArrayName;
        }

        // すでに選択されているかチェック
        const isAlreadySelected = selectedCores.some(c =>
            c.index === index &&
            c.sourceCardId === sourceCardId &&
            c.sourceArrayName === sourceArrayName
        );

        if (!isAlreadySelected) {
            selectedCores.push(coreIdentifier);
            renderAll(); // リアルタイムでハイライト
        }
    }
}

function handleBrushMouseUp(e) {
    setBrushSelectState({ isSelecting: false });
    document.removeEventListener('mousemove', handleBrushMouseMove);
    document.removeEventListener('mouseup', handleBrushMouseUp);

    if (selectedCores.length > 0) {
        showCoreActionButtons();
    }
}

function showCoreActionButtons() {
    const container = document.getElementById('coreActionContainer');
    const buttons = document.getElementById('coreActionButtons');
    const message = document.getElementById('coreActionMessageContainer');
    
    message.style.display = 'none';
    buttons.style.display = 'flex';
    container.style.display = 'flex';
}

function hideCoreActionButtons() {
    const container = document.getElementById('coreActionContainer');
    container.style.display = 'none';
}

// --- アクションボタンのイベントリスナー ---

// 「トラッシュへ送る」ボタン
document.getElementById('moveCoresToTrashBtn').addEventListener('click', () => {
    if (selectedCores.length === 0) return;

    // ソウルコアが含まれるか確認
    const hasSoulCore = selectedCores.some(c => c.type === 'soul');
    if (hasSoulCore) {
        if (!confirm('ソウルコアをトラッシュに送りますか？')) {
            return; // キャンセルされたら何もしない
        }
    }

    // コアをトラッシュに移動
    removeCoresFromSource(selectedCores);
    selectedCores.forEach(core => trashCores.push(core.type));

    // 後処理
    clearSelectedCores();
    hideCoreActionButtons();
    renderAll();
});

// 「カードへ移動」ボタン
document.getElementById('moveCoresToCardBtn').addEventListener('click', () => {
    if (selectedCores.length === 0) return;

    // カード選択モードに移行
    const container = document.getElementById('coreActionContainer');
    const buttons = document.getElementById('coreActionButtons');
    const messageContainer = document.getElementById('coreActionMessageContainer');
    const message = document.getElementById('coreActionMessage');

    buttons.style.display = 'none';
    message.textContent = '移動先のカードをクリックしてください...';
    messageContainer.style.display = 'flex';

    // カードクリックリスナーを一時的に設定
    const fieldCards = document.getElementById('fieldCards');
    fieldCards.addEventListener('click', handleCardSelectForMove, { once: true });

    // キャンセルボタンのリスナー
    document.getElementById('cancelCoreMoveBtn').addEventListener('click', () => {
        fieldCards.removeEventListener('click', handleCardSelectForMove);
        showCoreActionButtons(); // 元のボタン表示に戻す
    }, { once: true });
});

// 「カードへ移動」モード中のカードクリック処理
function handleCardSelectForMove(e) {
    const cardElement = e.target.closest('.card');
    if (!cardElement) {
        // カード以外がクリックされたら、もう一度クリックを待つ
        const fieldCards = document.getElementById('fieldCards');
        fieldCards.addEventListener('click', handleCardSelectForMove, { once: true });
        return;
    }

    // コアをカードに移動
    moveSelectedCoresToCard(cardElement);

    // 後処理
    clearSelectedCores();
    hideCoreActionButtons();
    renderAll();
}
