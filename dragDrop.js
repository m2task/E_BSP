import { getZoneName } from './utils.js';
import { renderAll } from './renderers.js';
import { draggedElement, offsetX, offsetY, cardPositions, selectedCores, draggedCoreData, moveCardData, removeCoresFromSource, showToast, clearSelectedCores, voidChargeCount, field, setDraggedElement, setOffsetX, setOffsetY, setCardPositions, setSelectedCores, setDraggedCoreData, setVoidChargeCount } from './state.js'; // gameLogic.js から state.js に変更

export function handleDragStart(e) {
    setDraggedElement(e.target);
    setTimeout(() => draggedElement.classList.add('dragging'), 0);

    if (draggedElement.classList.contains('card')) {
        e.dataTransfer.setData("type", "card");
        e.dataTransfer.setData("cardId", draggedElement.dataset.id);
        e.dataTransfer.setData("sourceZoneId", draggedElement.parentElement.id);
        const rect = draggedElement.getBoundingClientRect();
        setOffsetX(e.clientX - rect.left);
        setOffsetY(e.clientY - rect.top);
    } else if (draggedElement.classList.contains('core')) {
        const coreType = draggedElement.dataset.coreType;
        const index = parseInt(draggedElement.dataset.index);
        const sourceCardId = draggedElement.dataset.sourceCardId;
        const sourceArrayName = draggedElement.parentElement.id;

        let currentDraggedCoreIdentifier = {
            type: coreType,
            index: index
        };
        if (sourceCardId) {
            currentDraggedCoreIdentifier.sourceCardId = sourceCardId;
        } else {
            currentDraggedCoreIdentifier.sourceArrayName = sourceArrayName;
        }

        const isDraggedCoreSelected = selectedCores.some(c => {
            if (c.sourceCardId && currentDraggedCoreIdentifier.sourceCardId) {
                return c.sourceCardId === currentDraggedCoreIdentifier.sourceCardId && c.index === currentDraggedCoreIdentifier.index;
            } else if (c.sourceArrayName && currentDraggedCoreIdentifier.sourceArrayName) {
                return c.sourceArrayName === currentDraggedCoreIdentifier.sourceArrayName && c.index === currentDraggedCoreIdentifier.index;
            }
            return false;
        });

        if (isDraggedCoreSelected && selectedCores.length > 1) {
            setDraggedCoreData(selectedCores.map(c => {
                const coreData = { type: c.type, index: c.index };
                if (c.sourceCardId) {
                    coreData.sourceCardId = c.sourceCardId;
                } else {
                    coreData.sourceArrayName = c.sourceArrayName;
                }
                return coreData;
            }));
            e.dataTransfer.setData("type", "multiCore");
            e.dataTransfer.setData("cores", JSON.stringify(draggedCoreData));
        } else {
            const parentCardElement = draggedElement.closest('.card');
            if (parentCardElement) {
                const rect = draggedElement.getBoundingClientRect();
                setOffsetX(e.clientX - rect.left);
                setOffsetY(e.clientY - rect.top);
                e.dataTransfer.setData("offsetX", offsetX);
                e.dataTransfer.setData("offsetY", offsetY);

                setDraggedCoreData([{ type: coreType, sourceCardId: sourceCardId, index: index, x: parseFloat(draggedElement.style.left), y: parseFloat(draggedElement.style.top) }]);
                e.dataTransfer.setData("type", "coreFromCard");
                e.dataTransfer.setData("cores", JSON.stringify(draggedCoreData));
            } else {
                setDraggedCoreData([{ type: coreType, sourceArrayName: sourceArrayName, index: index }]);
                e.dataTransfer.setData("type", "core");
                e.dataTransfer.setData("coreType", coreType);
                e.dataTransfer.setData("coreIndex", index);
                e.dataTransfer.setData("cores", JSON.stringify(draggedCoreData));
            }
        }
    } else if (draggedElement.id === 'voidCore') {
        const coresToMoveCount = voidChargeCount > 0 ? voidChargeCount : 1;
        setDraggedCoreData(Array(coresToMoveCount).fill({ type: "blue", sourceArrayName: 'void', index: -1 }));
        e.dataTransfer.setData("type", "voidCore");
        e.dataTransfer.setData("cores", JSON.stringify(draggedCoreData));
        showToast('voidToast', '', true);
    }
}

export function handleDragEnd() {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        setDraggedElement(null);
    }
    setDraggedCoreData(null);
    clearSelectedCores();
}

export function handleDeckDragEnter(e) {
    e.preventDefault();
    const deckButton = e.currentTarget;
    deckButton.classList.add('drag-over');
}

export function handleDeckDragLeave(e) {
    e.preventDefault();
    const deckButton = e.currentTarget;
    if (!deckButton.contains(e.relatedTarget)) {
        deckButton.classList.remove('drag-over', 'highlight-top-zone', 'highlight-bottom-zone');
    }
}

export function handleDeckDragOver(e) {
    e.preventDefault();
    const deckButton = e.currentTarget;
    const rect = deckButton.getBoundingClientRect();
    const clientY = e.clientY;

    const relativeY = clientY - rect.top;

    const twoThirdsHeight = rect.height * (2 / 3);

    deckButton.classList.add('drag-over');

    if (relativeY <= twoThirdsHeight) {
        deckButton.classList.add('highlight-top-zone');
        deckButton.classList.remove('highlight-bottom-zone');
    } else {
        deckButton.classList.add('highlight-bottom-zone');
        deckButton.classList.remove('highlight-top-zone');
    }
}

export function handleDeckDrop(e) {
    e.preventDefault();
    const deckButton = e.currentTarget;
    deckButton.classList.remove('drag-over', 'highlight-top-zone', 'highlight-bottom-zone');

    const type = e.dataTransfer.getData("type");
    if (type === 'card') {
        const cardId = e.dataTransfer.getData("cardId");
        const sourceZoneId = e.dataTransfer.getData("sourceZoneId");
        moveCardData(cardId, sourceZoneId, 'deck', e, deckButton);
    }
}

export function handleDrop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    const targetCardElement = e.target.closest('.card');
    const targetZoneElement = e.target.closest('.zone, .special-zone');

    if (type === 'card') {
        handleCardDrop(e);
    } else if (type === 'voidCore' || type === 'core' || type === 'multiCore' || type === 'coreFromCard') {
        const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
        if (targetCardElement) {
            const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
            if (coresToMove.length === 1 && coresToMove[0].sourceCardId === targetCardElement.dataset.id) {
                handleCoreInternalMoveOnCard(e, targetCardElement);
            } else {
                handleCoreDropOnCard(e, targetCardElement);
            }
        } else if (targetZoneElement) {
            handleCoreDropOnZone(e, targetZoneElement);
        }
    }
    clearSelectedCores();
}

export function handleCardDrop(e) {
    const cardId = e.dataTransfer.getData("cardId");
    const sourceZoneId = e.dataTransfer.getData("sourceZoneId");
    const targetElement = e.target.closest('#fieldZone, #handZone, #trashZoneFrame, #burstZone, .deck-button, #voidZone');
    if (!targetElement) return;

    const targetZoneName = getZoneName(targetElement);

    if (targetZoneName === 'deck') {
        return;
    }

    if (targetZoneName === 'field') {
        const fieldRect = document.getElementById('fieldCards').getBoundingClientRect();
        setCardPositions({
            ...cardPositions,
            [cardId]: {
                left: e.clientX - fieldRect.left - offsetX,
                top: e.clientY - fieldRect.top - offsetY
            }
        });
    } else {
        const newCardPositions = { ...cardPositions };
        delete newCardPositions[cardId];
        setCardPositions(newCardPositions);
    }
    moveCardData(cardId, sourceZoneId, targetZoneName);
}

export function handleCoreDropOnCard(e, targetCardElement) {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
    const targetCardId = targetCardElement.dataset.id;
    const targetCard = field.find(card => card.id === targetCardId);

    if (!targetCard) return;

    const cardRect = targetCardElement.getBoundingClientRect();
    const dropX = e.clientX - cardRect.left;
    const dropY = e.clientY - cardRect.top;

    if (type === 'voidCore') {
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
    renderAll();

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

    if (!targetCard || coresToMove.length !== 1) return;

    const coreInfo = coresToMove[0];
    const coreIndexOnCard = coreInfo.index;

    if (coreIndexOnCard === undefined || coreIndexOnCard < 0 || coreIndexOnCard >= targetCard.coresOnCard.length) {
        return;
    }

    const cardRect = targetCardElement.getBoundingClientRect();
    const currentOffsetX = parseFloat(e.dataTransfer.getData("offsetX"));
    const currentOffsetY = parseFloat(e.dataTransfer.getData("offsetY"));

    const newX = e.clientX - cardRect.left - currentOffsetX;
    const newY = e.clientY - cardRect.top - currentOffsetY;

    targetCard.coresOnCard[coreIndexOnCard].x = newX;
    targetCard.coresOnCard[coreIndexOnCard].y = newY;

    renderAll();
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
            else if (targetZoneName === 'count') deckCores.push("blue");
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
    if (targetZoneName === 'void') {
        for (const coreInfo of coresToMove) {
            if (coreInfo.type === 'soul') {
                if (confirm("ソウルドライブしますか？")) {
                    coresToActuallyMove.push(coreInfo);
                }
            } else {
                coresToActuallyMove.push(coreInfo);
            }
        }
    } else {
        coresToActuallyMove.push(...coresToMove);
    }

    removeCoresFromSource(coresToActuallyMove);

    const targetArray = (targetZoneName === 'trash') ? trashCores : getArrayByZoneName(targetZoneName);
    if (targetArray) {
        for (const coreInfo of coresToActuallyMove) {
            targetArray.push(coreInfo.type);
        }
    }

    renderAll();
}

export function handleCoreClick(e) {
    e.stopPropagation();
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

    if (existingIndex > -1) {
        selectedCores.splice(existingIndex, 1);
    } else {
        selectedCores.push(coreIdentifier);
    }
    renderAll();
}