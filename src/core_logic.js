// src/core_logic.js
import { lifeCores, reserveCores, countCores, trashCores, field, voidChargeCount, selectedCores, draggedCoreData, paymentState, setPaymentState, setVoidChargeCount, setSelectedCores, setDraggedCoreData, draggedElement, setMoveState, moveState } from './game_data.js';
import { renderAll } from './ui_render.js';
import { showToast, getArrayByZoneName, getZoneName } from './utils.js';


// =====================================================================
// ★★★ 重なり解消のためのヘルパー関数群 ★★★
// =====================================================================
const CORE_WIDTH = 20;
const CORE_HEIGHT = 20;
const PLACEMENT_MARGIN = 2; // コア間の最小マージン

/**
 * 二つのコアが重なっているか判定する
 * @param {{x: number, y: number}} core1
 * @param {{x: number, y: number}} core2
 * @returns {boolean}
 */
function isOverlapping(core1, core2) {
    return (
        core1.x < core2.x + CORE_WIDTH + PLACEMENT_MARGIN &&
        core1.x + CORE_WIDTH + PLACEMENT_MARGIN > core2.x &&
        core1.y < core2.y + CORE_HEIGHT + PLACEMENT_MARGIN &&
        core1.y + CORE_HEIGHT + PLACEMENT_MARGIN > core2.y
    );
}

/**
 * 指定されたカード上で、希望の座標に近い空きスロットを探索する
 * @param {number} preferredX - 希望のX座標
 * @param {number} preferredY - 希望のY座標
 * @param {Array<{x: number, y: number}>} existingCores - カード上の既存コアのリスト
 * @param {number} cardWidth - カードの幅
 * @param {number} cardHeight - カードの高さ
 * @returns {{x: number, y: number}} - 配置可能な新しい座標
 */
function findEmptySlot(preferredX, preferredY, existingCores, cardWidth, cardHeight) {
    let newPos = { x: preferredX, y: preferredY };

    // まず希望の座標をカード内にクランプ
    newPos.x = Math.max(0, Math.min(newPos.x, cardWidth - CORE_WIDTH));
    newPos.y = Math.max(0, Math.min(newPos.y, cardHeight - CORE_HEIGHT));

    let isOccupied = existingCores.some(core => isOverlapping(newPos, core));

    // もし埋まっていたら、空きスペースを螺旋状に探索
    if (isOccupied) {
        let radius = CORE_WIDTH / 2; // 最初の探索半径
        let angle = 0;
        let found = false;
        const maxRadius = Math.max(cardWidth, cardHeight) * 2; // 無限ループ防止

        while (!found && radius < maxRadius) {
            // 螺旋の座標を計算
            const testX = preferredX + Math.round(radius * Math.cos(angle));
            const testY = preferredY + Math.round(radius * Math.sin(angle));

            let candidatePos = { x: testX, y: testY };

            // カード境界内にクランプ
            candidatePos.x = Math.max(0, Math.min(candidatePos.x, cardWidth - CORE_WIDTH));
            candidatePos.y = Math.max(0, Math.min(candidatePos.y, cardHeight - CORE_HEIGHT));

            // その場所が空いているかチェック
            isOccupied = existingCores.some(core => isOverlapping(candidatePos, core));

            if (!isOccupied) {
                newPos = candidatePos;
                found = true;
            }

            // 角度を進める
            angle += Math.PI / 4; // 角度のステップを大きくする
            if (angle > Math.PI * 2) { // 1周したら半径を広げる
                angle = 0;
                radius += 5; // 半径の増加ステップ
            }
        }
    }

    return newPos;
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

export function clearSelectedCores() {
    setSelectedCores([]);
    renderAll(); // 選択状態をクリアしたら再描画してDOMを更新
}

export function handleCoreDropOnCard(e, targetCardElement) {
    const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
    const targetCardId = targetCardElement.dataset.id;
    const targetCard = field.find(card => card.id === targetCardId);

    if (!targetCard) return;
    e.preventDefault();

    const cardRect = targetCardElement.getBoundingClientRect();
    let initialDropX = e.clientX - cardRect.left;
    let initialDropY = e.clientY - cardRect.top;
    const type = e.dataTransfer.getData("type");

    // カードの回転に対応
    if (targetCard.isRotated) {
        const originalWidth = 104;
        const originalHeight = 156;
        const xFromCenter = initialDropX - (cardRect.width / 2);
        const yFromCenter = initialDropY - (cardRect.height / 2);
        const rotatedXFromCenter = yFromCenter;
        const rotatedYFromCenter = -xFromCenter;
        initialDropX = rotatedXFromCenter + (originalWidth / 2);
        initialDropY = rotatedYFromCenter + (originalHeight / 2);
    }

    const clampWidth = 104;
    const clampHeight = 156;

    // --- 重なり解消ロジック ---
    const addCoresWithOverlapAvoidance = (cores) => {
        let currentCoresOnCard = [...targetCard.coresOnCard];

        cores.forEach(coreInfo => {
            const coreType = (typeof coreInfo === 'string') ? coreInfo : coreInfo.type;
            const { x, y } = findEmptySlot(initialDropX, initialDropY, currentCoresOnCard, clampWidth, clampHeight);
            const newCore = { type: coreType, x, y };
            targetCard.coresOnCard.push(newCore);
            currentCoresOnCard.push(newCore);
        });
    };

    if (type === 'voidCore') {
        const coresToAddCount = coresToMove.length;
        const newCores = Array(coresToAddCount).fill("blue");
        addCoresWithOverlapAvoidance(newCores);
        setVoidChargeCount(0);
        showToast('voidToast', '', { hide: true });
        const toastMessage = `${coresToAddCount}個増やしました`;
        showToast('voidToast', toastMessage, { duration: 1000 });
    } else {
        removeCoresFromSource(coresToMove);
        addCoresWithOverlapAvoidance(coresToMove);
    }
}

export function handleCoreInternalMoveOnCard(e, targetCardElement) {
    e.preventDefault();
    const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
    const targetCardId = targetCardElement.dataset.id;
    const targetCard = field.find(card => card.id === targetCardId);

    if (!targetCard || coresToMove.length !== 1) return;

    const coreInfo = coresToMove[0];
    const coreIndexOnCard = coreInfo.index;

    if (coreIndexOnCard === undefined || coreIndexOnCard < 0 || coreIndexOnCard >= targetCard.coresOnCard.length) {
        return;
    }

    const cardRect = targetCardElement.getBoundingClientRect();
    const offsetX = parseFloat(e.dataTransfer.getData("offsetX"));
    const offsetY = parseFloat(e.dataTransfer.getData("offsetY"));

    let preferredX = e.clientX - cardRect.left;
    let preferredY = e.clientY - cardRect.top;

    if (targetCard.isRotated) {
        const originalWidth = 104;
        const originalHeight = 156;
        const xFromCenter = preferredX - (cardRect.width / 2);
        const yFromCenter = preferredY - (cardRect.height / 2);
        const rotatedXFromCenter = yFromCenter;
        const rotatedYFromCenter = -xFromCenter;
        preferredX = rotatedXFromCenter + (originalWidth / 2);
        preferredY = rotatedYFromCenter + (originalHeight / 2);
    }

    preferredX -= offsetX;
    preferredY -= offsetY;

    const clampWidth = 104;
    const clampHeight = 156;

    // --- 重なり解消ロジック ---
    const otherCores = targetCard.coresOnCard.filter((_, index) => index !== coreIndexOnCard);
    const { x, y } = findEmptySlot(preferredX, preferredY, otherCores, clampWidth, clampHeight);

    targetCard.coresOnCard[coreIndexOnCard].x = x;
    targetCard.coresOnCard[coreIndexOnCard].y = y;

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
        showToast('voidToast', '', { hide: true });

        const movedCount = coresToMove.length;
        for (const coreInfo of coresToMove) { // ループを変更
            // voidCoreであっても、ドラッグされたコアのタイプを尊重する
            // ただし、voidCore本来のドラッグ元にはtypeがないので、'blue'をデフォルトにする
            const droppedCoreType = coreInfo.type && coreInfo.type !== 'void' ? coreInfo.type : 'blue';

            if (targetZoneName === 'trash') trashCores.push(droppedCoreType);
            else if (targetZoneName === 'reserve') reserveCores.push(droppedCoreType);
            else if (targetZoneName === 'life') lifeCores.push(droppedCoreType);
            else if (targetZoneName === 'count') countCores.push(droppedCoreType);
        }
        const toastMessage = `${movedCount}個増やしました`;
        showToast('voidToast', toastMessage, { duration: 1000 });
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
                // キャンセルの場合は何もしない（＝元のの位置に残る）
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
        for (const coreInfo of coresToMove) {
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
                // For now, let's assume we remove the first matching type, or if we need unique IDs for cores.
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

export function getTotalCoresOnReserve() {
    return reserveCores.length;
}

export function getTotalCoresOnField() {
    return field.reduce((sum, card) => sum + (card.coresOnCard ? card.coresOnCard.length : 0), 0);
}

export function canPayTotal(cost) {
    const totalCores = getTotalCoresOnReserve() + getTotalCoresOnField();
    return totalCores >= cost;
}

// 新しい支払いフローのメイン関数
export function payCost(totalCost, cardToPlay, onPaymentSuccess) {
    // 1. リザーブから支払える分を計算
    const tempReserve = [...reserveCores];
    const coresFromReserve = [];
    // ソウルコアを後回しにする
    const normalCores = tempReserve.filter(c => c !== 'soul');
    const soulCores = tempReserve.filter(c => c === 'soul');

    while (coresFromReserve.length < totalCost && normalCores.length > 0) {
        coresFromReserve.push(normalCores.shift());
    }
    while (coresFromReserve.length < totalCost && soulCores.length > 0) {
        coresFromReserve.push(soulCores.shift());
    }

    const paidFromReserve = coresFromReserve.length;
    const remainingCost = totalCost - paidFromReserve;

    // 2. 不足コストがない場合 (リザーブだけで足りる)
    if (remainingCost <= 0) {
        // 支払ったコアをリザーブから削除する
        coresFromReserve.forEach(coreType => {
            const index = reserveCores.findIndex(c => c === coreType);
            if (index !== -1) {
                reserveCores.splice(index, 1);
            }
        });
        trashCores.push(...coresFromReserve);
        onPaymentSuccess();
        renderAll();
        return;
    }

    // 3. 不足コストがある場合 -> フィールド支払いへ
    showToast('infoToast', `残り${remainingCost}コストをフィールドのカードをクリックして支払ってください。`, { duration: 2000 });

    const onFieldPaymentSuccess = () => {
        // このコールバックは completePayment から呼ばれる
        // フィールド支払い分は completePayment 内でトラッシュに送られる
        // ここでリザーブからの支払い分をコミットする
        // 支払ったコアをリザーブから削除する
        coresFromReserve.forEach(coreType => {
            const index = reserveCores.findIndex(c => c === coreType);
            if (index !== -1) {
                reserveCores.splice(index, 1);
            }
        });
        trashCores.push(...coresFromReserve);
        onPaymentSuccess(); // 最終的な成功コールバック
    };

    // フィールド支払い開始
    startFieldPayment(remainingCost, cardToPlay, onFieldPaymentSuccess);
}


/**
 * フィールドからのコスト支払いプロセスを開始する
 */
export function startFieldPayment(totalCost, cardToPlay, successCallback) {
    setPaymentState({
        isPaying: true,
        totalCost: totalCost,
        paidAmount: 0,
        cardToPlay: cardToPlay,
        source: 'field',
        callback: successCallback,
        paymentLog: [],
    });
    renderAll();
}

/**
 * フィールドのカードからコストを支払う
 */
export function payCostFromField(cardId, amount) {
    if (!paymentState.isPaying || paymentState.source !== 'field') return;

    const card = field.find(c => c.id === cardId);
    if (!card || card.coresOnCard.length < amount) {
        return;
    }

    const remainingCost = paymentState.totalCost - paymentState.paidAmount;
    const paymentAmount = Math.min(amount, remainingCost);

    const coresToPay = [];
    const tempCoresOnCard = [...card.coresOnCard];
    const normalCoresOnCard = tempCoresOnCard.filter(c => c.type !== 'soul');
    const soulCoresOnCard = tempCoresOnCard.filter(c => c.type === 'soul');

    for (let i = 0; i < paymentAmount; i++) {
        if (normalCoresOnCard.length > 0) {
            coresToPay.push(normalCoresOnCard.pop());
        } else if (soulCoresOnCard.length > 0) {
            coresToPay.push(soulCoresOnCard.pop());
        }
    }

    if (coresToPay.length < paymentAmount) {
        return;
    }

    coresToPay.forEach(coreToRemove => {
        const index = card.coresOnCard.findIndex(c => c === coreToRemove);
        if (index !== -1) {
            card.coresOnCard.splice(index, 1);
        }
    });

    const logEntry = { fromCardId: cardId, paidCores: coresToPay };
    paymentState.paymentLog.push(logEntry);

    const newPaidAmount = paymentState.paidAmount + paymentAmount;
    setPaymentState({
        paidAmount: newPaidAmount,
        paymentLog: paymentState.paymentLog,
    });

    const remainingAfterThis = paymentState.totalCost - newPaidAmount;
    if (remainingAfterThis > 0) {
        showToast('infoToast', `あと${remainingAfterThis}コスト支払ってください。`, { duration: 1500 });
    }

    if (newPaidAmount >= paymentState.totalCost) {
        completePayment();
    }

    renderAll();
}

/**
 * コスト支払いプロセスを完了する (フィールド支払い完了時)
 */
export function completePayment() {
    if (!paymentState.isPaying) return;

    const { callback, paymentLog } = paymentState;

    // フィールドからの支払い分をトラッシュに移動
    if (paymentLog.length > 0) {
        paymentLog.forEach(log => {
            log.paidCores.forEach(core => {
                trashCores.push(core.type);
            });
        });
    }

    // 支払い状態をリセット
    setPaymentState({
        isPaying: false,
        totalCost: 0,
        paidAmount: 0,
        cardToPlay: null,
        source: 'reserve',
        callback: null,
        paymentLog: [],
    });

    // 成功コールバック（リザーブ分のコミットと最終的な成功処理）を実行
    if (callback) {
        callback();
    } else {
        renderAll();
    }
}

/**
 * コスト支払いプロセスをキャンセルする (フィールド支払いキャンセル時)
 */
export function cancelPayment(updateUI = true) {
    // フィールドからの支払いログに基づいてコアを元の場所に戻す
    if (paymentState.paymentLog.length > 0) {
        paymentState.paymentLog.forEach(log => {
            const card = field.find(c => c.id === log.fromCardId);
            if (card) {
                card.coresOnCard.push(...log.paidCores);
            }
        });
    }

    // 支払い状態をリセット
    setPaymentState({
        isPaying: false,
        totalCost: 0,
        paidAmount: 0,
        cardToPlay: null,
        source: 'reserve',
        callback: null,
        paymentLog: [], // ログをクリア
    });

    if (updateUI) {
        showToast('infoToast', 'コスト支払いがキャンセルされました', { duration: 1500 });
        renderAll();
    }
}

export function placeCoreOnSummonedCard(summonedCard) {
  if (reserveCores.length > 0) {
    // 1. リザーブからコアを乗せる (ソウルコア優先)
    let coreToMove;
    const soulCoreIndex = reserveCores.findIndex(c => c === 'soul');

    if (soulCoreIndex !== -1) {
        // ソウルコアがあれば優先的に移動
        coreToMove = reserveCores.splice(soulCoreIndex, 1)[0];
    } else {
        // なければ最初のコアを移動
        coreToMove = reserveCores.shift();
    }
    summonedCard.coresOnCard.push({ type: coreToMove, sourceArrayName: 'reserveCores' });
    showToast('infoToast', `${summonedCard.name}にリザーブからコアを1個置きました。`, { duration: 1500 });
    renderAll();
  } else {
    // 2. リザーブにコアがない場合、フィールドの他のカードから移動
    const potentialSourceCards = field.filter(card => card.id !== summonedCard.id && card.coresOnCard.length > 0);

    if (potentialSourceCards.length > 0) {
      // フィールドからのコア移動を開始
      startCoreMoveFromField(summonedCard);
    } else {
      // 3. 移動できるコアがどこにもない
      showToast('infoToast', 'リザーブにもフィールドにも移動できるコアがありません。', { duration: 2000 });
    }
  }
}

/**
 * フィールドからのコア移動プロセスを開始する
 */
export function startCoreMoveFromField(targetCard) {
    setMoveState({
        isMoving: true,
        targetCard: targetCard,
        callback: () => {
            // 移動成功時のコールバック（もしあれば）
            showToast('infoToast', `${targetCard.name}にコアを移動しました。`, { duration: 1500 });
        },
    });
    showToast('infoToast', `移動元のカードをクリックしてください。`, { duration: 2000 });
    renderAll(); // フィールドのカードをハイライトするために再描画
}

/**
 * フィールドのカードから別のカードへコアを1つ移動する
 * @param {object} sourceCard - 移動元のカード
 * @param {object} targetCard - 移動先のカード
 * @param {string} priority - 'soul' または 'normal'。どちらのコアを優先的に移動するか。
 */
export function moveCoreFromField(sourceCard, targetCard, priority = 'normal') {
    if (!sourceCard || !targetCard || sourceCard.coresOnCard.length === 0) {
        cancelCoreMove();
        return;
    }

    let coreToMove;
    if (priority === 'soul') {
        // ソウルコアを優先的に移動
        const soulCoreIndex = sourceCard.coresOnCard.findIndex(c => c.type === 'soul');
        if (soulCoreIndex !== -1) {
            coreToMove = sourceCard.coresOnCard.splice(soulCoreIndex, 1)[0];
        } else {
            // ソウルコアがなければ最初のコアを移動
            coreToMove = sourceCard.coresOnCard.shift();
        }
    } else {
        // 通常コアを優先的に移動（ソウルコアを残す）
        const normalCoreIndex = sourceCard.coresOnCard.findIndex(c => c.type !== 'soul');
        if (normalCoreIndex !== -1) {
            coreToMove = sourceCard.coresOnCard.splice(normalCoreIndex, 1)[0];
        } else {
            // 通常コアがなければ最後のコア（ソウルコアのはず）を移動
            coreToMove = sourceCard.coresOnCard.pop();
        }
    }

    targetCard.coresOnCard.push(coreToMove);

    // 移動モードを終了
    const { callback } = moveState;
    setMoveState({
        isMoving: false,
        targetCard: null,
        callback: null,
    });

    if (callback) {
        callback();
    }
    renderAll();
}

/**
 * コア移動プロセスをキャンセルする
 */
export function cancelCoreMove() {
    setMoveState({
        isMoving: false,
        targetCard: null,
        callback: null,
    });
    showToast('infoToast', 'コアの移動をキャンセルしました。', { duration: 1500 });
    renderAll();
}
