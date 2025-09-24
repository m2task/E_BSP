// src/game_data.js
export let deck = [];
export let field = [];
export let hand = [];
export let trash = [];
export let burst = [];
export let openArea = [];

export let lifeCores = []; // 初期値を空の配列に変更
export let reserveCores = []; // 初期値を空の配列に変更
export let countCores = []; // 初期値を空の配列に変更
export let trashCores = []; // 初期値を空の配列に変更

export let voidChargeCount = 0;
export let toastTimeout = null;

export let handVisible = true;
export let handPinned = false;
export let countShowCountAsNumber = true;
export let cardIdCounter = 0;
export let coreIdCounter = 0; // coreIdCounter を追加



// --- ドラッグ情報とカード位置 ---
export let draggedElement = null;
export let offsetX = 0;
export let offsetY = 0;
export let cardPositions = {}; // { cardId: { left, top } }

// --- コア選択・ドラッグ関連 ---
export let selectedCores = []; // 選択されたコアの情報を保持 { type: 'blue', sourceArrayName: 'lifeCores', index: 0 }
export let draggedCoreData = null; // ドラッグ中のコアデータ（複数選択対応）

// --- タッチドラッグ関連 ---
export let touchDraggedElement = null; // タッチでドラッグ中の要素のクローン
export let initialTouchX = 0;
export let initialTouchY = 0;
export let currentTouchX = 0;
export let currentTouchY = 0;
export let touchOffsetX = 0;
export let touchOffsetY = 0;
export let isDragging = false; // ドラッグ中かどうかを示すフラグ

export const discardState = { counter: 0, names: [], timer: null };

// Setters for game data
export function setDeck(newDeck) { deck = newDeck; }
export function setField(newField) { field = newField; }
export function setHand(newHand) { hand = newHand; }
export function setTrash(newTrash) { trash = newTrash; }
export function setBurst(newBurst) { burst = newBurst; }
export function setOpenArea(newOpenArea) { openArea = newOpenArea; }
export function setLifeCores(newLCC) { lifeCores = newLCC; }
export function setReserveCores(newRCC) { reserveCores = newRCC; }
export function setCountCores(newDCC) { countCores = newDCC; }
export function setTrashCores(newTCC) { trashCores = newTCC; }
export function setVoidChargeCount(count) { voidChargeCount = count; }
export function setToastTimeout(timeout) { toastTimeout = timeout; }
export function setHandVisible(visible) { handVisible = visible; }
export function setHandPinned(pinned) { handPinned = pinned; }
export function setCountShowCountAsNumber(showAsNumber) { countShowCountAsNumber = showAsNumber; }
export function setCardIdCounter(counter) { cardIdCounter = counter; }
export function setCoreIdCounter(counter) { coreIdCounter = counter; } // setCoreIdCounter を追加
export function setDraggedElement(element) { draggedElement = element; }
export function setOffsetX(x) { offsetX = x; }
export function setOffsetY(y) { offsetY = y; }
export function setCardPositions(positions) { cardPositions = positions; }
export function setSelectedCores(cores) { selectedCores = cores; }
export function setDraggedCoreData(data) { draggedCoreData = data; }
export function setDiscardCounter(count) { discardState.counter = count; }
export function setDiscardedCardNames(names) { discardState.names = names; }
export function setDiscardToastTimer(timer) { discardState.timer = timer; }

// Setters for touch drag data
export function setTouchDraggedElement(element) { touchDraggedElement = element; }
export function setInitialTouchX(x) { initialTouchX = x; }
export function setInitialTouchY(y) { initialTouchY = y; }
export function setCurrentTouchX(x) { currentTouchX = x; }
export function setCurrentTouchY(y) { currentTouchY = y; }
export function setTouchOffsetX(x) { touchOffsetX = x; }
export function setTouchOffsetY(y) { touchOffsetY = y; }
export function setIsDragging(dragging) { isDragging = dragging; }