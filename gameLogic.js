import { getZoneName, shuffle, getDeckNameFromURL } from './utils.js';
import { renderAll } from './renderers.js';
import { deck, field, hand, trash, burst, lifeCores, reserveCores, deckCores, trashCores, voidChargeCount, toastTimeout, handVisible, deckShowCountAsNumber, cardIdCounter, draggedElement, offsetX, offsetY, cardPositions, selectedCores, draggedCoreData, setDeck, setField, setHand, setTrash, setBurst, setLifeCores, setReserveCores, setDeckCores, setTrashCores, setVoidChargeCount, setToastTimeout, setHandVisible, setDeckShowCountAsNumber, setCardIdCounter, setDraggedElement, setOffsetX, setOffsetY, setCardPositions, setSelectedCores, setDraggedCoreData } from './state.js';

// 初期化関数
export function initializeGame() {
    setSelectedCores([]); // 選択されたコアを初期化
    const deckName = getDeckNameFromURL();
    const loadedDeck = JSON.parse(localStorage.getItem(deckName)) || [];

    const includeFirstCard = JSON.parse(localStorage.getItem("includeFirstCard") || "false");

    let initialDeck = loadedDeck;

    if (includeFirstCard && initialDeck.length > 0) {
        const [fixedCard] = initialDeck.splice(0, 1); // デッキの最初のカードを削除
        hand.push({ id: `card-${cardIdCounter++}`, name: fixedCard, isRotated: false, isExhausted: false, coresOnCard: [] }); // 手札に追加
    }

    setDeck(initialDeck.map(name => ({ id: `card-${cardIdCounter++}`, name, isRotated: false, isExhausted: false, coresOnCard: [] })));
    shuffle(deck);

    const initialHandSize = 4;
    while (hand.length < initialHandSize && deck.length > 0) {
        hand.push(deck.shift());
    }

    renderAll();
}

// データ操作
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

    const [cardData] = sourceArray.splice(cardIndex, 1);

    let shouldTransferCoresToReserve = false;

    if (targetZoneName === 'deck') {
        let putOnBottom = false;
        if (dropEvent && dropTargetElement) {
            const rect = dropTargetElement.getBoundingClientRect();
            const clickY = dropEvent.clientY - rect.top;
            const buttonHeight = rect.height;
            const twoThirdsHeight = buttonHeight * (2 / 3);

            if (clickY > twoThirdsHeight) {
                putOnBottom = true;
            }
        } else {
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

        if (getZoneName({ id: sourceZoneId }) === 'field' && cardData.coresOnCard && cardData.coresOnCard.length > 0) {
            shouldTransferCoresToReserve = true;
        }
    } else if (targetZoneName === 'void') {
        if (getZoneName({ id: sourceZoneId }) === 'field' && cardData.coresOnCard && cardData.coresOnCard.length > 0) {
            shouldTransferCoresToReserve = true;
        }
        if (!confirm(`${cardData.name}をゲームから除外していいですか？`)) {
            sourceArray.splice(cardIndex, 0, cardData);
            renderAll();
            return;
        }
    } else {
        if (getZoneName({ id: sourceZoneId }) === 'field' && targetZoneName !== 'field' && cardData.coresOnCard && cardData.coresOnCard.length > 0) {
            shouldTransferCoresToReserve = true;
        }

        if (targetZoneName === 'hand') {
            cardData.isRotated = false;
            cardData.isExhausted = false;
        }
        const targetArray = getArrayByZoneName(targetZoneName);
        if (targetArray) targetArray.push(cardData);
    }

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

    for (const core of cores) {
        if (targetZoneName === "void") {
            if (core.type === 'soul') {
                if (!confirm("ソウルドライブしますか？")) {
                }
            }
        } else if (targetArray) {
            targetArray.push(core.type);
        }
    }
    renderAll();
    clearSelectedCores();
}

export function removeCoresFromSource(cores) {
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
        coresToRemoveFromThisSource.sort((a, b) => b.index - a.index);

        if (sourceKey.startsWith('array:')) {
            const sourceArrayName = sourceKey.substring(6);
            const sourceArray = getArrayByZoneName(sourceArrayName);
            if (!sourceArray) {
                continue;
            }

            for (const coreInfo of coresToRemoveFromThisSource) {
                const actualIndex = coreInfo.index;
                if (actualIndex > -1 && actualIndex < sourceArray.length) {
                    sourceArray.splice(actualIndex, 1);
                } else {
                }
            }

        } else if (sourceKey.startsWith('card:')) {
            const sourceCardId = sourceKey.substring(5);
            const sourceCard = field.find(card => card.id === sourceCardId);
            if (!sourceCard || !sourceCard.coresOnCard) {
                continue;
            }

            for (const coreInfo of coresToRemoveFromThisSource) {
                const actualIndex = coreInfo.index;
                if (actualIndex > -1 && actualIndex < sourceCard.coresOnCard.length) {
                    sourceCard.coresOnCard.splice(actualIndex, 1);
                } else {
                }
            }
        }
    }
}

// UI関数
export function drawCard(fromBottom = false) {
    if (deck.length > 0) {
        let cardToDraw;
        if (fromBottom) {
            if (!confirm("デッキの下からドローしますか？")) {
                return;
            }
            cardToDraw = deck.pop();
        } else {
            cardToDraw = deck.shift();
        }
        hand.push(cardToDraw);
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
    renderAll();
}

export function toggleDeckCoreCount() {
    deckShowCountAsNumber = !deckShowCountAsNumber;
    renderAll();
}

export function refreshAll() {
    setSelectedCores([]);
    field.forEach(card => {
        if (card.isExhausted) {
            card.isExhausted = false;
            card.isRotated = true;
        } else {
            card.isRotated = false;
            card.isExhausted = false;
        }
    });

    while (trashCores.length > 0) {
        reserveCores.push(trashCores.shift());
    }

    renderAll();
}

export function clearSelectedCores() {
    setSelectedCores([]);
    renderAll();
}

export function showToast(toastId, message, hide = false) {
    const toastElement = document.getElementById(toastId);
    if (!toastElement) return;

    clearTimeout(toastTimeout);

    if (hide || message === '') {
        toastElement.classList.remove('show');
        toastElement.textContent = '';
    } else {
        toastElement.textContent = message;
        toastElement.classList.add('show');
        setToastTimeout(setTimeout(() => {
            toastElement.classList.remove('show');
            toastElement.textContent = '';
        }, 1000));
    }
}