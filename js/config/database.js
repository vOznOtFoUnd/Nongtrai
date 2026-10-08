const CROPS_DB = {
    rice: { id: 'rice', name: 'Lúa', growTime: 40, seedCost: 10, sellPrice: 25, exp: 5, icon: '🌾' },
    corn: { id: 'corn', name: 'Bắp Ngô', growTime: 80, seedCost: 25, sellPrice: 65, exp: 12, icon: '🌽' },
    tomato: { id: 'tomato', name: 'Cà Chua', growTime: 120, seedCost: 40, sellPrice: 110, exp: 20, icon: '🍅' },
    pumpkin: { id: 'pumpkin', name: 'Bí Ngô', growTime: 180, seedCost: 80, sellPrice: 230, exp: 40, icon: '🎃' },
    watermelon: { id: 'watermelon', name: 'Dưa Hấu', growTime: 240, seedCost: 150, sellPrice: 450, exp: 75, icon: '🍉' },
    strawberry: { id: 'strawberry', name: 'Dâu Tây', growTime: 360, seedCost: 250, sellPrice: 800, exp: 120, icon: '🍓' }
};

const TREES_DB = {
    apple: { id: 'apple', name: 'Quả Táo', saplingCost: 300, harvestTime: 240, sellPrice: 180, exp: 35, icon: '🍎' },
    orange: { id: 'orange', name: 'Quả Cam', saplingCost: 500, harvestTime: 360, sellPrice: 300, exp: 55, icon: '🍊' },
    peach: { id: 'peach', name: 'Quả Đào', saplingCost: 800, harvestTime: 480, sellPrice: 450, exp: 80, icon: '🍑' },
    mango: { id: 'mango', name: 'Quả Xoài', saplingCost: 1200, harvestTime: 600, sellPrice: 650, exp: 110, icon: '🥭' }
};

const FISH_DB = {
    fry_goldfish: { id: 'fry_goldfish', name: 'Cá Vàng giống', growTime: 120, cost: 50, adultId: 'goldfish', icon: '🐟' },
    fry_carp: { id: 'fry_carp', name: 'Cá Chép giống', growTime: 240, cost: 120, adultId: 'carp', icon: '🐠' },
    goldfish: { id: 'goldfish', name: 'Cá Vàng lớn', sellPrice: 200, exp: 40, icon: '🐟' },
    carp: { id: 'carp', name: 'Cá Chép lớn', sellPrice: 450, exp: 80, icon: '🐠' }
};

const SUPPLIES_DB = {
    feed_chicken: { id: 'feed_chicken', name: 'Cám Gà', cost: 15, icon: '🌾' },
    feed_cow: { id: 'feed_cow', name: 'Cỏ Tươi', cost: 25, icon: '🌿' },
    feed_pig: { id: 'feed_pig', name: 'Thức Ăn Heo', cost: 20, icon: '🥔' },
    medicine: { id: 'medicine', name: 'Thuốc Thú Y', cost: 40, icon: '💊' }
};

const RECIPES_DB = {
    // --- KHU VỰC CHẾ BIẾN VẬT TƯ & THỨC ĂN NÔNG TRẠI ---
    craft_feed_chicken: { 
        id: 'craft_feed_chicken', name: 'Trộn Cám Gà (x3)', cost: 0, cookTime: 30, sellPrice: 50, 
        ingredients: { rice: 1 }, icon: '🌾', isFeed: true, outputItem: 'feed_chicken', outputQty: 3 
    },
    craft_feed_cow: { 
        id: 'craft_feed_cow', name: 'Ủ Cỏ Tươi Cho Bò (x5)', cost: 0, cookTime: 45, sellPrice: 80, 
        ingredients: { corn: 1 }, icon: '🌿', isFeed: true, outputItem: 'feed_cow', outputQty: 5 
    },
    craft_feed_pig: { 
        id: 'craft_feed_pig', name: 'Chế Thức Ăn Heo (x18)', cost: 0, cookTime: 60, sellPrice: 150, 
        ingredients: { pumpkin: 1 }, icon: '🥔', isFeed: true, outputItem: 'feed_pig', outputQty: 18 
    },
    craft_medicine: { 
        id: 'craft_medicine', name: 'Bào Chế Thuốc Thú Y (x2)', cost: 100, cookTime: 90, sellPrice: 160, 
        ingredients: { tomato: 2, worm: 1 }, icon: '💊', isFeed: true, outputItem: 'medicine', outputQty: 2 
    },

    // --- CÁC MÓN ĂN CHẾ BIẾN CAO CẤP ---
    rice_bowl: { id: 'rice_bowl', name: 'Cơm Trắng Dinh Dưỡng', cost: 0, cookTime: 40, sellPrice: 120, staminaRestore: 30, ingredients: { rice: 2 }, icon: '🍚' },
    grilled_corn: { id: 'grilled_corn', name: 'Bắp Nướng Mỡ Hành', cost: 0, cookTime: 50, sellPrice: 280, staminaRestore: 45, ingredients: { corn: 2 }, icon: '🌽' },
    fried_egg: { id: 'fried_egg', name: 'Trứng Ốp La Cà Chua', cost: 0, cookTime: 45, sellPrice: 380, staminaRestore: 55, ingredients: { egg: 2, tomato: 1 }, icon: '🍳' },
    apple_juice: { id: 'apple_juice', name: 'Nước Táo Ép', cost: 0, cookTime: 60, sellPrice: 1100, staminaRestore: 70, ingredients: { apple: 2 }, icon: '🧃' },
    watermelon_juice: { id: 'watermelon_juice', name: 'Nước Dưa Hấu Ướp Lạnh', cost: 200, cookTime: 75, sellPrice: 1850, staminaRestore: 90, ingredients: { watermelon: 1 }, icon: '🍉' },
    pork_stew: { id: 'pork_stew', name: 'Sườn Heo Hầm Cà Chua', cost: 0, cookTime: 120, sellPrice: 1650, staminaRestore: 110, ingredients: { pork: 1, tomato: 2 }, icon: '🍲' },
    grilled_fish: { id: 'grilled_fish', name: 'Cá Chép Nướng Giấy Bạc', cost: 250, cookTime: 90, sellPrice: 1550, staminaRestore: 100, ingredients: { carp: 1, corn: 1 }, icon: '🐟' },
    orange_smoothie: { id: 'orange_smoothie', name: 'Sinh Tố Cam Sữa', cost: 300, cookTime: 90, sellPrice: 2200, staminaRestore: 120, ingredients: { orange: 2, milk: 1 }, icon: '🥤' },
    peach_tea: { id: 'peach_tea', name: 'Trà Đào Sảng Khoái', cost: 450, cookTime: 120, sellPrice: 3400, staminaRestore: 140, ingredients: { peach: 2 }, icon: '🍹' },
    pumpkin_soup: { id: 'pumpkin_soup', name: 'Súp Bí Ngô Kem Sữa', cost: 350, cookTime: 100, sellPrice: 1600, staminaRestore: 130, ingredients: { pumpkin: 1, milk: 1, egg: 1 }, icon: '🥣' },
    strawberry_cake: { id: 'strawberry_cake', name: 'Bánh Kem Dâu Tây', cost: 500, cookTime: 150, sellPrice: 6800, staminaRestore: 200, ingredients: { strawberry: 2, milk: 1, egg: 2 }, icon: '🍰' },
    mango_smoothie: { id: 'mango_smoothie', name: 'Sinh Tố Xoài Nhiệt Đới', cost: 600, cookTime: 180, sellPrice: 5200, staminaRestore: 170, ingredients: { mango: 2, milk: 1 }, icon: '🥭' },
    apple_steak: { id: 'apple_steak', name: 'Bít Tết Sốt Táo', cost: 500, cookTime: 210, sellPrice: 3200, staminaRestore: 180, ingredients: { milk: 2, apple: 2, pork: 1 }, icon: '🥩' },
    seafood_pumpkin: { id: 'seafood_pumpkin', name: 'Lẩu Bí Ngô Hải Sản', cost: 700, cookTime: 240, sellPrice: 4200, staminaRestore: 230, ingredients: { pumpkin: 1, carp: 1, goldfish: 1, tomato: 2 }, icon: '🍲' }
};

const WEATHER_TYPES = ['sunny', 'rainy', 'cloudy', 'snowy'];
const WEATHER_ICONS = { sunny: '☀️', rainy: '🌧️', cloudy: '☁️', snowy: '❄️' };
const WEATHER_NAMES = { sunny: 'Nắng đẹp', rainy: 'Mưa rào', cloudy: 'Nhiều mây', snowy: 'Tuyết rơi' };

// Bổ sung vào getItemInfo các vật phẩm xuất chuồng / chặt cây
function getItemInfo(key) {
    if (CROPS_DB[key]) return CROPS_DB[key];
    if (TREES_DB[key]) return TREES_DB[key];
    if (FISH_DB[key]) return FISH_DB[key];
    if (SUPPLIES_DB[key]) return SUPPLIES_DB[key];
    if (RECIPES_DB[key]) return RECIPES_DB[key];
    
    if (key.endsWith('_seed')) {
        const base = key.replace('_seed', '');
        if (CROPS_DB[base]) return { name: 'Hạt Giống ' + CROPS_DB[base].name, icon: '🌱', cost: CROPS_DB[base].seedCost };
    }
    if (key.startsWith('sapling_')) {
        const base = key.replace('sapling_', '');
        if (TREES_DB[base]) return { name: 'Cây Giống ' + TREES_DB[base].name, icon: '🌳', cost: TREES_DB[base].saplingCost };
    }
    
    const specialMap = {
        buy_chicken: { name: 'Gà Con Giống', icon: '🐥', cost: 200 },
        buy_cow: { name: 'Bò Giống', icon: '🐮', cost: 800 },
        buy_pig: { name: 'Heo Giống', icon: '🐷', cost: 500 },
        egg: { name: 'Trứng Gà', icon: '🥚', sellPrice: 120, exp: 25 },
        milk: { name: 'Sữa Bò Tươi', icon: '🥛', sellPrice: 350, exp: 60 },
        pork: { name: 'Thịt Heo Sạch', icon: '🥩', sellPrice: 650, exp: 120 },
        chicken_meat: { name: 'Thịt Gà Nguyên Con', icon: '🍗', sellPrice: 850, exp: 150 },
        beef_meat: { name: 'Thịt Bò Thượng Hạng', icon: '🥩', sellPrice: 1800, exp: 300 },
        wood: { name: 'Gỗ Cây', icon: '🪵', sellPrice: 150, exp: 20 },
        worm: { name: 'Sâu Đất', icon: '🐛', sellPrice: 15, exp: 5 }
    };
    if (specialMap[key]) return specialMap[key];

    return { name: key, icon: '📦', sellPrice: 20 };
}
