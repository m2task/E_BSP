// src/card_logic.js
import { deck, hand, field, trash, burst, reserveCores, discardState, openArea, setDeck, setHand, setField, setTrash, setBurst, setReserveCores, setDiscardCounter, setDiscardedCardNames, setDiscardToastTimer, setOpenArea } from './game_data.js';
import { renderAll } from './ui_render.js';
import { showToast, getArrayByZoneName, getZoneName } from './utils.js';

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
    const sourceArray = getArrayByZoneName(sourceZoneId);
    if (!sourceArray) return;
    const cardIndex = sourceArray.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const [cardData] = sourceArray.splice(cardIndex, 1); // カードを一時的にソースから削除

    let shouldTransferCoresToReserve = false; // コアをリザーブに移動するかどうかのフラグ

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

        // デッキへの配置が確定した場合のみ、コア移動のフラグを立てる
        if (sourceZoneId === 'field' && cardData.coresOnCard && cardData.coresOnCard.length > 0) {
            shouldTransferCoresToReserve = true;
        }
    } else if (targetZoneName === 'void') {
        // カードをボイドに移動する場合、単にソースから削除し、どこにも追加しない
        // フィールドからボイドに移動する場合、その上のコアをリザーブに移動
        if (sourceZoneId === 'field' && cardData.coresOnCard && cardData.coresOnCard.length > 0) {
            shouldTransferCoresToReserve = true;
        }
        if (!confirm(`${cardData.name}をゲームから除外していいですか？`)) {
            // ユーザーがキャンセルした場合、カードを元の場所に戻す
            sourceArray.splice(cardIndex, 0, cardData);
            renderAll(); // 元に戻した状態を反映
            return; // 処理を中断
        }
        // ユーザーがOKした場合、カードは既にソースから削除されているので何もしない
    } else { // This 'else' block handles all other target zones (hand, field, trash, burst, life, reserve, count)
        // デッキ以外のエリアへの移動の場合
        // フィールドから別のエリアにカードが移動する場合、その上のコアをリザーブに移動
        if (getZoneName({ id: sourceZoneId }) === 'field' && targetZoneName !== 'field' && cardData.coresOnCard && cardData.coresOnCard.length > 0) {
            shouldTransferCoresToReserve = true;
        }

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
        cardData.coresOnCard.forEach(core => {
            reserveCores.push(core.type);
        });
        cardData.coresOnCard = [];
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