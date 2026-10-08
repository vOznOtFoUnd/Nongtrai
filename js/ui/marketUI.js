// Render Danh Sách Đơn Hàng Tại Sạp Hàng
function renderMarketOrders() {
    const container = document.getElementById('market-orders-container');
    if (!container) return;

    const orders = Array.isArray(gameState.marketOrders) ? gameState.marketOrders : [];
    let html = '';

    orders.forEach(o => {
        const reqs = Array.isArray(o.reqs) ? o.reqs : [];
        let canFulfill = true;

        let reqsHtml = reqs.map(r => {
            const itemId = r.id || r.itemId;
            const qty = Number(r.qty) || 0;
            const hasQty = gameState.inventory[itemId] || 0;

            if (hasQty < qty) canFulfill = false;

            return `<span class="inline-flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-800">${r.icon || ''} ${r.name || itemId} (${hasQty}/${qty})</span>`;
        }).join(' ');

        html += `
            <div class="bg-amber-50/80 rounded-2xl p-3 border border-amber-200 flex flex-col gap-2">
                <div class="flex justify-between items-center">
                    <span class="font-extrabold text-xs text-slate-800">👤 Khách hàng: ${o.customer || 'Khách'}</span>
                    <span class="text-xs font-black text-amber-600">+${o.rewardGold || 0}🪙 | +${o.rewardExp || 0}EXP</span>
                </div>
                <div class="flex flex-wrap gap-1">${reqsHtml}</div>
                <button onclick="fulfillMarketOrder('${o.id}')" ${!canFulfill || o.completed ? 'disabled' : ''} class="py-2 ${canFulfill && !o.completed ? 'bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] rounded-xl shadow' : 'bg-slate-300 text-slate-500 rounded-xl cursor-not-allowed'} transition">
                    ${o.completed ? 'Đã Hoàn Thành' : 'Giao Hàng'}
                </button>
            </div>
        `;
    });

    container.innerHTML = html || `<div class="text-center text-slate-400 py-8 font-bold">Chưa có đơn hàng mới!</div>`;
}

// Thực Hiện Giao Hàng Cho Khách
function fulfillMarketOrder(orderId) {
    const order = (gameState.marketOrders || []).find(o => o.id === orderId);
    if (!order || order.completed) return;

    const canFulfill = (order.reqs || []).every(r => {
        const itemId = r.id || r.itemId;
        const requiredQty = Number(r.qty) || 0;
        return (gameState.inventory[itemId] || 0) >= requiredQty;
    });

    if (!canFulfill) {
        showToast("Thiếu Hàng! 📦", "Bạn chưa đủ nguyên liệu để giao đơn này!", "❌");
        return;
    }

    order.reqs.forEach(r => {
        const itemId = r.id || r.itemId;
        gameState.inventory[itemId] = (gameState.inventory[itemId] || 0) - (Number(r.qty) || 0);
    });

    order.completed = true;
    gameState.gold += order.rewardGold || 0;
    addExp(order.rewardExp || 0);

    showToast("Giao Hàng Thành Công! 📦", `Nhận được +${order.rewardGold || 0} Vàng & +${order.rewardExp || 0} EXP!`, "🎉");

    if ((gameState.marketOrders || []).every(o => o.completed)) {
        generateMarketOrders();
        showToast("Sạp Hàng Mới! 🏪", "Đã cập nhật đơn hàng khách mới!", "✨");
    }

    renderMarketOrders();
    updateUI();
    saveGame();
}
