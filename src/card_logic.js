// src/card_logic.js
import { deck, hand, field, trash, burst, reserveCores, discardState, openArea, setDeck, setHand, setField, setTrash, setBurst, setReserveCores, setDiscardCounter, setDiscardedCardNames, setDiscardToastTimer, setOpenArea } from './game_data.js';
import { renderAll, showCostModal } from './ui_render.js';
import { showToast, getArrayByZoneName, getZoneName } from './utils.js';
import { payCostFromReserve } from './core_logic.js';

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

export function moveCardData(cardId, sourceZoneId, targetZoneName, dropEvent = null, dropTargetElement = null) {
    console.log(`[moveCardData] Initiating move for Card ID: ${cardId} from ${sourceZoneId} to ${targetZoneName}`);

    const sourceArray = getArrayByZoneName(sourceZoneId);
    if (!sourceArray) {
        console.error(`[moveCardData] Invalid source zone: ${sourceZoneId}`);
        return;
    }

    const cardIndex = sourceArray.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
        console.error(`[moveCardData] Card with ID ${cardId} not found in ${sourceZoneId}`);
        return;
    }

    const [cardData] = sourceArray.splice(cardIndex, 1);
    console.log(`[moveCardData] Card data extracted:`, cardData);

    // 非同期処理（フィールドへの移動）
    if (targetZoneName === 'field' && sourceZoneId !== 'field') {
        console.log(`[moveCardData] Async path: Moving to field.`);
        showCostModal(cardData,
            (cost) => { // Success callback (cost paid)
                console.log(`[moveCardData] Cost paid: ${cost}`);
                if (payCostFromReserve(cost)) {
                    addField(cardData);
                } else {
                    console.log(`[moveCardData] Cost payment failed. Returning card to ${sourceZoneId}`);
                    sourceArray.splice(cardIndex, 0, cardData);
                }
                renderAll();
            },
            () => { // Cancel callback (no cost paid)
                console.log(`[moveCardData] Cost payment cancelled. Moving to field without cost.`);
                addField(cardData);
                renderAll();
            }
        );
    } else {
        // 同期処理（フィールド以外への移動）
        console.log(`[moveCardData] Sync path: Moving to ${targetZoneName}`);
        handleSyncCardMove(cardData, sourceZoneId, targetZoneName, dropEvent, dropTargetElement);
        renderAll();
    }
}

function addField(cardData) {
    const targetArray = getArrayByZoneName('field');
    if (targetArray) {
        targetArray.push(cardData);
    }
}

function handleSyncCardMove(cardData, sourceZoneId, targetZoneName, dropEvent, dropTargetElement) {
    let shouldTransferCoresToReserve = (sourceZoneId === 'field' && targetZoneName !== 'field' && cardData.coresOnCard && cardData.coresOnCard.length > 0);

    if (targetZoneName === 'deck') {
        let putOnBottom = false;
        if (dropEvent && dropTargetElement) {
            const rect = dropTargetElement.getBoundingClientRect();
            const clickY = dropEvent.clientY - rect.top;
            if (clickY > rect.height * (2 / 3)) {
                putOnBottom = true;
            }
        } else {
            putOnBottom = confirm(`${cardData.name}をデッキの下に戻しますか？`);
        }
        if (putOnBottom) {
            deck.push(cardData);
            showToast('cardMoveToast', `${cardData.name}をデッキの下に戻しました`);
        } else {
            deck.unshift(cardData);
            showToast('cardMoveToast', `${cardData.name}をデッキの上に戻しました`);
        }
    } else if (targetZoneName === 'void') {
        if (!confirm(`${cardData.name}をゲームから除外していいですか？`)) {
            const sourceArray = getArrayByZoneName(sourceZoneId);
            const cardIndex = sourceArray.findIndex(c => c.id === cardData.id);
            sourceArray.splice(cardIndex, 0, cardData);
            return;
        }
    } else {
        if (targetZoneName === 'hand') {
            cardData.isRotated = false;
            cardData.isExhausted = false;
        }
        const targetArray = getArrayByZoneName(targetZoneName);
        if (targetArray) {
            targetArray.push(cardData);
        }
    }

    if (shouldTransferCoresToReserve) {
        reserveCores.push(...cardData.coresOnCard.map(core => core.type));
        cardData.coresOnCard = [];
    }

    if (sourceZoneId === 'openArea' && openArea.length === 0) {
        document.getElementById('openAreaModal').style.display = 'none';
    }
}

export function openDeck() {
    if (deck.length < 1) {
        alert("デッキが空です。");
        return;
    }

    const openedCard = deck.shift();
    setOpenArea([...openArea, openedCard]);

    const openAreaModal = document.getElementById('openAreaModal');
    openAreaModal.style.display = 'flex';

    renderAll();
}

export function discardDeck() {
    if (deck.length === 0) {
        alert("デッキが空です");
        return;
    }

    const discardedCard = deck.shift();
    trash.push(discardedCard);

    setDiscardCounter(discardState.counter + 1);
    setDiscardedCardNames([...discardState.names, discardedCard.name]);

    renderAll();

    // 既存のタイマーがあればクリア
    if (discardState.timer) {
        clearTimeout(discardState.timer);
    }

    // 新しいタイマーを設定
    setDiscardToastTimer(setTimeout(() => {
        const message = `${discardState.counter}枚破棄しました。\n${discardState.names.join("、")}`;
        showToast('cardMoveToast', message);
        
        // カウンターとリストをリセット
        setDiscardCounter(0);
        setDiscardedCardNames([]);
        setDiscardToastTimer(null);
    }, 350)); // 350msのデバウンス
}