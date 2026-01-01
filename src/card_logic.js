// src/card_logic.js
import { deck, hand, field, trash, burst, reserveCores, discardState, openArea, cardIdCounter, setCardIdCounter, setDeck, setHand, setField, setTrash, setBurst, setReserveCores, setDiscardCounter, setDiscardedCardNames, setDiscardToastTimer, setOpenArea, cardPositions } from './game_data.js';
import { renderAll, showCostModal, showMaintainCoreButton, cancelMaintainCore, renderOpenArea } from './ui_render.js';
import { showToast, getArrayByZoneName, getZoneName } from './utils.js';
import { payCost, canPayTotal, placeCoreOnSummonedCard } from './core_logic.js';
import { openModal } from './event_handlers.js';
import { hideMagnifier } from './magnify_logic.js';

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
    const movedCardData = sourceArray[cardIndex];

    // Handle special card logic (if moved from field to non-field, it disappears)
    if (movedCardData.isSpecial && targetZoneName !== 'field') {
        sourceArray.splice(cardIndex, 1);
        if (movedCardData.coresOnCard && movedCardData.coresOnCard.length > 0) {
            reserveCores.push(...movedCardData.coresOnCard.map(core => core.type));
            movedCardData.coresOnCard = [];
        }
        delete cardPositions[cardId];
        renderAll();
        return;
    }
    
    // --- Non-Summoning Move Logic (e.g., field to hand, hand to trash) ---
    sourceArray.splice(cardIndex, 1);
    hideMagnifier();

    let shouldTransferCoresToReserve = (sourceZoneId === 'field' && targetZoneName !== 'field' && movedCardData.coresOnCard && movedCardData.coresOnCard.length > 0);

    if (targetZoneName === 'deck') {
        shouldTransferCoresToReserve = true;
        let putOnBottom = false;
        if (dropEvent && dropTargetElement) {
            const rect = dropTargetElement.getBoundingClientRect();
            const clickY = dropEvent.clientY - rect.top;
            putOnBottom = clickY > rect.height * (2 / 3);
        } else {
            putOnBottom = confirm(`${movedCardData.name}をデッキの下に戻しますか？`);
        }
        if (putOnBottom) {
            deck.push(movedCardData);
            showToast('cardMoveToast', 'カードをデッキの下に戻しました', { duration: 1000 });
        } else {
            deck.unshift(movedCardData);
            showToast('cardMoveToast', 'カードをデッキの上に戻しました', { duration: 1000 });
        }
    } else if (targetZoneName === 'void') {
        if (!confirm(`カードをゲームから除外していいですか？`)) {
            sourceArray.splice(cardIndex, 0, movedCardData);
            return;
        }
    } else {
        if (targetZoneName === 'hand') {
            movedCardData.isRotated = false;
            movedCardData.isExhausted = false;
        }
        const targetArray = getArrayByZoneName(targetZoneName);
        if (targetArray) {
            targetArray.push(movedCardData);
        }
    }

    if (shouldTransferCoresToReserve) {
        reserveCores.push(...movedCardData.coresOnCard.map(core => core.type));
        movedCardData.coresOnCard = [];
    }

    if (sourceZoneId === 'openArea' && openArea.length === 0) {
        document.getElementById('openAreaModal').style.display = 'none';
    }

    renderAll();
}

export function startPaymentProcess(cardData, sourceZoneId) {
    const onSummonSuccess = () => {
        cancelMaintainCore();
        renderAll();
        if (!cardData.isSpecial) {
            showMaintainCoreButton(
                () => placeCoreOnSummonedCard(cardData),
                () => {} // No action on "No"
            );
        }
    };

    // Burst summon doesn't require cost
    if (sourceZoneId === 'burst') {
        onSummonSuccess();
    } else {
        // Other summons (from hand, trash, etc.) go through cost payment
        showCostModal(
            cardData,
            (cost) => {
                if (canPayTotal(cost)) {
                    payCost(cost, cardData, onSummonSuccess);
                } else {
                    showToast('errorToast', 'コストを支払えません。', { duration: 2000 });
                    // If payment fails, move the card back to the source
                    const fieldIndex = field.findIndex(c => c.id === cardData.id);
                    if (fieldIndex > -1) {
                        const [returnedCard] = field.splice(fieldIndex, 1);
                        const sourceArray = getArrayByZoneName(sourceZoneId);
                        if (sourceArray) sourceArray.push(returnedCard);
                        renderAll();
                    }
                }
            },
            () => onSummonSuccess() // Cost 0 summon
        );
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

    renderAll();

    // 既存のタイマーがあればクリア
    if (discardState.timer) {
        clearTimeout(discardState.timer);
    }

    // 新しいタイマーを設定
    setDiscardToastTimer(setTimeout(() => {
        const message = `${discardState.counter}枚破棄しました。`;
        showToast('cardMoveToast', message, { duration: 1000 });
        
        // カウンターとリストをリセット
        setDiscardCounter(0);
        setDiscardToastTimer(null);
    }, 350)); // 350msのデバウンス
}

export function createSpecialCardOnField(cardType, position) {
    let currentCardId = cardIdCounter;
    const newCard = {
        id: `card-${currentCardId++}`,
        name: cardType === 'token' ? 'トークン' : 'カードB面',
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

export function discardAllOpenCards() {
    if (openArea.length === 0) {
        return; // 対象のカードがない場合は何もしない
    }

    // openArea のカードを trash に移動
    setTrash([...trash, ...openArea]);

    // openArea を空にする
    setOpenArea([]);

    // UIを更新
    renderAll();
}
