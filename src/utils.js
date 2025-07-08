// src/utils.js
import { toastTimeout, setToastTimeout } from './game_data.js';
import { hand, field, trash, burst, lifeCores, reserveCores, countCores, trashCores } from './game_data.js';

export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export function getZoneName(element) {
    const id = element.id;
    if (id.includes('field')) return 'field';
    if (id.includes('hand')) return 'hand';
    if (id.includes('trash')) return 'trash';
    if (id.includes('burst')) return 'burst';
    if (element.classList.contains('deck-button')) return 'deck';
    if (id.includes('life')) return 'life';
    if (id.includes('reserve')) return 'reserve';
    if (id.includes('count') || id.includes('deckCore')) return 'count';
    if (id.includes('void')) return 'void';
    return null;
}

export function getArrayByZoneName(zoneName) {
    switch (zoneName) {
        case 'hand': case 'handZone': return hand;
        case 'field': case 'fieldCards': return field;
        case 'trash': case 'trashZoneFrame': case 'trashModalContent': return trash;
        case 'burst': case 'burstZone': case 'burstCard': return burst;
        case 'life': case 'lifeCores': return lifeCores;
        case 'reserve': case 'reserveCores': return reserveCores;
        case 'count': case 'countZone': return countCores;
        case 'trashcore': case 'trashListArea': return trashCores;
        default: return null;
    }
}

export function showToast(toastId, message, hide = false) {
    const toastElement = document.getElementById(toastId);
    if (!toastElement) return;

    clearTimeout(toastTimeout); // 既存のタイマーをクリア

    if (hide || message === '') {
        toastElement.classList.remove('show');
        toastElement.textContent = '';
    } else {
        toastElement.textContent = message;
        toastElement.classList.add('show');
        setToastTimeout(setTimeout(() => {
            toastElement.classList.remove('show');
            toastElement.textContent = '';
        }, 1000)); // 1秒後に非表示
    }
}

export function isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    // Android, iOS, and Windows Phone detection
    if (/android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent) || /windows phone/i.test(userAgent)) {
        return true;
    }
    // Check for touch support (less reliable for specific device type, but good for touch-enabled devices)
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}
