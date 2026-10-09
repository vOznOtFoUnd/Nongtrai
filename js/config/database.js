const CROPS_DB = {
    rice: { id: 'rice', name: 'Lúa', growTime: 60, seedCost: 10, sellPrice: 25, exp: 5, icon: '🌾' },
    corn: { id: 'corn', name: 'Bắp Ngô', growTime: 120, seedCost: 25, sellPrice: 65, exp: 12, icon: '🌽' },
    tomato: { id: 'tomato', name: 'Cà Chua', growTime: 180, seedCost: 40, sellPrice: 110, exp: 20, icon: '🍅', regrowHarvests: 4 },
    pumpkin: { id: 'pumpkin', name: 'Bí Ngô', growTime: 300, seedCost: 80, sellPrice: 230, exp: 40, icon: '🎃' },
    watermelon: { id: 'watermelon', name: 'Dưa Hấu', growTime: 420, seedCost: 150, sellPrice: 450, exp: 75, icon: '🍉' },
    strawberry: { id: 'strawberry', name: 'Dâu Tây', growTime: 600, seedCost: 250, sellPrice: 800, exp: 120, icon: '🍓', regrowHarvests: 5 },
    potato: { id: 'potato', name: 'Khoai Tây', growTime: 150, seedCost: 30, sellPrice: 85, exp: 15, icon: '🥔' },
    carrot: { id: 'carrot', name: 'Cà Rốt', growTime: 210, seedCost: 45, sellPrice: 125, exp: 22, icon: '🥕' },
    eggplant: { id: 'eggplant', name: 'Cà Tím', growTime: 300, seedCost: 75, sellPrice: 220, exp: 38, icon: '🍆', regrowHarvests: 3 },
    chili: { id: 'chili', name: 'Ớt Đỏ', growTime: 360, seedCost: 110, sellPrice: 330, exp: 52, icon: '🌶️', regrowHarvests: 4 },
    pineapple: { id: 'pineapple', name: 'Dứa', growTime: 480, seedCost: 200, sellPrice: 620, exp: 95, icon: '🍍' }
};

const TREES_DB = {
    apple: { id: 'apple', name: 'Quả Táo', saplingCost: 300, harvestTime: 300, sellPrice: 180, exp: 35, icon: '🍎' },
    orange: { id: 'orange', name: 'Quả Cam', saplingCost: 500, harvestTime: 420, sellPrice: 300, exp: 55, icon: '🍊' },
    peach: { id: 'peach', name: 'Quả Đào', saplingCost: 800, harvestTime: 540, sellPrice: 450, exp: 80, icon: '🍑' },
    mango: { id: 'mango', name: 'Quả Xoài', saplingCost: 1200, harvestTime: 720, sellPrice: 650, exp: 110, icon: '🥭' }
};

const FISH_DB = {
    fry_goldfish: { id: 'fry_goldfish', name: 'Cá Vàng giống', growTime: 180, cost: 50, adultId: 'goldfish', icon: '🐟' },
    fry_carp: { id: 'fry_carp', name: 'Cá Chép giống', growTime: 300, cost: 120, adultId: 'carp', icon: '🐠' },
    goldfish: { id: 'goldfish', name: 'Cá Vàng lớn', sellPrice: 200, exp: 40, icon: '🐟' },
    carp: { id: 'carp', name: 'Cá Chép lớn', sellPrice: 450, exp: 80, icon: '🐠' }
};

const SUPPLIES_DB = {
    feed_chicken: { id: 'feed_chicken', name: 'Cám Gà', cost: 15, icon: '🌾' },
    feed_cow: { id: 'feed_cow', name: 'Cỏ Tươi', cost: 25, icon: '🌿' },
    feed_pig: { id: 'feed_pig', name: 'Thức Ăn Heo', cost: 20, icon: '🥔' },
    feed_duck: { id: 'feed_duck', name: 'Cám Vịt', cost: 18, icon: '🌾' },
    feed_fish: { id: 'feed_fish', name: 'Thức Ăn Cá', cost: 22, icon: '🐟' },
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
    craft_feed_duck: { id: 'craft_feed_duck', name: 'Trộn Cám Vịt (x4)', cost: 0, cookTime: 45, sellPrice: 95, ingredients: { rice: 1, corn: 1 }, icon: '🦆', isFeed: true, outputItem: 'feed_duck', outputQty: 4 },
    craft_feed_fish: { id: 'craft_feed_fish', name: 'Ép Viên Thức Ăn Cá (x5)', cost: 0, cookTime: 50, sellPrice: 110, ingredients: { corn: 1, carrot: 1 }, icon: '🐟', isFeed: true, outputItem: 'feed_fish', outputQty: 5 },
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
    seafood_pumpkin: { id: 'seafood_pumpkin', name: 'Lẩu Bí Ngô Hải Sản', cost: 700, cookTime: 240, sellPrice: 4200, staminaRestore: 230, ingredients: { pumpkin: 1, carp: 1, goldfish: 1, tomato: 2 }, icon: '🍲' },
    potato_fries: { id: 'potato_fries', name: 'Khoai Tây Chiên', cost: 120, cookTime: 55, sellPrice: 420, staminaRestore: 45, ingredients: { potato: 2 }, icon: '🍟' },
    carrot_soup: { id: 'carrot_soup', name: 'Súp Cà Rốt', cost: 140, cookTime: 65, sellPrice: 520, staminaRestore: 60, ingredients: { carrot: 2, milk: 1 }, icon: '🥕' },
    eggplant_grill: { id: 'eggplant_grill', name: 'Cà Tím Nướng', cost: 160, cookTime: 70, sellPrice: 650, staminaRestore: 70, ingredients: { eggplant: 2, tomato: 1 }, icon: '🍆' },
    chili_noodles: { id: 'chili_noodles', name: 'Mì Cay Nông Trại', cost: 240, cookTime: 90, sellPrice: 950, staminaRestore: 85, ingredients: { chili: 2, egg: 1, corn: 1 }, icon: '🍜' },
    pineapple_juice: { id: 'pineapple_juice', name: 'Nước Ép Dứa', cost: 260, cookTime: 80, sellPrice: 1200, staminaRestore: 95, ingredients: { pineapple: 2 }, icon: '🍍' },
    duck_egg_rice: { id: 'duck_egg_rice', name: 'Cơm Trứng Vịt', cost: 280, cookTime: 95, sellPrice: 1450, staminaRestore: 110, ingredients: { duck_egg: 1, rice: 2 }, icon: '🍳' },
    roasted_duck: { id: 'roasted_duck', name: 'Vịt Quay Sốt Dứa', cost: 420, cookTime: 150, sellPrice: 2600, staminaRestore: 160, ingredients: { duck_meat: 1, pineapple: 1 }, icon: '🍗' },
    boiled_duck_egg: { id: 'boiled_duck_egg', name: 'Trứng Vịt Luộc', cost: 180, cookTime: 45, sellPrice: 720, staminaRestore: 65, ingredients: { duck_egg: 2 }, icon: '🥚' },
    duck_noodles: { id: 'duck_noodles', name: 'Mì Vịt Chibi', cost: 360, cookTime: 120, sellPrice: 2100, staminaRestore: 145, ingredients: { duck_meat: 1, rice: 1, carrot: 1 }, icon: '🍜' },
    fish_soup: { id: 'fish_soup', name: 'Canh Cá Rau Củ', cost: 300, cookTime: 100, sellPrice: 1750, staminaRestore: 120, ingredients: { carp: 1, carrot: 1, tomato: 1 }, icon: '🥣' },
    fish_rice: { id: 'fish_rice', name: 'Cơm Cá Chiên', cost: 320, cookTime: 90, sellPrice: 1650, staminaRestore: 115, ingredients: { goldfish: 1, rice: 2 }, icon: '🍚' },
    fried_fish: { id: 'fried_fish', name: 'Cá Chiên Giòn', cost: 350, cookTime: 105, sellPrice: 1900, staminaRestore: 130, ingredients: { carp: 1, corn: 1 }, icon: '🍤' },
    tropical_salad: { id: 'tropical_salad', name: 'Salad Trái Cây', cost: 320, cookTime: 100, sellPrice: 1800, staminaRestore: 125, ingredients: { apple: 1, mango: 1, pineapple: 1 }, icon: '🥗' },
    farm_hotpot: { id: 'farm_hotpot', name: 'Lẩu Thập Cẩm', cost: 500, cookTime: 160, sellPrice: 2900, staminaRestore: 175, ingredients: { potato: 1, carrot: 1, egg: 1, milk: 1, tomato: 1 }, icon: '🍲' },
    strawberry_tart: { id: 'strawberry_tart', name: 'Bánh Tart Dâu', cost: 420, cookTime: 130, sellPrice: 2600, staminaRestore: 155, ingredients: { strawberry: 2, egg: 1, milk: 1 }, icon: '🥧' }
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
        buy_duck: { name: 'Vịt Con Giống', icon: '🦆', cost: 180 },
        duck_egg: { name: 'Trứng Vịt', icon: '🥚', sellPrice: 160, exp: 30 },
        duck_meat: { name: 'Thịt Vịt', icon: '🍗', sellPrice: 720, exp: 100 },
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
