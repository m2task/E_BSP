

// --- ブラシ選択状態 ---
export let selectionActionMode = 'none'; // 'none', 'select', 'moveToCard'
export let isBrushSelecting = false;
export let brushStartPos = { x: 0, y: 0 };
export let brushSelectionRect = null; // { x, y, width, height }

// Setters for brush selection
export function setSelectionActionMode(mode) { selectionActionMode = mode; }
export function setIsBrushSelecting(selecting) { isBrushSelecting = selecting; }
export function setBrushStartPos(pos) { brushStartPos = pos; }
export function setBrushSelectionRect(rect) { brushSelectionRect = rect; }
