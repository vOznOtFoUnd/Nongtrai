let shopSearchQuery = '';

// Chuyển Tab Cửa Hàng
function switchShopTab(tab) {
    activeShopTab = tab;
    shopSearchQuery = ''; // Reset từ khóa tìm kiếm khi đổi tab
    
    // Reset style nút tab
    document.querySelectorAll('.shop-tab-btn').forEach(btn => {
        btn.classList.remove('bg-amber-500', 'text-white', 'shadow');
        btn.classList.add('bg-slate-100', 'text-slate-600');
    });
    
    const sel = document.getElementById('tab-shop-' + tab);
    if (sel) {
        sel.classList.remove('bg-slate-100', 'text-slate-600');
        sel.classList.add('bg-amber-500', 'text-white', 'shadow');
    }

    // Reset ô input tìm kiếm nếu có
    const searchInput = document.getElementById('shop-search-input');
    if (searchInput) searchInput.value = '';

    renderShopItems();
}

// Tăng giảm số lượng thao tác Mua / Bán trong Shop
function adjustShopQty(delta) {
    shopBuyQty = Math.max(1, Math.min(99, shopBuyQty + delta));
    const qtyEl = document.getElementById('shop-buy-qty');
    if (qtyEl) qtyEl.innerText = shopBuyQty;
    
    // Re-render ngay lập tức để cập nhật tổng giá tiền hiển thị trên từng thẻ
    renderShopItems();
}

// Set nhanh số lượng (1, 5, 10, 20)
function setShopQty(val) {
    shopBuyQty = val;
    const qtyEl = document.getElementById('shop-buy-qty');
    if (qtyEl) qtyEl.innerText = shopBuyQty;
    renderShopItems();
}

// Tìm kiếm vật phẩm trong Shop
function handleShopSearch(input) {
    shopSearchQuery = input.value.toLowerCase().trim();
    renderShopItems();
}

// Render danh sách vật phẩm Cửa Hàng theo Tab (Chuyển sang Lưới Grid 2 Cột)
function renderShopItems() {
    const container = document.getElementById('shop-items-container');
    if (!container) return;

    let rawItems = [];

    // 1. Gom dữ liệu theo Tab
    if (activeShopTab === 'seeds') {
        Object.keys(CROPS_DB).forEach(k => {
            rawItems.push({ key: k + '_seed', name: 'Hạt Giống ' + CROPS_DB[k].name, icon: '🌱', cost: CROPS_DB[k].seedCost, category: 'seeds' });
        });
    } else if (activeShopTab === 'trees') {
        Object.keys(TREES_DB).forEach(k => {
            rawItems.push({ key: 'sapling_' + k, name: 'Cây Giống ' + TREES_DB[k].name, icon: '🌳', cost: TREES_DB[k].saplingCost, category: 'trees' });
        });
    } else if (activeShopTab === 'animals') {
        const animals = [
            { key: 'buy_chicken', name: 'Gà Con Giống', cost: 200, icon: '🐥' },
            { key: 'buy_cow', name: 'Bò Giống', cost: 800, icon: '🐮' },
            { key: 'buy_pig', name: 'Heo Giống', cost: 500, icon: '🐷' },
            { key: 'fry_goldfish', name: 'Cá Vàng Giống', cost: 100, icon: '🐟' },
            { key: 'fry_carp', name: 'Cá Chép Giống', cost: 250, icon: '🐠' }
        ];
        rawItems = animals;
    } else if (activeShopTab === 'supplies') {
        Object.keys(SUPPLIES_DB).forEach(k => {
            const s = SUPPLIES_DB[k];
            rawItems.push({ key: k, name: s.name, icon: s.icon, cost: s.cost, category: 'supplies' });
        });
    } else if (activeShopTab === 'recipes') {
        Object.keys(RECIPES_DB).forEach(k => {
            const r = RECIPES_DB[k];
            rawItems.push({ key: k, name: r.name, icon: r.icon, cost: r.cost || 200, isRecipe: true });
        });
    } else if (activeShopTab === 'sell') {
        Object.keys(gameState.inventory).forEach(k => {
            const qtyInStock = gameState.inventory[k];
            if (qtyInStock > 0) {
                const info = getItemInfo(k);
                rawItems.push({ key: k, name: info.name, icon: info.icon, sellPrice: info.sellPrice || 10, qtyInStock: qtyInStock, isSell: true });
            }
        });
    }

    // 2. Lọc theo từ khóa tìm kiếm
    if (shopSearchQuery !== '') {
        rawItems = rawItems.filter(item => item.name.toLowerCase().includes(shopSearchQuery));
    }

    if (rawItems.length === 0) {
        container.innerHTML = `
            <div class="col-span-1 sm:col-span-2 text-center text-slate-400 py-10 font-bold">
                <span class="text-3xl block mb-2">🔍</span>
                ${activeShopTab === 'sell' ? 'Không có vật phẩm nào trong kho để bán!' : 'Không tìm thấy vật phẩm phù hợp!'}
            </div>
        `;
        return;
    }

    // 3. Chuyển container sang dải Lưới Grid 2 Cột
    container.className = "grid grid-cols-1 sm:grid-cols-2 gap-2.5";

    let html = '';
    rawItems.forEach(item => {
        if (item.isRecipe) {
            const unlocked = gameState.unlockedRecipes.includes(item.key);
            html += `
                <div class="bg-amber-50/90 rounded-2xl p-3 border border-amber-200 flex items-center justify-between shadow-sm hover:shadow transition">
                    <div class="flex items-center gap-2.5 overflow-hidden">
                        <span class="text-3xl p-1.5 bg-white rounded-xl shadow-sm">${item.icon}</span>
                        <div class="overflow-hidden">
                            <div class="font-extrabold text-xs text-slate-800 truncate">${item.name}</div>
                            <div class="text-[10px] text-amber-600 font-black mt-0.5">${unlocked ? 'Đã mở khóa' : item.cost.toLocaleString() + ' 🪙'}</div>
                        </div>
                    </div>
                    <button onclick="buyRecipe('${item.key}')" ${unlocked ? 'disabled' : ''} class="px-3 py-1.5 ${unlocked ? 'bg-slate-200 text-slate-400' : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'} font-black text-xs rounded-xl shadow whitespace-nowrap">
                        ${unlocked ? 'Đã Có' : 'Học'}
                    </button>
                </div>
            `;
        } else if (item.isSell) {
            const actualQtyToSell = Math.min(item.qtyInStock, shopBuyQty);
            const totalPrice = item.sellPrice * actualQtyToSell;
            const totalAllPrice = item.sellPrice * item.qtyInStock;

            html += `
                <div class="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm hover:shadow transition flex flex-col justify-between gap-2">
                    <div class="flex items-center gap-2.5">
                        <span class="text-3xl p-1.5 bg-emerald-50 rounded-xl border border-emerald-100">${item.icon}</span>
                        <div class="overflow-hidden">
                            <div class="font-extrabold text-xs text-slate-800 truncate">${item.name}</div>
                            <div class="text-[10px] text-slate-500">Đang có: <b class="text-emerald-600 font-extrabold text-xs">${item.qtyInStock}</b> (${item.sellPrice}🪙/cái)</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                        <button onclick="sellItem('${item.key}', ${actualQtyToSell})" class="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[11px] rounded-xl shadow active:scale-95 whitespace-nowrap">
                            Bán x${actualQtyToSell} (+${totalPrice.toLocaleString()}🪙)
                        </button>
                        ${item.qtyInStock > actualQtyToSell ? `
                            <button onclick="sellItem('${item.key}',${item.qtyInStock})" class="px-2 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-[10px] rounded-xl shadow active:scale-95 whitespace-nowrap">
                                Tất cả (${totalAllPrice.toLocaleString()}🪙)
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            const totalPrice = item.cost * shopBuyQty;
            html += `
                <div class="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm hover:shadow transition flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2.5 overflow-hidden">
                        <span class="text-3xl p-1.5 bg-amber-50 rounded-xl border border-amber-100">${item.icon}</span>
                        <div class="overflow-hidden">
                            <div class="font-extrabold text-xs text-slate-800 truncate">${item.name}</div>
                            <div class="text-[10px] text-amber-600 font-black mt-0.5">${totalPrice.toLocaleString()} 🪙 (x${shopBuyQty})</div>
                        </div>
                    </div>
                    <button onclick="buyItem('${item.key}')" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow active:scale-95 whitespace-nowrap">Mua</button>
                </div>
            `;
        }
    });

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
        
        // Cập nhật thanh Stats + Tự động re-render lại khung hiển thị Shop
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

// Bán Đồ trong Shop (Cập nhật real-time ngay sau khi bấm bán)
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
    
    // Cập nhật thanh Vàng + Tự động làm mới danh sách kho Bán
    updateUI();
    renderShopItems();
    saveGame();
}
