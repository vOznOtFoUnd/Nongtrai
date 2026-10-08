let shopSearchQuery = '';
if (typeof activeShopTab === 'undefined') window.activeShopTab = 'seeds';
if (typeof shopBuyQty === 'undefined') window.shopBuyQty = 1;

// Chuyển Tab Cửa Hàng (An toàn tuyệt đối, không đè vỡ CSS)
function switchShopTab(tab) {
    activeShopTab = tab;
    shopSearchQuery = ''; // Reset từ khóa tìm kiếm
    
    // Cập nhật trạng thái Active của Nút Tab
    document.querySelectorAll('.shop-tab-btn').forEach(btn => {
        btn.classList.remove('bg-amber-500', 'text-white', 'shadow');
        btn.classList.add('bg-slate-200/60', 'text-slate-600');
    });
    
    const sel = document.getElementById('tab-shop-' + tab);
    if (sel) {
        sel.classList.remove('bg-slate-200/60', 'text-slate-600');
        sel.classList.add('bg-amber-500', 'text-white', 'shadow');
    }

    const searchInput = document.getElementById('shop-search-input');
    if (searchInput) searchInput.value = '';

    renderShopItems();
}

// Tăng giảm số lượng thao tác Mua / Bán
function adjustShopQty(delta) {
    shopBuyQty = Math.max(1, Math.min(99, shopBuyQty + delta));
    const qtyEl = document.getElementById('shop-buy-qty');
    if (qtyEl) qtyEl.innerText = shopBuyQty;
    renderShopItems();
}

// Set nhanh số lượng
function setShopQty(val) {
    shopBuyQty = val;
    const qtyEl = document.getElementById('shop-buy-qty');
    if (qtyEl) qtyEl.innerText = shopBuyQty;
    renderShopItems();
}

// Tìm kiếm vật phẩm
function handleShopSearch(input) {
    shopSearchQuery = input.value.toLowerCase().trim();
    renderShopItems();
}

// Render danh sách vật phẩm Cửa Hàng
function renderShopItems() {
    const container = document.getElementById('shop-items-container');
    if (!container) return;

    // Cập nhật Vàng ở Footer Shop
    const goldDisplay = document.getElementById('shop-gold-display');
    if (goldDisplay && typeof gameState !== 'undefined') {
        goldDisplay.innerText = gameState.gold.toLocaleString();
    }

    let rawItems = [];

    // 1. Gom dữ liệu theo Tab
    if (activeShopTab === 'seeds') {
        if (typeof CROPS_DB !== 'undefined') {
            Object.keys(CROPS_DB).forEach(k => {
                rawItems.push({ key: k + '_seed', name: 'Hạt Giống ' + CROPS_DB[k].name, icon: '🌱', cost: CROPS_DB[k].seedCost });
            });
        }
    } else if (activeShopTab === 'trees') {
        if (typeof TREES_DB !== 'undefined') {
            Object.keys(TREES_DB).forEach(k => {
                rawItems.push({ key: 'sapling_' + k, name: 'Cây Giống ' + TREES_DB[k].name, icon: '🌳', cost: TREES_DB[k].saplingCost });
            });
        }
    } else if (activeShopTab === 'animals') {
        rawItems = [
            { key: 'buy_chicken', name: 'Gà Con Giống', cost: 200, icon: '🐥' },
            { key: 'buy_cow', name: 'Bò Giống', cost: 800, icon: '🐮' },
            { key: 'buy_pig', name: 'Heo Giống', cost: 500, icon: '🐷' },
            { key: 'fry_goldfish', name: 'Cá Vàng Giống', cost: 100, icon: '🐟' },
            { key: 'fry_carp', name: 'Cá Chép Giống', cost: 250, icon: '🐠' }
        ];
    } else if (activeShopTab === 'supplies') {
        if (typeof SUPPLIES_DB !== 'undefined') {
            Object.keys(SUPPLIES_DB).forEach(k => {
                const s = SUPPLIES_DB[k];
                rawItems.push({ key: k, name: s.name, icon: s.icon, cost: s.cost });
            });
        }
    } else if (activeShopTab === 'recipes') {
        if (typeof RECIPES_DB !== 'undefined') {
            Object.keys(RECIPES_DB).forEach(k => {
                const r = RECIPES_DB[k];
                rawItems.push({ key: k, name: r.name, icon: r.icon, cost: r.cost || 200, isRecipe: true });
            });
        }
    } else if (activeShopTab === 'sell') {
        if (typeof gameState !== 'undefined' && gameState.inventory) {
            Object.keys(gameState.inventory).forEach(k => {
                const qtyInStock = gameState.inventory[k];
                if (qtyInStock > 0) {
                    const info = getItemInfo(k);
                    rawItems.push({ key: k, name: info.name, icon: info.icon, sellPrice: info.sellPrice || 10, qtyInStock: qtyInStock, isSell: true });
                }
            });
        }
    }

    // 2. Lọc theo từ khóa tìm kiếm
    if (shopSearchQuery !== '') {
        rawItems = rawItems.filter(item => item.name.toLowerCase().includes(shopSearchQuery));
    }

    // 3. Khung Empty State nghệ thuật nếu rỗng
    if (rawItems.length === 0) {
        container.innerHTML = `
            <div class="col-span-1 sm:col-span-2 flex flex-col items-center justify-center py-10 text-slate-400 my-auto">
                <span class="text-4xl block mb-2">${activeShopTab === 'sell' ? '📦' : '🔍'}</span>
                <div class="font-bold text-xs text-slate-600 mb-1">
                    ${activeShopTab === 'sell' ? 'Túi đồ rỗng, chưa có vật phẩm để bán!' : 'Không tìm thấy vật phẩm phù hợp!'}
                </div>
            </div>
        `;
        return;
    }

    // 4. Render danh sách Card phẳng đồng nhất kích thước
    let html = '';
    rawItems.forEach(item => {
        if (item.isRecipe) {
            const unlocked = gameState.unlockedRecipes && gameState.unlockedRecipes.includes(item.key);
            html += `
                <div class="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-sm flex items-center justify-between h-[68px]">
                    <div class="flex items-center gap-2 overflow-hidden">
                        <span class="text-2xl p-2 bg-amber-50 rounded-xl border border-amber-100 flex-shrink-0">${item.icon}</span>
                        <div class="overflow-hidden">
                            <div class="font-extrabold text-xs text-slate-800 truncate">${item.name}</div>
                            <div class="text-[10px] text-amber-600 font-black mt-0.5">${unlocked ? 'Đã mở khóa' : item.cost.toLocaleString() + ' 🪙'}</div>
                        </div>
                    </div>
                    <button onclick="buyRecipe('${item.key}')" ${unlocked ? 'disabled' : ''} class="px-3 py-1.5 ${unlocked ? 'bg-slate-100 text-slate-400' : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'} font-black text-xs rounded-xl shadow-sm whitespace-nowrap">
                        ${unlocked ? 'Đã Có' : 'Học'}
                    </button>
                </div>
            `;
        } else if (item.isSell) {
            const actualQtyToSell = Math.min(item.qtyInStock, shopBuyQty);
            const totalPrice = item.sellPrice * actualQtyToSell;
            const totalAllPrice = item.sellPrice * item.qtyInStock;

            html += `
                <div class="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-sm flex flex-col justify-between h-[90px]">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl p-1.5 bg-emerald-50 rounded-xl border border-emerald-100 flex-shrink-0">${item.icon}</span>
                        <div class="overflow-hidden">
                            <div class="font-extrabold text-xs text-slate-800 truncate">${item.name}</div>
                            <div class="text-[10px] text-slate-500">Có: <b class="text-emerald-600 font-extrabold">${item.qtyInStock}</b> (${item.sellPrice}🪙/món)</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 pt-1 border-t border-slate-100">
                        <button onclick="sellItem('${item.key}', ${actualQtyToSell})" class="flex-1 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] rounded-lg shadow-sm active:scale-95 whitespace-nowrap">
                            Bán x${actualQtyToSell} (+${totalPrice.toLocaleString()}🪙)
                        </button>
                        ${item.qtyInStock > actualQtyToSell ? `
                            <button onclick="sellItem('${item.key}',${item.qtyInStock})" class="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white font-black text-[10px] rounded-lg shadow-sm active:scale-95 whitespace-nowrap">
                                Tất cả (${totalAllPrice.toLocaleString()}🪙)
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            const totalPrice = item.cost * shopBuyQty;
            html += `
                <div class="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-sm flex items-center justify-between gap-2 h-[68px]">
                    <div class="flex items-center gap-2 overflow-hidden">
                        <span class="text-2xl p-2 bg-amber-50 rounded-xl border border-amber-100 flex-shrink-0">${item.icon}</span>
                        <div class="overflow-hidden">
                            <div class="font-extrabold text-xs text-slate-800 truncate">${item.name}</div>
                            <div class="text-[10px] text-amber-600 font-black mt-0.5">${totalPrice.toLocaleString()} 🪙 (x${shopBuyQty})</div>
                        </div>
                    </div>
                    <button onclick="buyItem('${item.key}')" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-sm active:scale-95 whitespace-nowrap">Mua</button>
                </div>
            `;
        }
    });

    container.innerHTML = html;
}

// Mua Vật Phẩm
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

// Mua Công Thức
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

// Bán Đồ
function sellItem(itemKey, qtyToSell) {
    const currentQty = gameState.inventory[itemKey] || 0;
    if (currentQty <= 0) return;

    const sellAmount = Math.min(currentQty, qtyToSell || 1);
    const info = getItemInfo(itemKey);
    const unitPrice = info.sellPrice || 10;
    const totalPrice = unitPrice * sellAmount;

    gameState.gold += totalPrice;
    gameState.inventory[itemKey] = currentQty - sellAmount;
    
    showToast("Bán Hàng Thành Công! 💰", `Đã bán ${sellAmount} ${info.name} (+${totalPrice.toLocaleString()} 🪙)!`, "🪙");
    
    updateUI();
    renderShopItems();
    saveGame();
}
