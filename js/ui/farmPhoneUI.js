// UPGRADE 49: One mobile phone dock for orders, entertainment and notifications.
let farmPhoneLastOrderBadge = -1;
function getFarmPhoneReadyCount() {
    if (typeof getReadyMarketCount === 'function') return getReadyMarketCount();
    const orders = Array.isArray(gameState.marketOrders) ? gameState.marketOrders : [];
    return orders.filter(o => !o.completed && Array.isArray(o.reqs) && o.reqs.length && o.reqs.every(r => (Number(gameState.inventory?.[r.id]) || 0) >= (Number(r.qty) || 0))).length;
}
function updateFarmPhoneNotification() {
    const count = getFarmPhoneReadyCount();
    const badge = document.getElementById('farm-phone-order-badge');
    const appBadge = document.getElementById('farm-phone-app-badge');
    [badge, appBadge].forEach(el => { if (!el) return; el.textContent = String(count); el.classList.toggle('hidden', count <= 0); });
    const button = document.getElementById('farm-phone-button');
    if (button && count > 0 && count !== farmPhoneLastOrderBadge && farmPhoneLastOrderBadge >= 0) {
        button.classList.remove('farm-phone-notify'); void button.offsetWidth; button.classList.add('farm-phone-notify');
    }
    farmPhoneLastOrderBadge = count;
}
function openFarmPhone() {
    updateFarmPhoneNotification();
    openModal('modal-farm-phone');
}
