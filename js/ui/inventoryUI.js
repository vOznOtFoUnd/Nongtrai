// Render Túi đồ nông dân
function renderInventory() {
    const container = document.getElementById('inventory-container');
    if (!container) return;

    let html = '';
    Object.keys(gameState.inventory).forEach(key => {
        const qty = gameState.inventory[key];
        if (qty > 0) {
            const info = getItemInfo(key);
            html += `
                <div class="bg-white/80 rounded-2xl p-3 border border-slate-200 flex flex-col items-center text-center shadow-sm">
                    <span class="text-3xl mb-1">${info.icon}</span>
                    <div class="font-extrabold text-xs text-slate-800 mb-1">${info.name}</div>
                    <div class="text-[10px] text-amber-600 font-bold mb-2">Số lượng: ${qty}</div>
                    ${info.staminaRestore ? `<button onclick="eatFood('${key}')" class="w-full py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-xl shadow">Ăn (+${info.staminaRestore}⚡)</button>` : ''}
                </div>
            `;
        }
    });

    container.innerHTML = html || `<div class="col-span-3 text-center text-slate-400 py-8 font-bold">Túi đồ trống rỗng!</div>`;
}

// Ăn Món Ăn để Hồi Thể Lực
function eatFood(recipeKey) {
    const qty = gameState.inventory[recipeKey] || 0;
    if (qty <= 0) return;

    const r = RECIPES_DB[recipeKey];
    if (r && r.staminaRestore) {
        gameState.inventory[recipeKey] -= 1;
        gameState.staminaFloat = Math.min(gameState.maxStamina, gameState.staminaFloat + r.staminaRestore);
        gameState.stamina = Math.floor(gameState.staminaFloat);
        showToast("Thưởng Thức Món Ăn! 😋", `Hồi phục +${r.staminaRestore} Thể lực!`, "⚡");
        updateUI();
        renderInventory();
        saveGame();
    }
}
