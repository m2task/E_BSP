import { showToast } from './src/utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const cropperSection = document.getElementById('cropper-section');
    const deckListSection = document.getElementById('deck-list-section');
    const deckEditingArea = document.querySelector('.deck-editing-area');
    const showCropperBtn = document.getElementById('show-cropper-btn');
    const showDeckListBtn = document.getElementById('show-deck-list-btn');
    const imageLoader = document.getElementById('imageLoader');
    const cropButton = document.getElementById('crop-button');
    const sourceImage = document.getElementById('sourceImage'); // 処理用の非表示画像
    const previewImage = document.getElementById('previewImage'); // 表示用のプレビュー画像
    const deckList = document.getElementById('deck-list');
    const totalCardCountSpan = document.getElementById('total-card-count');
    const deckEditorContainer = document.getElementById('deck-editor-container');
    const cardNameInput = document.getElementById('cardNameInput');
    const addCardByNameButton = document.getElementById('addCardByNameButton');
    const deckNameInput = document.getElementById('deckNameInput');
    const saveDeckAsButton = document.getElementById('saveDeckAsButton');
    const overwriteSaveButton = document.getElementById('overwriteSaveButton');
    const newDeckButton = document.getElementById('newDeckButton');

    const debugArea = document.getElementById('debug-area'); // デバッグエリア

    // --- State ---
    const imageState = { isLoaded: false };
    let deck = [];
    let currentEditingDeckName = null;

    // --- Utility Functions ---
    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    function createCardImageFromText(text, width = 80, height = 110) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const padding = 5;
        const maxWidth = width - (padding * 2);
        const lineHeight = 14;
        let lines = [];
        let currentLine = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const testLine = currentLine + char;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
                lines.push(currentLine);
                currentLine = char;
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
        const totalTextHeight = (lines.length - 1) * lineHeight;
        let startY = (height - totalTextHeight) / 2;
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], width / 2, startY + (i * lineHeight));
        }
        return canvas.toDataURL('image/png');
    }

    // --- Deck Editor Functions ---
    function renderEditedDeck() {
        deckEditorContainer.innerHTML = '';
        if (deck.length === 0) {
            deckEditorContainer.innerHTML = '<p style="color: #666;">ここに編集中のカードが表示されます。</p>';
            totalCardCountSpan.textContent = '0';
            return;
        }
        let totalCardCount = 0;
        deck.forEach(card => {
            totalCardCount += card.quantity;
            const cardItem = document.createElement('div');
            cardItem.className = 'deck-card-item';
            cardItem.dataset.cardId = card.id;
            const img = document.createElement('img');
            img.src = card.imgDataUrl;
            img.alt = card.name || `Card ${card.id}`;
            const controls = document.createElement('div');
            controls.className = 'card-controls';
            const decreaseBtn = document.createElement('button');
            decreaseBtn.textContent = '-';
            decreaseBtn.addEventListener('click', () => handleDecreaseQuantity(card.id));
            const quantitySpan = document.createElement('span');
            quantitySpan.className = 'card-quantity';
            quantitySpan.textContent = `x${card.quantity}`;
            const increaseBtn = document.createElement('button');
            increaseBtn.textContent = '+';
            increaseBtn.addEventListener('click', () => handleIncreaseQuantity(card.id));
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '削除';
            deleteBtn.className = 'delete-button';
            deleteBtn.addEventListener('click', () => handleDeleteCard(card.id));
            controls.appendChild(decreaseBtn);
            controls.appendChild(quantitySpan);
            controls.appendChild(increaseBtn);
            controls.appendChild(deleteBtn);
            cardItem.appendChild(img);
            cardItem.appendChild(controls);
            deckEditorContainer.appendChild(cardItem);
        });
        totalCardCountSpan.textContent = totalCardCount.toString();
    }

    function handleDecreaseQuantity(id) {
        const cardIndex = deck.findIndex(card => card.id === id);
        if (cardIndex !== -1) {
            deck[cardIndex].quantity--;
            if (deck[cardIndex].quantity <= 0) deck.splice(cardIndex, 1);
            renderEditedDeck();
        }
    }

    function handleIncreaseQuantity(id) {
        const cardIndex = deck.findIndex(card => card.id === id);
        if (cardIndex !== -1) {
            deck[cardIndex].quantity++;
            renderEditedDeck();
        }
    }

    function handleDeleteCard(id) {
        deck = deck.filter(card => card.id !== id);
        renderEditedDeck();
    }

    // --- Deck List Functions ---
    async function renderDeckList() {
        deckList.innerHTML = '';
        const savedDecks = await window.cardGameDB.getAllDecks();
        if (!savedDecks || savedDecks.length === 0) {
            deckList.innerHTML = '<p>保存されたデッキはありません。</p>';
            return;
        }
        for (const deckData of savedDecks) {
            const deckName = deckData.name;
            const totalCards = deckData.data.reduce((sum, card) => sum + card.quantity, 0);
            const listItem = document.createElement('li');
            listItem.dataset.deckName = deckName;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.className = 'deck-checkbox';
            checkbox.dataset.deckName = deckName;
            checkbox.addEventListener('click', (e) => e.stopPropagation());
            listItem.appendChild(checkbox);
            const battleButton = document.createElement('button');
            battleButton.textContent = 'このデッキで対戦';
            battleButton.className = 'battle-button';
            battleButton.dataset.deckName = deckName;
            battleButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const isChecked = e.target.closest('li').querySelector('.deck-checkbox').checked;
                window.location.href = `battle.html?deckName=${encodeURIComponent(deckName)}&useContract=${isChecked}`;
            });
            listItem.appendChild(battleButton);
            const deckNameSpan = document.createElement('span');
            deckNameSpan.textContent = `${deckName} (${totalCards}枚)`;
            listItem.appendChild(deckNameSpan);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '削除';
            deleteButton.dataset.deckName = deckName;
            deleteButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`デッキ「${deckName}」を本当に削除しますか？`)) {
                    await window.cardGameDB.deleteDeck(deckName);
                    renderDeckList();
                    if (currentEditingDeckName === deckName) {
                        deck = [];
                        currentEditingDeckName = null;
                        renderEditedDeck();
                    }
                }
            });
            listItem.appendChild(deleteButton);
            listItem.addEventListener('click', async () => {
                if (currentEditingDeckName === deckName) {
                    deck = [];
                    currentEditingDeckName = null;
                    renderEditedDeck();
                    return;
                }
                const loadedDeck = await window.cardGameDB.loadDeck(deckName);
                if (loadedDeck) {
                    deck = [...loadedDeck];
                    renderEditedDeck();
                    currentEditingDeckName = deckName;
                    deckEditingArea.scrollIntoView({ behavior: 'smooth' });
                } else {
                    alert('デッキの読み込みに失敗しました。');
                }
            });
            deckList.appendChild(listItem);
        }
    }

    // --- Event Listeners ---

    // Section visibility has been removed as all sections are now always visible.

    newDeckButton.addEventListener('click', () => {
        newDeckButton.classList.add('hidden'); // 新規デッキ作成ボタンを非表示
        imageLoader.classList.remove('hidden'); // ファイル選択ボタンを表示
        imageLoader.value = '';
    });

    imageLoader.addEventListener('change', (e) => {
        deck = [];
        currentEditingDeckName = null;
        renderEditedDeck();
        debugArea.style.display = 'none'; // デバッグエリアを一旦隠す

        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageUrl = event.target.result;
                // 表示用と処理用の両方の画像にソースを設定
                previewImage.src = imageUrl;
                sourceImage.src = imageUrl;

                sourceImage.onload = () => {
                    imageState.isLoaded = true;
                    // ファイル選択後に自動でカード切り出し処理を実行
                    if (typeof cv !== 'undefined' && cv.imread) {
                        try {
                            const src = cv.imread(sourceImage);
                            const gray = new cv.Mat();
                            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

                            // 1. 適応的しきい値処理
                            const thresh = new cv.Mat();
                            cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 21, 2);

                            // 2. 弱めのモルフォロジー演算（クロージングのみ）で内部の穴を埋める
                            const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
                            const morph = new cv.Mat();
                            cv.morphologyEx(thresh, morph, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 1);

                            // --- デバッグここから ---
                            // モルフォロジー処理後の結果を表示
                            cv.imshow('edges-canvas', morph);
                            // debugArea.style.display = 'block'; // デバッグ情報を非表示化
                            // --- デバッグここまで ---

                            // 3. 輪郭を検出
                            const contours = new cv.MatVector();
                            const hierarchy = new cv.Mat();
                            cv.findContours(morph, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

                            let croppedCardCount = 0;
                            const cardRects = [];

                            for (let i = 0; i < contours.size(); ++i) {
                                const cnt = contours.get(i);
                                const rect = cv.boundingRect(cnt);
                                const aspectRatio = rect.width / rect.height;
                                const area = cv.contourArea(cnt);

                                // 4. フィルタリング条件を大胆に緩める
                                const minCardArea = 3000;    // 5000から引き下げ
                                const maxCardArea = 500000;  // 変更なし
                                const minAspectRatio = 0.5;  // 0.6から引き下げ
                                const maxAspectRatio = 1.0;  // 0.9から引き上げ

                                if (area > minCardArea && area < maxCardArea && aspectRatio > minAspectRatio && aspectRatio < maxAspectRatio) {
                                    cardRects.push(rect);
                                }
                                cnt.delete();
                            }

                            // 座標でソート (左上から右下へ)
                            cardRects.sort((a, b) => {
                                const yDiff = a.y - b.y;
                                if (Math.abs(yDiff) > a.height / 2) { // Y座標が大きく違う場合は行が違うと判断
                                    return yDiff;
                                }
                                return a.x - b.x; // 同じ行ならX座標でソート
                            });

                            for (const rect of cardRects) {
                                const croppedCard = src.roi(rect);
                                const canvas = document.createElement('canvas');
                                canvas.width = rect.width;
                                canvas.height = rect.height;
                                cv.imshow(canvas, croppedCard);

                                const imgDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                                const existingCardIndex = deck.findIndex(card => card.imgDataUrl === imgDataUrl);
                                if (existingCardIndex !== -1) {
                                    deck[existingCardIndex].quantity++;
                                } else {
                                    deck.push({ id: generateUniqueId(), imgDataUrl: imgDataUrl, quantity: 1 });
                                }
                                croppedCardCount++;
                                croppedCard.delete();
                            }

                            renderEditedDeck();
                            alert(`${croppedCardCount}枚のカードをデッキに追加しました。`);
                            deckEditingArea.scrollIntoView({ behavior: 'smooth' });

                            // メモリ解放
                            src.delete();
                            gray.delete();
                            thresh.delete();
                            morph.delete();
                            kernel.delete();
                            contours.delete();
                            hierarchy.delete();

                            // UIの状態をリセット
                            imageLoader.classList.add('hidden');
                            newDeckButton.classList.remove('hidden');

                        } catch (error) {
                            console.error("カードの自動切り取り中にエラーが発生しました:", error);
                            alert("カードの自動切り取り中にエラーが発生しました。コンソールを確認してください。");
                        }
                    } else {
                        alert('画像処理ライブラリ(OpenCV.js)がまだ読み込まれていません。少し待ってからもう一度お試しください。');
                    }
                };
            };
            reader.readAsDataURL(file);
        }
    });

    // Deck Editor Listeners
    addCardByNameButton.addEventListener('click', () => {
        const cardName = cardNameInput.value.trim();
        if (cardName === '') {
            alert('カード名を入力してください。');
            return;
        }
        const imgDataUrl = createCardImageFromText(cardName);
        const existingCardIndex = deck.findIndex(card => card.imgDataUrl === imgDataUrl);
        if (existingCardIndex !== -1) {
            deck[existingCardIndex].quantity++;
        } else {
            deck.push({ id: generateUniqueId(), imgDataUrl: imgDataUrl, quantity: 1, name: cardName });
        }
        renderEditedDeck();
        cardNameInput.value = '';
    });

    saveDeckAsButton.addEventListener('click', async () => {
        let deckName = deckNameInput.value.trim();

        // デッキ名が空の場合、自動で名前を生成する
        if (deckName === '') {
            const savedDecks = await window.cardGameDB.getAllDecks();
            const existingDeckNames = savedDecks.map(d => d.name);
            let newDeckIndex = 1;
            while (existingDeckNames.includes(`デッキ${newDeckIndex}`)) {
                newDeckIndex++;
            }
            deckName = `デッキ${newDeckIndex}`;
        }

        if (deck.length === 0) {
            alert('デッキにカードがありません。');
            return;
        }
        try {
            await window.cardGameDB.saveDeck(deckName, deck);
            showToast('deckSaveToast', `デッキ「${deckName}」を保存しました。`, { duration: 2000 });
            window.scrollTo({ top: 0, behavior: 'smooth' }); // ページ上部にスクロール
            deckNameInput.value = ''; // 入力欄はクリアする
            renderDeckList();
            currentEditingDeckName = deckName;
        } catch (error) {
            console.error('デッキの保存に失敗しました:', error);
            alert('デッキの保存に失敗しました。');
        }
    });

    overwriteSaveButton.addEventListener('click', async () => {
        if (currentEditingDeckName === null) {
            alert('上書き保存するには、まずデッキを読み込むか、名前を付けて保存してください。');
            return;
        }
        try {
            await window.cardGameDB.saveDeck(currentEditingDeckName, deck);
            showToast('deckSaveToast', `デッキ「${currentEditingDeckName}」を上書き保存しました。`, { duration: 2000 });
            window.scrollTo({ top: 0, behavior: 'smooth' }); // ページ上部にスクロール
            renderDeckList();
        } catch (error) {
            console.error('デッキの上書き保存に失敗しました:', error);
            alert('デッキの上書き保存に失敗しました。');
        }
    });

    // --- Initial Setup ---
    function initialize() {
        cropperSection.style.display = 'block';
        deckListSection.style.display = 'block';
        deckEditingArea.style.display = 'block';
        renderDeckList();
        renderEditedDeck();
    }

    initialize();
});