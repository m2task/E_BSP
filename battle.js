import { initializeGame } from './js/game-state.js';
import { setupEventListeners } from './js/event-handlers.js';
import { renderAll } from './js/render-utils.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: Initializing game...');
    initializeGame();
    setupEventListeners();
    renderAll(); // 初期描画
    console.log('DOMContentLoaded: Game initialized and rendered.');
});
