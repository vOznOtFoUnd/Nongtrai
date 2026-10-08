// Render Giao Diện 4 Bếp Nấu Ăn & Cối Chế Biến
function renderKitchenStoves() {
    const tabsContainer = document.getElementById('kitchen-stoves-tabs');
    if (!tabsContainer) return;

    let tabsHtml = '';
    gameState.kitchenStoves.forEach((s, idx) => {
        const isSelected = idx === gameState.selectedStoveIdx;
        tabsHtml += `
            <button onclick="selectStove(${idx})" class="p-2 rounded-2xl border flex flex-col items-center justify-center transition ${isSelected ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-105' : (s.unlocked ? 'bg-white text-slate-700 border-slate-200' : 'bg-slate-200 text-slate-400 border-slate-300')}">
                <span class="text-lg">🍳</span>
                <span class="text-[10px] font-black">Bếp ${idx + 1}</span>
            </button>
        `;
    });
    tabsContainer.innerHTML = tabsHtml;

    const curStove = gameState.kitchenStoves[gameState.selectedStoveIdx];
    const statusEl = document.getElementById('stove-cooking-status');

    if (!curStove.unlocked) {
        statusEl.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <div class="font-extrabold text-slate-800">Bếp ${curStove.id + 1} chưa mở khóa</div>
                    <div class="text-[11px] text-slate-500">Yêu cầu Cấp ${curStove.levelReq} - Giá: ${curStove.cost.toLocaleString()} 🪙</div>
                </div>
                <button onclick="unlockStove(${curStove.id})" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow">Mở Khoá</button>
            </div>
        `;
    } else if (curStove.cooking) {
        const recipe = RECIPES_DB[curStove.recipeId];
        const elapsed = (Date.now() - curStove.startTime) / 1000;
        const remSecs = Math.max(0, Math.ceil(curStove.duration - elapsed));

        statusEl.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <div class="font-extrabold text-slate-800 flex items-center gap-1">${recipe.icon} Đang chế biến ${recipe.name}...</div>
                    <div class="text-[11px] text-slate-500">Thời gian còn lại: <b>${formatTime(remSecs)}</b></div>
                </div>
                <button onclick="claimCookedFood(${curStove.id})" ${remSecs > 0 ? 'disabled' : ''} class="px-3 py-1.5 ${remSecs === 0 ? 'bg-amber-500 hover:bg-amber-600 text-white animate-bounce' : 'bg-slate-300 text-slate-500'} font-bold rounded-xl shadow">
                    ${remSecs === 0 ? 'Nhận Thành Phẩm' : 'Đang Chế Biến'}
                </button>
            </div>
        `;
    } else {
        statusEl.innerHTML = `<div class="text-slate-600 font-bold text-center">Bếp trống. Chọn công thức hoặc loại thức ăn bên dưới để bắt đầu!</div>`;
    }

    const recipesContainer = document.getElementById('kitchen-recipes-container');
    let recipesHtml = '';

    gameState.unlockedRecipes.forEach(rKey => {
        const r = RECIPES_DB[rKey];
        if (!r) return;
        
        let canCook = true;
        let reqText = [];

        Object.keys(r.ingredients).forEach(ing => {
            const reqQty = r.ingredients[ing];
            const hasQty = gameState.inventory[ing] || 0;
            if (hasQty < reqQty) canCook = false;
            const ingInfo = getItemInfo(ing);
            reqText.push(`${ingInfo.name}: ${hasQty}/${reqQty}`);
        });

        recipesHtml += `
            <div class="${r.isFeed ? 'bg-amber-100/90 border-amber-300' : 'bg-white/90 border-amber-200'} rounded-2xl p-3 border flex items-center justify-between shadow-sm">
                <div class="flex items-center gap-2.5">
                    <span class="text-3xl">${r.icon}</span>
                    <div>
                        <div class="font-black text-xs text-slate-800">${r.name}</div>
                        <div class="text-[10px] text-slate-500">${reqText.join(' | ')}</div>
                    </div>
                </div>
                <button onclick="cookRecipe('${rKey}')" ${(!curStove.unlocked || curStove.cooking || !canCook) ? 'disabled' : ''} class="px-3 py-1.5 ${canCook && curStove.unlocked && !curStove.cooking ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-200 text-slate-400'} font-bold text-xs rounded-xl shadow whitespace-nowrap">
                    Chế Biến
                </button>
            </div>
        `;
    });

    recipesContainer.innerHTML = recipesHtml;
}

// Chọn Bếp Nấu Ăn
function selectStove(idx) {
    gameState.selectedStoveIdx = idx;
    renderKitchenStoves();
}

// Mở Khóa Bếp Mới
function unlockStove(stoveIdx) {
    const stove = gameState.kitchenStoves[stoveIdx];
    if (gameState.level < stove.levelReq) {
        showToast("Cấp Độ Chưa Đủ! ⭐", `Bạn cần Cấp ${stove.levelReq} để mở bếp này!`, "❌");
        return;
    }
    if (gameState.gold < stove.cost) {
        showToast("Thiếu Vàng! 🪙", `Bạn cần ${stove.cost} Vàng để mở bếp này!`, "❌");
        return;
    }

    gameState.gold -= stove.cost;
    stove.unlocked = true;
    if (typeof build4CookingStoves === 'function') build4CookingStoves();
    showToast("Mở Khoá Bếp Nấu! 🍳", `Đã mở khóa Bếp ${stoveIdx + 1}!`, "🎉");
    updateUI();
    renderKitchenStoves();
    saveGame();
}

// Bắt Đầu Nấu / Trộn Thức Ăn
function cookRecipe(recipeKey) {
    const stove = gameState.kitchenStoves[gameState.selectedStoveIdx];
    if (!stove || !stove.unlocked || stove.cooking) return;

    const r = RECIPES_DB[recipeKey];
    Object.keys(r.ingredients).forEach(ing => {
        gameState.inventory[ing] -= r.ingredients[ing];
    });

    stove.cooking = true;
    stove.recipeId = recipeKey;
    stove.startTime = Date.now();
    stove.duration = r.cookTime;

    showToast("Bắt Đầu Chế Biến! 🍳", `Đang thực hiện "${r.name}"...`, "🔥");
    renderKitchenStoves();
    saveGame();
}

// Nhận Món Ăn / Thức Ăn Gia Súc Đã Nấu Xong
function claimCookedFood(stoveIdx) {
    const stove = gameState.kitchenStoves[stoveIdx];
    if (!stove || !stove.cooking) return;

    const r = RECIPES_DB[stove.recipeId];
    
    if (r.isFeed && r.outputItem) {
        // Trường hợp chế tạo Thức ăn gia súc (được cộng nhiều món một lúc)
        const addQty = r.outputQty || 1;
        gameState.inventory[r.outputItem] = (gameState.inventory[r.outputItem] || 0) + addQty;
        showToast("Chế Tạo Thành Công! 🌾", `Nhận được +${addQty} ${getItemInfo(r.outputItem).name}!`, "🎉");
    } else {
        // Trường hợp nấu món ăn bình thường
        gameState.inventory[stove.recipeId] = (gameState.inventory[stove.recipeId] || 0) + 1;
        trackQuestProgress('cook_recipe', stove.recipeId);
        showToast("Món Ăn Hoàn Thành! 🍳", `Nhận được 1 ${r.name}!`, "🎉");
    }

    addExp(25);
    stove.cooking = false;
    stove.recipeId = null;

    renderKitchenStoves();
    saveGame();
}
