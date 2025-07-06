import { getDeckNameFromURL, shuffle, getZoneName } from './utils.js';
import { initializeGame, getArrayByZoneName, moveCardData, moveCoresToZone, removeCoresFromSource, drawCard, addDeckCore, toggleDeckCoreCount, refreshAll, clearSelectedCores, showToast } from './gameLogic.js';
import { renderAll, createCardElement, renderHand, renderField, renderTrash, renderBurst, renderCores, renderDeckCore, renderTrashCores, toggleHand, renderTrashModalContent, openTrashModal } from './renderers.js';
import { handleDragStart, handleDragEnd, handleDeckDragEnter, handleDeckDragLeave, handleDeckDragOver, handleDeckDrop, handleDrop, handleCardDrop, handleCoreDropOnCard, handleCoreInternalMoveOnCard, handleCoreDropOnZone, handleCoreClick } from './dragDrop.js';


document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    setupEventListeners();
});



function setupEventListeners() {
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', handleDrop);

    // デッキボタンのドラッグイベントリスナーを追加
    const deckButton = document.querySelector('.deck-button');
    deckButton.addEventListener('dragenter', handleDeckDragEnter);
    deckButton.addEventListener('dragleave', handleDeckDragLeave);
    deckButton.addEventListener('dragover', handleDeckDragOver);
    deckButton.addEventListener('drop', handleDeckDrop);

    // コアのクリックイベント（選択用）

    // フィールドのカードクリックイベント（回転用）
    document.getElementById('fieldCards').addEventListener('click', (e) => {
        const cardElement = e.target.closest('.card');
        if (cardElement && !e.target.classList.contains('exhaust-button')) {
            const cardId = cardElement.dataset.id;
    const cardData = field.find(card => card.id === cardId);
    if (!cardData) return; // データが見つからない場合は何もしない

    if (cardData.isRotated) {
        cardData.isRotated = false;
    } else {
        cardData.isRotated = true;
        cardData.isExhausted = false; // 疲労させたら重疲労は解除
    }
    renderAll(); // 状態変更を反映するために再描画
        }
    });

    // 画面のどこかをクリックしたらコアの選択を解除
    // このイベントリスナーを修正
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('core')) {
            clearSelectedCores();
        }
        // ボイドアイコン以外の場所をクリックしたらチャージ数をリセット
        if (e.target.id !== 'voidCore') {
            voidChargeCount = 0;
            showToast('voidToast', '', true); // トーストを非表示にする
        }
    });

    document.querySelector('.deck-button').addEventListener('click', (e) => {
        const deckButton = e.currentTarget;
        const rect = deckButton.getBoundingClientRect();
        const clickY = e.clientY - rect.top; // ボタン内でのクリックY座標
        const buttonHeight = rect.height;

        // ボタンの高さの2/3を計算
        const twoThirdsHeight = buttonHeight * (2 / 3);

        if (clickY <= twoThirdsHeight) {
            // 上2/3をクリックした場合
            drawCard(false); // 上からドロー
        } else {
            // 下1/3をクリックした場合
            drawCard(true); // 下からドロー
        }
    });

    // handZoneContainer にマウスイベントを追加
    const handZoneContainer = document.getElementById('handZoneContainer');
    const openHandButton = document.getElementById('openHandButton');

    handZoneContainer.addEventListener('mouseover', () => {
        handZoneContainer.classList.remove('collapsed');
        openHandButton.classList.add('hidden');
    });

    handZoneContainer.addEventListener('mouseleave', () => {
        handZoneContainer.classList.add('collapsed');
        openHandButton.classList.remove('hidden');
    });

    // openHandButton にマウスイベントを追加
    openHandButton.addEventListener('mouseover', () => {
        handZoneContainer.classList.remove('collapsed');
        openHandButton.classList.add('hidden');
    });

    openHandButton.addEventListener('mouseleave', () => {
        handZoneContainer.classList.add('collapsed');
        openHandButton.classList.remove('hidden');
    });

    // ドラッグ中のカードが「手札を開く」ボタンの上に来たら手札を開く
    openHandButton.addEventListener('dragover', () => {
        const type = draggedElement.dataset.type;
        if (draggedElement.classList.contains('card')) {
            handZoneContainer.classList.remove('collapsed');
            openHandButton.classList.add('hidden');
        }
    });

    document.getElementById('trashZoneTitle').addEventListener('click', openTrashModal);
    document.getElementById('addDeckCoreBtn').addEventListener('click', addDeckCore);
    document.getElementById('toggleDeckCoreBtn').addEventListener('click', toggleDeckCoreCount);
    document.getElementById('refreshButton').addEventListener('click', refreshAll);

    // ボイドアイコンのクリックイベント
    document.getElementById('voidCore').addEventListener('click', (e) => {
        e.stopPropagation(); // ドキュメント全体のクリックイベントが発火しないようにする
        voidChargeCount++;
        showToast('voidToast', ` ${voidChargeCount}個増やせます`);
    });

    // 「デッキ登録画面へ」ボタンのクリックイベント
    document.getElementById('goToDeckRegisterButton').addEventListener('click', () => {
        if (confirm("デッキ登録画面に移動しますか？\n現在のゲーム状態は保存されません。")) {
            window.location.href = "index.html";
        }
    });
}








































































