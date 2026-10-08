// Bật cửa sổ Popup Modal
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');

    if (id === 'modal-shop' && typeof renderShopItems === 'function') renderShopItems();
    else if (id === 'modal-inventory' && typeof renderInventory === 'function') renderInventory();
    else if (id === 'modal-kitchen' && typeof renderKitchenStoves === 'function') renderKitchenStoves();
    else if (id === 'modal-market' && typeof renderMarketOrders === 'function') renderMarketOrders();
    else if (id === 'modal-quests' && typeof renderQuests === 'function') renderQuests();
    else if (id === 'modal-bau-cua' && typeof renderBauCuaState === 'function') renderBauCuaState();
    else if (id === 'modal-horse-race' && typeof renderHorseRaceState === 'function') renderHorseRaceState();
}

// Tắt cửa sổ Popup Modal
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}
