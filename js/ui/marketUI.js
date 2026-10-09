// Giá đổi đơn theo độ khó và số lần đổi riêng trong ngày.
function getMarketRefreshCost(order) {
    const base = 30;
    const tier = order && order.difficulty === 'Khó' ? 2 : (order && order.difficulty === 'Vừa' ? 1 : 0);
    return base + tier * 15 + Math.min(30, Math.max(0, Number(order && order.refreshCount) || 0) * 5);
}
function formatMarketCountdown(ms) {
    const secs = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
}
function renderMarketOrders() {
    const container = document.getElementById('market-orders-container');
    if (!container) return;
    const orders = Array.isArray(gameState.marketOrders) ? gameState.marketOrders : [];
    if (!orders.length) { container.innerHTML = '<div class="text-center text-slate-400 py-8 font-bold">Đang tìm khách mới…</div>'; return; }
    const now = Date.now();
    container.innerHTML = orders.map(o => {
        const hasTimer = !!o.completed && Number.isFinite(Number(o.refreshAt)) && Number(o.refreshAt) > 0;
        const remaining = hasTimer ? Math.max(0, Number(o.refreshAt) - now) : 0;
        const cost = getMarketRefreshCost(o);
        let canFulfill = true;
        const reqTotals = new Map();
        (o.reqs || []).forEach(r => reqTotals.set(r.id, (reqTotals.get(r.id) || 0) + (Number(r.qty) || 0)));
        reqTotals.forEach((qty, itemId) => { if ((Number(gameState.inventory[itemId]) || 0) < qty) canFulfill = false; });
        const reqsHtml = (o.reqs || []).map(r => {
            const hasQty = Number(gameState.inventory[r.id]) || 0;
            return `<span class="inline-flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-800">${r.icon} ${r.name} (${hasQty}/${r.qty})</span>`;
        }).join(' ');
        return `<div class="bg-amber-50/90 rounded-2xl p-3 border border-amber-200 flex flex-col gap-2">
          <div class="flex justify-between items-center gap-2"><span class="font-extrabold text-xs text-slate-800">👤 ${o.customer || 'Khách'}</span><span class="text-xs font-black text-amber-600">+${o.rewardGold || 0}🪙 | +${o.rewardExp || 0}EXP</span></div>
          <div class="flex justify-between items-center gap-2"><span class="text-[10px] font-black text-orange-700 bg-orange-100 rounded-full px-2 py-1">${o.orderType || 'Đơn giao hàng'}</span><span class="text-[10px] font-bold text-slate-500">Độ khó: ${o.difficulty || 'Vừa'}</span></div>
          <div class="flex flex-wrap gap-1">${reqsHtml}</div>
          ${o.completed ? '<div class="text-xs font-bold text-emerald-700">✅ Đã giao — đang chờ khách mới</div>' : `<button onclick="fulfillMarketOrder('${o.id}')" ${!canFulfill?'disabled':''} class="py-2 ${canFulfill?'bg-amber-500 hover:bg-amber-600 text-white':'bg-slate-300 text-slate-500'} font-bold rounded-xl text-xs shadow-sm">Giao hàng</button>`}
          <div class="flex items-center justify-between gap-2 border-t border-amber-200 pt-2"><span class="text-[10px] text-slate-600">${hasTimer ? `Đơn mới sau <b data-market-countdown="${o.id}">${formatMarketCountdown(remaining)}</b>` : (o.completed ? 'Đang chờ làm mới…' : 'Chưa giao · không tự làm mới')}</span><button onclick="refreshMarketOrder('${o.id}')" class="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-[10px] shadow" ${Number(gameState.gold)<cost?'disabled':''}>Đổi đơn · ${cost} 🪙</button></div>
        </div>`;
    }).join('');
}
function refreshMarketOrder(orderId) {
    const index = (gameState.marketOrders || []).findIndex(o => String(o.id) === String(orderId));
    if (index < 0) return;
    const order = gameState.marketOrders[index]; const cost = getMarketRefreshCost(order);
    if ((Number(gameState.gold)||0) < cost) { showToast('Thiếu vàng 🪙', `Cần ${cost} vàng để đổi đơn này.`, '❌'); return; }
    if (!confirm(`Đổi riêng đơn hàng này với giá ${cost} vàng? Các đơn khác sẽ được giữ nguyên.`)) return;
    gameState.gold -= cost;
    const previousCount = (Number(order.refreshCount)||0) + 1;
    replaceMarketOrderAt(index);
    gameState.marketOrders[index].refreshCount = previousCount;
    showToast('Đã đổi đơn hàng 📦', `Đã dùng ${cost} vàng để tìm khách mới.`, '🔄');
    renderMarketOrders(); updateUI(); saveGame();
}
function updateMarketOrderTimers() {
    if (!Array.isArray(gameState.marketOrders) || !gameState.marketOrders.length) return;
    const now = Date.now(); let changed = false;
    gameState.marketOrders.forEach((order, index) => {
        if (!order.completed) { order.refreshAt = null; return; }
        if (!Number.isFinite(Number(order.refreshAt)) || Number(order.refreshAt) <= 0) order.refreshAt = now + MARKET_ORDER_LIFETIME_MS;
        if (now >= Number(order.refreshAt)) { replaceMarketOrderAt(index); changed = true; }
    });
    const container = document.getElementById('market-orders-container');
    if (container && !container.closest('#modal-market')?.classList.contains('hidden')) {
        if (changed) renderMarketOrders();
        else container.querySelectorAll('[data-market-countdown]').forEach(el => {
            const order = gameState.marketOrders.find(o => String(o.id) === String(el.dataset.marketCountdown));
            if (order) el.textContent = formatMarketCountdown(Number(order.refreshAt)-now);
        });
    }
}
// Thực Hiện Giao Hàng Cho Khách
function fulfillMarketOrder(orderId) {
    const orders = Array.isArray(gameState.marketOrders) ? gameState.marketOrders : [];
    const order = orders.find(item => String(item.id) === String(orderId));
    if (!order || order.completed || !Array.isArray(order.reqs) || order.reqs.length === 0) return;
    const rewardGold = Number(order.rewardGold);
    const rewardExp = Number(order.rewardExp);
    if (!Number.isFinite(rewardGold) || rewardGold < 0 || !Number.isFinite(rewardExp) || rewardExp < 0) {
        showToast('Đơn Hàng Lỗi! 📦', 'Phần thưởng đơn hàng không hợp lệ.', '❌');
        return;
    }
    const requiredTotals = new Map();
    for (const req of order.reqs) {
        if (!req || typeof req.id !== 'string' || !req.id || !Number.isFinite(Number(req.qty)) || Number(req.qty) <= 0) {
            showToast('Đơn Hàng Lỗi! 📦', 'Nguyên liệu của đơn hàng không hợp lệ.', '❌');
            return;
        }
        requiredTotals.set(req.id, (requiredTotals.get(req.id) || 0) + Number(req.qty));
    }
    for (const [itemId, qty] of requiredTotals) {
        if ((Number(gameState.inventory[itemId]) || 0) < qty) {
            const itemName = order.reqs.find(req => req.id === itemId)?.name || itemId;
            showToast('Thiếu Hàng! 📦', `Bạn không có đủ ${itemName} để giao đơn này.`, '❌');
            return;
        }
    }
    requiredTotals.forEach((qty, itemId) => {
        gameState.inventory[itemId] = (Number(gameState.inventory[itemId]) || 0) - qty;
    });
    order.completed = true;
    gameState.gold = (Number(gameState.gold) || 0) + rewardGold;
    addExp(rewardExp);
    showToast('Giao Hàng Thành Công! 📦', `Nhận được +${rewardGold} Vàng & +${rewardExp} EXP!`, '🎉');
    // Đơn đã giao giữ slot và bộ đếm; chỉ slot này tự thay khi hết 10 phút.
    order.completedAt = Date.now();
    order.refreshAt = Date.now() + MARKET_ORDER_LIFETIME_MS;
    renderMarketOrders();
    updateUI();
    saveGame();
}
