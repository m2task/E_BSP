// src/game_data.js
export let deck = [];
export let field = [];
export let hand = [];
export let trash = [];
export let burst = [];

export let lifeCores = ["blue", "blue", "blue", "blue", "blue"];
export let reserveCores = ["blue", "blue", "blue", "soul"];
export let countCores = [];
export let trashCores = [];

export let voidChargeCount = 0;
export let toastTimeout = null;

export let handVisible = true;
export let countShowCountAsNumber = true;
export let cardIdCounter = 0;


export let cardPositions = {}; // { cardId: { left, top } }

// --- コア選択・ドラッグ関連 ---
export let selectedCores = []; // 選択されたコアの情報を保持 { type: 'blue', sourceArrayName: 'lifeCores', index: 0 }
export let draggedCoreData = null; // ドラッグ中のコアデータ（複数選択対応）

// Setters for game data
export function setDeck(newDeck) { deck = newDeck; }
export function setField(newField) { field = newField; }
export function setHand(newHand) { hand = newHand; }
export function setTrash(newTrash) { trash = newTrash; }
export function setBurst(newBurst) { burst = newBurst; }
export function setLifeCores(newLCC) { lifeCores = newLCC; }
export function setReserveCores(newRCC) { reserveCores = newRCC; }
export function setCountCores(newDCC) { countCores = newDCC; }
export function setTrashCores(newTCC) { trashCores = newTCC; }
export function setVoidChargeCount(count) { voidChargeCount = count; }
export function setToastTimeout(timeout) { toastTimeout = timeout; }
export function setHandVisible(visible) { handVisible = visible; }
export function setCountShowCountAsNumber(showAsNumber) { countShowCountAsNumber = showAsNumber; }
export function setCardIdCounter(counter) { cardIdCounter = counter; }

export function setCardPositions(positions) { cardPositions = positions; }
export function setSelectedCores(cores) { selectedCores = cores; }
export function setDraggedCoreData(data) { draggedCoreData = data; }
