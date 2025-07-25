// src/utils.js
import { toastTimeout, setToastTimeout } from './game_data.js';
import { hand, field, trash, burst, lifeCores, reserveCores, countCores, trashCores, openArea } from './game_data.js';

export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export function getZoneName(element) {
    if (!element) return null;
    const id = element.id;
    if (id.includes('field')) return 'field';
    if (id.includes('hand')) return 'hand';
    if (id.includes('trash')) return 'trash';
    if (id.includes('burst')) return 'burst';
    if (element.classList && element.classList.contains('deck-button')) return 'deck';
    if (id.includes('life')) return 'life';
    if (id.includes('reserve')) return 'reserve';
    if (id.includes('count') || id.includes('deckCore')) return 'count';
    if (id.includes('void')) return 'void';
    if (id.includes('openArea')) return 'openArea';

    // 親要素をたどってゾーン名を探す
    let parent = element.parentElement;
    while (parent) {
        const parentId = parent.id;
        if (parentId.includes('openArea')) return 'openArea';
        parent = parent.parentElement;
    }

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
        case 'openArea': return openArea;
        default: return null;
    }
}

export function showToast(toastId, message, hide = false) {
    console.log(`showToast called: ID=${toastId}, Message=${message}, Hide=${hide}`);
    const toastElement = document.getElementById(toastId);
    if (!toastElement) {
        console.error(`Toast element with ID '${toastId}' not found.`);
        return;
    }

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

// モバイルデバイスかどうかを判定する関数
export function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
}
