// src/core_logic.js
import { lifeCores, reserveCores, countCores, trashCores, field, voidChargeCount, selectedCores, draggedCoreData, setVoidChargeCount, setSelectedCores, setDraggedCoreData } from './game_data.js';
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

export function handleCoreDropOnCard(e, targetCardElement, coresToMoveFromTouch = null) {
    e.preventDefault();
    const coresToMove = coresToMoveFromTouch || JSON.parse(e.dataTransfer.getData("cores"));
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
                x: dropX + (currentCoresOnCardCount * coreOffsetX),
                y: dropY + (currentCoresOnCardCount * coreOffsetY)
            });
        }
        setVoidChargeCount(0); // ボイドコア移動後はチャージをリセット
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
                x: dropX + (currentCoresOnCardCount * coreOffsetX),
                y: dropY + (currentCoresOnCardCount * coreOffsetY)
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

export function handleCoreInternalMoveOnCard(e, targetCardElement, coresToMoveFromTouch = null) {
    e.preventDefault();
    const coresToMove = coresToMoveFromTouch || JSON.parse(e.dataTransfer.getData("cores"));
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

export function handleCoreDropOnZone(e, targetElement, coresToMoveFromTouch = null) {
    const targetZoneName = getZoneName(targetElement);
    let coresToMove = coresToMoveFromTouch; // タッチイベントから渡されたコアデータ

    let type;
    if (coresToMoveFromTouch) {
        // タッチイベントの場合
        if (coresToMoveFromTouch.length > 0 && coresToMoveFromTouch[0].sourceArrayName === 'void') {
            type = 'voidCore';
        } else {
            type = 'core'; // 単一または複数コア
        }
    } else {
        // 標準のドラッグ＆ドロップイベントの場合
        type = e.dataTransfer.getData("type");
        if (type === 'multiCore' || type === 'coreFromCard' || type === 'core' || type === 'voidCore') {
            coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
        }
    }

    // coresToMove が null または undefined の場合は空の配列として扱う
    if (!coresToMove) {
        coresToMove = [];
    }

    // voidCore の処理は特別なので最初に処理
    if (type === 'voidCore') {
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
                const actualIndex = coreInfo.index; // Assuming coreInfo.type is the actual core value
                if (isNaN(actualIndex) || actualIndex < 0 || actualIndex >= sourceArray.length) {
                    console.error(`Invalid index for core removal in ${sourceArrayName}: ${actualIndex}. CoreInfo:`, coreInfo);
                    continue; // 無効なインデックスの場合はスキップ
                }
                sourceArray.splice(actualIndex, 1);
            }

        } else if (sourceKey.startsWith('card:')) {
            const sourceCardId = sourceKey.substring(5); // "card:".length
            const sourceCard = field.find(card => card.id === sourceCardId);
            if (!sourceCard || !sourceCard.coresOnCard) {
                continue;
            }

            for (const coreInfo of coresToRemoveFromThisSource) {
                const actualIndex = coreInfo.index; // Assuming coreInfo.type is the actual core value
                if (isNaN(actualIndex) || actualIndex < 0 || actualIndex >= sourceCard.coresOnCard.length) {
                    console.error(`Invalid index for core removal on card ${sourceCardId}: ${actualIndex}. CoreInfo:`, coreInfo);
                    continue; // 無効なインデックスの場合はスキップ
                }
                sourceCard.coresOnCard.splice(actualIndex, 1);
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