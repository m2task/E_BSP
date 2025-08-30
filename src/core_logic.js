// src/core_logic.js
import { lifeCores, reserveCores, countCores, trashCores, field, voidChargeCount, selectedCores, draggedCoreData, setVoidChargeCount, setSelectedCores, setDraggedCoreData, draggedElement } from './game_data.js';
import { renderAll } from './ui_render.js';
import { showToast, getArrayByZoneName, getZoneName } from './utils.js';

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

export function clearSelectedCores() {
    setSelectedCores([]);
    renderAll(); // 選択状態をクリアしたら再描画してDOMを更新
}

export function handleCoreDropOnCard(e, targetCardElement) {
    const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
    const targetCardId = targetCardElement.dataset.id;
    const targetCard = field.find(card => card.id === targetCardId);

    if (!targetCard) return;

    // preventDefault() は実際のイベントオブジェクトにしか存在しないため、存在チェックを行う
    if (e.preventDefault) {
        e.preventDefault();
    }

    const cardRect = targetCardElement.getBoundingClientRect();
    const dropX = e.clientX - cardRect.left;
    const dropY = e.clientY - cardRect.top;
    const type = e.dataTransfer.getData("type");

    if (type === 'voidCore') {
        // ボイドコアの場合、チャージ数分の新しい青コアを生成してカードに追加
        const coresToAddCount = coresToMove.length;
        const coreOffsetX = 10;
        const coreOffsetY = 10;

        for (let i = 0; i < coresToAddCount; i++) {
            const currentCoresOnCardCount = targetCard.coresOnCard.length;
            targetCard.coresOnCard.push({
                type: "blue",
                x: dropX + (currentCoresOnCardCount * coreOffsetX),
                y: dropY + (currentCoresOnCardCount * coreOffsetY)
            });
        }
        setVoidChargeCount(0);
        showToast('voidToast', '', true);
    } else {
        // 通常のコア移動の場合
        removeCoresFromSource(coresToMove);

        const coreOffsetX = 10;
        const coreOffsetY = 10;

        for (const coreInfo of coresToMove) {
            const currentCoresOnCardCount = targetCard.coresOnCard.length;
            targetCard.coresOnCard.push({
                type: coreInfo.type,
                x: dropX + (currentCoresOnCardCount * coreOffsetX),
                y: dropY + (currentCoresOnCardCount * coreOffsetY)
            });
        }
    }

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

    // ドラッグされた要素の表示を元に戻す
    if (draggedElement) {
        draggedElement.style.display = 'block';
    }

}

export function handleCoreDropOnZone(e, targetElement) {
    const targetZoneName = getZoneName(targetElement);
    const type = e.dataTransfer.getData("type");

    if (type === 'voidCore') {
        const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
        setVoidChargeCount(0);
        showToast('voidToast', '', true);

        const movedCount = coresToMove.length;
        for (let i = 0; i < movedCount; i++) {
            if (targetZoneName === 'trash') trashCores.push("blue");
            else if (targetZoneName === 'reserve') reserveCores.push("blue");
            else if (targetZoneName === 'life') lifeCores.push("blue");
            else if (targetZoneName === 'count') countCores.push("blue");
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

export function removeCoresFromSource(cores) {
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

export function payCostFromReserve(cost) {
    if (cost <= 0) return true; // コストが0以下の場合は支払い不要

    const normalCores = reserveCores.filter(core => core === "blue");
    const soulCores = reserveCores.filter(core => core === "soul");

    if (normalCores.length + soulCores.length < cost) {
        alert(`リザーブのコアが足りません。必要なコア: ${cost}個、現在のリザーブ: ${reserveCores.length}個`);
        return false; // 支払い失敗
    }

    let paidCount = 0;
    const coresToPay = [];

    // 優先的にノーマルコアを支払う
    while (paidCount < cost && normalCores.length > 0) {
        coresToPay.push(normalCores.shift());
        paidCount++;
    }

    // 足りない分をソウルコアで支払う
    while (paidCount < cost && soulCores.length > 0) {
        coresToPay.push(soulCores.shift());
        paidCount++;
    }

    // 支払ったコアをトラッシュに移動
    for (const core of coresToPay) {
        trashCores.push(core);
    }

    // 残ったコアでリザーブを再構築
    reserveCores.splice(0, reserveCores.length, ...normalCores, ...soulCores);

    renderAll();
    return true; // 支払い成功
}