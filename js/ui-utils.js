
import { deck, hand, deckCores, trashCores, lifeCores, reserveCores, field, voidChargeCount, updateVoidChargeCount, deckShowCountAsNumber } from './game-state.js';
import { renderAll, renderDeckCore, renderTrashModalContent } from './render-utils.js';
import { clearSelectedCores } from './event-handlers.js';

let toastTimeout = null;

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

export function toggleHand() {
    const container = document.getElementById("handZoneContainer");
    const openBtn = document.getElementById("openHandButton");

    if (container.classList.contains("collapsed")) {
        container.classList.remove("collapsed");
        openBtn.classList.add("hidden");
    } else {
        container.classList.add("collapsed");
        openBtn.classList.remove("hidden");
    }
}

export function openTrashModal() {
    const modal = document.getElementById("trashModal");
    renderTrashModalContent();
    modal.style.display = "flex";

    const closeModalOnClick = e => {
        if (!document.getElementById("trashModalContent").contains(e.target)) {
            modal.style.display = "none";
            document.removeEventListener('mousedown', closeModalOnClick);
        }
    };
    setTimeout(() => document.addEventListener('mousedown', closeModalOnClick), 0);
}

export function addDeckCore() {
    deckCores.push("blue");
    renderDeckCore();
}

export function toggleDeckCoreCount() {
    deckShowCountAsNumber = !deckShowCountAsNumber;
    const countZone = document.getElementById("countZone");
    const countSummary = document.getElementById("deckCoreSummary");

    if (deckShowCountAsNumber) {
        countSummary.style.display = 'block';
        countZone.style.display = 'none';
        countZone.classList.remove('core-move-mode');
    } else {
        countSummary.style.display = 'none';
        countZone.style.display = 'flex';
        countZone.classList.add('core-move-mode');
    }
    renderDeckCore();
}

export function refreshAll() {
    clearSelectedCores();
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
        toastTimeout = setTimeout(() => {
            toastElement.classList.remove('show');
            toastElement.textContent = '';
        }, 1000);
    }
}
