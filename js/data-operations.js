
import { deck, field, reserveCores } from './game-state.js';
import { renderAll } from './render-utils.js';
import { showToast, getZoneName, getArrayByZoneName } from './utils.js';
import { offsetX, offsetY } from './event-handlers.js';

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
                }
            }
        }
    }
}
