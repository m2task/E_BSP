// src/magnify_logic.js
import { draggedElement, isDragging, field, hand, trash, burst, openArea } from './game_data.js';

const loupe = document.getElementById('magnifying-loupe');
const magnifiedImage = document.getElementById('magnified-card-image');
const magnifiedTokenContainer = document.getElementById('magnified-token-container');
const magnifiedTokenName = document.getElementById('magnified-token-name');
const magnifiedTokenText = document.getElementById('magnified-token-text');

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
        hideMagnifier();
        return;
    }

    const cardElement = e.currentTarget;
    const cardId = cardElement.dataset.id;
    
    // 通常のカード配列内を検索
    let cardData = cardId ? getCardData(cardId) : null;

    // デッキ外モーダル内の未配置カードの場合（dataset.idが無い）
    if (!cardData && cardElement.classList.contains('special-card')) {
        const specialType = cardElement.dataset.cardType;
        if (specialType === 'token') {
            cardData = {
                isSpecial: true,
                specialType: 'token',
                name: cardElement.dataset.tokenName || cardElement.textContent.trim() || 'トークン',
                text: cardElement.dataset.tokenText || ''
            };
        }
    }

    if (!cardData) {
        hideMagnifier();
        return;
    }

    if (cardData.imgDataUrl) {
        if (magnifiedTokenContainer) magnifiedTokenContainer.style.display = 'none';
        magnifiedImage.src = cardData.imgDataUrl;
        magnifiedImage.style.display = 'block';
        loupe.style.display = 'block';
    } else if (cardData.isSpecial && cardData.specialType === 'token') {
        magnifiedImage.style.display = 'none';
        if (magnifiedTokenContainer) {
            magnifiedTokenContainer.style.display = 'flex';
            if (magnifiedTokenName) {
                magnifiedTokenName.textContent = cardData.name || 'トークン';
            }
            if (magnifiedTokenText) {
                magnifiedTokenText.textContent = cardData.text && cardData.text.trim() !== ''
                    ? cardData.text
                    : '（効果テキストなし）';
            }
        }
        loupe.style.display = 'block';
    } else {
        hideMagnifier();
    }
}

function handleCardMouseOut() {
    loupe.style.display = 'none';
    if (magnifiedImage) magnifiedImage.src = '';
    if (magnifiedTokenContainer) magnifiedTokenContainer.style.display = 'none';
}

export function hideMagnifier() {
    handleCardMouseOut();
}

export function updateMagnifierEventListeners() {
    const cards = document.querySelectorAll(
        '#fieldCards .card, #handZone .card, #trashModalContent .card, #openArea .card, #burstCard .card, #deckGaiModalContent .card'
    );
    
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
