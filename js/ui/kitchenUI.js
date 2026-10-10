// Nhà bếp chibi: tối đa 3 bếp, mỗi bếp có 1 món đang nấu + tối đa 3 món chờ.
const KITCHEN_QUEUE_LIMIT = 3;
const kitchenReadyNotified = new Map();

function kitchenHasIngredients(recipe) {
    if (!recipe || !recipe.ingredients) return false;
    return Object.entries(recipe.ingredients).every(([itemKey, required]) =>
        (Number(gameState.inventory[itemKey]) || 0) >= Number(required)
    );
}

function kitchenMissingIngredients(recipe) {
    if (!recipe || !recipe.ingredients) return [];
    return Object.entries(recipe.ingredients).filter(([itemKey, required]) =>
        (Number(gameState.inventory[itemKey]) || 0) < Number(required)
    ).map(([itemKey, required]) => `${getItemInfo(itemKey).name} cần ${required}`);
}

function startStoveRecipe(stove, recipeKey) {
    const recipe = RECIPES_DB[recipeKey];
    if (!stove || !stove.unlocked || stove.cooking || !recipe || !kitchenHasIngredients(recipe)) return false;

    // Nguyên liệu chỉ bị trừ đúng lúc món thực sự bắt đầu nấu.
    Object.entries(recipe.ingredients).forEach(([itemKey, required]) => {
        gameState.inventory[itemKey] = Math.max(0, (Number(gameState.inventory[itemKey]) || 0) - Number(required));
    });
    stove.cooking = true;
    stove.recipeId = recipeKey;
    stove.startTime = Date.now();
    stove.duration = Math.max(0, Number(recipe.cookTime) || 0);
    return true;
}

// Được gọi mỗi giây; nếu bếp trống, món đầu hàng sẽ tự bắt đầu khi đủ nguyên liệu.
// Đồng hồ dùng timestamp thực nên vẫn chạy khi đóng game/offline.
function updateKitchenQueueScheduler() {
    if (!gameState || !Array.isArray(gameState.kitchenStoves)) return false;
    let changed = false;
    gameState.kitchenStoves.slice(0, 3).forEach(stove => {
        if (!stove) return;
        if (stove.cooking) {
            const ready = (Date.now() - Number(stove.startTime || 0)) / 1000 >= Math.max(0, Number(stove.duration) || 0);
            const jobKey = `${Number(stove.startTime) || 0}|${stove.recipeId || ''}`;
            if (ready && kitchenReadyNotified.get(stove.id) !== jobKey) {
                kitchenReadyNotified.set(stove.id, jobKey);
                if (typeof playFarmSound === 'function') playFarmSound('kitchen-done');
            }
        } else {
            kitchenReadyNotified.delete(stove.id);
        }
        if (!stove.unlocked || stove.cooking || !Array.isArray(stove.queue) || stove.queue.length === 0) return;
        const nextJob = stove.queue[0];
        const recipe = nextJob && RECIPES_DB[nextJob.recipeId];
        if (!recipe || !kitchenHasIngredients(recipe)) return;
        if (startStoveRecipe(stove, nextJob.recipeId)) {
            stove.queue.shift();
            changed = true;
        }
    });
    if (changed && typeof saveGame === 'function') saveGame();
    return changed;
}

function renderKitchenStoves() {
    const tabsContainer = document.getElementById('kitchen-stoves-tabs');
    if (!tabsContainer || !Array.isArray(gameState.kitchenStoves)) return;
    gameState.kitchenStoves = gameState.kitchenStoves.slice(0, 3);
    gameState.selectedStoveIdx = Math.max(0, Math.min(gameState.kitchenStoves.length - 1, Number(gameState.selectedStoveIdx) || 0));

    tabsContainer.innerHTML = gameState.kitchenStoves.map((stove, idx) => {
        const selected = idx === gameState.selectedStoveIdx;
        const activeRecipe = stove.cooking && RECIPES_DB[stove.recipeId];
        const ready = activeRecipe && (Date.now() - Number(stove.startTime || 0)) / 1000 >= Math.max(0, Number(stove.duration) || 0);
        const title = idx === 0 ? 'Bếp chính' : (idx === 1 ? 'Bếp phụ' : 'Bếp cao cấp');
        const status = !stove.unlocked ? '🔒 Khóa' : (ready ? '✨ Đã xong' : (stove.cooking ? '🔥 Đang nấu' : (stove.queue.length ? '🧺 Có hàng chờ' : '🌷 Sẵn sàng')));
        return `<button onclick="selectStove(${idx})" class="min-h-[76px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition ${selected ? 'bg-orange-400 text-white border-orange-500 shadow-md scale-[1.02]' : (stove.unlocked ? 'bg-white/90 text-amber-900 border-amber-200 hover:bg-orange-50' : 'bg-stone-100 text-stone-400 border-stone-200')}">
            <span class="text-xl">${idx === 0 ? '🍲' : (idx === 1 ? '🥘' : '🫕')}</span>
            <span class="text-[11px] font-black">${title}</span>
            <span class="text-[9px] font-bold">${status}</span>
        </button>`;
    }).join('');

    const stove = gameState.kitchenStoves[gameState.selectedStoveIdx];
    const statusEl = document.getElementById('stove-cooking-status');
    const recipesContainer = document.getElementById('kitchen-recipes-container');
    if (!stove || !statusEl || !recipesContainer) return;

    if (!stove.unlocked) {
        statusEl.innerHTML = `<div class="flex items-center gap-3"><div class="text-4xl">🔐</div><div class="flex-1 min-w-0"><div class="font-black text-amber-950 text-sm">${stove.id === 1 ? 'Bếp phụ' : 'Bếp cao cấp'} đang khóa</div><div class="text-[11px] text-amber-800 mt-1">Cần đạt level ${stove.levelReq} và trả ${Number(stove.cost).toLocaleString('vi-VN')} vàng. Mở khóa một lần, lưu vĩnh viễn.</div></div><button onclick="unlockStove(${stove.id})" class="shrink-0 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow">Mở bếp</button></div>`;
    } else if (stove.cooking) {
        const recipe = RECIPES_DB[stove.recipeId];
        if (recipe) {
            const remaining = Math.max(0, Math.ceil(Number(stove.duration || 0) - (Date.now() - Number(stove.startTime || 0)) / 1000));
            const done = remaining === 0;
            statusEl.innerHTML = `<div class="flex items-center gap-3"><div class="w-14 h-14 rounded-2xl bg-white/90 border border-amber-200 flex items-center justify-center text-3xl shadow-sm">${recipe.icon}</div><div class="flex-1 min-w-0"><div class="text-[10px] font-black uppercase tracking-wide text-amber-700">${done ? 'Món đã hoàn thành' : 'Đang nấu trên bếp'}</div><div class="font-black text-amber-950 text-sm truncate">${recipe.name}</div><div class="text-[11px] text-amber-800 mt-1">${done ? 'Món đã sẵn sàng để nhận.' : `Còn ${formatTime(remaining)} · tiếp tục tính giờ khi offline`}</div></div><button onclick="claimCookedFood(${stove.id})" ${!done ? 'disabled' : ''} class="shrink-0 px-3 py-2 rounded-xl font-black text-xs ${done ? 'bg-emerald-500 text-white shadow animate-pulse' : 'bg-stone-200 text-stone-400'}">${done ? 'Nhận món' : 'Đang nấu'}</button></div>`;
        }
    } else if (stove.queue.length) {
        const next = RECIPES_DB[stove.queue[0].recipeId];
        const missing = next ? kitchenMissingIngredients(next) : [];
        statusEl.innerHTML = `<div class="flex items-center gap-3"><div class="text-4xl">${missing.length ? '🧺' : '🍲'}</div><div class="flex-1"><div class="font-black text-amber-950">${missing.length ? 'Đang chờ nguyên liệu' : 'Bếp chuẩn bị món tiếp theo'}</div><div class="text-[11px] text-amber-800 mt-1">${next ? `${next.icon} ${next.name}` : 'Món tiếp theo'}${missing.length ? ` · Thiếu ${missing.join(', ')}` : ' · sẽ tự bắt đầu khi bếp trống'}</div></div><span class="text-xs font-black text-amber-800">${stove.queue.length}/3</span></div>`;
    } else {
        statusEl.innerHTML = `<div class="flex items-center gap-3"><div class="text-4xl">🏡</div><div class="flex-1"><div class="font-black text-amber-950">Bếp đang nghỉ</div><div class="text-[11px] text-amber-800 mt-1">Chọn công thức bên dưới để bắt đầu nấu hoặc thêm món vào hàng chờ.</div></div><span class="text-xs font-black text-amber-800">0/3 chờ</span></div>`;
    }

    const queueHtml = `<section class="rounded-2xl border border-orange-200 bg-white/75 p-3 shadow-sm mb-3">
        <div class="flex items-center justify-between gap-2 mb-2"><div class="font-black text-sm text-amber-950">🧺 Hàng chờ của bếp này</div><span class="text-[10px] font-black rounded-full bg-orange-100 text-orange-800 px-2 py-1">${stove.queue.length}/3 món</span></div>
        ${stove.queue.length ? stove.queue.map((job, i) => { const r = RECIPES_DB[job.recipeId]; const missing = r ? kitchenMissingIngredients(r) : []; return `<div class="flex items-center gap-2 py-2 ${i ? 'border-t border-orange-100' : ''}"><span class="text-2xl">${r ? r.icon : '🍲'}</span><div class="flex-1 min-w-0"><div class="font-bold text-xs text-slate-800 truncate">${r ? r.name : 'Công thức không hợp lệ'}</div><div class="text-[10px] ${missing.length ? 'text-rose-600' : 'text-slate-500'}">${missing.length ? `Chờ nguyên liệu: ${missing.join(', ')}` : 'Chưa trừ nguyên liệu · sẽ trừ khi bắt đầu nấu'}</div></div><button onclick="removeQueuedRecipe(${stove.id}, ${i})" class="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-black">Bỏ</button></div>`; }).join('') : '<div class="text-[11px] text-slate-500 py-2">Chưa có món chờ. Mỗi bếp xếp tối đa 3 món.</div>'}
    </section>`;

    // Stable sort: công thức đủ nguyên liệu luôn nằm trên, giữ thứ tự gốc trong mỗi nhóm.
    const sortedRecipeKeys = (Array.isArray(gameState.unlockedRecipes) ? gameState.unlockedRecipes : [])
        .map((key, originalIndex) => ({ key, originalIndex, recipe: RECIPES_DB[key] }))
        .filter(entry => !!entry.recipe)
        .sort((a, b) => {
            const aMissing = kitchenMissingIngredients(a.recipe).length > 0 ? 1 : 0;
            const bMissing = kitchenMissingIngredients(b.recipe).length > 0 ? 1 : 0;
            return aMissing - bMissing || a.originalIndex - b.originalIndex;
        });
    const recipesHtml = sortedRecipeKeys.map(({ key, recipe }) => {
        const missing = kitchenMissingIngredients(recipe);
        const hasRoom = stove.queue.length < KITCHEN_QUEUE_LIMIT;
        const buttonDisabled = !stove.unlocked || !hasRoom;
        const ingredientText = Object.entries(recipe.ingredients || {}).map(([id, qty]) => `${getItemInfo(id).name} ${Number(gameState.inventory[id]) || 0}/${qty}`).join(' · ');
        return `<article class="${recipe.isFeed ? 'bg-amber-50 border-amber-200' : 'bg-white/90 border-orange-100'} rounded-2xl p-3 border shadow-sm flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-3xl shrink-0">${recipe.icon}</div>
            <div class="flex-1 min-w-0"><div class="font-black text-xs text-slate-800">${recipe.name}</div><div class="text-[10px] text-slate-500 mt-1 leading-relaxed">${ingredientText}</div><div class="text-[10px] ${missing.length ? 'text-rose-500' : 'text-emerald-700'} mt-1">${missing.length ? `❗ Thiếu hiện tại: ${missing.map(x => x.replace(' cần ', ' ')).join(', ')}` : `⏱ ${formatTime(Number(recipe.cookTime) || 0)} · đủ nguyên liệu`}</div></div>
            <button onclick="cookRecipe('${key}')" ${buttonDisabled ? 'disabled' : ''} class="shrink-0 px-3 py-2 rounded-xl text-[11px] font-black shadow-sm ${buttonDisabled ? 'bg-stone-100 text-stone-400' : 'bg-orange-400 hover:bg-orange-500 text-white'}">${hasRoom ? 'Xếp món' : 'Đầy hàng'}</button>
        </article>`;
    }).join('');
    recipesContainer.innerHTML = queueHtml + `<div class="flex items-center justify-between gap-2 mb-1"><div class="font-black text-sm text-amber-950">📖 Công thức nhà bếp</div><div class="text-[10px] text-slate-500">Nguyên liệu trừ khi bắt đầu nấu</div></div>` + recipesHtml;
}

function selectStove(idx) {
    const index = Math.floor(Number(idx));
    if (!Array.isArray(gameState.kitchenStoves) || !Number.isInteger(index) || index < 0 || index >= Math.min(3, gameState.kitchenStoves.length)) return;
    gameState.selectedStoveIdx = index;
    renderKitchenStoves();
}

function unlockStove(stoveIdx) {
    const stove = Array.isArray(gameState.kitchenStoves) ? gameState.kitchenStoves[stoveIdx] : null;
    if (!stove || stove.unlocked) return;
    if (gameState.level < stove.levelReq) {
        showToast('Chưa đủ level! ⭐', `Cần level ${stove.levelReq} để mở bếp này.`, '🔒');
        return;
    }
    if (gameState.gold < stove.cost) {
        showToast('Chưa đủ vàng! 🪙', `Cần ${Number(stove.cost).toLocaleString('vi-VN')} vàng để mở bếp.`, '🪙');
        return;
    }
    gameState.gold -= stove.cost;
    stove.unlocked = true;
    if (typeof build4CookingStoves === 'function') build4CookingStoves();
    showToast('Mở bếp thành công! 🏡', `Đã mở ${stoveIdx === 1 ? 'Bếp phụ' : 'Bếp cao cấp'} vĩnh viễn.`, '🎉');
    updateUI();
    renderKitchenStoves();
    saveGame();
}

// Thêm món vào bếp đang chọn. Nếu bếp rảnh và đủ nguyên liệu, món bắt đầu ngay;
// nếu không, món được xếp hàng mà chưa tiêu hao nguyên liệu.
function cookRecipe(recipeKey) {
    const stove = Array.isArray(gameState.kitchenStoves) ? gameState.kitchenStoves[gameState.selectedStoveIdx] : null;
    const recipe = RECIPES_DB[recipeKey];
    if (!stove || !stove.unlocked || !recipe || !recipe.ingredients || typeof recipe.ingredients !== 'object') {
        showToast('Không thể xếp món! 🍳', 'Bếp hoặc công thức không hợp lệ.', '❌');
        return;
    }
    if (!Array.isArray(stove.queue)) stove.queue = [];
    if (stove.queue.length >= KITCHEN_QUEUE_LIMIT) {
        showToast('Hàng chờ đã đầy! 🧺', 'Mỗi bếp chỉ nhận tối đa 3 món chờ.', '🧺');
        return;
    }
    const previousStartTime = Number(stove.startTime) || 0;
    stove.queue.push({ recipeId: recipeKey, queuedAt: Date.now() });
    updateKitchenQueueScheduler();
    const startedThisJob = stove.cooking && stove.recipeId === recipeKey && Number(stove.startTime) !== previousStartTime;
    if (startedThisJob && typeof playFarmSound === 'function') playFarmSound('cook');
    if (startedThisJob) showToast('Bắt đầu nấu! 🍲', `Đang nấu ${recipe.name}. Nguyên liệu đã được trừ.`, '🔥');
    else showToast('Đã xếp vào hàng chờ! 🧺', `${recipe.name} sẽ bắt đầu khi bếp trống và đủ nguyên liệu.`, '✨');
    renderKitchenStoves();
    updateUI();
    saveGame();
}

function removeQueuedRecipe(stoveIdx, queueIndex) {
    const stove = gameState.kitchenStoves && gameState.kitchenStoves[stoveIdx];
    if (!stove || !Array.isArray(stove.queue) || queueIndex < 0 || queueIndex >= stove.queue.length) return;
    const [job] = stove.queue.splice(queueIndex, 1);
    const recipe = job && RECIPES_DB[job.recipeId];
    showToast('Đã bỏ món chờ', `${recipe ? recipe.name : 'Món ăn'} đã được gỡ khỏi hàng chờ. Chưa có nguyên liệu nào bị trừ.`, '🧺');
    renderKitchenStoves();
    saveGame();
}

function claimCookedFood(stoveIdx) {
    const stove = Array.isArray(gameState.kitchenStoves) ? gameState.kitchenStoves[stoveIdx] : null;
    if (!stove || !stove.cooking || !RECIPES_DB[stove.recipeId]) return;
    const recipe = RECIPES_DB[stove.recipeId];
    const elapsed = (Date.now() - Number(stove.startTime || 0)) / 1000;
    if (elapsed < Math.max(0, Number(stove.duration) || 0)) {
        showToast('Chưa nấu xong! 🍳', 'Hãy đợi món ăn hoàn thành rồi nhận nhé.', '⏳');
        return;
    }
    if (recipe.isFeed && recipe.outputItem) {
        const addQty = Math.max(1, Math.floor(Number(recipe.outputQty) || 1));
        gameState.inventory[recipe.outputItem] = (Number(gameState.inventory[recipe.outputItem]) || 0) + addQty;
        showToast('Chế tạo thành công! 🌾', `Nhận được +${addQty} ${getItemInfo(recipe.outputItem).name}!`, '🎉');
    } else {
        gameState.inventory[stove.recipeId] = (Number(gameState.inventory[stove.recipeId]) || 0) + 1;
        if (!gameState.statistics || typeof gameState.statistics !== 'object') gameState.statistics = { animalsSold: 0, mealsCooked: 0, playTimeSeconds: 0, animalSicknessEvents: 0, cropsPlanted: 0 };
        gameState.statistics.mealsCooked = (Number(gameState.statistics.mealsCooked) || 0) + 1;
        trackQuestProgress('cook_recipe', stove.recipeId);
        showToast('Món ăn hoàn thành! 🍲', `Nhận được 1 ${recipe.name}!`, '🎉');
    }
    stove.cooking = false;
    stove.recipeId = null;
    stove.startTime = 0;
    stove.duration = 0;
    addExp(25);
    updateKitchenQueueScheduler();
    renderKitchenStoves();
    updateUI();
    saveGame();
}
