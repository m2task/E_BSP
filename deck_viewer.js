document.addEventListener('DOMContentLoaded', () => {
    const deckList = document.getElementById('deck-list');
    const selectedDeckCardsContainer = document.getElementById('selected-deck-cards');

    // --- Elements for editing deck ---
    const totalCardCountSpan = document.getElementById('total-card-count');
    const deckEditorContainer = document.getElementById('deck-editor-container');
    const cardNameInput = document.getElementById('cardNameInput');
    const addCardByNameButton = document.getElementById('addCardByNameButton');
    const deckNameInput = document.getElementById('deckNameInput');
    const saveDeckAsButton = document.getElementById('saveDeckAsButton');
    const overwriteSaveButton = document.getElementById('overwriteSaveButton');

    let deck = []; // The currently edited deck
    let currentEditingDeckName = null; // Stores the name of the currently loaded/edited deck

    // New: Generates a simple unique ID for cards
    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    // New: Creates a card image (data URL) from text
    function createCardImageFromText(text, width = 80, height = 110) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        // Draw text
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial'; // Adjust font size and family as needed
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2); // Center text

        return canvas.toDataURL('image/png');
    }

    // New: Renders the currently edited deck in the deckEditorContainer
    function renderEditedDeck() {
        deckEditorContainer.innerHTML = '';
        if (deck.length === 0) {
            deckEditorContainer.innerHTML = '<p style="color: #666;">ここに編集中のカードが表示されます。</p>';
            totalCardCountSpan.textContent = '0';
            return;
        }

        let totalCardCount = 0;
        deck.forEach(card => {
            totalCardCount += card.quantity;

            const cardItem = document.createElement('div');
            cardItem.className = 'deck-card-item';
            cardItem.dataset.cardId = card.id;

            const img = document.createElement('img');
            img.src = card.imgDataUrl;
            img.alt = card.name || `Card ${card.id}`;

            const controls = document.createElement('div');
            controls.className = 'card-controls';

            const decreaseBtn = document.createElement('button');
            decreaseBtn.textContent = '-';
            decreaseBtn.addEventListener('click', () => handleDecreaseQuantity(card.id));

            const quantitySpan = document.createElement('span');
            quantitySpan.className = 'card-quantity';
            quantitySpan.textContent = `x${card.quantity}`;

            const increaseBtn = document.createElement('button');
            increaseBtn.textContent = '+';
            increaseBtn.addEventListener('click', () => handleIncreaseQuantity(card.id));

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '削除';
            deleteBtn.className = 'delete-button';
            deleteBtn.addEventListener('click', () => handleDeleteCard(card.id));

            controls.appendChild(decreaseBtn);
            controls.appendChild(quantitySpan);
            controls.appendChild(increaseBtn);
            controls.appendChild(deleteBtn);

            cardItem.appendChild(img);
            cardItem.appendChild(controls);
            deckEditorContainer.appendChild(cardItem);
        });
        totalCardCountSpan.textContent = totalCardCount.toString();
    }

    // New: Handles decreasing card quantity for edited deck
    function handleDecreaseQuantity(id) {
        const cardIndex = deck.findIndex(card => card.id === id);
        if (cardIndex !== -1) {
            deck[cardIndex].quantity--;
            if (deck[cardIndex].quantity <= 0) {
                deck.splice(cardIndex, 1); // Remove if quantity is 0 or less
            }
            renderEditedDeck();
        }
    }

    // New: Handles increasing card quantity for edited deck
    function handleIncreaseQuantity(id) {
        const cardIndex = deck.findIndex(card => card.id === id);
        if (cardIndex !== -1) {
            deck[cardIndex].quantity++;
            renderEditedDeck();
        }
    }

    // New: Handles deleting a card from edited deck
    function handleDeleteCard(id) {
        deck = deck.filter(card => card.id !== id);
        renderEditedDeck();
    }

    function renderDeckList() {
        deckList.innerHTML = ''; // Clear existing list
        const savedDecks = JSON.parse(localStorage.getItem('savedDecks') || '{}');

        if (Object.keys(savedDecks).length === 0) {
            deckList.innerHTML = '<p>保存されたデッキはありません。</p>';
            return;
        }

        for (const deckName in savedDecks) {
            const deckData = savedDecks[deckName];
            const totalCards = deckData.reduce((sum, card) => sum + card.quantity, 0);

            const listItem = document.createElement('li');
            listItem.dataset.deckName = deckName; // Store deck name for selection

            const battleButton = document.createElement('button');
            battleButton.textContent = 'このデッキで対戦';
            battleButton.className = 'battle-button'; // Add a class for styling
            battleButton.dataset.deckName = deckName;
            battleButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent listItem click event
                const savedDecks = JSON.parse(localStorage.getItem('savedDecks') || '{}');
                const selectedDeckData = savedDecks[deckName];
                if (selectedDeckData) {
                    localStorage.setItem('currentBattleDeck', JSON.stringify(selectedDeckData));
                    window.location.href = 'battle.html';
                } else {
                    alert('選択されたデッキが見つかりませんでした。');
                }
            });
            listItem.appendChild(battleButton);

            const deckNameSpan = document.createElement('span');
            deckNameSpan.textContent = `${deckName} (${totalCards}枚)`;
            listItem.appendChild(deckNameSpan);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '削除';
            deleteButton.dataset.deckName = deckName;
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent listItem click event
                if (confirm(`デッキ「${deckName}」を本当に削除しますか？`)) {
                    delete savedDecks[deckName];
                    localStorage.setItem('savedDecks', JSON.stringify(savedDecks));
                    renderDeckList(); // Re-render the list
                    clearSelectedDeckDisplay(); // Clear displayed deck if deleted
                }
            });

            listItem.appendChild(deleteButton);

            listItem.addEventListener('click', () => {
                if (currentEditingDeckName === deckName) {
                    // 同じデッキがクリックされた場合は編集モードを解除
                    deck = []; // デッキをクリア
                    currentEditingDeckName = null; // 編集中のデッキ名をリセット
                    renderEditedDeck(); // 編集エリアを更新
                    return;
                }
                deck = [...deckData]; // Copy the array to avoid direct reference issues
                renderEditedDeck();
                currentEditingDeckName = deckName; // Update current editing deck name
            });
            deckList.appendChild(listItem);
        }
    }

    // Initial render
    renderDeckList();
    renderEditedDeck(); // Initial render of the empty edited deck

    // Event Listener for adding card by name
    addCardByNameButton.addEventListener('click', () => {
        const cardName = cardNameInput.value.trim();
        if (cardName === '') {
            alert('カード名を入力してください。');
            return;
        }

        const imgDataUrl = createCardImageFromText(cardName);

        const existingCardIndex = deck.findIndex(card => card.imgDataUrl === imgDataUrl);

        if (existingCardIndex !== -1) {
            deck[existingCardIndex].quantity++;
        } else {
            deck.push({
                id: generateUniqueId(),
                imgDataUrl: imgDataUrl,
                quantity: 1,
                name: cardName
            });
        }

        renderEditedDeck();
        cardNameInput.value = '';
    });

    // Event Listener for saving deck with a given name
    saveDeckAsButton.addEventListener('click', () => {
        const deckName = deckNameInput.value.trim();
        if (deckName === '') {
            alert('デッキ名を入力してください。');
            return;
        }

        let savedDecks = JSON.parse(localStorage.getItem('savedDecks') || '{}');

        savedDecks[deckName] = deck;

        localStorage.setItem('savedDecks', JSON.stringify(savedDecks));

        alert(`デッキ「${deckName}」を保存しました。`);
        deckNameInput.value = '';
        renderDeckList(); // Update the list of saved decks
        currentEditingDeckName = deckName; // Set current editing deck name after saving
    });

    // Event Listener for overwrite save
    overwriteSaveButton.addEventListener('click', () => {
        if (currentEditingDeckName === null) {
            alert('上書き保存するには、まずデッキを読み込むか、名前を付けて保存してください。');
            return;
        }

        let savedDecks = JSON.parse(localStorage.getItem('savedDecks') || '{}');

        if (!savedDecks[currentEditingDeckName]) {
            alert(`エラー: デッキ「${currentEditingDeckName}」が見つかりません。名前を付けて保存してください。`);
            currentEditingDeckName = null; // Reset
            return;
        }

        savedDecks[currentEditingDeckName] = deck; // Overwrite

        localStorage.setItem('savedDecks', JSON.stringify(savedDecks));

        alert(`デッキ「${currentEditingDeckName}」を上書き保存しました。`);
        renderDeckList(); // Update the list of saved decks
    });
});