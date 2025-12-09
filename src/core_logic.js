/**
 * ブラシ選択とアクションモードをキャンセルする
 */
export function cancelSelection() {
    setSelectedCores([]);
    setSelectionActionMode('none');
    renderAll();
}

/**
 * 選択されたコアをすべてトラッシュに移動する
 */
export function moveSelectedCoresToTrash() {
    if (selectedCores.length === 0) {
        cancelSelection();
        return;
    }

    const coresToMove = [...selectedCores];
    
    // 1. 移動元のコアを削除
    removeCoresFromSource(coresToMove);

    // 2. トラッシュにコアを追加
    const coreTypes = coresToMove.map(core => core.type);
    trashCores.push(...coreTypes);

    // 3. 状態をリセット
    showToast('infoToast', `${coresToMove.length}個のコアをトラッシュに送りました。`, { duration: 1500 });
    cancelSelection();
}

/**
 * 選択されたコアをすべて指定のカードに移動する
 * @param {string} targetCardId - 移動先のカードID
 */
export function moveSelectedCoresToCard(targetCardId) {
    const targetCard = field.find(card => card.id === targetCardId);
    if (!targetCard || selectedCores.length === 0) {
        cancelSelection();
        return;
    }

    const coresToMove = [...selectedCores];

    // 1. 移動元のコアを削除
    removeCoresFromSource(coresToMove);

    // 2. ターゲットカードにコアを追加（重なりを避ける）
    const cardWidth = 104;
    const cardHeight = 156;
    // カードの中央付近を初期位置にする
    let preferredX = cardWidth / 2 - 10;
    let preferredY = cardHeight / 2 - 10;

    coresToMove.forEach(coreInfo => {
        const { x, y } = findEmptySlot(preferredX, preferredY, targetCard.coresOnCard, cardWidth, cardHeight);
        targetCard.coresOnCard.push({ type: coreInfo.type, x, y });
        // 次のコアの配置場所を少しずらす
        preferredX += 5;
        preferredY += 5;
    });

    // 3. 状態をリセット
    showToast('infoToast', `${coresToMove.length}個のコアを ${targetCard.name} に移動しました。`, { duration: 1500 });
    cancelSelection();
}