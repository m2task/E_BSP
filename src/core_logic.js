// src/core_logic.js
import { lifeCores, reserveCores, countCores, trashCores, field, voidChargeCount, selectedCores, draggedCoreData, setVoidChargeCount, setSelectedCores, setDraggedCoreData, draggedElement, coreIdCounter, setCoreIdCounter } from './game_data.js';
import { renderAll } from './ui_render.js';
import { showToast, getArrayByZoneName, getZoneName } from './utils.js';

export function handleCoreClick(e) {
    e.stopPropagation(); // イベントの伝播を停止
    const coreElement = e.target.closest('.core');
    if (!coreElement) {
        return;
    }

    const coreId = coreElement.dataset.coreId; // coreId を取得
    const coreType = coreElement.dataset.coreType;
    const sourceCardId = coreElement.dataset.sourceCardId; // カード上のコアの場合

    // 選択されたコアの情報を構築
    let clickedCore = { id: coreId, type: coreType };
    if (sourceCardId) {
        clickedCore.sourceCardId = sourceCardId;
    } else {
        clickedCore.sourceArrayName = coreElement.parentElement.id;
    }

    const existingIndex = selectedCores.findIndex(c => c.id === coreId); // IDで検索

    // Ctrl/Metaキーの有無に関わらず、選択をトグル
    if (existingIndex > -1) {
        selectedCores.splice(existingIndex, 1);
    } else {
        selectedCores.push(clickedCore);
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

    if (e.preventDefault) {
        e.preventDefault();
    }

    const cardRect = targetCardElement.getBoundingClientRect();
    let dropX = e.clientX - cardRect.left;
    let dropY = e.clientY - cardRect.top;
    const type = e.dataTransfer.getData("type");

    // カードが回転している場合、ドロップ座標を変換する
    if (targetCard.isRotated) {
        const originalWidth = 104; // CSSでの定義値
        const originalHeight = 156; // CSSでの定義値

        const xFromCenter = dropX - (cardRect.width / 2);
        const yFromCenter = dropY - (cardRect.height / 2);

        const rotatedXFromCenter = yFromCenter;
        const rotatedYFromCenter = -xFromCenter;

        dropX = rotatedXFromCenter + (originalWidth / 2);
        dropY = rotatedYFromCenter + (originalHeight / 2);
    }

    const coreWidth = 20;
    const coreHeight = 20;
    const clampWidth = 104;
    const clampHeight = 156;

    dropX = Math.max(0, Math.min(dropX, clampWidth - coreWidth));
    dropY = Math.max(0, Math.min(dropY, clampHeight - coreHeight));

    if (type === 'voidCore') {
        const coresToAddCount = coresToMove.length;
        let currentCoreId = coreIdCounter; // coreIdCounter を取得
        for (let i = 0; i < coresToAddCount; i++) {
            targetCard.coresOnCard.push({ id: `core-${currentCoreId++}`, type: "blue", x: dropX, y: dropY }); // IDを付与
        }
        setCoreIdCounter(currentCoreId); // coreIdCounter を更新
        setVoidChargeCount(0);
        showToast('voidToast', '', true);
        const toastMessage = `${coresToAddCount}個増やしました`;
        showToast('voidToast', toastMessage);
    } else {
        removeCoresFromSource(coresToMove);
        for (const coreInfo of coresToMove) {
            // コアオブジェクト全体を渡す
            targetCard.coresOnCard.push({ ...coreInfo, x: dropX, y: dropY });
        }
    }
    renderAll(); // コアの追加後に再描画
}

export function handleCoreInternalMoveOnCard(e, targetCardElement) {
    e.preventDefault();
    const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
    const targetCardId = targetCardElement.dataset.id;
    const targetCard = field.find(card => card.id === targetCardId);

    if (!targetCard || coresToMove.length !== 1) return;

    const coreInfo = coresToMove[0];
    // IDでコアを検索
    const coreToMoveOnCard = targetCard.coresOnCard.find(c => c.id === coreInfo.id);
    if (!coreToMoveOnCard) {
        return;
    }

    const cardRect = targetCardElement.getBoundingClientRect();
    const offsetX = parseFloat(e.dataTransfer.getData("offsetX"));
    const offsetY = parseFloat(e.dataTransfer.getData("offsetY"));

    let newX = e.clientX - cardRect.left;
    let newY = e.clientY - cardRect.top;

    if (targetCard.isRotated) {
        const originalWidth = 104;
        const originalHeight = 156;

        const xFromCenter = newX - (cardRect.width / 2);
        const yFromCenter = newY - (cardRect.height / 2);

        const rotatedXFromCenter = yFromCenter;
        const rotatedYFromCenter = -xFromCenter;

        newX = rotatedXFromCenter + (originalWidth / 2);
        newY = rotatedYFromCenter + (originalHeight / 2);
    }

    newX -= offsetX;
    newY -= offsetY;

    const coreWidth = 20;
    const coreHeight = 20;
    const clampWidth = 104;
    const clampHeight = 156;

    newX = Math.max(0, Math.min(newX, clampWidth - coreWidth));
    newY = Math.max(0, Math.min(newY, clampHeight - coreHeight));

    coreToMoveOnCard.x = newX; // 直接コアオブジェクトのプロパティを更新
    coreToMoveOnCard.y = newY; // 直接コアオブジェクトのプロパティを更新

    if (draggedElement) {
        draggedElement.style.display = 'block';
    }
    renderAll(); // コアの位置変更後に再描画
}

export function handleCoreDropOnZone(e, targetElement) {
    const targetZoneName = getZoneName(targetElement);
    const type = e.dataTransfer.getData("type");

    if (type === 'voidCore') {
        const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
        setVoidChargeCount(0);
        showToast('voidToast', '', true);

        const movedCount = coresToMove.length;
        let currentCoreId = coreIdCounter; // coreIdCounter を取得
        for (let i = 0; i < movedCount; i++) {
            const newCore = { id: `core-${currentCoreId++}`, type: "blue" }; // IDを付与
            if (targetZoneName === 'trash') trashCores.push(newCore);
            else if (targetZoneName === 'reserve') reserveCores.push(newCore);
            else if (targetZoneName === 'life') lifeCores.push(newCore);
            else if (targetZoneName === 'count') countCores.push(newCore);
        }
        setCoreIdCounter(currentCoreId); // coreIdCounter を更新
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
            targetArray.push(coreInfo); // コアオブジェクト全体をプッシュ
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

        if (sourceKey.startsWith('array:')) {
            const sourceArrayName = sourceKey.substring(6); // "array:".length
            const sourceArray = getArrayByZoneName(sourceArrayName);
            if (!sourceArray) {
                continue;
            }

            for (const coreInfo of coresToRemoveFromThisSource) {
                const indexToRemove = sourceArray.findIndex(c => c.id === coreInfo.id); // IDで検索
                if (indexToRemove > -1) {
                    sourceArray.splice(indexToRemove, 1);
                }
            }

        } else if (sourceKey.startsWith('card:')) {
            const sourceCardId = sourceKey.substring(5); // "card:".length
            const sourceCard = field.find(card => card.id === sourceCardId);
            if (!sourceCard || !sourceCard.coresOnCard) {
                continue;
            }

            for (const coreInfo of coresToRemoveFromThisSource) {
                const indexToRemove = sourceCard.coresOnCard.findIndex(c => c.id === coreInfo.id); // IDで検索
                if (indexToRemove > -1) {
                    sourceCard.coresOnCard.splice(indexToRemove, 1);
                }
            }
        }
    }
}

export function payCostFromReserve(cost) {
    if (cost <= 0) return true; // コストが0以下の場合は支払い不要

    // コアオブジェクトの配列としてフィルタリング
    const normalCores = reserveCores.filter(core => core.type === "blue");
    const soulCores = reserveCores.filter(core => core.type === "soul");

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
        trashCores.push(core); // コアオブジェクト全体をプッシュ
    }

    // 残ったコアでリザーブを再構築
    setReserveCores([...normalCores, ...soulCores]); // setReserveCores を使用して更新

    renderAll();
    return true; // 支払い成功
}

export function handleCoreDragStart(e, coreId, coreType, sourceArrayName, sourceCardId) {
    e.stopPropagation();
    const coreElement = e.target.closest('.core');
    const isSelected = coreElement.classList.contains('selected');
    let coresToDrag = [];

    if (isSelected) {
        coresToDrag = [...selectedCores];
    }
    else {
        const coreIdentifier = { id: coreId, type: coreType }; // IDを付与
        if (sourceCardId) {
            coreIdentifier.sourceCardId = sourceCardId;
        }
        else {
            coreIdentifier.sourceArrayName = sourceArrayName;
        }
        coresToDrag = [coreIdentifier];
    }

    e.dataTransfer.setData("cores", JSON.stringify(coresToDrag));
    e.dataTransfer.setData("type", "multiCore");

    if (sourceCardId) {
        e.dataTransfer.setData("type", "coreFromCard");
        const cardRect = coreElement.closest('.card').getBoundingClientRect();
        const coreRect = coreElement.getBoundingClientRect();
        const offsetX = e.clientX - coreRect.left;
        const offsetY = e.clientY - coreRect.top;
        e.dataTransfer.setData("offsetX", offsetX);
        e.dataTransfer.setData("offsetY", offsetY);
    }
    else {
        e.dataTransfer.setData("type", "core");
    }

    setDraggedCoreData({
        cores: coresToDrag,
        sourceArrayName: sourceArrayName,
        sourceCardId: sourceCardId
    });

    setTimeout(() => {
        if (draggedElement) {
            draggedElement.style.display = 'none';
        }
    }, 0);
}

export function handleVoidCoreDragStart(e) {
    const voidCoreElement = document.getElementById('voidCore');
    const count = voidChargeCount > 0 ? voidChargeCount : 1;
    
    let currentCoreId = coreIdCounter; // coreIdCounter を取得
    const coresToDrag = Array(count).fill(null).map(() => ({ id: `core-${currentCoreId++}`, type: 'blue' })); // IDを付与
    setCoreIdCounter(currentCoreId); // coreIdCounter を更新

    e.dataTransfer.setData("cores", JSON.stringify(coresToDrag));
    e.dataTransfer.setData("type", "voidCore");

    setDraggedCoreData({
        cores: coresToDrag,
        sourceArrayName: 'void'
    });
}

export function handleVoidCoreClick(e) {
    e.stopPropagation();
    setVoidChargeCount(voidChargeCount + 1);
    const toastMessage = `${voidChargeCount + 1}個`;
    showToast('voidToast', toastMessage);
}

export function handleVoidCoreRightClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (voidChargeCount > 0) {
        setVoidChargeCount(voidChargeCount - 1);
        const toastMessage = voidChargeCount > 0 ? `${voidChargeCount}個` : '';
        showToast('voidToast', toastMessage, voidChargeCount === 0);
    }
}