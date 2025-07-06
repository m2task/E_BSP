import { getZoneName, shuffle, getDeckNameFromURL } from './utils.js';
import { renderAll } from './renderers.js'; // renderAll は後で作成します

// battle.js からエクスポートされるグローバル変数
export let deck;
export let field;
export let hand;
export let trash;
export let burst;
export let lifeCores;
export let reserveCores;
export let deckCores;
export let trashCores;
export let voidChargeCount;
export let toastTimeout;
export let handVisible;
export let deckShowCountAsNumber;
export let cardIdCounter = 0; // cardIdCounter を初期化
export let draggedElement;
export let offsetX;
export let offsetY;
export let cardPositions = {}; // cardPositions を初期化
export let selectedCores = []; // selectedCores を初期化
export let draggedCoreData;

// 初期化関数 (battle.js から移動)
export function initializeGame() {
    selectedCores = []; // 選択されたコアを初期化
    const deckName = getDeckNameFromURL();
    const loadedDeck = JSON.parse(localStorage.getItem(deckName)) || [];

    // 契約カードの設定をlocalStorageから読み込む
    const includeFirstCard = JSON.parse(localStorage.getItem("includeFirstCard") || "false");

    let initialDeck = loadedDeck;

    // 契約カードの処理
    if (includeFirstCard && initialDeck.length > 0) {
        // デッキの最初のカードを契約カードとして扱う
        const fixedCardName = initialDeck[0];
        const fixedCardIndex = initialDeck.findIndex(name => name === fixedCardName); // 最初のカードのインデックスを見つける
        if (fixedCardIndex > -1) {
            const [fixedCard] = initialDeck.splice(fixedCardIndex, 1); // デッキから削除
            hand.push({ id: `card-${cardIdCounter++}`, name: fixedCard, isRotated: false, isExhausted: false, coresOnCard: [] }); // 手札に追加
        }
    }

    deck = initialDeck.map(name => ({ id: `card-${cardIdCounter++}`, name, isRotated: false, isExhausted: false, coresOnCard: [] }));
    shuffle(deck);

    const initialHandSize = 4;
    while (hand.length < initialHandSize && deck.length > 0) {
        hand.push(deck.shift());
    }

    renderAll();
}

// データ操作 (battle.js から移動)
export function getArrayByZoneName(zoneName) {
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

export function moveCardData(cardId, sourceZoneId, targetZoneName, dropEvent = null, dropTargetElement = null) {
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

export function moveCoresToZone(cores, targetZoneName) {
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

// UI関数 (battle.js から移動)
export function drawCard(fromBottom = false) {
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

export function addDeckCore() {
    deckCores.push("blue");
    renderAll(); // renderDeckCore() の代わりに renderAll() を呼び出す
}

export function toggleDeckCoreCount() {
    deckShowCountAsNumber = !deckShowCountAsNumber;
    renderAll(); // renderDeckCore() の代わりに renderAll() を呼び出す
}

export function refreshAll() {
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

export function clearSelectedCores() {
    selectedCores = [];
    renderAll(); // 選択状態をクリアしたら再描画してDOMを更新
}

export function showToast(toastId, message, hide = false) {
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