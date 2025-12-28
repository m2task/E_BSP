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
                            const thresh = new cv.Mat();
                            // 背景が白(255)に近いので、240を閾値にして反転二値化
                            cv.threshold(gray, thresh, 240, 255, cv.THRESH_BINARY_INV);

                            // ノイズ除去のためにモルフォロジー演算（オープニング）
                            const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
                            const opening = new cv.Mat();
                            cv.morphologyEx(thresh, opening, cv.MORPH_OPEN, kernel, new cv.Point(-1, -1), 1);

                            const contours = new cv.MatVector();
                            const hierarchy = new cv.Mat();
                            cv.findContours(opening, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

                            let croppedCardCount = 0;
                            const cardRects = [];

                            for (let i = 0; i < contours.size(); ++i) {
                                const cnt = contours.get(i);
                                const area = cv.contourArea(cnt);
                                const rect = cv.boundingRect(cnt);
                                const aspectRatio = rect.width / rect.height;

                                // --- カード選別（フィルタリング）---
                                // これらの値は、実際の画像に合わせて調整が必要な場合があります。
                                const minCardArea = 5000; // 最小のカード面積（小さすぎるノイズを除外）
                                const maxCardArea = 500000; // 最大のカード面積（大きすぎる領域を除外）
                                const minAspectRatio = 0.6; // 最小のアスペクト比（細すぎるものを除外）
                                const maxAspectRatio = 0.9; // 最大のアスペクト比（太すぎるものを除外）

                                if (area > minCardArea && area < maxCardArea && aspectRatio > minAspectRatio && aspectRatio < maxAspectRatio) {
                                    
                                    // --- 「平均的な黒さ」によるノイズフィルタリング ---
                                    let hasBlackCircle = false;
                                    const roiRatio = 0.35; // 右上の35%の領域をチェック
                                    const roiX = rect.x + rect.width * (1 - roiRatio);
                                    const roiY = rect.y;
                                    const roiWidth = rect.width * roiRatio;
                                    const roiHeight = rect.height * roiRatio;

                                    // ROIが画像範囲内にあるか確認
                                    if (roiX >= 0 && roiY >= 0 && roiWidth > 10 && roiHeight > 10 && (roiX + roiWidth) <= src.cols && (roiY + roiHeight) <= src.rows) {
                                        const roiRect = new cv.Rect(roiX, roiY, roiWidth, roiHeight);
                                        const roi = src.roi(roiRect);
                                        const grayRoi = new cv.Mat();
                                        cv.cvtColor(roi, grayRoi, cv.COLOR_RGBA2GRAY, 0);
                                        
                                        // ROIの平均ピクセル値（明るさ）を計算
                                        const meanBrightness = cv.mean(grayRoi)[0];
                                        
                                        const blacknessThreshold = 195; // この値より平均が暗ければ「黒」とみなす (要調整)

                                        if (meanBrightness < blacknessThreshold) {
                                            hasBlackCircle = true;
                                        }

                                        roi.delete();
                                        grayRoi.delete();
                                    }

                                    // 黒い部分が見つかった候補のみ、次の処理へ進む
                                    if (hasBlackCircle) {
                                        // --- 矩形の補正ロジック (余白の切り詰め) ---
                                        const topPaddingRatio = 0.020;
                                        const rightPaddingRatio = 0.025;

                                        const topPadding = rect.height * topPaddingRatio;
                                        const rightPadding = rect.width * rightPaddingRatio;

                                        const newX = rect.x;
                                        const newY = rect.y + topPadding;
                                        const newWidth = rect.width - rightPadding;
                                        const newHeight = rect.height - topPadding;

                                        // 補正後の矩形がマイナスのサイズにならないようにチェック
                                        if (newWidth > 0 && newHeight > 0) {
                                            const correctedRect = new cv.Rect(newX, newY, newWidth, newHeight);
                                            cardRects.push(correctedRect);
                                        } else {
                                            cardRects.push(rect); // 補正に失敗した場合は元の矩形を使う
                                        }
                                    }
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
                            opening.delete();
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
            alert(`デッキ「${deckName}」を保存しました。`);
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
            alert(`デッキ「${currentEditingDeckName}」を上書き保存しました。`);
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