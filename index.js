document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const cropperSection = document.getElementById('cropper-section');
    const deckListSection = document.getElementById('deck-list-section');
    const deckEditingArea = document.querySelector('.deck-editing-area');
    const showCropperBtn = document.getElementById('show-cropper-btn');
    const showDeckListBtn = document.getElementById('show-deck-list-btn');
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
    const deckList = document.getElementById('deck-list');
    const totalCardCountSpan = document.getElementById('total-card-count');
    const deckEditorContainer = document.getElementById('deck-editor-container');
    const cardNameInput = document.getElementById('cardNameInput');
    const addCardByNameButton = document.getElementById('addCardByNameButton');
    const deckNameInput = document.getElementById('deckNameInput');
    const saveDeckAsButton = document.getElementById('saveDeckAsButton');
    const overwriteSaveButton = document.getElementById('overwriteSaveButton');
    const manualModeRadio = document.getElementById('manual-mode');
    const autoModeRadio = document.getElementById('auto-mode');
    const manualGapControls = document.getElementById('manual-gap-controls');
    const autoCropButton = document.getElementById('auto-crop-button');

    // --- State ---
    const gridState = { x: 50, y: 50, cellWidth: 80, cellHeight: 110 };
    const gapState = { horizontal: 10, vertical: 20 };
    const imageState = { x: 0, y: 0, scale: 1.0, isLoaded: false };
    const interactionState = { isDragging: false, isPanning: false, target: null, startX: 0, startY: 0, panStartX: 0, panStartY: 0, initialState: {} };
    let deck = [];
    let currentEditingDeckName = null;

    // All other functions (Deck, Cropper, Event Listeners) are omitted for brevity.
    // They are assumed to be the same as the previous correct version.
    // The key changes are in the auto-cropping flow and the removal of debug code.

    // --- Mode Switching & Controls ---
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

    // --- Cropping Logic ---
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

    // --- Auto-cropping V5 (Final) ---
    async function findCardRects(imageElement, rows, cols) {
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
            const HISTOGRAM_THRESHOLD_RATIO = 0.8;

            const isWhite = (x, y) => {
                if (x < 0 || x >= width || y < 0 || y >= height) return true;
                const i = (y * width + x) * 4;
                return data[i] > WHITE_THRESHOLD && data[i + 1] > WHITE_THRESHOLD && data[i + 2] > WHITE_THRESHOLD;
            };

            let contentBox = { top: -1, bottom: -1, left: -1, right: -1 };
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (!isWhite(x, y)) {
                        if (contentBox.top === -1) contentBox.top = y;
                        contentBox.bottom = y;
                        if (contentBox.left === -1 || x < contentBox.left) contentBox.left = x;
                        if (contentBox.right === -1 || x > contentBox.right) contentBox.right = x;
                    }
                }
            }

            if (contentBox.top === -1) {
                resolve([]);
                return;
            }

            const foundRects = [];
            const cellWidth = (contentBox.right - contentBox.left + 1) / cols;
            const cellHeight = (contentBox.bottom - contentBox.top + 1) / rows;

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
                            
                            const imgX = roughRect.x + x;
                            const imgY = roughRect.y + y;

                            if (!isWhite(imgX, imgY)) {
                                const component = {
                                    pixels: [],
                                    minX: imgX, maxX: imgX, minY: imgY, maxY: imgY
                                };
                                const queue = [[imgX, imgY]];
                                visited[y * roughRect.width + x] = 1;

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
                                        
                                        if (nextX >= roughRect.x && nextX < roughRect.x + roughRect.width &&
                                            nextY >= roughRect.y && nextY < roughRect.y + roughRect.height) {
                                            
                                            const nextVisitedIdx = (nextY - roughRect.y) * roughRect.width + (nextX - roughRect.x);
                                            if (!visited[nextVisitedIdx] && !isWhite(nextX, nextY)) {
                                                visited[nextVisitedIdx] = 1;
                                                queue.push([nextX, nextY]);
                                            }
                                        }
                                    }
                                }
                                if (!largestComponent || component.pixels.length > largestComponent.pixels.length) {
                                    largestComponent = component;
                                }
                            }
                            visited[visitedIdx] = 1;
                        }
                    }

                    if (largestComponent) {
                        const xHistogram = {};
                        const yHistogram = {};
                        for (const p of largestComponent.pixels) {
                            xHistogram[p[0]] = (xHistogram[p[0]] || 0) + 1;
                            yHistogram[p[1]] = (yHistogram[p[1]] || 0) + 1;
                        }

                        const xHistValues = Object.values(xHistogram);
                        const yHistValues = Object.values(yHistogram);
                        if (xHistValues.length === 0 || yHistValues.length === 0) continue;

                        const maxXHist = Math.max(...xHistValues);
                        const maxYHist = Math.max(...yHistValues);
                        const xThreshold = maxYHist * HISTOGRAM_THRESHOLD_RATIO;
                        const yThreshold = maxXHist * HISTOGRAM_THRESHOLD_RATIO;

                        const denseXCoords = Object.keys(xHistogram).filter(x => xHistogram[x] >= yThreshold);
                        const denseYCoords = Object.keys(yHistogram).filter(y => yHistogram[y] >= xThreshold);
                        
                        if (denseXCoords.length === 0 || denseYCoords.length === 0) continue;

                        const finalRect = {
                            x: Math.min(...denseXCoords.map(Number)),
                            y: Math.min(...denseYCoords.map(Number)),
                            width: 0,
                            height: 0
                        };
                        finalRect.width = Math.max(...denseXCoords.map(Number)) - finalRect.x + 1;
                        finalRect.height = Math.max(...denseYCoords.map(Number)) - finalRect.y + 1;

                        if (finalRect.width > MIN_CARD_SIZE && finalRect.height > MIN_CARD_SIZE) {
                            foundRects.push(finalRect);
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
        if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1) { alert('有効な行数と列数を入力してください。'); return; }

        autoCropButton.textContent = '処理中...';
        autoCropButton.disabled = true;
        
        try {
            const foundRects = await findCardRects(sourceImage, rows, cols);

            if (foundRects.length === 0) {
                alert('カードを検出できませんでした。行数や列数を確認するか、手動モードを試してください。');
                return;
            }
            const count = processCroppedImages(foundRects);
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

    // All other functions are omitted for brevity but are assumed to be correct.
});


