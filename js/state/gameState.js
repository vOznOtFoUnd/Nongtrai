// Game State Toàn Cục
let shopBuyQty = 1;
let activeShopTab = 'seeds';

function applyGameDefaults() {
    if (!gameState.inventory || typeof gameState.inventory !== 'object') gameState.inventory = {};
    if (!Array.isArray(gameState.quests)) gameState.quests = [];
    if (!Array.isArray(gameState.marketOrders)) gameState.marketOrders = [];
    if (!Array.isArray(gameState.unlockedPlots)) gameState.unlockedPlots = Array(CONFIG.TOTAL_PLOTS).fill(false);
    if (!Array.isArray(gameState.plots)) gameState.plots = Array(CONFIG.TOTAL_PLOTS).fill(null).map(() => ({
        cropId: null, plantedAt: 0, watered: false, reducedSecs: 0, hasPest: false, pestAppearedAt: 0, pestImmune: false, isDead: false
    }));
    if (!Array.isArray(gameState.orchardPlots)) gameState.orchardPlots = Array(10).fill(null).map((_, i) => ({
        unlocked: i < 2, treeType: i === 0 ? 'apple' : null, plantedAt: i === 0 ? Date.now() - 120000 : 0
    }));
    if (!gameState.fishPond || typeof gameState.fishPond !== 'object') {
        gameState.fishPond = { capacity: 6, fishes: [] };
    }
    if (!Array.isArray(gameState.chickens)) gameState.chickens = [];
    if (!Array.isArray(gameState.cows)) gameState.cows = [];
    if (!Array.isArray(gameState.pigs)) gameState.pigs = [];
    if (!Array.isArray(gameState.kitchenStoves)) {
        gameState.kitchenStoves = [
            { id: 0, levelReq: 1, cost: 0, unlocked: true, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0 },
            { id: 1, levelReq: 3, cost: 500, unlocked: false, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0 },
            { id: 2, levelReq: 5, cost: 1200, unlocked: false, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0 },
            { id: 3, levelReq: 8, cost: 2500, unlocked: false, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0 }
        ];
    }
}

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
    currentWeather: 'sunny',
    inventory: {
        rice_seed: 5, corn_seed: 3, sapling_apple: 2, feed_chicken: 5, feed_cow: 3, feed_pig: 3,
        medicine: 2, buy_chicken: 2, buy_cow: 1, buy_pig: 1, fry_goldfish: 2, egg: 2, milk: 1, pork: 0, worm: 2
    },
    unlockedRecipes: [
        'craft_feed_chicken', 'craft_feed_cow', 'craft_feed_pig', 'craft_medicine',
        'rice_bowl', 'grilled_corn', 'fried_egg', 'apple_juice', 'pork_stew'
    ],
    unlockedPlots: Array(CONFIG.TOTAL_PLOTS).fill(false),
    plots: Array(CONFIG.TOTAL_PLOTS).fill(null).map(() => ({
        cropId: null, plantedAt: 0, watered: false, reducedSecs: 0, hasPest: false, pestAppearedAt: 0, pestImmune: false, isDead: false
    })),
    orchardPlots: Array(10).fill(null).map((_, i) => ({
        unlocked: i < 2, treeType: i === 0 ? 'apple' : null, plantedAt: i === 0 ? Date.now() - 120000 : 0
    })),
    fishPond: { 
        capacity: 6, 
        fishes: [
            { id: 1, type: 'fry_goldfish', plantedAt: Date.now() - 40000 },
            { id: 2, type: 'fry_carp', plantedAt: Date.now() - 100000 }
        ] 
    },
    chickens: [{ id: 1, bornAt: Date.now() - 200000, yieldCount: 0, hungry: false, sick: false, lastSickDay: 0, producedAt: Date.now() - 50000, x: -20, z: -18, targetX: -20, targetZ: -18 }],
    cows: [{ id: 1, bornAt: Date.now() - 400000, yieldCount: 0, hungry: false, sick: false, lastSickDay: 0, producedAt: Date.now() - 100000, x: -20, z: 10, targetX: -20, targetZ: 10 }],
    pigs: [{ id: 1, bornAt: Date.now() - 200000, hungry: false, sick: false, lastSickDay: 0, producedAt: Date.now() - 150000, x: 20, z: 14, targetX: 20, targetZ: 14 }],
    kitchenStoves: [
        { id: 0, levelReq: 1, cost: 0, unlocked: true, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0 },
        { id: 1, levelReq: 3, cost: 500, unlocked: false, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0 },
        { id: 2, levelReq: 5, cost: 1200, unlocked: false, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0 },
        { id: 3, levelReq: 8, cost: 2500, unlocked: false, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0 }
    ],
    selectedStoveIdx: 0,
    marketOrders: [],
    quests: []
};

// Mở khóa 6 ô đất đầu tiên mặc định
for (let i = 0; i < 6; i++) gameState.unlockedPlots[i] = true;

// 1. Hàm lưu Game (Ghi nhớ mốc thời gian thực lúc thoát)
function saveGame() {
    try {
        applyGameDefaults();
        gameState.lastSavedAt = Date.now();
        localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(gameState));
    } catch (e) {}
}

// 2. Hàm tải Game (Cập nhật đồng bộ thêm lastSavedAt)
function loadGame() {
    try {
        const saved = localStorage.getItem(CONFIG.SAVE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            gameState = Object.assign({}, gameState, parsed);
            applyGameDefaults();

            if (parsed.lastSavedAt) {
                gameState.lastSavedAt = parsed.lastSavedAt;
            }

            if (!gameState.kitchenStoves || !Array.isArray(gameState.kitchenStoves)) {
                gameState.kitchenStoves = [
                    { id: 0, levelReq: 1, cost: 0, unlocked: true, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0 },
                    { id: 1, levelReq: 3, cost: 500, unlocked: false, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0 },
                    { id: 2, levelReq: 5, cost: 1200, unlocked: false, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0 },
                    { id: 3, levelReq: 8, cost: 2500, unlocked: false, cooking: false, recipeId: null, quantity: 0, startTime: 0, duration: 0 }
                ];
            }
            if (!gameState.fishPond) gameState.fishPond = { capacity: 6, fishes: [] };
            return true;
        }
    } catch (e) {}
    return false;
}
