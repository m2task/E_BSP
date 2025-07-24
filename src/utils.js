// src/utils.js
import { toastTimeout, setToastTimeout } from './game_data.js';
import { hand, field, trash, burst, lifeCores, reserveCores, countCores, trashCores, openArea } from './game_data.js';
import { renderAll } from './ui_render.js'; // renderAllをインポート

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
    if (element && element.classList && element.classList.contains('deck-button')) return 'deck';
    if (id.includes('life')) return 'life';
    if (id.includes('reserve')) return 'reserve';
    if (id.includes('count') || id.includes('deckCore')) return 'count';
    if (id.includes('void')) return 'void';
    if (id.includes('openArea')) return 'openArea';
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

export function showCostPad(cardData, sourceArray, cardIndex, event, callback) {
    const costPad = document.getElementById('costPad');
    costPad.innerHTML = ''; // パッドをクリア

    for (let i = 1; i <= 9; i++) {
        const button = document.createElement('div');
        button.className = 'cost-pad-button';
        button.textContent = i;
        button.onclick = (e) => {
            e.stopPropagation(); // 親要素へのイベント伝播を停止
            costPad.style.display = 'none';
            callback(i);
        };
        costPad.appendChild(button);
    }

    costPad.style.display = 'grid';
    costPad.style.left = `${event.clientX}px`;
    costPad.style.top = `${event.clientY}px`;

    // パッドの外側をクリックしたらコスト0で召喚
    setTimeout(() => {
        const clickOutsideHandler = (e) => {
            if (!costPad.contains(e.target)) {
                costPad.style.display = 'none';
                callback(0); // コスト0でコールバックを実行
                document.removeEventListener('click', clickOutsideHandler);
            }
        };
        document.addEventListener('click', clickOutsideHandler);
    }, 0);
}