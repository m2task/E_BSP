// src/magnify_logic.js
import { draggedElement, isDragging, field, hand, trash, burst, openArea } from './game_data.js';

const loupe = document.getElementById('magnifying-loupe');
const magnifiedImage = document.getElementById('magnified-card-image');

// プレビューパネルの固定サイズ
const PREVIEW_WIDTH = 160; // 80px * 2.0
const PREVIEW_HEIGHT = 240; // 120px * 2.0
const OFFSET = 10; // カードとプレビューパネルの間のオフセット

function getCardData(cardId) {
    const allCardArrays = [field, hand, trash, burst, openArea];
    for (const arr of allCardArrays) {
        const foundCard = arr.find(c => c.id === cardId);
        if (foundCard) return foundCard;
    }
    return null;
}

function handleCardMouseOver(e) {
    if (draggedElement || isDragging) {
        loupe.style.display = 'none'; // ドラッグ中は非表示を徹底
        return;
    }

    const cardElement = e.currentTarget;
    const cardId = cardElement.dataset.id;
    const cardData = getCardData(cardId);

    if (!cardData || !cardData.imgDataUrl) {
        loupe.style.display = 'none';
        return;
    }

    magnifiedImage.src = cardData.imgDataUrl;

    const cardRect = cardElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    let previewLeft;
    let previewTop = cardRect.top; // カードの上端に合わせる

    // 右側に表示できるかチェック
    if (cardRect.right + OFFSET + PREVIEW_WIDTH <= viewportWidth) {
        previewLeft = cardRect.right + OFFSET;
    } else {
        // 右側にはみ出す場合、左側に表示
        previewLeft = cardRect.left - OFFSET - PREVIEW_WIDTH;
        // 左側にはみ出す場合、画面左端に固定
        if (previewLeft < 0) {
            previewLeft = 0;
        }
    }

    // プレビューが画面下にはみ出す場合、調整
    if (previewTop + PREVIEW_HEIGHT > window.innerHeight) {
        previewTop = window.innerHeight - PREVIEW_HEIGHT - OFFSET; // 下端に合わせる
        if (previewTop < 0) previewTop = 0; // 上にはみ出さないように
    }

    loupe.style.left = `${previewLeft}px`;
    loupe.style.top = `${previewTop}px`;
    loupe.style.display = 'block';
}

function handleCardMouseOut() {
    loupe.style.display = 'none';
}

export function updateMagnifierEventListeners() {
    const cards = document.querySelectorAll('#fieldCards .card, #handZone .card, #trashModalContent .card, #openArea .card, #burstCard .card');
    
    cards.forEach(card => {
        // 既存のリスナーを削除してから追加し、重複を防ぐ
        card.removeEventListener('mouseover', handleCardMouseOver);
        card.removeEventListener('mouseout', handleCardMouseOut);
        // mousemove と wheel はこのモードでは不要なので削除
        card.removeEventListener('mousemove', () => {}); // ダミー関数で削除
        card.removeEventListener('wheel', () => {}); // ダミー関数で削除

        card.addEventListener('mouseover', handleCardMouseOver);
        card.addEventListener('mouseout', handleCardMouseOut);
    });
}
