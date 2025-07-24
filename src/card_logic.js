// src/card_logic.js
import { deck, hand, field, trash, burst, reserveCores, discardState, openArea, setDeck, setHand, setField, setTrash, setBurst, setReserveCores, setDiscardCounter, setDiscardedCardNames, setDiscardToastTimer, setOpenArea } from './game_data.js';
import { renderAll } from './ui_render.js';
import { showToast, getArrayByZoneName, getZoneName } from './utils.js';
import { payCostFromReserve } from './core_logic.js';

export function drawCard(fromBottom = false) {
    if (deck.length > 0) {
        let cardToDraw;
        if (fromBottom) {
            if (!confirm("デッキの下からドローしますか？")) {
                return; // キャンセルされたらドローしない
            }
            cardToDraw = deck.pop(); // デッキの下からドロー
        } else {
            cardToDraw = deck.shift(); // デッキの上からドロー
        }
        hand.push(cardToDraw);
        // ドローしたら手札を開く
        const handZoneContainer = document.getElementById('handZoneContainer');
        const openHandButton = document.getElementById('openHandButton');
        handZoneContainer.classList.remove('collapsed');
        openHandButton.classList.add('hidden');
        renderAll();
    } else {
        alert("デッキが空です");
    }
}

export function moveCardData(cardId, sourceZoneId, targetZoneName, dropEvent = null, dropTargetElement = null) {
    console.log(`[moveCardData] Card ID: ${cardId}, Source Zone: ${sourceZoneId}, Target Zone: ${targetZoneName}`);
    const sourceArray = getArrayByZoneName(sourceZoneId);
    if (!sourceArray) {
        console.warn(`[moveCardData] Source array not found for zone: ${sourceZoneId}`);
        return;
    }
    const cardIndex = sourceArray.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
        console.warn(`[moveCardData] Card not found in source array: ${cardId}`);
        return;
    }

    const [cardData] = sourceArray.splice(cardIndex, 1); // カードを一時的にソースから削除
    console.log(`[moveCardData] Card data extracted:`, cardData);

    // コアをリザーブに移動するかどうかのフラグを、移動元がフィールドで、移動先がフィールド以外の場合に設定
    let shouldTransferCoresToReserve = (sourceZoneId === 'field' && targetZoneName !== 'field' && cardData.coresOnCard && cardData.coresOnCard.length > 0);
    console.log(`[moveCardData] shouldTransferCoresToReserve: ${shouldTransferCoresToReserve}, Cores on card:`, cardData.coresOnCard);

    if (targetZoneName === 'deck') {
        let putOnBottom = false;
        if (dropEvent && dropTargetElement) { // ドロップイベントとターゲット要素が渡された場合
            const rect = dropTargetElement.getBoundingClientRect();
            const clickY = dropEvent.clientY - rect.top; // ドロップされたY座標
            const buttonHeight = rect.height;
            const twoThirdsHeight = buttonHeight * (2 / 3);

            if (clickY > twoThirdsHeight) {
                putOnBottom = true; // 下1/3にドロップされたら下に戻す
            }
        } else {
            // ドロップイベントがない場合は、従来の確認ダイアログを表示
            if (confirm(`${cardData.name}をデッキの下に戻しますか？`)) {
                putOnBottom = true;
            }
        }

        if (putOnBottom) {
            deck.push(cardData);
            showToast('cardMoveToast', `${cardData.name}をデッキの下に戻しました`);
        } else {
            deck.unshift(cardData);
            showToast('cardMoveToast', `${cardData.name}をデッキの上に戻しました`);
        }
    } else if (targetZoneName === 'void') {
        // カードをボイドに移動する場合、単にソースから削除し、どこにも追加しない
        if (!confirm(`${cardData.name}をゲームから除外していいですか？`)) {
            // ユーザーがキャンセルした場合、カードを元の場所に戻す
            sourceArray.splice(cardIndex, 0, cardData);
            renderAll(); // 元に戻した状態を反映
            return; // 処理を中断
        }
        // ユーザーがOKした場合、カードは既にソースから削除されているので何もしない
    } else if (targetZoneName === 'field' && sourceZoneId !== 'field') {
        // フィールドにカードを置く場合、コストパッドを表示
        showCostPad(cardData, sourceArray, cardIndex, dropEvent, (cost) => {
            if (!payCostFromReserve(cost)) {
                // コスト支払い失敗時（コア不足）
                // カードを元のソースエリアに戻す
                sourceArray.splice(cardIndex, 0, cardData);
                renderAll();
                return; // 処理を中断
            }
            // コスト支払いが成功した場合のみフィールドに追加
            const targetArray = getArrayByZoneName(targetZoneName);
            if (targetArray) targetArray.push(cardData);
            renderAll();
        });
        return; // コストパッドの処理に任せるため、一旦ここでreturn else { // This 'else' block handles all other target zones (hand, trash, burst, life, reserve, count)
        // 手札に戻す場合は回転状態をリセット
        if (targetZoneName === 'hand') {
            cardData.isRotated = false;
            cardData.isExhausted = false;
        }
        const targetArray = getArrayByZoneName(targetZoneName);
        if (targetArray) targetArray.push(cardData);
    }

    // コア移動のフラグが立っている場合のみ、コアをリザーブに移動し、カード上のコアを空にする
    if (shouldTransferCoresToReserve) {
        console.log(`[moveCardData] Transferring cores to reserve. Current reserveCores:`, reserveCores);
        cardData.coresOnCard.forEach(core => {
            console.log(`[moveCardData] Moving core type '${core.type}' to reserve.`);
            reserveCores.push(core.type);
        });
        console.log(`[moveCardData] Cores moved. New reserveCores:`, reserveCores);
        cardData.coresOnCard = [];
        console.log(`[moveCardData] Cores on card cleared. cardData.coresOnCard:`, cardData.coresOnCard);
    }

    if (sourceZoneId === 'openArea' && openArea.length === 0) {
        const openAreaModal = document.getElementById('openAreaModal');
        openAreaModal.style.display = 'none';
    }

    renderAll();
}

export function openDeck() {
    if (deck.length < 1) {
        alert("デッキが空です。");
        return;
    }

    const openedCard = deck.shift();
    setOpenArea([...openArea, openedCard]);

    const openAreaModal = document.getElementById('openAreaModal');
    openAreaModal.style.display = 'flex';

    renderAll();
}

export function discardDeck() {
    if (deck.length === 0) {
        alert("デッキが空です");
        return;
    }

    const discardedCard = deck.shift();
    trash.push(discardedCard);

    setDiscardCounter(discardState.counter + 1);
    setDiscardedCardNames([...discardState.names, discardedCard.name]);

    renderAll();

    // 既存のタイマーがあればクリア
    if (discardState.timer) {
        clearTimeout(discardState.timer);
    }

    // 新しいタイマーを設定
    setDiscardToastTimer(setTimeout(() => {
        const message = `${discardState.counter}枚破棄しました。\n${discardState.names.join("、")}`;
        showToast('cardMoveToast', message);
        
        // カウンターとリストをリセット
        setDiscardCounter(0);
        setDiscardedCardNames([]);
        setDiscardToastTimer(null);
    }, 350)); // 350msのデバウンス
}