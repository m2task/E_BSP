// src/magnify_logic.js
import { draggedElement, isDragging, field, hand, trash, burst, openArea } from './game_data.js';

let zoomLevel = 2;
let loupeSize = 180;

const loupe = document.getElementById('magnifying-loupe');

function getCardData(cardId) {
    const allCardArrays = [field, hand, trash, burst, openArea];
    for (const arr of allCardArrays) {
        const foundCard = arr.find(c => c.id === cardId);
        if (foundCard) return foundCard;
    }
    return null;
}

function updateLoupePosition(e) {
    loupe.style.left = `${e.clientX - loupeSize / 2}px`;
    loupe.style.top = `${e.clientY - loupeSize / 2}px`;
}

function handleCardMouseMove(e) {
    if (loupe.style.display === 'none') return;

    updateLoupePosition(e);

    const cardElement = e.currentTarget;
    const cardRect = cardElement.getBoundingClientRect();

    const x = e.clientX - cardRect.left;
    const y = e.clientY - cardRect.top;

    const bgX = - (x * zoomLevel - loupeSize / 2);
    const bgY = - (y * zoomLevel - loupeSize / 2);

    loupe.style.backgroundPosition = `${bgX}px ${bgY}px`;
}

function handleCardMouseOver(e) {
    if (draggedElement || isDragging) {
        return; // Do not show magnifier while dragging
    }

    const cardElement = e.currentTarget;
    const cardId = cardElement.dataset.id;
    const cardData = getCardData(cardId);

    if (!cardData || !cardData.imgDataUrl) {
        loupe.style.display = 'none';
        return;
    }

    const img = new Image();
    img.src = cardData.imgDataUrl;
    img.onload = () => {
        loupe.style.backgroundImage = `url(${cardData.imgDataUrl})`;
        loupe.style.backgroundSize = `${img.width * zoomLevel}px ${img.height * zoomLevel}px`;
        loupe.style.display = 'block';
    };

    updateLoupePosition(e);
}

function handleCardMouseOut() {
    loupe.style.display = 'none';
    loupe.style.backgroundImage = 'none';
}

function handleWheel(e) {
    if (loupe.style.display === 'none') return;

    e.preventDefault();

    if (e.deltaY < 0) {
        zoomLevel = Math.min(5, zoomLevel + 0.2);
    } else {
        zoomLevel = Math.max(1.5, zoomLevel - 0.2);
    }

    const cardElement = e.currentTarget;
    const cardId = cardElement.dataset.id;
    const cardData = getCardData(cardId);

    if (cardData && cardData.imgDataUrl) {
        const img = new Image();
        img.src = cardData.imgDataUrl;
        img.onload = () => {
            loupe.style.backgroundSize = `${img.width * zoomLevel}px ${img.height * zoomLevel}px`;
            handleCardMouseMove(e);
        }
    }
}

export function updateMagnifierEventListeners() {
    const cards = document.querySelectorAll('#fieldCards .card, #handZone .card, #trashModalContent .card, #openArea .card, #burstCard .card');
    
    cards.forEach(card => {
        // Remove old listeners to prevent duplication, then add them back.
        // This is a robust way to handle re-renders.
        card.removeEventListener('mouseover', handleCardMouseOver);
        card.removeEventListener('mouseout', handleCardMouseOut);
        card.removeEventListener('mousemove', handleCardMouseMove);
        card.removeEventListener('wheel', handleWheel);

        card.addEventListener('mouseover', handleCardMouseOver);
        card.addEventListener('mouseout', handleCardMouseOut);
        card.addEventListener('mousemove', handleCardMouseMove);
        card.addEventListener('wheel', handleWheel, { passive: false });

        // DEBUG: 枠線を赤くして、リスナーが設定されたことを視覚的に確認
        card.style.border = '2px solid red';
    });
}