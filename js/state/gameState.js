// Game State Toàn Cục
let shopBuyQty = 1;
let activeShopTab = 'plants';
let shopMode = 'buy';
let activePlantType = 'crops';

let gameState = {
    level: 1,
    exp: 0,
    gold: 2000,
    stamina: 100,
    maxStamina: 100,
    staminaFloat: 100,
    currentTool: 'hand',
    gameDay: 1,
    dayTimeSeconds: 6 * REAL_SECS_PER_GAME_HOUR,
    timeScaleVersion: 3,
    currentWeather: 'sunny',
    inventory: {
        rice_seed: 5, corn_seed: 3, sapling_apple: 2, feed_chicken: 5, feed_cow: 3, feed_pig: 3, feed_duck: 4, feed_fish: 5,
        medicine: 2, buy_chicken: 2, buy_cow: 1, buy_pig: 1, buy_duck: 2, fry_goldfish: 2, egg: 2, duck_egg: 0, milk: 1, pork: 0, worm: 2
    },
    // Mở khóa sẵn các công thức cơ bản + công thức làm thức ăn gia súc
    
    unlockedRecipes: [
        'craft_feed_chicken', 'craft_feed_cow', 'craft_feed_pig', 'craft_feed_duck', 'craft_feed_fish', 'craft_medicine',
        'rice_bowl', 'grilled_corn', 'fried_egg', 'apple_juice', 'pork_stew'
    ],

    unlockedPlots: Array(CONFIG.TOTAL_PLOTS).fill(false),
    plots: Array(CONFIG.TOTAL_PLOTS).fill(null).map(() => ({
        cropId: null, plantedAt: 0, watered: false, reducedSecs: 0, hasPest: false, pestAppearedAt: 0, pestImmune: false, isDead: false, plotLevel: 1, harvestCount: 0, regrowMax: 0
    })),
    orchardLevel: 1,
    penLevels: { chicken: 1, cow: 1, pig: 1 },
    orchardPlots: Array(10).fill(null).map((_, i) => ({
        unlocked: i < 2, treeType: i === 0 ? 'apple' : null, plantedAt: i === 0 ? Date.now() - 120000 : 0
    })),
    fishPond: { 
        level: 1, capacity: 6, duckCapacity: 4, ducks: [], fishes: [
            { id: 1, type: 'fry_goldfish', plantedAt: Date.now() - 40000, hunger: 100, hungry: false, sick: false, starvingStartAt: null },
            { id: 2, type: 'fry_carp', plantedAt: Date.now() - 100000, hunger: 100, hungry: false, sick: false, starvingStartAt: null }
        ] 
    },
    chickens: [{ id: 1, bornAt: Date.now() - 200000, yieldCount: 0, hungry: false, sick: false, lastSickDay: 0, producedAt: Date.now() - 50000, x: -20, z: -18, targetX: -20, targetZ: -18 }],
    cows: [{ id: 1, bornAt: Date.now() - 400000, yieldCount: 0, hungry: false, sick: false, lastSickDay: 0, producedAt: Date.now() - 100000, x: -20, z: 10, targetX: -20, targetZ: 10 }],
    pigs: [{ id: 1, bornAt: Date.now() - 200000, hungry: false, sick: false, lastSickDay: 0, producedAt: Date.now() - 150000, x: 20, z: 14, targetX: 20, targetZ: 14 }],
    
    kitchenStoves: [
        { id: 0, levelReq: 1, cost: 0, unlocked: true, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0, queue: [] },
        { id: 1, levelReq: 7, cost: 3000, unlocked: false, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0, queue: [] },
        { id: 2, levelReq: 20, cost: 15000, unlocked: false, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0, queue: [] }
    ],
    selectedStoveIdx: 0,
    marketOrders: [],
    quests: [],
    shopStockDay: 0,
    shopDailyStock: [],
    marketOrdersDay: 0,
    playerName: 'Chibi Farmer',
    // Counters added in UPGRADE 16. Older saves start at zero where no reliable history exists.
    statistics: { animalsSold: 0, mealsCooked: 0, playTimeSeconds: 0, animalSicknessEvents: 0, cropsPlanted: 0 },
    settings: { sound: true, music: true, soundVolume: 0.65, musicVolume: 0.3 }
};

// Mở khóa 6 ô đất đầu tiên mặc định
for (let i = 0; i < 6; i++) gameState.unlockedPlots[i] = true;

// Snapshot mặc định để khôi phục các trường bị thiếu trong save cũ mà không reset tiến trình.
const INITIAL_GAME_STATE = JSON.parse(JSON.stringify(gameState));
let saveErrorNotified = false;

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneGameValue(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

// Merge object theo từng trường; array trong save hợp lệ được giữ nguyên để không mất tiến trình.
function mergeGameState(defaults, saved) {
    if (Array.isArray(defaults)) return Array.isArray(saved) ? cloneGameValue(saved) : cloneGameValue(defaults);
    if (isPlainObject(defaults)) {
        const source = isPlainObject(saved) ? saved : {};
        const result = {};
        Object.keys(defaults).forEach(key => {
            result[key] = mergeGameState(defaults[key], source[key]);
        });
        Object.keys(source).forEach(key => {
            if (!(key in result)) result[key] = cloneGameValue(source[key]);
        });
        return result;
    }
    return saved === undefined || saved === null ? defaults : saved;
}

function normalizeLoadedGameState(state) {
    const validNumber = (value, fallback, min = 0) => Number.isFinite(value) ? Math.max(min, value) : fallback;
    ['level', 'exp', 'gold', 'stamina', 'maxStamina', 'staminaFloat', 'gameDay', 'dayTimeSeconds', 'selectedStoveIdx'].forEach(key => {
        if (typeof state[key] !== 'number' || !Number.isFinite(state[key])) state[key] = INITIAL_GAME_STATE[key];
    });
    state.level = Math.max(1, Math.floor(state.level));
    state.orchardLevel = Math.max(1, Math.min(5, Math.floor(Number(state.orchardLevel) || 1)));
    if (!isPlainObject(state.penLevels)) state.penLevels = { chicken: 1, cow: 1, pig: 1 };
    ['chicken','cow','pig'].forEach(k => state.penLevels[k] = Math.max(1, Math.min(5, Math.floor(Number(state.penLevels[k]) || 1))));
    state.exp = Math.max(0, state.exp);
    state.gold = Math.max(0, state.gold);
    state.maxStamina = Math.max(1, state.maxStamina);
    state.staminaFloat = Math.min(state.maxStamina, Math.max(0, state.staminaFloat));
    state.stamina = Math.min(state.maxStamina, Math.max(0, Math.floor(state.stamina)));
    state.gameDay = Math.max(1, Math.floor(state.gameDay));
    state.dayTimeSeconds = ((Math.max(0, state.dayTimeSeconds) % REAL_SECS_PER_GAME_DAY) + REAL_SECS_PER_GAME_DAY) % REAL_SECS_PER_GAME_DAY;

    if (!isPlainObject(state.inventory)) state.inventory = cloneGameValue(INITIAL_GAME_STATE.inventory);
    Object.keys(state.inventory).forEach(key => {
        const amount = Number(state.inventory[key]);
        if (!Number.isFinite(amount) || amount < 0) delete state.inventory[key];
        else state.inventory[key] = amount;
    });
    Object.keys(INITIAL_GAME_STATE.inventory).forEach(key => {
        if (!(key in state.inventory)) state.inventory[key] = INITIAL_GAME_STATE.inventory[key];
    });

    const normalizeArray = (key, fallback, predicate) => {
        const fixedSize = ['plots', 'unlockedPlots', 'orchardPlots', 'kitchenStoves'].includes(key);
        if (!Array.isArray(state[key])) {
            state[key] = cloneGameValue(fallback);
            return;
        }
        if (fixedSize) {
            const defaults = cloneGameValue(fallback);
            state[key] = state[key].map((item, index) => predicate(item)
                ? item
                : cloneGameValue(defaults[index] !== undefined ? defaults[index] : defaults[0]));
            while (state[key].length < defaults.length) state[key].push(cloneGameValue(defaults[state[key].length]));
        } else {
            state[key] = state[key].filter(predicate);
        }
    };
    normalizeArray('unlockedRecipes', INITIAL_GAME_STATE.unlockedRecipes, item => typeof item === 'string');
    normalizeArray('unlockedPlots', INITIAL_GAME_STATE.unlockedPlots, item => typeof item === 'boolean');
    normalizeArray('plots', INITIAL_GAME_STATE.plots, item => isPlainObject(item));
    normalizeArray('orchardPlots', INITIAL_GAME_STATE.orchardPlots, item => isPlainObject(item));
    normalizeArray('chickens', INITIAL_GAME_STATE.chickens, item => isPlainObject(item));
    normalizeArray('cows', INITIAL_GAME_STATE.cows, item => isPlainObject(item));
    normalizeArray('pigs', INITIAL_GAME_STATE.pigs, item => isPlainObject(item));
    if (!Array.isArray(state.fishPond && state.fishPond.ducks)) { if (!isPlainObject(state.fishPond)) state.fishPond = cloneGameValue(INITIAL_GAME_STATE.fishPond); state.fishPond.ducks = []; }
    // Migrate legacy 4-stove saves to the new 3-row kitchen without losing an active fourth-stove dish.
    const legacyFourthStove = Array.isArray(state.kitchenStoves) && state.kitchenStoves.length > 3
        ? cloneGameValue(state.kitchenStoves[3]) : null;
    normalizeArray('kitchenStoves', INITIAL_GAME_STATE.kitchenStoves, item => isPlainObject(item));
    state.kitchenStoves = state.kitchenStoves.slice(0, 3);
    state.kitchenStoves.forEach((stove, i) => {
        stove.id = i;
        stove.queue = Array.isArray(stove.queue) ? stove.queue.filter(job => isPlainObject(job) && typeof job.recipeId === 'string' && !!RECIPES_DB[job.recipeId]).slice(0, 3) : [];
        // Keep already-unlocked rows unlocked for existing players; new unlocks use the new level/cost.
        stove.levelReq = i === 0 ? 1 : (i === 1 ? 7 : 20);
        stove.cost = i === 0 ? 0 : (i === 1 ? 3000 : 15000);
    });
    if (legacyFourthStove && legacyFourthStove.cooking && legacyFourthStove.recipeId && RECIPES_DB[legacyFourthStove.recipeId] && state.kitchenStoves[2].queue.length < 3) {
        state.kitchenStoves[2].queue.push({ recipeId: legacyFourthStove.recipeId, queuedAt: Date.now(), migratedFromLegacyStove: true });
    }
    normalizeArray('marketOrders', INITIAL_GAME_STATE.marketOrders, item => isPlainObject(item));
    normalizeArray('quests', INITIAL_GAME_STATE.quests, item => isPlainObject(item));
    // Keep world arrays aligned to the current map while preserving every in-range plot.
    state.unlockedPlots = state.unlockedPlots.slice(0, CONFIG.TOTAL_PLOTS);
    state.plots = state.plots.slice(0, CONFIG.TOTAL_PLOTS);
    while (state.unlockedPlots.length < CONFIG.TOTAL_PLOTS) state.unlockedPlots.push(false);
    while (state.plots.length < CONFIG.TOTAL_PLOTS) state.plots.push(cloneGameValue(INITIAL_GAME_STATE.plots[0]));

    // Fill missing keys on each fixed-slot object without replacing existing progress.
    state.plots = state.plots.map((plot, i) => Object.assign({}, INITIAL_GAME_STATE.plots[i] || INITIAL_GAME_STATE.plots[0], plot, { plotLevel: Math.max(1, Math.min(5, Math.floor(Number(plot.plotLevel) || 1))) }));
    state.orchardPlots = state.orchardPlots.map((plot, i) => Object.assign({}, INITIAL_GAME_STATE.orchardPlots[i] || INITIAL_GAME_STATE.orchardPlots[0], plot));
    state.kitchenStoves = state.kitchenStoves.map((stove, i) => Object.assign({}, INITIAL_GAME_STATE.kitchenStoves[i] || INITIAL_GAME_STATE.kitchenStoves[0], stove));
    state.kitchenStoves.forEach(stove => {
        if (!Array.isArray(stove.queue)) stove.queue = [];
        stove.queue = stove.queue.filter(job => isPlainObject(job) && typeof job.recipeId === 'string' && !!RECIPES_DB[job.recipeId]).slice(0, 3);
        if (stove.cooking && (!stove.recipeId || !RECIPES_DB[stove.recipeId] || !Number.isFinite(Number(stove.startTime)) || !Number.isFinite(Number(stove.duration)))) {
            stove.cooking = false;
            stove.recipeId = null;
            stove.startTime = 0;
            stove.duration = 0;
        }
    });
    state.selectedStoveIdx = Math.max(0, Math.min(state.kitchenStoves.length - 1, Math.floor(state.selectedStoveIdx)));

    if (!isPlainObject(state.statistics)) state.statistics = cloneGameValue(INITIAL_GAME_STATE.statistics);
    ['animalsSold', 'mealsCooked', 'playTimeSeconds', 'animalSicknessEvents', 'cropsPlanted'].forEach(key => {
        const value = Number(state.statistics[key]);
        state.statistics[key] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    });
    if (!isPlainObject(state.settings)) state.settings = { sound: true, music: true, soundVolume: 0.65, musicVolume: 0.3 };
    state.settings.sound = state.settings.sound !== false;
    state.settings.music = state.settings.music !== false;
    ['soundVolume', 'musicVolume'].forEach(key => { const value = Number(state.settings[key]); state.settings[key] = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : (key === 'soundVolume' ? 0.65 : 0.3); });
    if (typeof state.playerName !== 'string' || !state.playerName.trim()) state.playerName = 'Chibi Farmer';
    state.playerName = state.playerName.slice(0, 24);
    if (!isPlainObject(state.fishPond)) state.fishPond = cloneGameValue(INITIAL_GAME_STATE.fishPond);
    if (!Array.isArray(state.fishPond.fishes)) state.fishPond.fishes = cloneGameValue(INITIAL_GAME_STATE.fishPond.fishes);
    if (!Array.isArray(state.fishPond.ducks)) state.fishPond.ducks = [];
    state.fishPond.ducks = state.fishPond.ducks.filter(duck => isPlainObject(duck));
    state.fishPond.ducks.forEach(duck => { if (!Number.isFinite(duck.bornAt)) duck.bornAt = Date.now(); if (!Number.isFinite(duck.producedAt)) duck.producedAt = Date.now(); if (!Number.isFinite(duck.eggCount)) duck.eggCount = 0; if (!Number.isFinite(duck.hunger)) duck.hunger = 100; });
    state.fishPond.level = Math.max(1, Math.min(5, Math.floor(Number(state.fishPond.level) || 1)));
    state.fishPond.capacity = Math.max(6, state.fishPond.level * 6);
    state.fishPond.duckCapacity = Math.max(2, state.fishPond.level * 2);
    state.fishPond.fishes = state.fishPond.fishes.filter(fish => isPlainObject(fish) && typeof fish.type === 'string' && Number.isFinite(fish.plantedAt));
    state.fishPond.fishes.forEach(fish => { fish.hunger = Number.isFinite(fish.hunger) ? Math.max(0, Math.min(100, fish.hunger)) : 100; fish.hungry = Boolean(fish.hungry) || fish.hunger <= 40; fish.sick = Boolean(fish.sick); if (!Number.isFinite(fish.starvingStartAt)) fish.starvingStartAt = null; });
    state.fishPond.ducks.forEach(duck => { duck.hunger = Number.isFinite(duck.hunger) ? Math.max(0, Math.min(100, duck.hunger)) : 100; duck.hungry = Boolean(duck.hungry) || duck.hunger <= 40; duck.sick = Boolean(duck.sick); if (!Number.isFinite(duck.starvingStartAt)) duck.starvingStartAt = null; });

    ['chickens', 'cows', 'pigs'].forEach(key => state[key].forEach(animal => {
        if (!Number.isFinite(animal.hunger)) animal.hunger = animal.hungry ? 0 : 100;
        animal.hunger = Math.max(0, Math.min(100, animal.hunger));
        animal.hungry = Boolean(animal.hungry) || animal.hunger <= 40;
        animal.sick = Boolean(animal.sick);
        if (!Number.isFinite(animal.starvingStartAt)) animal.starvingStartAt = null;
    }));

    if (!['sunny', 'rainy', 'cloudy', 'snowy'].includes(state.currentWeather)) state.currentWeather = 'sunny';
    if (typeof state.currentTool !== 'string') state.currentTool = 'hand';
    if (typeof state.lastSavedAt !== 'number' || !Number.isFinite(state.lastSavedAt) || state.lastSavedAt <= 0) delete state.lastSavedAt;
    return state;
}

// 1. Lưu game: không nuốt lỗi âm thầm; chỉ báo một lần để tránh spam khi autosave.
function saveGame() {
    const previousTimestamp = gameState.lastSavedAt;
    try {
        if (typeof localStorage === 'undefined') throw new Error('localStorage không khả dụng');
        gameState.lastSavedAt = Date.now();
        localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(gameState));
        saveErrorNotified = false;
        return true;
    } catch (error) {
        if (previousTimestamp === undefined) delete gameState.lastSavedAt;
        else gameState.lastSavedAt = previousTimestamp;
        if (typeof console !== 'undefined' && console.error) console.error('[Nongtrai] Không thể lưu tiến trình:', error);
        if (!saveErrorNotified && typeof showToast === 'function') {
            showToast('Không Lưu Được! 💾', 'Bộ nhớ trình duyệt có thể đã đầy hoặc bị chặn. Hãy kiểm tra cài đặt trình duyệt.', '⚠️', 5000);
            saveErrorNotified = true;
        }
        return false;
    }
}

// 2. Tải game: xác thực dữ liệu và bổ sung trường mới, giữ lại tiến trình hợp lệ.
function loadGame() {
    if (typeof localStorage === 'undefined') return false;
    const keys = [CONFIG.SAVE_KEY, ...(Array.isArray(CONFIG.LEGACY_SAVE_KEYS) ? CONFIG.LEGACY_SAVE_KEYS : [])];
    for (const key of keys) {
        const saved = localStorage.getItem(key);
        if (!saved) continue;
        try {
            const parsed = JSON.parse(saved);
            if (!isPlainObject(parsed)) throw new Error('Save không phải object hợp lệ');
            // Version 3 tách rõ đồng hồ 30 phút hiện tại khỏi save version 2.
            // UPGRADE 08 dùng 86.400 giây/ngày; UPGRADE 09+ dùng 1.800 giây/ngày.
            const savedTimeVersion = Number(parsed.timeScaleVersion) || 0;
            if (savedTimeVersion !== 3 && Number.isFinite(Number(parsed.dayTimeSeconds))) {
                const rawClock = Math.max(0, Number(parsed.dayTimeSeconds));
                let legacyDayLength;
                if (savedTimeVersion === 2) legacyDayLength = rawClock > REAL_SECS_PER_GAME_DAY ? 86400 : REAL_SECS_PER_GAME_DAY;
                else legacyDayLength = rawClock > 900 ? 86400 : 900;
                parsed.dayTimeSeconds = Math.floor((rawClock % legacyDayLength) / legacyDayLength * REAL_SECS_PER_GAME_DAY);
            }
            parsed.timeScaleVersion = 3;
            gameState = normalizeLoadedGameState(mergeGameState(INITIAL_GAME_STATE, parsed));
            if (key !== CONFIG.SAVE_KEY) saveGame(); // ghi bản đã chuẩn hóa ở khóa hiện tại, không xóa save nguồn
            return true;
        } catch (error) {
            if (typeof console !== 'undefined' && console.warn) console.warn(`[Nongtrai] Không đọc được save ${key}; thử bản dự phòng nếu có.`, error);
        }
    }
    return false;
}

// Kiểm tra & trừ Thể lực
function checkAndDeductStamina(cost) {
    if (cost <= 0) return true;
    if (gameState.stamina < cost) {
        if (typeof showToast === 'function') {
            showToast("Hết Thể Lực! ⚡", `Bạn cần ít nhất ${cost} Thể lực ⚡ để thực hiện!`, "⚡");
        }
        return false;
    }
    gameState.staminaFloat = Math.max(0, gameState.staminaFloat - cost);
    gameState.stamina = Math.floor(gameState.staminaFloat);
    if (typeof updateUI === 'function') updateUI();
    saveGame();
    return true;
}

// Thêm EXP & Xử lý thăng cấp
function addExp(amount) {
    const gained = Number(amount);
    if (!Number.isFinite(gained) || gained <= 0) return;
    gameState.exp = Math.max(0, Number(gameState.exp) || 0) + gained;
    let levelsGained = 0;

    // Có thể lên nhiều cấp cùng lúc nếu nhận lượng EXP lớn.
    while (gameState.exp >= Math.max(1, gameState.level * 100)) {
        gameState.exp -= Math.max(1, gameState.level * 100);
        gameState.level += 1;
        levelsGained += 1;
    }

    if (levelsGained > 0) {
        gameState.staminaFloat = gameState.maxStamina;
        gameState.stamina = gameState.maxStamina;
        if (typeof updatePlotColorsByLevel === 'function') updatePlotColorsByLevel();
        if (typeof showToast === 'function') {
            showToast('THĂNG CẤP! 🎉', `Chúc mừng! Bạn đã đạt Cấp ${gameState.level}. Hồi đầy thể lực!`, '⭐', 4000);
        }
    }
    if (typeof updateUI === 'function') updateUI();
    saveGame();
}

// Hàng luân phiên theo ngày; các mặt hàng thiết yếu luôn có sẵn.
function refreshDailyShopStock(force = false) {
    const day = Math.max(1, Number(gameState.gameDay) || 1);
    if (!force && gameState.shopStockDay === day && Array.isArray(gameState.shopDailyStock) && gameState.shopDailyStock.length) return;
    const rotating = [
        ...Object.keys(CROPS_DB).filter(k => !['rice','corn'].includes(k)).map(k => k + '_seed'),
        ...Object.keys(TREES_DB).map(k => 'sapling_' + k),
        'buy_duck','fry_goldfish','fry_carp','potato_fries','carrot_soup','eggplant_grill','chili_noodles','pineapple_juice','tropical_salad','farm_hotpot','strawberry_tart'
    ];
    // Xáo trộn xác định theo ngày để khi reload trong ngày hàng không đổi.
    let seed = day * 9301 + 49297;
    const pool = rotating.slice();
    for (let i = pool.length - 1; i > 0; i--) { seed = (seed * 9301 + 49297) % 233280; const j = Math.floor((seed / 233280) * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    gameState.shopDailyStock = pool.slice(0, 7);
    gameState.shopStockDay = day;
    if (typeof saveGame === 'function') saveGame();
}

// Format thời gian hiển thị (ví dụ 1m20s)
function formatTime(totalSecs) {
    const m = Math.floor(totalSecs / 60);
    const s = Math.floor(totalSecs % 60);
    return `${m > 0 ? m + 'm' : ''}${s}s`;
}

// Tạo nhiệm vụ hàng ngày
function generateDailyQuests() {
    const questPool = [
        { type: 'harvest_crop', itemId: 'rice', title: 'Thu hoạch 5 Lúa', target: 5, rewardGold: 300, rewardExp: 50 },
        { type: 'harvest_crop', itemId: 'corn', title: 'Thu hoạch 3 Bắp Ngô', target: 3, rewardGold: 350, rewardExp: 60 },
        { type: 'harvest_crop', itemId: 'tomato', title: 'Thu hoạch 3 Cà Chua', target: 3, rewardGold: 400, rewardExp: 70 },
        { type: 'harvest_crop', itemId: 'pumpkin', title: 'Thu hoạch 2 Bí Ngô', target: 2, rewardGold: 500, rewardExp: 80 },
        { type: 'catch_bug', itemId: null, title: 'Bắt 3 con sâu trên ruộng', target: 3, rewardGold: 350, rewardExp: 60 },
        { type: 'water', itemId: null, title: 'Tưới nước cho 8 ô đất', target: 8, rewardGold: 250, rewardExp: 40 },
        { type: 'collect_animal', itemId: 'egg', title: 'Thu hoạch 3 Trứng gà', target: 3, rewardGold: 300, rewardExp: 50 },
        { type: 'collect_animal', itemId: 'milk', title: 'Thu hoạch 2 Sữa bò', target: 2, rewardGold: 450, rewardExp: 75 },
        { type: 'collect_animal', itemId: 'pork', title: 'Thu hoạch 2 Thịt heo', target: 2, rewardGold: 500, rewardExp: 80 },
        { type: 'harvest_fish', itemId: null, title: 'Thu hoạch 2 Cá lớn trong ao', target: 2, rewardGold: 400, rewardExp: 65 },
        { type: 'cook_recipe', itemId: 'rice_bowl', title: 'Nấu 2 Cơm Trắng Dinh Dưỡng', target: 2, rewardGold: 450, rewardExp: 70 },
        { type: 'cook_recipe', itemId: 'grilled_corn', title: 'Nấu 2 Bắp Nướng Mỡ Hành', target: 2, rewardGold: 500, rewardExp: 85 },
        { type: 'cook_recipe', itemId: 'pork_stew', title: 'Nấu 1 Sườn Heo Hầm Cà Chua', target: 1, rewardGold: 600, rewardExp: 100 },
        { type: 'harvest_crop', itemId: 'carrot', title: 'Thu hoạch 3 Cà Rốt', target: 3, rewardGold: 420, rewardExp: 70 },
        { type: 'harvest_crop', itemId: 'potato', title: 'Thu hoạch 4 Khoai Tây', target: 4, rewardGold: 380, rewardExp: 65 },
        { type: 'collect_animal', itemId: 'duck_egg', title: 'Thu hoạch 2 Trứng Vịt', target: 2, rewardGold: 500, rewardExp: 85 },
        { type: 'cook_recipe', itemId: 'potato_fries', title: 'Nấu 2 Khoai Tây Chiên', target: 2, rewardGold: 480, rewardExp: 80 },
        { type: 'harvest_fish', itemId: null, title: 'Thu hoạch 4 cá trong ao', target: 4, rewardGold: 650, rewardExp: 110 }
    ];

    const shuffled = [...questPool];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    gameState.quests = shuffled.slice(0, 3).map((q, idx) => ({
        id: 'quest_' + Date.now() + '_' + idx,
        type: q.type,
        targetItem: q.itemId,
        title: q.title,
        progress: 0,
        target: q.target,
        rewardGold: q.rewardGold,
        rewardExp: q.rewardExp,
        completed: false,
        claimed: false
    }));
    gameState.questResetAt = Date.now() + 24 * 60 * 60 * 1000;
    if (typeof updateQuestBadge === 'function') updateQuestBadge();
}

// Theo dõi tiến độ nhiệm vụ
function trackQuestProgress(type, itemId = null, count = 1) {
    let updated = false;
    if (!gameState.quests || !Array.isArray(gameState.quests)) return;

    gameState.quests.forEach(q => {
        if (!q.completed) {
            let match = false;
            if (q.type === type) {
                if (!q.targetItem || q.targetItem === itemId) {
                    match = true;
                }
            }
            if (match) {
                q.progress += count;
                if (q.progress >= q.target) {
                    q.progress = q.target;
                    q.completed = true;
                    if (typeof showToast === 'function') {
                        showToast("Nhiệm Vụ Hoàn Thành! 📜", `Bạn đã hoàn thành: "${q.title}". Mở menu để nhận thưởng!`, "🎉");
                    }
                }
                updated = true;
            }
        }
    });
    if (updated) {
        if (typeof updateQuestBadge === 'function') updateQuestBadge();
        saveGame();
    }
}

// Tạo đơn hàng độc lập theo slot để thay một đơn không làm mất các đơn còn lại.
const MARKET_ORDER_LIFETIME_MS = 10 * 60 * 1000;
function createMarketOrder() {
    const possibleItems = [
        { id: 'rice', name: 'Lúa', price: 25, exp: 5, icon: '🌾' }, { id: 'corn', name: 'Bắp Ngô', price: 65, exp: 12, icon: '🌽' },
        { id: 'tomato', name: 'Cà Chua', price: 110, exp: 20, icon: '🍅' }, { id: 'pumpkin', name: 'Bí Ngô', price: 230, exp: 40, icon: '🎃' },
        { id: 'apple', name: 'Quả Táo', price: 180, exp: 35, icon: '🍎' }, { id: 'egg', name: 'Trứng gà', price: 50, exp: 15, icon: '🥚' },
        { id: 'milk', name: 'Sữa bò', price: 120, exp: 25, icon: '🥛' }, { id: 'pork', name: 'Thịt heo', price: 150, exp: 30, icon: '🥩' },
        { id: 'goldfish', name: 'Cá Vàng', price: 200, exp: 40, icon: '🐟' }, { id: 'rice_bowl', name: 'Cơm Trắng', price: 120, exp: 25, icon: '🍚' },
        { id: 'grilled_corn', name: 'Bắp Nướng', price: 280, exp: 35, icon: '🌽' }, { id: 'pork_stew', name: 'Sườn Heo Hầm', price: 550, exp: 80, icon: '🍲' },
        { id: 'carrot', name: 'Cà Rốt', price: 125, exp: 22, icon: '🥕' }, { id: 'potato', name: 'Khoai Tây', price: 85, exp: 15, icon: '🥔' },
        { id: 'duck_egg', name: 'Trứng Vịt', price: 160, exp: 30, icon: '🥚' }, { id: 'pineapple', name: 'Dứa', price: 620, exp: 95, icon: '🍍' },
        { id: 'potato_fries', name: 'Khoai Tây Chiên', price: 420, exp: 45, icon: '🍟' }, { id: 'pineapple_juice', name: 'Nước Ép Dứa', price: 1200, exp: 80, icon: '🍍' }
    ];
    const customers = [
        { name: 'Cụ Bà Tư', kind: 'Đơn dân làng', multiplier: 1.25 }, { name: 'Chị Hoa Đầu Bếp', kind: 'Đơn nhà bếp', multiplier: 1.5 },
        { name: 'Thương Nhân Nam', kind: 'Đơn thương nhân', multiplier: 1.8 }, { name: 'Anh Bảy Ngư Phủ', kind: 'Đơn đặc sản', multiplier: 1.65 },
        { name: 'Chú Sáu Nông Dân', kind: 'Đơn nông sản', multiplier: 1.35 }, { name: 'Quán Ăn Ven Sông', kind: 'Đơn số lượng lớn', multiplier: 1.7 }
    ];
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const reqCount = Math.random() < 0.48 ? 1 : (Math.random() < 0.78 ? 2 : 3);
    const shuffled = possibleItems.slice().sort(() => Math.random() - 0.5).slice(0, reqCount);
    let totalVal = 0, totalExp = 0;
    const reqs = shuffled.map(item => { const qty = reqCount === 3 ? 2 + Math.floor(Math.random()*2) : 1 + Math.floor(Math.random()*2); totalVal += item.price*qty; totalExp += item.exp*qty; return {id:item.id,name:item.name,icon:item.icon,qty,price:item.price}; });
    const difficulty = reqCount === 1 ? 'Dễ' : (reqCount === 2 ? 'Vừa' : 'Khó');
    return { id:'order_'+Date.now()+'_'+Math.floor(Math.random()*999999), customer:customer.name, orderType:customer.kind, difficulty, reqs,
        rewardGold:Math.floor(totalVal*customer.multiplier), rewardExp:Math.floor(totalExp*(customer.multiplier+0.15)), completed:false,
        refreshAt:null, refreshCount:0 };
}
function generateMarketOrders() {
    gameState.marketOrders = Array.from({length:4}, () => createMarketOrder());
    gameState.marketOrdersDay = Number(gameState.gameDay) || 1;
    if (typeof saveGame === 'function') saveGame();
}
function ensureMarketOrderTimers() {
    if (!Array.isArray(gameState.marketOrders)) gameState.marketOrders = [];
    const now = Date.now();
    gameState.marketOrders.forEach(order => {
        if (order.completed) { if (!Number.isFinite(Number(order.refreshAt)) || Number(order.refreshAt) <= 0) order.refreshAt = now + MARKET_ORDER_LIFETIME_MS; } else { order.refreshAt = null; }
        if (!Number.isFinite(Number(order.refreshCount))) order.refreshCount = 0;
    });
}
function replaceMarketOrderAt(index) {
    if (!Array.isArray(gameState.marketOrders) || index < 0 || index >= gameState.marketOrders.length) return;
    gameState.marketOrders[index] = createMarketOrder();
    if (typeof playFarmSound === 'function') playFarmSound('order');
    if (typeof saveGame === 'function') saveGame();
}
