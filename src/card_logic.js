// src/card_logic.js
import { deck, hand, field, trash, burst, reserveCores, discardState, openArea, cardIdCounter, setCardIdCounter, setDeck, setHand, setField, setTrash, setBurst, setReserveCores, setDiscardCounter, setDiscardedCardNames, setDiscardToastTimer, setOpenArea, cardPositions } from './game_data.js';
import { renderAll, showCostModal, renderOpenArea } from './ui_render.js';
import { showToast, getArrayByZoneName, getZoneName } from './utils.js';
import { payCostFromReserve } from './core_logic.js';
import { openModal } from './event_handlers.js';

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
    const sourceArray = getArrayByZoneName(sourceZoneId);
    const cardIndex = sourceArray.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    const cardData = sourceArray[cardIndex];

    // Handle special card logic (if moved from field to non-field, it disappears)
    if (cardData.isSpecial && targetZoneName !== 'field') {
        // Remove the card from the field
        sourceArray.splice(cardIndex, 1);
        // Move its cores to the reserve
        if (cardData.coresOnCard && cardData.coresOnCard.length > 0) {
            reserveCores.push(...cardData.coresOnCard.map(core => core.type));
            cardData.coresOnCard = [];
        }
        delete cardPositions[cardId];
        renderAll();
        return; // Stop further execution
    }

    // フィールド以外のゾーンからフィールドへの移動の場合のみコスト支払いモーダルを表示
    if (targetZoneName === 'field' && sourceZoneId !== 'field' && sourceZoneId !== 'burst') {
        const sourceArray = getArrayByZoneName(sourceZoneId);
        const cardIndex = sourceArray.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;
        const cardData = sourceArray[cardIndex];

        showCostModal(cardData,
            (cost) => { // Success callback (cost paid)
                const currentSourceArray = getArrayByZoneName(sourceZoneId);
                const currentCardIndex = currentSourceArray.findIndex(c => c.id === cardId);
                if (currentCardIndex === -1) return; // Card is no longer in the source zone

                if (payCostFromReserve(cost)) {
                    const [movedCard] = currentSourceArray.splice(currentCardIndex, 1);
                    field.push(movedCard);
                } else {
                    // Not enough cores, do nothing, card stays in source
                }
                renderAll();
            },
            () => { // Cancel callback (no cost paid)
                const currentSourceArray = getArrayByZoneName(sourceZoneId);
                const currentCardIndex = currentSourceArray.findIndex(c => c.id === cardId);
                if (currentCardIndex === -1) return; // Card is no longer in the source zone

                const [movedCard] = currentSourceArray.splice(currentCardIndex, 1);
                field.push(movedCard);
                renderAll();
            }
        );
    } else {
        // 同期処理（フィールド以外への移動、またはフィールド内移動）
        const sourceArray = getArrayByZoneName(sourceZoneId);
        const cardIndex = sourceArray.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;

        const [cardData] = sourceArray.splice(cardIndex, 1);

        let shouldTransferCoresToReserve = (sourceZoneId === 'field' && targetZoneName !== 'field' && cardData.coresOnCard && cardData.coresOnCard.length > 0);

        if (targetZoneName === 'deck') {
            // デッキに移動する場合、コアをリザーブに送るフラグを立てる
            shouldTransferCoresToReserve = true;
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
                sourceArray.splice(cardIndex, 0, cardData); // Cancelled, so return the card
                return;
            }
            // Card is already removed, so we just continue
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

        renderAll();
    }
}

export function openDeck() {
    if (deck.length < 1) {
        alert("デッキが空です。");
        return;
    }

    const openedCard = deck.shift();
    setOpenArea([...openArea, openedCard]);

    openModal('openAreaModal', 'openArea', renderOpenArea);

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

export function createSpecialCardOnField(cardType, position) {
    let currentCardId = cardIdCounter;
    const newCard = {
        id: `card-${currentCardId++}`,
        name: cardType === 'token' ? 'トークン' : '転生後',
        imgDataUrl: null, // No image for special cards
        isRotated: false,
        isExhausted: false,
        coresOnCard: [],
        isSpecial: true,
        specialType: cardType
    };
    setCardIdCounter(currentCardId);

    field.push(newCard);
    cardPositions[newCard.id] = position;

    renderAll();
}