// Chuyển Tab Cửa Hàng
function switchShopTab(tab) {
    activeShopTab = tab;
    document.querySelectorAll('.shop-tab-btn').forEach(btn => {
        btn.classList.remove('bg-amber-500', 'text-white', 'shadow');
        btn.classList.add('text-slate-600');
    });
    const sel = document.getElementById('tab-shop-' + tab);
    if (sel) {
        sel.classList.remove('text-slate-600');
        sel.classList.add('bg-amber-500', 'text-white', 'shadow');
    }
    renderShopItems();
}

// Tăng giảm số lượng mua trong Shop
function adjustShopQty(delta) {
    shopBuyQty = Math.max(1, Math.min(50, shopBuyQty + delta));
    const qtyEl = document.getElementById('shop-buy-qty');
    if (qtyEl) qtyEl.innerText = shopBuyQty;
}

// Render danh sách vật phẩm Cửa Hàng theo Tab
function renderShopItems() {
    const container = document.getElementById('shop-items-container');
    if (!container) return;

    let html = '';
    if (activeShopTab === 'seeds') {
        Object.keys(CROPS_DB).forEach(key => {
            const c = CROPS_DB[key];
            const price = c.seedCost * shopBuyQty;
            html += `
                <div class="bg-amber-50/80 rounded-2xl p-3 border border-amber-200 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl">${c.icon}</span>
                        <div>
                            <div class="font-extrabold text-xs text-slate-800">Hạt Giống ${c.name}</div>
                            <div class="text-[10px] text-amber-600 font-bold">Giá: ${price} 🪙</div>
                        </div>
                    </div>
                    <button onclick="buyItem('${key}_seed')" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow">Mua</button>
                </div>
            `;
        });
    } else if (activeShopTab === 'trees') {
        Object.keys(TREES_DB).forEach(key => {
            const t = TREES_DB[key];
            const price = t.saplingCost * shopBuyQty;
            html += `
                <div class="bg-emerald-50/80 rounded-2xl p-3 border border-emerald-200 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl">${t.icon}</span>
                        <div>
                            <div class="font-extrabold text-xs text-slate-800">Cây Giống ${t.name}</div>
                            <div class="text-[10px] text-emerald-600 font-bold">Giá: ${price} 🪙</div>
                        </div>
                    </div>
                    <button onclick="buyItem('sapling_${key}')" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow">Mua</button>
                </div>
            `;
        });
    } else if (activeShopTab === 'animals') {
        const animals = [
            { id: 'buy_chicken', name: 'Gà Con Giống', cost: 150, icon: '🐥' },
            { id: 'buy_cow', name: 'Bò Giống', cost: 500, icon: '🐮' },
            { id: 'buy_pig', name: 'Heo Giống', cost: 300, icon: '🐷' },
            { id: 'fry_goldfish', name: 'Cá Vàng Giống', cost: 50, icon: '🐟' },
            { id: 'fry_carp', name: 'Cá Chép Giống', cost: 120, icon: '🐠' }
        ];
        animals.forEach(a => {
            const price = a.cost * shopBuyQty;
            html += `
                <div class="bg-sky-50/80 rounded-2xl p-3 border border-sky-200 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl">${a.icon}</span>
                        <div>
                            <div class="font-extrabold text-xs text-slate-800">${a.name}</div>
                            <div class="text-[10px] text-sky-600 font-bold">Giá: ${price} 🪙</div>
                        </div>
                    </div>
                    <button onclick="buyItem('${a.id}')" class="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow">Mua</button>
                </div>
            `;
        });
    } else if (activeShopTab === 'supplies') {
        Object.keys(SUPPLIES_DB).forEach(key => {
            const s = SUPPLIES_DB[key];
            const price = s.cost * shopBuyQty;
            html += `
                <div class="bg-purple-50/80 rounded-2xl p-3 border border-purple-200 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl">${s.icon}</span>
                        <div>
                            <div class="font-extrabold text-xs text-slate-800">${s.name}</div>
                            <div class="text-[10px] text-purple-600 font-bold">Giá: ${price} 🪙</div>
                        </div>
                    </div>
                    <button onclick="buyItem('${key}')" class="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs rounded-xl shadow">Mua</button>
                </div>
            `;
        });
    } else if (activeShopTab === 'recipes') {
        Object.keys(RECIPES_DB).forEach(key => {
            const r = RECIPES_DB[key];
            const unlocked = gameState.unlockedRecipes.includes(key);
            html += `
                <div class="bg-orange-50/80 rounded-2xl p-3 border border-orange-200 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl">${r.icon}</span>
                        <div>
                            <div class="font-extrabold text-xs text-slate-800">Công thức: ${r.name}</div>
                            <div class="text-[10px] text-orange-600 font-bold">${unlocked ? 'Đã mở khóa' : 'Giá: ' + (r.cost || 200) + ' 🪙'}</div>
                        </div>
                    </div>
                    <button onclick="buyRecipe('${key}')" ${unlocked ? 'disabled' : ''} class="px-3 py-1.5 ${unlocked ? 'bg-slate-300 text-slate-500' : 'bg-orange-500 hover:bg-orange-600 text-white'} font-bold text-xs rounded-xl shadow">
                        ${unlocked ? 'Đã Có' : 'Học'}
                    </button>
                </div>
            `;
        });
    } else if (activeShopTab === 'sell') {
        Object.keys(gameState.inventory).forEach(key => {
            const qty = gameState.inventory[key];
            if (qty > 0) {
                const info = getItemInfo(key);
                const price = (info.sellPrice || 10) * qty;
                html += `
                    <div class="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl">${info.icon}</span>
                            <div>
                                <div class="font-extrabold text-xs text-slate-800">${info.name}</div>
                                <div class="text-[10px] text-slate-500">Số lượng: <b>${qty}</b></div>
                            </div>
                        </div>
                        <button onclick="sellItem('${key}')" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow">
                            Bán (+${price}🪙)
                        </button>
                    </div>
                `;
            }
        });
    }

    container.innerHTML = html;
}

// Mua Vật Phẩm trong Shop
function buyItem(itemKey) {
    const info = getItemInfo(itemKey);
    const unitPrice = info.cost || 20;
    const totalPrice = unitPrice * shopBuyQty;

    if (gameState.gold >= totalPrice) {
        gameState.gold -= totalPrice;
        gameState.inventory[itemKey] = (gameState.inventory[itemKey] || 0) + shopBuyQty;
        showToast("Mua Thành Công! 🛒", `Đã mua ${shopBuyQty} ${info.name}!`, "🪙");
        updateUI();
        renderShopItems();
        saveGame();
    } else {
        showToast("Không Đủ Vàng! 🪙", "Bạn cần thêm vàng để mua vật phẩm này!", "❌");
    }
}

// Mua Công Thức Nấu Ăn
function buyRecipe(recipeKey) {
    const r = RECIPES_DB[recipeKey];
    const cost = r.cost || 200;
    if (gameState.gold >= cost) {
        gameState.gold -= cost;
        gameState.unlockedRecipes.push(recipeKey);
        showToast("Đã Học Công Thức! 📜", `Bạn đã mở khóa món ăn "${r.name}"!`, "🎉");
        updateUI();
        renderShopItems();
        saveGame();
    } else {
        showToast("Không Đủ Vàng! 🪙", "Bạn cần thêm vàng để mua công thức này!", "❌");
    }
}

// Bán Đồ trong Shop
function sellItem(itemKey) {
    const qty = gameState.inventory[itemKey] || 0;
    if (qty <= 0) return;

    const info = getItemInfo(itemKey);
    const unitPrice = info.sellPrice || 10;
    const totalPrice = unitPrice * qty;

    gameState.gold += totalPrice;
    gameState.inventory[itemKey] = 0;
    showToast("Bán Hàng Thành Công! 💰", `Thu được +${totalPrice.toLocaleString()} 🪙!`, "🪙");
    updateUI();
    renderShopItems();
    saveGame();
}
