// Render Danh Sách Đơn Hàng Tại Sạp Hàng
function renderMarketOrders() {
    const container = document.getElementById('market-orders-container');
    if (!container) return;

    let html = '';
    gameState.marketOrders.forEach(o => {
        let canFulfill = true;
        let reqsHtml = o.reqs.map(r => {
            const hasQty = gameState.inventory[r.id] || 0;
            if (hasQty < r.qty) canFulfill = false;
            return `<span class="inline-flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-800">${r.icon} ${r.name} (${hasQty}/${r.qty})</span>`;
        }).join(' ');

        html += `
            <div class="bg-amber-50/80 rounded-2xl p-3 border border-amber-200 flex flex-col gap-2">
                <div class="flex justify-between items-center">
                    <span class="font-extrabold text-xs text-slate-800">👤 Khách hàng: ${o.customer}</span>
                    <span class="text-xs font-black text-amber-600">+${o.rewardGold}🪙 | +${o.rewardExp}EXP</span>
                </div>
                <div class="flex flex-wrap gap-1">${reqsHtml}</div>
                <button onclick="fulfillMarketOrder('${o.id}')" ${!canFulfill || o.completed ? 'disabled' : ''} class="py-2 ${canFulfill && !o.completed ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-200 text-slate-400'} font-bold text-xs rounded-xl shadow">
                    ${o.completed ? 'Đã Hoàn Thành' : 'Giao Hàng'}
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Thực Hiện Giao Hàng Cho Khách
function fulfillMarketOrder(orderId) {
    const order = gameState.marketOrders.find(o => o.id === orderId);
    if (!order || order.completed) return;

    order.reqs.forEach(r => {
        gameState.inventory[r.id] -= r.qty;
    });

    order.completed = true;
    gameState.gold += order.rewardGold;
    addExp(order.rewardExp);

    showToast("Giao Hàng Thành Công! 📦", `Nhận được +${order.rewardGold} Vàng & +${order.rewardExp} EXP!`, "🎉");

    if (gameState.marketOrders.every(o => o.completed)) {
        generateMarketOrders();
        showToast("Sạp Hàng Mới! 🏪", "Đã cập nhật đơn hàng khách mới!", "✨");
    }

    renderMarketOrders();
    updateUI();
    saveGame();
}
