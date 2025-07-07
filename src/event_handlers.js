// src/event_handlers.js
import { draggedElement, offsetX, offsetY, cardPositions, voidChargeCount, selectedCores, draggedCoreData, setDraggedElement, setOffsetX, setOffsetY, setVoidChargeCount, setSelectedCores, setDraggedCoreData, field, countCores, countShowCountAsNumber, setCountShowCountAsNumber, reserveCores, trashCores } from './game_data.js';
import { renderAll, renderTrashModalContent } from './ui_render.js';
import { showToast, getZoneName } from './utils.js';
import { drawCard, moveCardData } from './card_logic.js';
import { handleCoreClick, clearSelectedCores, handleCoreDropOnCard, handleCoreInternalMoveOnCard, handleCoreDropOnZone } from './core_logic.js';

export function setupEventListeners() {
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
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('core')) {
            clearSelectedCores();
        }
        // ボイドアイコン以外の場所をクリックしたらチャージ数をリセット
        if (e.target.id !== 'voidCore') {
            setVoidChargeCount(0);
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
        if (draggedElement && draggedElement.classList.contains('card')) {
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
        setVoidChargeCount(voidChargeCount + 1);
        showToast('voidToast', ` ${voidChargeCount}個増やせます`);
    });

    // interact.js を使った voidCore のドラッグ処理
    interact('#voidCore')
        .draggable({
            listeners: {
                start (event) {
                    // ドラッグ開始時の処理
                    console.log('voidCore drag start');
                    showToast('voidToast', '', true); // ドラッグ開始時にトーストを非表示
                },
                move (event) {
                    // ドラッグ中の処理
                    const target = event.target;
                    // keep the dragged position in the data-x/data-y attributes
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    // translate the element
                    target.style.transform = `translate(${x}px, ${y}px)`;

                    // update the posiion attributes
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                },
                end (event) {
                    console.log('voidCore drag end');
                    const dropTarget = event.relatedTarget; // ドロップされた要素

                    // voidCore の位置をリセット
                    const target = event.target;
                    target.style.transform = 'translate(0px, 0px)';
                    target.setAttribute('data-x', 0);
                    target.setAttribute('data-y', 0);

                    // コア生成ロジックを呼び出すための準備
                    const coresToMoveCount = voidChargeCount > 0 ? voidChargeCount : 1;
                    const coresToMove = Array(coresToMoveCount).fill({ type: "blue", sourceArrayName: 'void', index: -1 });
                    
                    // ダミーのDragEventオブジェクトを作成
                    const dummyEvent = {
                        preventDefault: () => {},
                        dataTransfer: {
                            getData: (key) => {
                                if (key === "type") return "voidCore";
                                if (key === "cores") return JSON.stringify(coresToMove);
                                return "";
                            }
                        },
                        clientX: event.clientX,
                        clientY: event.clientY
                    };

                    if (dropTarget) {
                        if (dropTarget.classList.contains('card')) {
                            handleCoreDropOnCard(dummyEvent, dropTarget);
                        } else if (dropTarget.classList.contains('zone') || dropTarget.classList.contains('special-zone') || dropTarget.classList.contains('deck-button')) {
                            handleCoreDropOnZone(dummyEvent, dropTarget);
                        }
                    }
                }
            }
        });

    // interact.js を使ったカードのドラッグ処理
    interact('.card')
        .draggable({
            listeners: {
                start (event) {
                    console.log('Card drag start');
                    const target = event.target;
                    const rect = target.getBoundingClientRect();
                    target.dataset.dragOffsetX = event.clientX - rect.left;
                    target.dataset.dragOffsetY = event.clientY - rect.top;
                },
                move (event) {
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    target.style.transform = `translate(${x}px, ${y}px)`;

                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                },
                end (event) {
                    console.log('Card drag end');
                    const target = event.target;
                    const dropTarget = event.relatedTarget;

                    target.style.transform = 'translate(0px, 0px)';
                    target.setAttribute('data-x', 0);
                    target.setAttribute('data-y', 0);

                    if (dropTarget) {
                        const dragOffsetX = parseFloat(target.dataset.dragOffsetX || 0);
                        const dragOffsetY = parseFloat(target.dataset.dragOffsetY || 0);
                        console.log('dragOffsetX:', dragOffsetX, 'dragOffsetY:', dragOffsetY); // Debug log

                        const dummyEvent = {
                            preventDefault: () => {},
                            dataTransfer: {
                                getData: (key) => {
                                    if (key === "type") return "card";
                                    if (key === "cardId") return target.dataset.id;
                                    if (key === "sourceZoneId") return target.parentElement.id;
                                    if (key === "offsetX") return dragOffsetX;
                                    if (key === "offsetY") return dragOffsetY;
                                    return "";
                                }
                            },
                            clientX: event.clientX,
                            clientY: event.clientY
                        };
                        handleCardDrop(dummyEvent, dropTarget);
                    }
                }
            }
        });

    // Configure droppable zones for interact.js
    interact('.zone, .special-zone, .card, .deck-button') // Select all potential drop targets
        .dropzone({
            accept: '#voidCore', // Only accept drops from #voidCore for now
            overlap: 0.75, // Require 75% overlap for a drop to be valid

            ondropactivate: function (event) {
                // add active dropzone feedback
                event.target.classList.add('drop-active');
            },
            ondragenter: function (event) {
                var draggableElement = event.relatedTarget;
                var dropzoneElement = event.target;

                // feedback the draggable element and dropzone
                dropzoneElement.classList.add('drop-target');
                draggableElement.classList.add('can-drop');
            },
            ondragleave: function (event) {
                // remove the drop feedback style
                event.target.classList.remove('drop-target');
                event.relatedTarget.classList.remove('can-drop');
            },
            ondrop: function (event) {
                // This event fires when a draggable element is dropped on a droppable element.
                // The actual core generation logic will be in the draggable's dragend event.
                // This is mainly for visual feedback or if we want to handle the drop here.
                console.log('interact.js drop event on:', event.target.id || event.target.className);
            },
            ondropdeactivate: function (event) {
                // remove active dropzone feedback
                event.target.classList.remove('drop-active');
                event.target.classList.remove('drop-target');
            }
        });

    // 「デッキ登録画面へ」ボタンのクリックイベント
    document.getElementById('goToDeckRegisterButton').addEventListener('click', () => {
        if (confirm("デッキ登録画面に移動しますか？\n現在のゲーム状態は保存されません。")) {
            window.location.href = "index.html";
        }
    });
}

// --- イベントハンドラ --- 
export function handleDragStart(e) {
    setDraggedElement(e.target);
    draggedElement.classList.add('dragging');

    if (draggedElement.classList.contains('core')) {
        const coreType = draggedElement.dataset.coreType;
        const index = parseInt(draggedElement.dataset.index);
        const sourceCardId = draggedElement.dataset.sourceCardId;

        let currentDraggedCoreIdentifier = {
            type: coreType,
            index: index
        };
        if (sourceCardId) {
            currentDraggedCoreIdentifier.sourceCardId = sourceCardId;
        } else {
            currentDraggedCoreIdentifier.sourceArrayName = draggedElement.parentElement.id;
        }

        // 現在ドラッグされているコアが選択されたコアのリストに含まれているかを確認
        const isDraggedCoreSelected = selectedCores.some(c => {
            if (c.sourceCardId && currentDraggedCoreIdentifier.sourceCardId) {
                return c.sourceCardId === currentDraggedCoreIdentifier.sourceCardId && c.index === currentDraggedCoreIdentifier.index;
            } else if (c.sourceArrayName && currentDraggedCoreIdentifier.sourceArrayName) {
                return c.sourceArrayName === currentDraggedCoreIdentifier.sourceArrayName && c.index === currentDraggedCoreIdentifier.index;
            }
            return false;
        });

        if (isDraggedCoreSelected && selectedCores.length > 1) {
            // 複数のコアが選択されており、ドラッグされたコアがそのうちの1つである場合
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
        } else { // 単一コアのドラッグ（選択されていない場合、または1つだけ選択されていてそれがドラッグされた場合）
            const parentCardElement = draggedElement.closest('.card'); // 親がカードかどうかを再確認
            if (parentCardElement) {
                // カード上のコアのドラッグ
                const rect = draggedElement.getBoundingClientRect();
                setOffsetX(e.clientX - rect.left);
                setOffsetY(e.clientY - rect.top);
                e.dataTransfer.setData("offsetX", offsetX);
                e.dataTransfer.setData("offsetY", offsetY);

                setDraggedCoreData([{ type: coreType, sourceCardId: sourceCardId, index: index, x: parseFloat(draggedElement.style.left), y: parseFloat(draggedElement.style.top) }]);
                e.dataTransfer.setData("type", "coreFromCard");
                e.dataTransfer.setData("cores", JSON.stringify(draggedCoreData));
            } else {
                // ゾーンのコアのドラッグ
                setDraggedCoreData([{ type: coreType, sourceArrayName: draggedElement.parentElement.id, index: index }]);
                e.dataTransfer.setData("type", "core");
                e.dataTransfer.setData("coreType", coreType);
                e.dataTransfer.setData("coreIndex", index);
                e.dataTransfer.setData("cores", JSON.stringify(draggedCoreData));
            }
        }
    }
    
}

export function handleDragEnd() {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        setDraggedElement(null);
    }
    setDraggedCoreData(null);
    clearSelectedCores(); // ドラッグ終了時に選択を解除
}

// 新しいデッキドラッグイベントハンドラ
export function handleDeckDragEnter(e) {
    e.preventDefault();
    const deckButton = e.currentTarget;
    deckButton.classList.add('drag-over');
}

export function handleDeckDragLeave(e) {
    e.preventDefault();
    const deckButton = e.currentTarget;
    // 関連要素への移動の場合はクラスを削除しない
    if (!deckButton.contains(e.relatedTarget)) {
        deckButton.classList.remove('drag-over', 'highlight-top-zone', 'highlight-bottom-zone');
    }
}

export function handleDeckDragOver(e) {
    e.preventDefault(); // ドロップを許可するために必要
    const deckButton = e.currentTarget;
    const rect = deckButton.getBoundingClientRect();
    const clientY = e.clientY;

    // デッキボタン内の相対Y座標
    const relativeY = clientY - rect.top;

    // デッキボタンの高さの2/3を計算
    const twoThirdsHeight = rect.height * (2 / 3);

    deckButton.classList.add('drag-over'); // ドラッグオーバー中は常に全体を発光

    if (relativeY <= twoThirdsHeight) {
        // 上2/3にいる場合
        deckButton.classList.add('highlight-top-zone');
        deckButton.classList.remove('highlight-bottom-zone');
    } else {
        // 下1/3にいる場合
        deckButton.classList.add('highlight-bottom-zone');
        deckButton.classList.remove('highlight-top-zone');
    }
}

// handleDrop からデッキボタンへのドロップ処理を分離
export function handleDeckDrop(e) {
    e.preventDefault();
    const deckButton = e.currentTarget;
    deckButton.classList.remove('drag-over', 'highlight-top-zone', 'highlight-bottom-zone'); // ドロップ後にクラスを削除

    const type = e.dataTransfer.getData("type");
    if (type === 'card') {
        const cardId = e.dataTransfer.getData("cardId");
        const sourceZoneId = e.dataTransfer.getData("sourceZoneId");
        moveCardData(cardId, sourceZoneId, 'deck', e, deckButton); // ドロップイベントとターゲット要素を渡す
    }
}

export function handleDrop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    const targetCardElement = e.target.closest('.card'); // ドロップ先がカードかどうか
    const targetZoneElement = e.target.closest('.zone, .special-zone'); // ドロップ先がゾーンかどうか

    if (type === 'card') {
        handleCardDrop(e);
    } else if (type === 'voidCore' || type === 'core' || type === 'multiCore' || type === 'coreFromCard') {
        const coresToMove = JSON.parse(e.dataTransfer.getData("cores"));
        if (targetCardElement) {
            // Check if it's an internal move within the same card
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
    clearSelectedCores(); // ドロップ処理の最後に選択状態をクリア
}

export function handleCardDrop(e, dropTarget) {
    console.log('handleCardDrop called.'); // Debug log
    console.log('dropTarget:', dropTarget); // Debug log
    const cardId = e.dataTransfer.getData("cardId");
    const sourceZoneId = e.dataTransfer.getData("sourceZoneId");
    const targetElement = dropTarget;
    if (!targetElement) {
        console.log('No targetElement, returning.'); // Debug log
        return;
    }

    const targetZoneName = getZoneName(targetElement);
    console.log('targetZoneName:', targetZoneName); // Debug log

    if (targetZoneName === 'deck') {
        // デッキへのドロップは handleDeckDrop で処理するため、ここでは何もしない
        console.log('Dropped on deck, returning.'); // Debug log
        return;
    }

    if (targetZoneName === 'field') {
        console.log('Dropped on field.'); // Debug log
        const fieldRect = document.getElementById('fieldCards').getBoundingClientRect();
        const offsetX = parseFloat(e.dataTransfer.getData("offsetX"));
        const offsetY = parseFloat(e.dataTransfer.getData("offsetY"));
        console.log('offsetX:', offsetX, 'offsetY:', offsetY); // Debug log
        console.log('e.clientX:', e.clientX, 'e.clientY:', e.clientY); // Debug log
        console.log('fieldRect.left:', fieldRect.left, 'fieldRect.top:', fieldRect.top); // Debug log
        cardPositions[cardId] = {
            left: e.clientX - fieldRect.left - offsetX,
            top: e.clientY - fieldRect.top - offsetY
        };
        console.log('cardPositions[cardId]:', cardPositions[cardId]); // Debug log
    } else {
        console.log('Dropped on non-field zone.'); // Debug log
        delete cardPositions[cardId];
    }
    moveCardData(cardId, sourceZoneId, targetZoneName);
    console.log('moveCardData called.'); // Debug log
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
    countCores.push("blue");
    renderAll();
}

export function toggleDeckCoreCount() {
    setCountShowCountAsNumber(!countShowCountAsNumber);
    renderAll();
}

export function refreshAll() {
    setSelectedCores([]); // 選択されたコアをクリア
    field.forEach(card => {
        if (card.isExhausted) {
            card.isExhausted = false;
            card.isRotated = true; // 重疲労から疲労へ
        } else {
            card.isRotated = false;
            card.isExhausted = false;
        }
    });

    // トラッシュのコアをすべてリザーブに移動
    while (trashCores.length > 0) {
        reserveCores.push(trashCores.shift());
    }

    renderAll();
}