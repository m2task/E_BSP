document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const cropperSection = document.getElementById('cropper-section');
    const deckListSection = document.getElementById('deck-list-section');
    const deckEditingArea = document.querySelector('.deck-editing-area');
    const showCropperBtn = document.getElementById('show-cropper-btn');
    const showDeckListBtn = document.getElementById('show-deck-list-btn');
    const rowsInput = document.getElementById('rows');
    const colsInput = document.getElementById('cols');
    const topOffsetInput = document.getElementById('top-offset'); // New
    const imageLoader = document.getElementById('imageLoader');
    const cropButton = document.getElementById('crop-button');
    const zoomOutButton = document.getElementById('zoom-out-button');
    const zoomInButton = document.getElementById('zoom-in-button');
    const gapHDecreaseBtn = document.getElementById('gapH-decrease');
    const gapHIncreaseBtn = document.getElementById('gapH-increase');
    const gapHValueSpan = document.getElementById('gapH-value');
    const gapVDecreaseBtn = document.getElementById('gapV-decrease');
    const gapVIncreaseBtn = document.getElementById('gapV-increase');
    const gapVValueSpan = document.getElementById('gapV-value');
    const cropperContainer = document.getElementById('cropper-container');
    const imageContainer = document.getElementById('image-container');
    const sourceImage = document.getElementById('sourceImage');
    const handlesContainer = document.getElementById('grid-handles-container');
    const overlayMask = document.getElementById('overlay-mask');
    const deckList = document.getElementById('deck-list');
    const totalCardCountSpan = document.getElementById('total-card-count');
    const deckEditorContainer = document.getElementById('deck-editor-container');
    const cardNameInput = document.getElementById('cardNameInput');
    const addCardByNameButton = document.getElementById('addCardByNameButton');
    const deckNameInput = document.getElementById('deckNameInput');
    const saveDeckAsButton = document.getElementById('saveDeckAsButton');
    const overwriteSaveButton = document.getElementById('overwriteSaveButton');

    // --- New UI Elements for Auto-cropping ---
    const manualModeRadio = document.getElementById('manual-mode');
    const autoModeRadio = document.getElementById('auto-mode');
    const manualGapControls = document.getElementById('manual-gap-controls');
    const autoCropButton = document.getElementById('auto-crop-button');

    // --- State ---
    const gridState = { x: 50, y: 50, cellWidth: 80, cellHeight: 110 };
    const gapState = { horizontal: 10, vertical: 20 };
    const imageState = { x: 0, y: 0, scale: 1.0, isLoaded: false };
    const interactionState = {
        isDragging: false,
        isPanning: false,
        isPinching: false,
        target: null,
        startX: 0, startY: 0,
        panStartX: 0, panStartY: 0,
        initialState: {},
        initialPinchDistance: 0,
    };

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

    // --- Cropper Functions ---
    function drawGridAndHandles() {
        handlesContainer.innerHTML = '';
        overlayMask.innerHTML = '';
        if (!imageState.isLoaded) return;
        const rows = parseInt(rowsInput.value, 10);
        const cols = parseInt(colsInput.value, 10);
        const gapH = gapState.horizontal;
        const gapV = gapState.vertical;
        const totalCellWidth = gridState.cellWidth + gapH;
        const totalCellHeight = gridState.cellHeight + gapV;
        const totalGridDisplayWidth = (gridState.cellWidth * cols) + (gapH * (cols - 1));
        const totalGridDisplayHeight = (gridState.cellHeight * rows) + (gapV * (rows - 1));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell-visual';
                cell.style.left = `${gridState.x + c * totalCellWidth}px`;
                cell.style.top = `${gridState.y + r * totalCellHeight}px`;
                cell.style.width = `${gridState.cellWidth}px`;
                cell.style.height = `${gridState.cellHeight}px`;
                handlesContainer.appendChild(cell);
            }
        }
    }

    function applyImageTransform() {
        sourceImage.style.transform = `translate(${imageState.x}px, ${imageState.y}px) scale(${imageState.scale})`;
    }

    // --- Event Listeners ---
    function getPointer(e) { return e.touches ? e.touches[0] : e; }
    function onDragStart(e) {
        if (e.target.classList.contains('handle')) {
            e.preventDefault();
            const pointer = getPointer(e);
            interactionState.isDragging = true;
            interactionState.target = e.target.dataset.target;
            interactionState.startX = pointer.clientX;
            interactionState.startY = pointer.clientY;
            interactionState.initialState = { ...gridState };
        }
    }
    function onPanStart(e) {
        e.preventDefault();
        const pointer = getPointer(e);
        interactionState.isPanning = true;
        interactionState.panStartX = pointer.clientX - imageState.x;
        interactionState.panStartY = pointer.clientY - imageState.y;
        imageContainer.classList.add('grabbing');
    }
    function onInteractionMove(e) {
        if (interactionState.isDragging) {
            e.preventDefault();
            const pointer = getPointer(e);
            const dx = pointer.clientX - interactionState.startX;
            const dy = pointer.clientY - interactionState.startY;
            if (interactionState.target === 'move') {
                gridState.x = interactionState.initialState.x + dx;
                gridState.y = interactionState.initialState.y + dy;
            } else if (interactionState.target === 'resize-v') {
                gridState.cellWidth = Math.max(10, interactionState.initialState.cellWidth + dx);
            } else if (interactionState.target === 'resize-h') {
                gridState.cellHeight = Math.max(10, interactionState.initialState.cellHeight + dy);
            }
            drawGridAndHandles();
        } else if (interactionState.isPanning) {
            e.preventDefault();
            const pointer = getPointer(e);
            imageState.x = pointer.clientX - interactionState.panStartX;
            imageState.y = pointer.clientY - interactionState.panStartY;
            applyImageTransform();
        }
    }
    function onInteractionEnd(e) {
        interactionState.isDragging = false;
        interactionState.isPanning = false;
        imageContainer.classList.remove('grabbing');
    }

    showCropperBtn.addEventListener('click', (e) => { e.preventDefault(); cropperSection.style.display = 'block'; deckListSection.style.display = 'none'; deckEditingArea.style.display = 'block'; });
    showDeckListBtn.addEventListener('click', (e) => { e.preventDefault(); cropperSection.style.display = 'none'; deckListSection.style.display = 'block'; deckEditingArea.style.display = 'block'; });
    handlesContainer.addEventListener('mousedown', onDragStart);
    handlesContainer.addEventListener('touchstart', onDragStart, { passive: false });
    imageContainer.addEventListener('mousedown', onPanStart);
    imageContainer.addEventListener('touchstart', onPanStart, { passive: false });
    window.addEventListener('mousemove', onInteractionMove);
    window.addEventListener('touchmove', onInteractionMove, { passive: false });
    window.addEventListener('mouseup', onInteractionEnd);
    window.addEventListener('touchend', onInteractionEnd);

    const handleZoom = (direction) => {
        if (!imageState.isLoaded) return;
        const scaleAmount = direction === 'in' ? 1.1 : 1 / 1.1;
        imageState.scale *= scaleAmount;
        imageState.scale = Math.max(0.1, imageState.scale);
        applyImageTransform();
    };
    zoomInButton.addEventListener('click', () => handleZoom('in'));
    zoomOutButton.addEventListener('click', () => handleZoom('out'));
    cropperContainer.addEventListener('wheel', (e) => { e.preventDefault(); handleZoom(e.deltaY < 0 ? 'in' : 'out'); });

    manualModeRadio.addEventListener('change', () => {
        if (manualModeRadio.checked) {
            manualGapControls.style.display = 'block';
            cropButton.classList.remove('hidden');
            autoCropButton.classList.add('hidden');
            handlesContainer.style.display = 'block';
            overlayMask.style.display = 'block';
        }
    });
    autoModeRadio.addEventListener('change', () => {
        if (autoModeRadio.checked) {
            manualGapControls.style.display = 'none';
            cropButton.classList.add('hidden');
            autoCropButton.classList.remove('hidden');
            handlesContainer.style.display = 'none';
            overlayMask.style.display = 'none';
        }
    });

    rowsInput.addEventListener('change', () => { if (manualModeRadio.checked) drawGridAndHandles(); });
    colsInput.addEventListener('change', () => { if (manualModeRadio.checked) drawGridAndHandles(); });
    const updateGapDisplayAndDraw = () => {
        gapHValueSpan.textContent = gapState.horizontal;
        gapVValueSpan.textContent = gapState.vertical;
        if (manualModeRadio.checked) drawGridAndHandles();
    };
    gapHDecreaseBtn.addEventListener('click', () => { gapState.horizontal = Math.max(0, gapState.horizontal - 1); updateGapDisplayAndDraw(); });
    gapHIncreaseBtn.addEventListener('click', () => { gapState.horizontal++; updateGapDisplayAndDraw(); });
    gapVDecreaseBtn.addEventListener('click', () => { gapState.vertical = Math.max(0, gapState.vertical - 1); updateGapDisplayAndDraw(); });
    gapVIncreaseBtn.addEventListener('click', () => { gapState.vertical++; updateGapDisplayAndDraw(); });

    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                sourceImage.src = event.target.result;
                sourceImage.onload = () => {
                    imageState.x = 0; y = 0; imageState.scale = 1.0; imageState.isLoaded = true;
                    applyImageTransform();
                    if (manualModeRadio.checked) drawGridAndHandles();
                };
            };
            reader.readAsDataURL(file);
        }
    });

    function addCardsToDeck(imgDataUrls) {
        imgDataUrls.forEach(imgDataUrl => {
            const existingCardIndex = deck.findIndex(card => card.imgDataUrl === imgDataUrl);
            if (existingCardIndex !== -1) deck[existingCardIndex].quantity++;
            else deck.push({ id: generateUniqueId(), imgDataUrl: imgDataUrl, quantity: 1 });
        });
        renderEditedDeck();
    }

    function processCroppedImages(rects) {
        const imgDataUrls = [];
        rects.forEach(rect => {
            if (rect.width <= 0 || rect.height <= 0) return;
            const canvas = document.createElement('canvas');
            canvas.width = rect.width;
            canvas.height = rect.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(sourceImage, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
            imgDataUrls.push(canvas.toDataURL('image/jpeg', 0.9));
        });
        addCardsToDeck(imgDataUrls);
        return imgDataUrls.length;
    }

    cropButton.addEventListener('click', () => {
        if (!imageState.isLoaded) { alert('まず画像を選択してください。'); return; }
        const rows = parseInt(rowsInput.value, 10);
        const cols = parseInt(colsInput.value, 10);
        const gapH = gapState.horizontal;
        const gapV = gapState.vertical;
        const totalCellWidth = gridState.cellWidth + gapH;
        const totalCellHeight = gridState.cellHeight + gapV;
        const cropperRect = cropperContainer.getBoundingClientRect();
        const imageRect = sourceImage.getBoundingClientRect();
        const ratio = sourceImage.naturalWidth / imageRect.width;
        const rects = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const sx = (cropperRect.left + gridState.x + c * totalCellWidth - imageRect.left) * ratio;
                const sy = (cropperRect.top + gridState.y + r * totalCellHeight - imageRect.top) * ratio;
                const sWidth = gridState.cellWidth * ratio;
                const sHeight = gridState.cellHeight * ratio;
                rects.push({ x: sx, y: sy, width: sWidth, height: sHeight });
            }
        }
        const count = processCroppedImages(rects);
        alert(`${count}枚のカードをデッキに追加しました。`);
        deckEditingArea.scrollIntoView({ behavior: 'smooth' });
    });

    async function findCardRects(imageElement, rows, cols, topOffset) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = imageElement.naturalWidth;
            canvas.height = imageElement.naturalHeight;
            ctx.drawImage(imageElement, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const { data, width, height } = imageData;

            const WHITE_THRESHOLD = 240;
            const MIN_CARD_SIZE = 50;

            const isWhite = (x, y) => {
                if (x < 0 || x >= width || y < 0 || y >= height) return true;
                const i = (y * width + x) * 4;
                return data[i] > WHITE_THRESHOLD && data[i + 1] > WHITE_THRESHOLD && data[i + 2] > WHITE_THRESHOLD;
            };

            let contentBox = { top: -1, bottom: -1, left: -1, right: -1 };
            for (let y = topOffset; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (!isWhite(x, y)) {
                        if (contentBox.top === -1) contentBox.top = y;
                        contentBox.bottom = y;
                        if (contentBox.left === -1 || x < contentBox.left) contentBox.left = x;
                        if (contentBox.right === -1 || x > contentBox.right) contentBox.right = x;
                    }
                }
            }

            if (contentBox.top === -1) { resolve([]); return; }

            const foundRects = [];
            const cellWidth = (contentBox.right - contentBox.left) / cols;
            const cellHeight = (contentBox.bottom - contentBox.top) / rows;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const roughRect = {
                        x: Math.floor(contentBox.left + c * cellWidth),
                        y: Math.floor(contentBox.top + r * cellHeight),
                        width: Math.ceil(cellWidth),
                        height: Math.ceil(cellHeight)
                    };

                    const visited = new Uint8Array(roughRect.width * roughRect.height);
                    let largestComponent = null;

                    for (let y = 0; y < roughRect.height; y++) {
                        for (let x = 0; x < roughRect.width; x++) {
                            const visitedIdx = y * roughRect.width + x;
                            if (visited[visitedIdx]) continue;
                            visited[visitedIdx] = 1;

                            const imgX = roughRect.x + x;
                            const imgY = roughRect.y + y;

                            if (!isWhite(imgX, imgY)) {
                                const component = {
                                    pixels: [],
                                    minX: imgX, maxX: imgX, minY: imgY, maxY: imgY
                                };
                                const queue = [[imgX, imgY]];
                                visited[visitedIdx] = 1;

                                while (queue.length > 0) {
                                    const [curX, curY] = queue.shift();
                                    component.pixels.push([curX, curY]);
                                    component.minX = Math.min(component.minX, curX);
                                    component.maxX = Math.max(component.maxX, curX);
                                    component.minY = Math.min(component.minY, curY);
                                    component.maxY = Math.max(component.maxY, curY);

                                    const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                                    for (const [dx, dy] of neighbors) {
                                        const nextX = curX + dx;
                                        const nextY = curY + dy;
                                        const nextVisitedIdx = (nextY - roughRect.y) * roughRect.width + (nextX - roughRect.x);

                                        if (nextX >= roughRect.x && nextX < roughRect.x + roughRect.width &&
                                            nextY >= roughRect.y && nextY < roughRect.y + roughRect.height &&
                                            !visited[nextVisitedIdx] && !isWhite(nextX, nextY)) {
                                            
                                            visited[nextVisitedIdx] = 1;
                                            queue.push([nextX, nextY]);
                                        }
                                    }
                                }
                                if (!largestComponent || component.pixels.length > largestComponent.pixels.length) {
                                    largestComponent = component;
                                }
                            }
                        }
                    }

                    if (largestComponent) {
                        const finalWidth = largestComponent.maxX - largestComponent.minX + 1;
                        const finalHeight = largestComponent.maxY - largestComponent.minY + 1;
                        if (finalWidth > MIN_CARD_SIZE && finalHeight > MIN_CARD_SIZE) {
                            foundRects.push({
                                x: largestComponent.minX,
                                y: largestComponent.minY,
                                width: finalWidth,
                                height: finalHeight
                            });
                        }
                    }
                }
            }
            resolve(foundRects);
        });
    }

    autoCropButton.addEventListener('click', async () => {
        if (!imageState.isLoaded) { alert('まず画像を選択してください。'); return; }
        const rows = parseInt(rowsInput.value, 10);
        const cols = parseInt(colsInput.value, 10);
        const topOffset = parseInt(topOffsetInput.value, 10) || 0;
        if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1) { alert('有効な行数と列数を入力してください。'); return; }

        autoCropButton.textContent = '処理中...';
        autoCropButton.disabled = true;
        try {
            const cropRects = await findCardRects(sourceImage, rows, cols, topOffset);
            if (cropRects.length === 0) {
                alert('カードを検出できませんでした。行数、列数、上部オフセットの値を確認するか、手動モードを試してください。');
                return;
            }
            const count = processCroppedImages(cropRects);
            alert(`${count}枚のカードを検出し、デッキに追加しました。`);
            deckEditingArea.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('自動切り取りでエラーが発生しました:', error);
            alert('エラーが発生しました。開発者コンソールを確認してください。');
        } finally {
            autoCropButton.textContent = '自動検出＆切り取り';
            autoCropButton.disabled = false;
        }
    });

    addCardByNameButton.addEventListener('click', () => {
        const cardName = cardNameInput.value.trim();
        if (cardName === '') { alert('カード名を入力してください。'); return; }
        const imgDataUrl = createCardImageFromText(cardName);
        addCardsToDeck([imgDataUrl]);
        renderEditedDeck();
        cardNameInput.value = '';
    });

    saveDeckAsButton.addEventListener('click', async () => {
        const deckName = deckNameInput.value.trim();
        if (deckName === '') { alert('デッキ名を入力してください。'); return; }
        if (deck.length === 0) { alert('デッキにカードがありません。'); return; }
        try {
            await window.cardGameDB.saveDeck(deckName, deck);
            alert(`デッキ「${deckName}」を保存しました。`);
            deckNameInput.value = '';
            renderDeckList();
            currentEditingDeckName = deckName;
        } catch (error) { console.error('デッキの保存に失敗しました:', error); alert('デッキの保存に失敗しました。'); }
    });

    overwriteSaveButton.addEventListener('click', async () => {
        if (currentEditingDeckName === null) { alert('上書き保存するには、まずデッキを読み込むか、名前を付けて保存してください。'); return; }
        try {
            await window.cardGameDB.saveDeck(currentEditingDeckName, deck);
            alert(`デッキ「${currentEditingDeckName}」を上書き保存しました。`);
            renderDeckList();
        } catch (error) { console.error('デッキの上書き保存に失敗しました:', error); alert('デッキの上書き保存に失敗しました。'); }
    });

    function initialize() {
        cropperSection.style.display = 'none';
        deckListSection.style.display = 'block';
        deckEditingArea.style.display = 'block';
        updateGapDisplayAndDraw();
        drawGridAndHandles();
        renderDeckList();
        renderEditedDeck();
    }

    initialize();
});
