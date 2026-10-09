let shopSearchQuery = '';
if (typeof activeShopTab === 'undefined') window.activeShopTab = 'plants';
if (typeof shopBuyQty === 'undefined') window.shopBuyQty = 1;
if (typeof shopMode === 'undefined') window.shopMode = 'buy';
if (typeof activePlantType === 'undefined') window.activePlantType = 'crops';

// Cửa hàng dùng bảng mở khóa cố định theo cấp, không quay vòng hàng theo ngày.
function getShopUnlockLevel(key) {
    if (['rice_seed','corn_seed','buy_chicken','feed_chicken','feed_cow','feed_pig','medicine'].includes(key)) return 1;
    if (key === 'buy_cow' || key === 'buy_pig') return key === 'buy_cow' ? 4 : 3;
    if (key === 'buy_duck' || key === 'fry_goldfish') return 3;
    if (key === 'fry_carp') return 6;
    const cropLevels = { potato:2, carrot:3, tomato:4, pumpkin:5, eggplant:6, chili:7, watermelon:8, pineapple:10, strawberry:12 };
    if (key.endsWith('_seed')) return cropLevels[key.slice(0, -5)] || 1;
    const treeLevels = { apple:5, orange:8, peach:12, mango:16 };
    if (key.startsWith('sapling_')) return treeLevels[key.slice(8)] || 1;
    const recipeLevels = { rice_bowl:1, grilled_corn:1, fried_egg:2, apple_juice:5, pork_stew:3, craft_feed_chicken:1, craft_feed_cow:2, craft_feed_pig:3, craft_feed_duck:2, craft_feed_fish:2, craft_medicine:4, potato_fries:2, carrot_soup:3, eggplant_grill:5, chili_noodles:7, pineapple_juice:9, duck_egg_rice:5, roasted_duck:8, boiled_duck_egg:3, duck_noodles:7, fish_soup:6, fish_rice:5, fried_fish:7, tropical_salad:8, farm_hotpot:10, strawberry_tart:12, watermelon_juice:8, grilled_fish:6, orange_smoothie:8, peach_tea:12, pumpkin_soup:5, strawberry_cake:12, mango_smoothie:16, apple_steak:10, seafood_pumpkin:14 };
    if (Object.prototype.hasOwnProperty.call(recipeLevels, key)) return recipeLevels[key];
    return 1;
}
function isShopItemUnlocked(key) { return (Number(gameState.level) || 1) >= getShopUnlockLevel(key); }

function updateShopNavigation() {
    document.querySelectorAll('.shop-tab-btn').forEach(btn => {
        const active = btn.id === 'tab-shop-' + activeShopTab;
        btn.classList.toggle('bg-amber-500', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('shadow', active);
        btn.classList.toggle('bg-white', !active);
        btn.classList.toggle('text-slate-600', !active);
        btn.classList.toggle('border', !active);
        btn.classList.toggle('border-slate-200', !active);
    });

    document.querySelectorAll('.shop-mode-btn').forEach(btn => {
        const active = btn.id === 'shop-mode-' + shopMode;
        btn.classList.toggle('bg-emerald-600', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('shadow', active);
        btn.classList.toggle('bg-white', !active);
        btn.classList.toggle('text-slate-600', !active);
    });

    document.querySelectorAll('.shop-plant-subtab-btn').forEach(btn => {
        const active = btn.id === 'shop-plant-' + activePlantType;
        btn.classList.toggle('bg-emerald-100', active);
        btn.classList.toggle('text-emerald-700', active);
        btn.classList.toggle('border-emerald-200', active);
        btn.classList.toggle('bg-white', !active);
        btn.classList.toggle('text-slate-500', !active);
        btn.classList.toggle('border-slate-200', !active);
    });

    const categories = document.getElementById('shop-buy-categories');
    const plantSubtabs = document.getElementById('shop-plant-subtabs');
    if (categories) categories.classList.toggle('hidden', shopMode !== 'buy');
    if (plantSubtabs) plantSubtabs.classList.toggle('hidden', shopMode !== 'buy' || activeShopTab !== 'plants');
}

// Chuyển danh mục. Tương thích với lời gọi cũ seeds/trees.
function switchShopTab(tab) {
    if (tab === 'seeds') { tab = 'plants'; activePlantType = 'crops'; }
    if (tab === 'trees') { tab = 'plants'; activePlantType = 'trees'; }
    if (!['plants', 'animals', 'recipes', 'supplies'].includes(tab)) return;
    activeShopTab = tab;
    shopMode = 'buy';
    updateShopNavigation();
    renderShopItems();
}

function switchShopMode(mode) {
    if (mode !== 'buy' && mode !== 'sell') return;
    shopMode = mode;
    updateShopNavigation();
    renderShopItems();
}

function switchPlantType(type) {
    if (type !== 'crops' && type !== 'trees') return;
    activePlantType = type;
    updateShopNavigation();
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
    shopBuyQty = Math.max(1, Math.min(99, Math.floor(Number(val) || 1)));
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
    const note = document.getElementById('shop-stock-note');
    if (note) note.textContent = shopMode === 'sell' ? '💰 Bán vật phẩm trong túi.' : `🔓 Cửa hàng mở khóa theo cấp nhân vật (cấp ${Number(gameState.level)||1}). Giá và thời gian sinh trưởng được giữ cố định.`;
    const goldDisplay = document.getElementById('shop-gold-display');
    if (goldDisplay && typeof gameState !== 'undefined') {
        goldDisplay.innerText = gameState.gold.toLocaleString();
    }

    let rawItems = [];

    // 1. Dữ liệu theo chế độ và danh mục
    if (shopMode === 'sell') {
        if (typeof gameState !== 'undefined' && gameState.inventory) {
            Object.keys(gameState.inventory).forEach(k => {
                const qtyInStock = Number(gameState.inventory[k]) || 0;
                if (qtyInStock > 0) {
                    const info = getItemInfo(k);
                    if (info && Number.isFinite(Number(info.sellPrice)) && Number(info.sellPrice) >= 0) rawItems.push({ key: k, name: info.name, icon: info.icon, sellPrice: Number(info.sellPrice), qtyInStock, isSell: true });
                }
            });
        }
    } else if (activeShopTab === 'plants' && activePlantType === 'crops') {
        if (typeof CROPS_DB !== 'undefined') {
            Object.keys(CROPS_DB).forEach(k => {
                const key = k + '_seed';
                if (isShopItemUnlocked(key)) rawItems.push({ key, name: 'Hạt Giống ' + CROPS_DB[k].name, icon: CROPS_DB[k].icon || '🌱', cost: CROPS_DB[k].seedCost });
            });
        }
    } else if (activeShopTab === 'plants' && activePlantType === 'trees') {
        if (typeof TREES_DB !== 'undefined') {
            Object.keys(TREES_DB).forEach(k => {
                const key = 'sapling_' + k; if (isShopItemUnlocked(key)) rawItems.push({ key, name: 'Cây Giống ' + TREES_DB[k].name, icon: TREES_DB[k].icon || '🌳', cost: TREES_DB[k].saplingCost });
            });
        }
    } else if (activeShopTab === 'animals') {
        rawItems = [
            { key: 'buy_chicken', name: 'Gà Con Giống', cost: 200, icon: '🐥' },
            { key: 'buy_cow', name: 'Bò Giống', cost: 800, icon: '🐮' },
            { key: 'buy_pig', name: 'Heo Giống', cost: 500, icon: '🐷' },
            { key: 'buy_duck', name: 'Vịt Con Giống', cost: 180, icon: '🦆' },
            { key: 'fry_goldfish', name: 'Cá Vàng Giống', cost: FISH_DB.fry_goldfish.cost, icon: '🐟' },
            { key: 'fry_carp', name: 'Cá Chép Giống', cost: FISH_DB.fry_carp.cost, icon: '🐠' }
        ].filter(item => isShopItemUnlocked(item.key));
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
                if (isShopItemUnlocked(k)) rawItems.push({ key: k, name: r.name, icon: r.icon, cost: Number.isFinite(Number(r.cost)) && Number(r.cost) > 0 ? Number(r.cost) : 200, isRecipe: true });
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
                <span class="text-4xl block mb-2">${shopMode === 'sell' ? '📦' : '🔍'}</span>
                <div class="font-bold text-xs text-slate-600 mb-1">
                    ${shopMode === 'sell' ? 'Túi đồ rỗng, chưa có vật phẩm để bán!' : 'Không tìm thấy vật phẩm phù hợp!'}
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
    const qty = Math.floor(Number(shopBuyQty));
    const unitPrice = info && info.cost !== undefined ? Number(info.cost) : NaN;
    if (!info || !Number.isFinite(qty) || qty < 1 || qty > 99 || !Number.isFinite(unitPrice) || unitPrice < 0 || !gameState.inventory) {
        showToast('Không Thể Mua! 🛒', 'Vật phẩm hoặc số lượng mua không hợp lệ.', '❌');
        return;
    }
    const totalPrice = unitPrice * qty;
    if (!Number.isFinite(totalPrice) || totalPrice > gameState.gold) {
        showToast('Không Đủ Vàng! 🪙', 'Bạn cần thêm vàng để mua vật phẩm này!', '❌');
        return;
    }
    gameState.gold -= totalPrice;
    gameState.inventory[itemKey] = (Number(gameState.inventory[itemKey]) || 0) + qty;
    showToast('Mua Thành Công! 🛒', `Đã mua ${qty} ${info.name}!`, '🪙');
    updateUI();
    renderShopItems();
    saveGame();
}

// Mua Công Thức
function buyRecipe(recipeKey) {
    const recipe = RECIPES_DB[recipeKey];
    if (!recipe || !Array.isArray(gameState.unlockedRecipes)) {
        showToast('Công Thức Không Hợp Lệ! 📜', 'Không tìm thấy công thức này.', '❌');
        return;
    }
    if (gameState.unlockedRecipes.includes(recipeKey)) {
        showToast('Đã Có Công Thức! 📜', 'Bạn đã mở khóa công thức này rồi.', 'ℹ️');
        return;
    }
    const cost = Number.isFinite(Number(recipe.cost)) ? Number(recipe.cost) : 200;
    if (!Number.isFinite(cost) || cost < 0) return;
    if (gameState.gold < cost) {
        showToast('Không Đủ Vàng! 🪙', 'Bạn cần thêm vàng để mua công thức này!', '❌');
        return;
    }
    gameState.gold -= cost;
    gameState.unlockedRecipes.push(recipeKey);
    showToast('Đã Học Công Thức! 📜', `Bạn đã mở khóa món ăn "${recipe.name}"!`, '🎉');
    updateUI();
    renderShopItems();
    saveGame();
}

// Bán Đồ
function sellItem(itemKey, qtyToSell) {
    const currentQty = Number(gameState.inventory && gameState.inventory[itemKey]) || 0;
    const requestedQty = qtyToSell === undefined ? 1 : Math.floor(Number(qtyToSell));
    const info = getItemInfo(itemKey);
    const unitPrice = info && info.sellPrice !== undefined ? Number(info.sellPrice) : NaN;
    if (currentQty <= 0 || !Number.isFinite(requestedQty) || requestedQty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
        showToast('Không Thể Bán! 💰', 'Vật phẩm hoặc số lượng bán không hợp lệ.', '❌');
        return;
    }
    const sellAmount = Math.min(currentQty, requestedQty);
    const totalPrice = unitPrice * sellAmount;
    gameState.gold = (Number(gameState.gold) || 0) + totalPrice;
    gameState.inventory[itemKey] = currentQty - sellAmount;
    showToast('Bán Hàng Thành Công! 💰', `Đã bán ${sellAmount} ${info.name} (+${totalPrice.toLocaleString()} 🪙)!`, '🪙');
    updateUI();
    renderShopItems();
    saveGame();
}

// Đồng bộ trạng thái các nút khi giao diện được nạp.
if (typeof document !== 'undefined') updateShopNavigation();
