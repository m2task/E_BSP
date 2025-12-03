// src/magnify_logic.js
import { draggedElement, isDragging, field, hand, trash, burst, openArea } from './game_data.js';

const loupe = document.getElementById('magnifying-loupe');
const magnifiedImage = document.getElementById('magnified-card-image');

// プレビューパネルの固定サイズ
const PREVIEW_WIDTH = 200; // 80px * 2.5
const PREVIEW_HEIGHT = 300; // 120px * 2.5
const OFFSET = 10; // カードとプレビューパネルの間のオフセット

let isMagnifyEnabled = true; // 拡大機能のON/OFF状態を管理 (初期状態はON)

function getCardData(cardId) {
    const allCardArrays = [field, hand, trash, burst, openArea];
    for (const arr of allCardArrays) {
        const foundCard = arr.find(c => c.id === cardId);
        if (foundCard) return foundCard;
    }
    return null;
}

function handleCardMouseOver(e) {
    if (!isMagnifyEnabled || draggedElement || isDragging) {
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

    // 位置はCSSで固定されるため、ここでは表示するだけ
    loupe.style.display = 'block';
}

function handleCardMouseOut() {
    loupe.style.display = 'none';
}

export function hideMagnifier() {
    handleCardMouseOut();
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

export function initializeMagnifyButton() {
    const toggleButton = document.getElementById('magnify-toggle-button');
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            // 状態を反転
            isMagnifyEnabled = !isMagnifyEnabled;
            
            // ボタンのテキストを更新 (次に押したときの動作を示す)
            toggleButton.textContent = isMagnifyEnabled ? 'カード拡大OFF' : 'カード拡大ON';

            if (!isMagnifyEnabled) {
                hideMagnifier(); // OFFにした瞬間に拡大表示を消す
            }
        });
    }
}
