
import { hand, field, trash, burst, lifeCores, reserveCores, deckCores, trashCores, cardPositions, deckShowCountAsNumber } from './game-state.js';
import { selectedCores } from './event-handlers.js';
import { handleCoreClick } from './event-handlers.js';

export function renderAll() {
    console.log('render-utils.js: renderAll called.');
    renderHand();
    renderField();
    renderTrash();
    renderBurst();
    renderCores("lifeCores", lifeCores);
    renderCores("reserveCores", reserveCores);
    renderDeckCore();
    renderTrashCores();

    if (document.getElementById("trashModal").style.display === "flex") {
        renderTrashModalContent();
    }
}

export function createCardElement(cardData) {
    const div = document.createElement('div');
    div.className = 'card';
    div.textContent = cardData.name;
    div.draggable = true;
    div.dataset.id = cardData.id;

    const exhaustBtn = document.createElement('button');
    exhaustBtn.className = 'exhaust-button';
    exhaustBtn.textContent = '重疲労';
    exhaustBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardElement = e.target.closest('.card');
        const cardId = cardElement.dataset.id;
        const cardData = field.find(card => card.id === cardId);
        if (!cardData) return;

        if (cardData.isExhausted) {
            cardData.isExhausted = false;
        } else {
            cardData.isExhausted = true;
            cardData.isRotated = false; // 重疲労させたら疲労は解除
        }
        renderAll(); // 状態変更を反映するために再描画
    });
    div.appendChild(exhaustBtn);
    return div;
}

function renderHand() {
    console.log('render-utils.js: renderHand called.');
    const handZone = document.getElementById("handZone");
    handZone.innerHTML = "";
    hand.forEach(cardData => {
        const cardElement = createCardElement(cardData);
        handZone.appendChild(cardElement);
    });
    document.getElementById("handCount").textContent = hand.length;
}

function renderField() {
    console.log('render-utils.js: renderField called.');
    const fieldZone = document.getElementById("fieldCards");
    fieldZone.innerHTML = "";
    field.forEach(cardData => {
        const cardElement = createCardElement(cardData);
        const pos = cardPositions[cardData.id];
        if (pos) {
            cardElement.style.position = 'absolute';
            cardElement.style.left = pos.left + 'px';
            cardElement.style.top = pos.top + 'px';
        }
        if (cardData.isRotated) cardElement.classList.add('rotated');
        if (cardData.isExhausted) cardElement.classList.add('exhausted');

        if (cardData.coresOnCard && cardData.coresOnCard.length > 0) {
            const coresContainer = document.createElement('div');
            coresContainer.className = 'cores-on-card';
            cardData.coresOnCard.forEach((core, index) => {
                const coreDiv = document.createElement('div');
                coreDiv.className = `core ${core.type}`;
                coreDiv.draggable = true;
                coreDiv.dataset.index = index;
                coreDiv.dataset.coreType = core.type;
                coreDiv.dataset.sourceCardId = cardData.id;
                coreDiv.style.position = 'absolute';
                coreDiv.style.left = core.x + 'px';
                coreDiv.style.top = core.y + 'px';
                coreDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleCoreClick(e);
                });
                const isSelected = selectedCores.some(c => {
                    return c.sourceCardId && c.sourceCardId === cardData.id && c.index === index;
                });
                if (isSelected) {
                    coreDiv.classList.add('selected');
                }
                coresContainer.appendChild(coreDiv);
            });
            cardElement.appendChild(coresContainer);
        }

        fieldZone.appendChild(cardElement);
    });
}

function renderTrash() {
    console.log('render-utils.js: renderTrash called.');
    const trashFrame = document.getElementById("trashCard");
    trashFrame.innerHTML = trash.length > 0 ? `<div class='card'>${trash[trash.length - 1].name}</div>` : "";
}

function renderBurst() {
    console.log('render-utils.js: renderBurst called.');
    const burstZone = document.getElementById("burstCard");
    burstZone.innerHTML = "";
    burst.forEach((cardData, i) => {
        const div = createCardElement(cardData);
        div.style.position = 'absolute';
        div.style.left = (i * 30) + 'px';
        div.style.zIndex = i + 1;
        burstZone.appendChild(div);
    });
}

export function renderCores(containerId, coreArray) {
    console.log(`render-utils.js: renderCores called for ${containerId}.`);
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    coreArray.forEach((coreType, index) => {
        const div = document.createElement("div");
        div.className = `core ${coreType}`;
        div.draggable = true;
        div.dataset.index = index;
        div.dataset.coreType = coreType;
        div.addEventListener('click', handleCoreClick);
        const isSelected = selectedCores.some(c => {
            return c.sourceArrayName && c.sourceArrayName === containerId && c.index === index;
        });
        if (isSelected) {
            div.classList.add('selected');
        }
        container.appendChild(div);
    });
}

function renderDeckCore() {
    console.log('render-utils.js: renderDeckCore called.');
    const countZone = document.getElementById("countZone");
    const countSummary = document.getElementById("deckCoreSummary");
    const n = deckCores.length;
    if (deckShowCountAsNumber) {
        countSummary.textContent = `カウント: ${n}`;
        countSummary.style.display = 'block';
        countZone.style.display = 'none';
        countZone.classList.remove('core-move-mode');
    } else {
        countSummary.style.display = 'none';
        countZone.style.display = 'flex';
        countZone.classList.add('core-move-mode');
        renderCores('countZone', deckCores);
    }
}

function renderTrashCores() {
    console.log('render-utils.js: renderTrashCores called.');
    const trashListArea = document.getElementById("trashListArea");
    trashListArea.innerHTML = "";
    if (trashCores.length === 0) {
        trashListArea.style.display = "none";
        return;
    }
    trashListArea.style.display = "flex";
    renderCores('trashListArea', trashCores);
}

export function renderTrashModalContent() {
    console.log('render-utils.js: renderTrashModalContent called.');
    const content = document.getElementById("trashModalContent");
    content.innerHTML = "";
    if (trash.length === 0) {
        document.getElementById("trashModal").style.display = "none";
        return;
    }
    trash.forEach(cardData => {
        const div = createCardElement(cardData);
        div.dataset.sourceZoneId = 'trashModalContent';
        content.appendChild(div);
    });
}
