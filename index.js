document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const cropperSection = document.getElementById('cropper-section');
    const deckListSection = document.getElementById('deck-list-section');
    const deckEditingArea = document.querySelector('.deck-editing-area');
    const showCropperBtn = document.getElementById('show-cropper-btn');
    const showDeckListBtn = document.getElementById('show-deck-list-btn');
    const rowsInput = document.getElementById('rows');
    const colsInput = document.getElementById('cols');
    const topOffsetInput = document.getElementById('top-offset');
    const debugModeCheckbox = document.getElementById('debug-mode');
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
    const debugCanvas = document.getElementById('debug-canvas');
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

    // --- Functions (Deck, Cropper, Event Listeners) are omitted for brevity ---
    // They are assumed to be the same as the previous version.
    // Only the changed/new functions are shown below.

    // --- Debugging ---
    function clearDebugCanvas() {
        const ctx = debugCanvas.getContext('2d');
        ctx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
    }

    function drawDebugInfo({ contentBox, roughRects, componentRects, foundRects }) {
        const imageRect = sourceImage.getBoundingClientRect();
        const containerRect = cropperContainer.getBoundingClientRect();
        
        const scaleX = imageRect.width / sourceImage.naturalWidth;
        const scaleY = imageRect.height / sourceImage.naturalHeight;

        debugCanvas.width = containerRect.width;
        debugCanvas.height = containerRect.height;
        
        const ctx = debugCanvas.getContext('2d');
        clearDebugCanvas();

        ctx.save();
        // Align debug canvas with the visible part of the image
        ctx.translate(imageRect.left - containerRect.left, imageRect.top - containerRect.top);

        ctx.lineWidth = 2;

        // Draw contentBox (Blue)
        if (contentBox) {
            ctx.strokeStyle = 'blue';
            ctx.strokeRect(contentBox.left * scaleX, contentBox.top * scaleY, (contentBox.right - contentBox.left) * scaleX, (contentBox.bottom - contentBox.top) * scaleY);
        }
        // Draw roughRects (Green)
        if (roughRects) {
            ctx.strokeStyle = 'green';
            roughRects.forEach(rect => {
                ctx.strokeRect(rect.x * scaleX, rect.y * scaleY, rect.width * scaleX, rect.height * scaleY);
            });
        }
        // Draw componentRects (Red) - Bounding box of largest component
        if (componentRects) {
            ctx.strokeStyle = 'red';
            componentRects.forEach(rect => {
                ctx.strokeRect(rect.x * scaleX, rect.y * scaleY, rect.width * scaleX, rect.height * scaleY);
            });
        }
        // Draw foundRects (Yellow) - Final estimation from histogram
        if (foundRects) {
            ctx.strokeStyle = 'yellow';
            foundRects.forEach(rect => {
                ctx.strokeRect(rect.x * scaleX, rect.y * scaleY, rect.width * scaleX, rect.height * scaleY);
            });
        }
        ctx.restore();
    }

    // --- Auto-cropping V4 (with Histogram Analysis) ---
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
            const HISTOGRAM_THRESHOLD_RATIO = 0.8; // 80% of max density is considered part of the card body

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

            if (contentBox.top === -1) {
                resolve({ foundRects: [], debugInfo: {} });
                return;
            }

            const foundRects = [];
            const roughRects = [];
            const componentRects = []; // For debugging the largest component box
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
                    roughRects.push(roughRect);

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
                        const componentRect = {
                            x: largestComponent.minX, y: largestComponent.minY,
                            width: largestComponent.maxX - largestComponent.minX + 1,
                            height: largestComponent.maxY - largestComponent.minY + 1
                        };
                        componentRects.push(componentRect);

                        // --- Histogram Analysis ---
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
                        const xThreshold = maxXHist * HISTOGRAM_THRESHOLD_RATIO;
                        const yThreshold = maxYHist * HISTOGRAM_THRESHOLD_RATIO;

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
            resolve({ foundRects, debugInfo: { contentBox, roughRects, componentRects } });
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
            const { foundRects, debugInfo } = await findCardRects(sourceImage, rows, cols, topOffset);

            if (debugModeCheckbox.checked) {
                drawDebugInfo({ ...debugInfo, foundRects, componentRects: debugInfo.componentRects });
                alert('デバッグ情報を表示しました。\n青:コンテンツ範囲, 緑:グリッド, 赤:塊の範囲, 黄:最終結果');
            } else {
                clearDebugCanvas();
                if (foundRects.length === 0) {
                    alert('カードを検出できませんでした。行数、列数、上部オフセットの値を確認するか、デバッグモードで確認してください。');
                    return;
                }
                // Re-run findCardRects without debug info to get the final rects for processing
                const { foundRects: finalRects } = await findCardRects(sourceImage, rows, cols, topOffset);
                const count = processCroppedImages(finalRects);
                alert(`${count}枚のカードを検出し、デッキに追加しました。`);
                deckEditingArea.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('自動切り取りでエラーが発生しました:', error);
            alert('エラーが発生しました。開発者コンソールを確認してください。');
        } finally {
            autoCropButton.textContent = '自動検出＆切り取り';
            autoCropButton.disabled = false;
        }
    });

    // The rest of the functions (event listeners, initial setup, etc.) are omitted for brevity.
    // They are assumed to be present and correct from the previous version.
});

