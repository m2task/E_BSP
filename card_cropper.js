document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const rowsInput = document.getElementById('rows');
    const colsInput = document.getElementById('cols');
    const imageLoader = document.getElementById('imageLoader');
    const cropButton = document.getElementById('crop-button');
    const zoomOutButton = document.getElementById('zoom-out-button');
    const zoomInButton = document.getElementById('zoom-in-button');

    // Gap adjustment buttons and displays
    const gapHDecreaseBtn = document.getElementById('gapH-decrease');
    const gapHIncreaseBtn = document.getElementById('gapH-increase');
    const gapHValueSpan = document.getElementById('gapH-value');
    const gapVDecreaseBtn = document.getElementById('gapV-decrease');
    const gapVIncreaseBtn = document.getElementById('gapV-increase');
    const gapVValueSpan = document.getElementById('gapV-value');

    const gridControls = document.getElementById('grid-controls');
    const gapControls = document.getElementById('gap-controls');
    const actionButtons = document.getElementById('action-buttons');

    const cropperContainer = document.getElementById('cropper-container');
    const imageContainer = document.getElementById('image-container');
    const sourceImage = document.getElementById('sourceImage');
    const handlesContainer = document.getElementById('grid-handles-container');
    const overlayMask = document.getElementById('overlay-mask');
    const deckEditorContainer = document.getElementById('deck-editor-container'); // Renamed
    const deckHeaderControls = document.querySelector('.deck-header-controls');

    // New: Elements for adding card by name
    const cardNameInput = document.getElementById('cardNameInput');
    const addCardByNameButton = document.getElementById('addCardByNameButton');
    const addCardByNameControls = document.querySelector('.add-card-by-name-controls');

    // New: Elements for saving/loading deck by name
    const deckNameInput = document.getElementById('deckNameInput');
    const saveDeckAsButton = document.getElementById('saveDeckAsButton');
    const saveLoadDeckControls = document.querySelector('.save-load-deck-controls');

    // --- State ---
    const gridState = {
        x: 50,          // Grid top-left X on screen
        y: 50,          // Grid top-left Y on screen
        cellWidth: 80,  // Width of one cell
        cellHeight: 110, // Height of one cell
    };

    const gapState = {
        horizontal: 10,
        vertical: 20,
    };

    const imageState = {
        x: 0,
        y: 0,
        scale: 1.0,
        isLoaded: false,
        isPanning: false,
        panStartX: 0,
        panStartY: 0,
    };

    const dragState = {
        isDragging: false,
        target: null, // 'move', 'resize-v', 'resize-h'
        startX: 0,
        startY: 0,
        initialState: {},
    };

    let deck = []; // New: Array to store cropped cards for the deck

    // --- Functions ---

    // New: Generates a simple unique ID for cards
    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    // New: Creates a card image (data URL) from text
    function createCardImageFromText(text, width = 80, height = 110) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        // Draw text
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial'; // Adjust font size and family as needed
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2); // Center text

        return canvas.toDataURL('image/png'); // PNGに変更
    }

    // New: Renders the deck in the deckEditorContainer
    function renderDeck() {
        deckEditorContainer.innerHTML = '';
        if (deck.length === 0) {
            deckEditorContainer.innerHTML = '<p style="color: #666;">ここに切り取ったカードが表示されます。</p>';
            document.getElementById('total-card-count').textContent = '0';
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
            img.alt = `Card ${card.id}`;

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
        document.getElementById('total-card-count').textContent = totalCardCount.toString();
    }

    // New: Handles decreasing card quantity
    function handleDecreaseQuantity(id) {
        const cardIndex = deck.findIndex(card => card.id === id);
        if (cardIndex !== -1) {
            deck[cardIndex].quantity--;
            if (deck[cardIndex].quantity <= 0) {
                deck.splice(cardIndex, 1); // Remove if quantity is 0 or less
            }
            renderDeck();
        }
    }

    // New: Handles increasing card quantity
    function handleIncreaseQuantity(id) {
        const cardIndex = deck.findIndex(card => card.id === id);
        if (cardIndex !== -1) {
            deck[cardIndex].quantity++;
            renderDeck();
        }
    }

    // New: Handles deleting a card
    function handleDeleteCard(id) {
        deck = deck.filter(card => card.id !== id);
        renderDeck();
    }

    function drawGridAndHandles() {
        handlesContainer.innerHTML = ''; // Clear previous handles and lines
        overlayMask.innerHTML = ''; // Clear previous mask panes
        if (!imageState.isLoaded) return;

        const rows = parseInt(rowsInput.value, 10);
        const cols = parseInt(colsInput.value, 10);
        const gapH = gapState.horizontal;
        const gapV = gapState.vertical;

        const totalCellWidth = gridState.cellWidth + gapH;
        const totalCellHeight = gridState.cellHeight + gapV;

        // Calculate total grid display dimensions
        const totalGridDisplayWidth = (gridState.cellWidth * cols) + (gapH * (cols - 1));
        const totalGridDisplayHeight = (gridState.cellHeight * rows) + (gapV * (rows - 1));

        // --- Draw Transparent Cells (the red frames) and Grey Gaps ---
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Draw the transparent cell (red frame)
                const cell = document.createElement('div');
                cell.className = 'grid-cell-visual';
                cell.style.left = `${gridState.x + c * totalCellWidth}px`;
                cell.style.top = `${gridState.y + r * totalCellHeight}px`;
                cell.style.width = `${gridState.cellWidth}px`;
                cell.style.height = `${gridState.cellHeight}px`;
                cell.style.border = 'none'; // Changed to none
                cell.style.boxSizing = 'border-box';
                cell.style.backgroundColor = 'transparent'; // Ensure transparent
                handlesContainer.appendChild(cell);

                // Draw horizontal gap to the right of the cell (if not last column)
                if (c < cols - 1) {
                    const hGap = document.createElement('div');
                    hGap.className = 'gap-visual'; // New class for gap visuals
                    hGap.style.left = `${gridState.x + c * totalCellWidth + gridState.cellWidth}px`;
                    hGap.style.top = `${gridState.y + r * totalCellHeight}px`;
                    hGap.style.width = `${gapH}px`;
                    hGap.style.height = `${gridState.cellHeight}px`;
                    hGap.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    handlesContainer.appendChild(hGap);
                }

                // Draw vertical gap below the cell (if not last row)
                if (r < rows - 1) {
                    const vGap = document.createElement('div');
                    vGap.className = 'gap-visual'; // New class for gap visuals
                    vGap.style.left = `${gridState.x + c * totalCellWidth}px`;
                    vGap.style.top = `${gridState.y + r * totalCellHeight + gridState.cellHeight}px`;
                    vGap.style.width = `${gridState.cellWidth}px`;
                    vGap.style.height = `${gapV}px`;
                    vGap.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    handlesContainer.appendChild(vGap);
                }

                // Draw the intersection gap (bottom-right of cell, if not last row or column)
                if (c < cols - 1 && r < rows - 1) {
                    const cornerGap = document.createElement('div');
                    cornerGap.className = 'gap-visual';
                    cornerGap.style.left = `${gridState.x + c * totalCellWidth + gridState.cellWidth}px`;
                    cornerGap.style.top = `${gridState.y + r * totalCellHeight + gridState.cellHeight}px`;
                    cornerGap.style.width = `${gapH}px`;
                    cornerGap.style.height = `${gapV}px`;
                    cornerGap.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    handlesContainer.appendChild(cornerGap);
                }
            }
        }

        // Create handles for the prototype cell (top-left)
        // These handles need to be appended to handlesContainer, not gridBackgroundMask
        // Their positions will be absolute relative to cropperContainer
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
        resizeVHandle.style.left = `${gridState.x + gridState.cellWidth}px`; // moveHandleの右端に合わせる
        resizeVHandle.style.top = `${gridState.y}px`;
        resizeVHandle.style.width = `10px`; // 幅を細く
        resizeVHandle.style.height = `${gridState.cellHeight}px`;
        resizeVHandle.style.backgroundColor = `pink`; // ピンクに
        resizeVHandle.style.zIndex = `11`; // moveHandleよりさらに手前に
        handlesContainer.appendChild(resizeVHandle);

        const resizeHHandle = document.createElement('div');
        resizeHHandle.className = 'handle resize-handle-h';
        resizeHHandle.dataset.target = 'resize-h';
        resizeHHandle.style.left = `${gridState.x}px`;
        resizeHHandle.style.top = `${gridState.y + gridState.cellHeight}px`; // moveHandleの下端に合わせる
        resizeHHandle.style.width = `${gridState.cellWidth}px`;
        resizeHHandle.style.height = `10px`; // 高さを細く
        resizeHHandle.style.backgroundColor = `pink`; // ピンクに
        resizeHHandle.style.zIndex = `11`; // moveHandleよりさらに手前に
        handlesContainer.appendChild(resizeHHandle);

        // --- Draw Outer Overlay Mask ---
        // Top mask
        const maskTop = document.createElement('div');
        maskTop.className = 'mask-pane';
        maskTop.style.top = '0';
        maskTop.style.left = '0';
        maskTop.style.width = '100%';
        maskTop.style.height = `${gridState.y}px`;
        overlayMask.appendChild(maskTop);

        // Bottom mask
        const maskBottom = document.createElement('div');
        maskBottom.className = 'mask-pane';
        maskBottom.style.top = `${gridState.y + totalGridDisplayHeight}px`;
        maskBottom.style.left = '0';
        maskBottom.style.width = '100%';
        maskBottom.style.height = `${cropperContainer.clientHeight - (gridState.y + totalGridDisplayHeight)}px`;
        overlayMask.appendChild(maskBottom);

        // Left mask
        const maskLeft = document.createElement('div');
        maskLeft.className = 'mask-pane';
        maskLeft.style.top = `${gridState.y}px`;
        maskLeft.style.left = '0';
        maskLeft.style.width = `${gridState.x}px`;
        maskLeft.style.height = `${totalGridDisplayHeight}px`;
        overlayMask.appendChild(maskLeft);

        // Right mask
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

    // Grid Manipulation
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
        if (!dragState.isDragging) return;
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
    });

    window.addEventListener('mouseup', () => {
        dragState.isDragging = false;
    });

    // Image Panning
    imageContainer.addEventListener('mousedown', (e) => {
        imageState.isPanning = true;
        imageState.panStartX = e.clientX - imageState.x;
        imageState.panStartY = e.clientY - imageState.y;
        imageContainer.classList.add('grabbing');
    });

    window.addEventListener('mousemove', (e) => {
        if (!imageState.isPanning) return;
        imageState.x = e.clientX - imageState.panStartX;
        imageState.y = e.clientY - imageState.panStartY;
        applyImageTransform();
    });

    imageContainer.addEventListener('mouseup', () => {
        imageState.isPanning = false;
        imageContainer.classList.remove('grabbing');
    });

    // Image Zooming
    const handleZoom = (direction) => {
        if (!imageState.isLoaded) return;
        const scaleAmount = 0.02;
        if (direction === 'in') {
            imageState.scale += scaleAmount;
        } else {
            imageState.scale = Math.max(0.1, imageState.scale - scaleAmount);
        }
        applyImageTransform();
    };

    zoomInButton.addEventListener('click', () => handleZoom('in'));
    zoomOutButton.addEventListener('click', () => handleZoom('out'));
    cropperContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        handleZoom(e.deltaY < 0 ? 'in' : 'out');
    });

    // General Controls
    rowsInput.addEventListener('change', drawGridAndHandles);
    colsInput.addEventListener('change', drawGridAndHandles);

    // New gap control listeners
    const updateGapDisplayAndDraw = () => {
        gapHValueSpan.textContent = gapState.horizontal;
        gapVValueSpan.textContent = gapState.vertical;
        drawGridAndHandles();
    };

    gapHDecreaseBtn.addEventListener('click', () => {
        gapState.horizontal = Math.max(0, gapState.horizontal - 1);
        updateGapDisplayAndDraw();
    });

    gapHIncreaseBtn.addEventListener('click', () => {
        gapState.horizontal++;
        updateGapDisplayAndDraw();
    });

    gapVDecreaseBtn.addEventListener('click', () => { // '↑' button
        gapState.vertical = Math.max(0, gapState.vertical - 1);
        updateGapDisplayAndDraw();
    });

    gapVIncreaseBtn.addEventListener('click', () => { // '↓' button
        gapState.vertical++;
        updateGapDisplayAndDraw();
    });


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
        deckEditorContainer.innerHTML = ''; // Changed from resultsContainer
        const rows = parseInt(rowsInput.value, 10);
        const cols = parseInt(colsInput.value, 10);
        const gapH = gapState.horizontal;
        const gapV = gapState.vertical;

        const totalCellWidth = gridState.cellWidth + gapH;
        const totalCellHeight = gridState.cellHeight + gapV;

        const cropperRect = cropperContainer.getBoundingClientRect();
        const imageRect = sourceImage.getBoundingClientRect();
        const naturalWidth = sourceImage.naturalWidth;
        const ratio = naturalWidth / imageRect.width;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cellAbsoluteX = cropperRect.left + gridState.x + c * totalCellWidth;
                const cellAbsoluteY = cropperRect.top + gridState.y + r * totalCellHeight;

                const imageAbsoluteX = imageRect.left;
                const imageAbsoluteY = imageRect.top;

                const deltaX = cellAbsoluteX - imageAbsoluteX;
                const deltaY = cellAbsoluteY - imageAbsoluteY;

                const sx = deltaX * ratio;
                const sy = deltaY * ratio;
                const sWidth = gridState.cellWidth * ratio;
                const sHeight = gridState.cellHeight * ratio;

                if (sWidth <= 0 || sHeight <= 0) continue;

                const canvas = document.createElement('canvas');
                canvas.width = sWidth;
                canvas.height = sHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(sourceImage, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
                const imgDataUrl = canvas.toDataURL('image/jpeg', 0.8); // PNGからJPEGに変更し圧縮

                // New: Add to deck logic
                const existingCardIndex = deck.findIndex(card => card.imgDataUrl === imgDataUrl);
                if (existingCardIndex !== -1) {
                    deck[existingCardIndex].quantity++;
                } else {
                    deck.push({
                        id: generateUniqueId(),
                        imgDataUrl: imgDataUrl,
                        quantity: 1,
                    });
                }
            }
        }
        renderDeck(); // Render the updated deck

        // 切り取り実行後、切り取り部分と関連コントロールを隠して編集エリアを表示
        cropperContainer.classList.add('hidden');
        gridControls.classList.add('hidden');
        gapControls.classList.add('hidden');
        actionButtons.classList.add('hidden');
        deckEditorContainer.classList.remove('hidden');
        deckHeaderControls.classList.remove('hidden');
        saveLoadDeckControls.classList.remove('hidden');
    });

    // Initial Draw
    drawGridAndHandles();
    renderDeck(); // New: Initial render of the empty deck

    // New: Add card by name
    addCardByNameButton.addEventListener('click', () => {
        const cardName = cardNameInput.value.trim();
        if (cardName === '') {
            alert('カード名を入力してください。');
            return;
        }

        const imgDataUrl = createCardImageFromText(cardName);

        // Check if card with this name already exists (using imgDataUrl as unique identifier for generated cards)
        const existingCardIndex = deck.findIndex(card => card.imgDataUrl === imgDataUrl);

        if (existingCardIndex !== -1) {
            deck[existingCardIndex].quantity++;
        } else {
            deck.push({
                id: generateUniqueId(),
                imgDataUrl: imgDataUrl,
                quantity: 1,
                name: cardName // Store the name for potential future use
            });
        }

        renderDeck();
        cardNameInput.value = ''; // Clear input field
    });

    // New: Save deck with a given name
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
            deckNameInput.value = ''; // Clear input field
        } catch (error) {
            console.error('デッキの保存に失敗しました:', error);
            alert('デッキの保存に失敗しました。');
        }
    });
});
