// Game State Toàn Cục
let shopBuyQty = 1;
let activeShopTab = 'seeds';

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
    unlockedRecipes: ['rice_bowl', 'grilled_corn', 'apple_juice', 'pork_stew'],
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

// Hàm lưu Game
function saveGame() {
    try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(gameState)); } catch(e) {}
}

// Hàm tải Game
function loadGame() {
    try {
        const saved = localStorage.getItem(CONFIG.SAVE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            gameState = Object.assign({}, gameState, parsed);
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
    } catch(e) {}
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
    gameState.exp += amount;
    const reqExp = gameState.level * 100;
    if (gameState.exp >= reqExp) {
        gameState.exp -= reqExp;
        gameState.level += 1;
        gameState.staminaFloat = gameState.maxStamina;
        gameState.stamina = gameState.maxStamina;
        
        if (typeof updatePlotColorsByLevel === 'function') {
            updatePlotColorsByLevel();
        }

        if (typeof showToast === 'function') {
            showToast("THĂNG CẤP! 🎉", `Chúc mừng! Bạn đã đạt Cấp ${gameState.level}. Hồi đầy thể lực!`, "⭐", 4000);
        }
    }
    if (typeof updateUI === 'function') updateUI();
    saveGame();
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
        { type: 'cook_recipe', itemId: 'pork_stew', title: 'Nấu 1 Sườn Heo Hầm Cà Chua', target: 1, rewardGold: 600, rewardExp: 100 }
    ];

    const shuffled = [...questPool].sort(() => 0.5 - Math.random());
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

// Tạo các đơn hàng ở Sạp hàng chợ
function generateMarketOrders() {
    const possibleItems = [
        { id: 'rice', name: 'Lúa', price: 25, exp: 5, icon: '🌾' },
        { id: 'corn', name: 'Bắp Ngô', price: 65, exp: 12, icon: '🌽' },
        { id: 'tomato', name: 'Cà Chua', price: 110, exp: 20, icon: '🍅' },
        { id: 'pumpkin', name: 'Bí Ngô', price: 230, exp: 40, icon: '🎃' },
        { id: 'apple', name: 'Quả Táo', price: 180, exp: 35, icon: '🍎' },
        { id: 'egg', name: 'Trứng gà', price: 50, exp: 15, icon: '🥚' },
        { id: 'milk', name: 'Sữa bò', price: 120, exp: 25, icon: '🥛' },
        { id: 'pork', name: 'Thịt heo', price: 150, exp: 30, icon: '🥩' },
        { id: 'goldfish', name: 'Cá Vàng', price: 200, exp: 40, icon: '🐟' },
        { id: 'rice_bowl', name: 'Cơm Trắng', price: 80, exp: 20, icon: '🍚' },
        { id: 'grilled_corn', name: 'Bắp Nướng', price: 150, exp: 35, icon: '🌽' },
        { id: 'pork_stew', name: 'Sườn Heo Hầm', price: 550, exp: 80, icon: '🍲' }
    ];

    const customerNames = ["Cụ Bà Tư", "Anh Bảy Ngư Phủ", "Chị Hoa Đầu Bếp", "Thương Nhân Nam", "Chú Sáu Nông Dân"];

    gameState.marketOrders = [];
    for (let i = 0; i < 3; i++) {
        const item1 = possibleItems[Math.floor(Math.random() * possibleItems.length)];
        const qty1 = Math.floor(Math.random() * 3) + 1;
        
        let reqs = [{ id: item1.id, name: item1.name, icon: item1.icon, qty: qty1, price: item1.price }];
        let totalVal = item1.price * qty1;
        let totalExp = item1.exp * qty1;

        if (Math.random() < 0.5) {
            const item2 = possibleItems[Math.floor(Math.random() * possibleItems.length)];
            if (item2.id !== item1.id) {
                const qty2 = Math.floor(Math.random() * 2) + 1;
                reqs.push({ id: item2.id, name: item2.name, icon: item2.icon, qty: qty2, price: item2.price });
                totalVal += item2.price * qty2;
                totalExp += item2.exp * qty2;
            }
        }

        const bonusGold = Math.floor(totalVal * 1.35);
        const bonusExp = Math.floor(totalExp * 1.5);

        gameState.marketOrders.push({
            id: 'order_' + Date.now() + '_' + i,
            customer: customerNames[Math.floor(Math.random() * customerNames.length)],
            reqs: reqs,
            rewardGold: bonusGold,
            rewardExp: bonusExp,
            completed: false
        });
    }
}
