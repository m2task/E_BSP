document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---

    // Section containers
    const cropperSection = document.getElementById('cropper-section');
    const deckListSection = document.getElementById('deck-list-section');
    const deckEditingArea = document.querySelector('.deck-editing-area');

    // Navbar buttons
    const showCropperBtn = document.getElementById('show-cropper-btn');
    const showDeckListBtn = document.getElementById('show-deck-list-btn');

    // Cropper elements
    const rowsInput = document.getElementById('rows');
    const colsInput = document.getElementById('cols');
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

    // Deck List elements
    const deckList = document.getElementById('deck-list');

    // Deck Editor elements
    const totalCardCountSpan = document.getElementById('total-card-count');
    const deckEditorContainer = document.getElementById('deck-editor-container');
    const cardNameInput = document.getElementById('cardNameInput');
    const addCardByNameButton = document.getElementById('addCardByNameButton');
    const deckNameInput = document.getElementById('deckNameInput');
    const saveDeckAsButton = document.getElementById('saveDeckAsButton');
    const overwriteSaveButton = document.getElementById('overwriteSaveButton');

    // --- State ---

    // Cropper state
    const gridState = { x: 50, y: 50, cellWidth: 80, cellHeight: 110 };
    const gapState = { horizontal: 10, vertical: 20 };
    const imageState = { x: 0, y: 0, scale: 1.0, isLoaded: false, isPanning: false, panStartX: 0, panStartY: 0 };
    const dragState = { isDragging: false, target: null, startX: 0, startY: 0, initialState: {} };

    // Deck editor state
    let deck = []; // The currently edited deck
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
        ctx.fillText(text, width / 2, height / 2);
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
            if (deck[cardIndex].quantity <= 0) {
                deck.splice(cardIndex, 1);
            }
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

                if (c < cols - 1) {
                    const hGap = document.createElement('div');
                    hGap.className = 'gap-visual';
                    hGap.style.left = `${gridState.x + c * totalCellWidth + gridState.cellWidth}px`;
                    hGap.style.top = `${gridState.y + r * totalCellHeight}px`;
                    hGap.style.width = `${gapH}px`;
                    hGap.style.height = `${gridState.cellHeight}px`;
                    handlesContainer.appendChild(hGap);
                }
                if (r < rows - 1) {
                    const vGap = document.createElement('div');
                    vGap.className = 'gap-visual';
                    vGap.style.left = `${gridState.x + c * totalCellWidth}px`;
                    vGap.style.top = `${gridState.y + r * totalCellHeight + gridState.cellHeight}px`;
                    vGap.style.width = `${gridState.cellWidth}px`;
                    vGap.style.height = `${gapV}px`;
                    handlesContainer.appendChild(vGap);
                }
                if (c < cols - 1 && r < rows - 1) {
                    const cornerGap = document.createElement('div');
                    cornerGap.className = 'gap-visual';
                    cornerGap.style.left = `${gridState.x + c * totalCellWidth + gridState.cellWidth}px`;
                    cornerGap.style.top = `${gridState.y + r * totalCellHeight + gridState.cellHeight}px`;
                    cornerGap.style.width = `${gapH}px`;
                    cornerGap.style.height = `${gapV}px`;
                    handlesContainer.appendChild(cornerGap);
                }
            }
        }

        const moveHandle = document.createElement('div');
        moveHandle.className = 'handle move-handle';
        moveHandle.dataset.target = 'move';
        moveHandle.style.left = `${gridState.x}px`;
        moveHandle.style.top = `${gridState.y}px`;
        moveHandle.style.width = `${gridState.cellWidth}px`;
        moveHandle.style.height = `${gridState.cellHeight}px`;
        handlesContainer.appendChild(moveHandle);

        const resizeVHandle = document.createElement('div');
        resizeVHandle.className = 'handle resize-handle-v';
        resizeVHandle.dataset.target = 'resize-v';
        resizeVHandle.style.left = `${gridState.x + gridState.cellWidth}px`;
        resizeVHandle.style.top = `${gridState.y}px`;
        resizeVHandle.style.width = `10px`;
        resizeVHandle.style.height = `${gridState.cellHeight}px`;
        handlesContainer.appendChild(resizeVHandle);

        const resizeHHandle = document.createElement('div');
        resizeHHandle.className = 'handle resize-handle-h';
        resizeHHandle.dataset.target = 'resize-h';
        resizeHHandle.style.left = `${gridState.x}px`;
        resizeHHandle.style.top = `${gridState.y + gridState.cellHeight}px`;
        resizeHHandle.style.width = `${gridState.cellWidth}px`;
        resizeHHandle.style.height = `10px`;
        handlesContainer.appendChild(resizeHHandle);

        const maskTop = document.createElement('div');
        maskTop.className = 'mask-pane';
        maskTop.style.height = `${gridState.y}px`;
        overlayMask.appendChild(maskTop);

        const maskBottom = document.createElement('div');
        maskBottom.className = 'mask-pane';
        maskBottom.style.top = `${gridState.y + totalGridDisplayHeight}px`;
        maskBottom.style.height = `${cropperContainer.clientHeight - (gridState.y + totalGridDisplayHeight)}px`;
        overlayMask.appendChild(maskBottom);

        const maskLeft = document.createElement('div');
        maskLeft.className = 'mask-pane';
        maskLeft.style.top = `${gridState.y}px`;
        maskLeft.style.width = `${gridState.x}px`;
        maskLeft.style.height = `${totalGridDisplayHeight}px`;
        overlayMask.appendChild(maskLeft);

        const maskRight = document.createElement('div');
        maskRight.className = 'mask-pane';
        maskRight.style.top = `${gridState.y}px`;
        maskRight.style.left = `${gridState.x + totalGridDisplayWidth}px`;
        maskRight.style.width = `${cropperContainer.clientWidth - (gridState.x + totalGridDisplayWidth)}px`;
        maskRight.style.height = `${totalGridDisplayHeight}px`;
        overlayMask.appendChild(maskRight);
    }

    function applyImageTransform() {
        sourceImage.style.transform = `translate(${imageState.x}px, ${imageState.y}px) scale(${imageState.scale})`;
    }

    // --- Event Listeners ---

    // Section visibility
    showCropperBtn.addEventListener('click', (e) => {
        e.preventDefault();
        cropperSection.style.display = 'block';
        deckListSection.style.display = 'none';
        deckEditingArea.style.display = 'block'; // Keep editor visible
    });

    showDeckListBtn.addEventListener('click', (e) => {
        e.preventDefault();
        cropperSection.style.display = 'none';
        deckListSection.style.display = 'block';
        deckEditingArea.style.display = 'block'; // Keep editor visible
    });

    // Cropper listeners
    handlesContainer.addEventListener('mousedown', (e) => {
        if (!e.target.classList.contains('handle')) return;
        e.preventDefault();
        dragState.isDragging = true;
        dragState.target = e.target.dataset.target;
        dragState.startX = e.clientX;
        dragState.startY = e.clientY;
        dragState.initialState = { ...gridState };
    });

    window.addEventListener('mousemove', (e) => {
        if (dragState.isDragging) {
            e.preventDefault();
            const dx = e.clientX - dragState.startX;
            const dy = e.clientY - dragState.startY;
            if (dragState.target === 'move') {
                gridState.x = dragState.initialState.x + dx;
                gridState.y = dragState.initialState.y + dy;
            } else if (dragState.target === 'resize-v') {
                gridState.cellWidth = Math.max(10, dragState.initialState.cellWidth + dx);
            } else if (dragState.target === 'resize-h') {
                gridState.cellHeight = Math.max(10, dragState.initialState.cellHeight + dy);
            }
            drawGridAndHandles();
        }
        if (imageState.isPanning) {
            imageState.x = e.clientX - imageState.panStartX;
            imageState.y = e.clientY - imageState.panStartY;
            applyImageTransform();
        }
    });

    window.addEventListener('mouseup', () => {
        dragState.isDragging = false;
        imageState.isPanning = false;
        imageContainer.classList.remove('grabbing');
    });

    imageContainer.addEventListener('mousedown', (e) => {
        imageState.isPanning = true;
        imageState.panStartX = e.clientX - imageState.x;
        imageState.panStartY = e.clientY - imageState.y;
        imageContainer.classList.add('grabbing');
    });

    const handleZoom = (direction) => {
        if (!imageState.isLoaded) return;
        const scaleAmount = 0.02;
        imageState.scale += (direction === 'in' ? scaleAmount : -scaleAmount);
        imageState.scale = Math.max(0.1, imageState.scale);
        applyImageTransform();
    };

    zoomInButton.addEventListener('click', () => handleZoom('in'));
    zoomOutButton.addEventListener('click', () => handleZoom('out'));
    cropperContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        handleZoom(e.deltaY < 0 ? 'in' : 'out');
    });

    rowsInput.addEventListener('change', drawGridAndHandles);
    colsInput.addEventListener('change', drawGridAndHandles);

    const updateGapDisplayAndDraw = () => {
        gapHValueSpan.textContent = gapState.horizontal;
        gapVValueSpan.textContent = gapState.vertical;
        drawGridAndHandles();
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
                    imageState.isLoaded = true;
                    drawGridAndHandles();
                };
            };
            reader.readAsDataURL(file);
        }
    });

    cropButton.addEventListener('click', () => {
        if (!imageState.isLoaded) {
            alert('まず画像を選択してください。');
            return;
        }
        const rows = parseInt(rowsInput.value, 10);
        const cols = parseInt(colsInput.value, 10);
        const gapH = gapState.horizontal;
        const gapV = gapState.vertical;
        const totalCellWidth = gridState.cellWidth + gapH;
        const totalCellHeight = gridState.cellHeight + gapV;
        const cropperRect = cropperContainer.getBoundingClientRect();
        const imageRect = sourceImage.getBoundingClientRect();
        const ratio = sourceImage.naturalWidth / imageRect.width;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const sx = (cropperRect.left + gridState.x + c * totalCellWidth - imageRect.left) * ratio;
                const sy = (cropperRect.top + gridState.y + r * totalCellHeight - imageRect.top) * ratio;
                const sWidth = gridState.cellWidth * ratio;
                const sHeight = gridState.cellHeight * ratio;

                if (sWidth <= 0 || sHeight <= 0) continue;

                const canvas = document.createElement('canvas');
                canvas.width = sWidth;
                canvas.height = sHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(sourceImage, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
                const imgDataUrl = canvas.toDataURL('image/jpeg', 0.9);

                const existingCardIndex = deck.findIndex(card => card.imgDataUrl === imgDataUrl);
                if (existingCardIndex !== -1) {
                    deck[existingCardIndex].quantity++;
                } else {
                    deck.push({ id: generateUniqueId(), imgDataUrl: imgDataUrl, quantity: 1 });
                }
            }
        }
        renderEditedDeck(); // Use the unified render function
        alert(`${rows * cols}枚のカードをデッキに追加しました。`);
        deckEditingArea.scrollIntoView({ behavior: 'smooth' });
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
        const deckName = deckNameInput.value.trim();
        if (deckName === '') {
            alert('デッキ名を入力してください。');
            return;
        }
        if (deck.length === 0) {
            alert('デッキにカードがありません。');
            return;
        }
        try {
            await window.cardGameDB.saveDeck(deckName, deck);
            alert(`デッキ「${deckName}」を保存しました。`);
            deckNameInput.value = '';
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
        cropperSection.style.display = 'none'; // Hide cropper by default
        deckListSection.style.display = 'block'; // Show deck list by default
        deckEditingArea.style.display = 'block';

        updateGapDisplayAndDraw();
        drawGridAndHandles();
        renderDeckList();
        renderEditedDeck();
    }

    initialize();
});
