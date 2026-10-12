import { CONFIG } from '../core/config.js';

export const state = {
  money: CONFIG.start.money,
  harvested: CONFIG.start.harvested,
  day: CONFIG.start.day,
  level: CONFIG.start.level,
  exp: CONFIG.start.exp,
  tool: 'plant',
  selectedCrop: 'wheat',
  plots: [],
  time: 0,
  dayLength: CONFIG.world.dayLength,
  backpack: { level: 0 },
  warehouse: { level: 0, items: {} },
  inventory: { seeds: { wheat: 5, carrot: 0, tomato: 0, pumpkin: 0, sunflower: 0, rose: 0, tulip: 0 }, crops: { wheat: 0, carrot: 0, tomato: 0, pumpkin: 0, sunflower: 0, rose: 0, tulip: 0 }, fish: 0, beachFish: 0, pests: 0, bait: 0, meals: { bread: 0, soup: 0, pie: 0, grilledFish: 0 }, resources: { stone: 0, copperOre: 0, ironOre: 0, crystal: 0, copperIngot: 0, ironIngot: 0, wood: 0, rope: 0, shells: 0, islandRelics: 0 } },
  forge: { rodLevel: 0, durability: 0, repairedCount: 0, upgrades: {}, pickaxeLevel: 0, boatLevel: 0, exploredIslands: [] },
  pets: { dog: 0, cat: 0, active: 'dog' },
  livestockHealth: { cows: 0, chickens: 0, pigs: 0 },
  livestockProductsMade: { cows: 0, chickens: 0, pigs: 0 },
  livestockFeed: 0, medicine: 0,
  fishPond: { count: 0, growth: 0 },
  livestock: { cows: 0, chickens: 0, pigs: 0, growth: { cows: 0, chickens: 0, pigs: 0 } },
  animalProducts: { milk: 0, eggs: 0, pork: 0 },
  quests: {
    harvest: { target: 5, progress: 0, claimed: false },
    sell: { target: 3, progress: 0, claimed: false },
    fish: { target: 2, progress: 0, claimed: false }
  },
  // Đơn giao hàng được lưu riêng; save cũ tự nhận danh sách đơn mới.
  deliveryOrders: [
    { id: 'wheat_delivery', crop: 'wheat', quantity: 3, reward: 90, exp: 15, accepted: false, completed: false },
    { id: 'carrot_delivery', crop: 'carrot', quantity: 2, reward: 120, exp: 18, accepted: false, completed: false },
    { id: 'tomato_delivery', crop: 'tomato', quantity: 2, reward: 160, exp: 22, accepted: false, completed: false }
  ],
};

export function spendMoney(amount) {
  if (state.money < amount) return false;
  state.money -= amount;
  saveGame();
  return true;
}

export function addMoney(amount) {
  state.money += amount;
  saveGame();
}

export function addExp(amount) {
  state.exp += amount;
  const nextLevelExp = state.level * 100;
  if (state.exp >= nextLevelExp) {
    state.exp -= nextLevelExp;
    state.level += 1;
    saveGame();
    return true;
  }
  saveGame();
  return false;
}

export function incrementHarvested() {
  state.harvested += 1;
  saveGame();
}

export function saveGame() {
  try {
    const saveData = {
      money: state.money,
      harvested: state.harvested,
      day: state.day,
      level: state.level,
      exp: state.exp,
      time: state.time,
      inventory: state.inventory,
      backpack: state.backpack,
      warehouse: state.warehouse,
      forge: state.forge, pets: state.pets, livestockHealth: state.livestockHealth, livestockProductsMade: state.livestockProductsMade, livestockFeed: state.livestockFeed, medicine: state.medicine,
      fishPond: state.fishPond,
      livestock: state.livestock,
      animalProducts: state.animalProducts,
      quests: state.quests,
      deliveryOrders: state.deliveryOrders,
      timestamp: Date.now(),
      plots: state.plots.map(p => ({
        ix: p.ix,
        iz: p.iz,
        unlocked: p.unlocked,
        state: p.state,
        cropType: p.cropType,
        growProgress: p.growProgress,
        stage: p.stage,
        watered: p.watered,
        dryTimer: p.dryTimer, pest: p.pest, pestClock: p.pestClock
      }))
    };
    localStorage.setItem('farm3d_save_data', JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.error('Không thể lưu dữ liệu game:', e);
    return false;
  }
}

export function loadGame() {
  let raw;
  try {
    raw = localStorage.getItem('farm3d_save_data');
  } catch (e) {
    console.error('Không thể truy cập dữ liệu lưu game:', e);
    return null;
  }
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new TypeError('Dữ liệu lưu game không đúng định dạng.');
    }

    const readNumber = (value, fallback, min = 0) =>
      Number.isFinite(value) && value >= min ? value : fallback;

    state.money = readNumber(data.money, CONFIG.start.money);
    state.harvested = readNumber(data.harvested, CONFIG.start.harvested);
    state.day = readNumber(data.day, CONFIG.start.day, 1);
    state.level = readNumber(data.level, CONFIG.start.level, 1);
    state.exp = readNumber(data.exp, CONFIG.start.exp);
    state.time = readNumber(data.time, 0);
    state.backpack = { level: 0, ...(data.backpack || {}) };
    state.backpack.level = Math.max(0, Math.min(5, Math.floor(Number(state.backpack.level) || 0)));
    state.warehouse = { level: 0, items: {}, ...(data.warehouse || {}) };
    state.warehouse.level = Math.max(0, Math.min(5, Math.floor(Number(state.warehouse.level) || 0)));
    state.warehouse.items = state.warehouse.items && typeof state.warehouse.items === 'object' ? state.warehouse.items : {};
    for (const [key, value] of Object.entries(state.warehouse.items)) state.warehouse.items[key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    const cropIds = ['wheat', 'carrot', 'tomato', 'pumpkin', 'sunflower', 'rose', 'tulip'];
    if (data.inventory && typeof data.inventory === 'object') {
      for (const id of cropIds) {
        const seedAmount = data.inventory.seeds?.[id];
        state.inventory.seeds[id] = Number.isFinite(seedAmount) && seedAmount >= 0 ? Math.floor(seedAmount) : 0;
        const cropAmount = data.inventory.crops?.[id];
        state.inventory.crops[id] = Number.isFinite(cropAmount) && cropAmount >= 0 ? Math.floor(cropAmount) : 0;
      }
    }
    for (const id of ['beachFish', 'pests', 'bait']) { const amount = data.inventory?.[id]; state.inventory[id] = Number.isFinite(amount) && amount >= 0 ? Math.floor(amount) : 0; }
    state.forge = { rodLevel: 0, durability: 0, repairedCount: 0, upgrades: {}, pickaxeLevel: 0, boatLevel: 0, exploredIslands: [], ...(data.forge || {}) };
    state.forge.upgrades = { ...(data.forge?.upgrades || {}) };
    state.forge.pickaxeLevel = Math.max(0, Math.min(3, Math.floor(Number(state.forge.pickaxeLevel) || 0)));
    state.forge.boatLevel = Math.max(0, Math.min(3, Math.floor(Number(state.forge.boatLevel) || 0)));
    state.forge.exploredIslands = Array.isArray(state.forge.exploredIslands) ? state.forge.exploredIslands : [];
    state.pets = { dog: 0, cat: 0, active: 'dog', ...(data.pets || {}) };
    state.livestockHealth = { cows: 0, chickens: 0, pigs: 0, ...(data.livestockHealth || {}) };
    state.livestockProductsMade = { cows: 0, chickens: 0, pigs: 0, ...(data.livestockProductsMade || {}) };
    state.livestockFeed = Number.isFinite(data.livestockFeed) && data.livestockFeed >= 0 ? Math.floor(data.livestockFeed) : 0;
    state.medicine = Number.isFinite(data.medicine) && data.medicine >= 0 ? Math.floor(data.medicine) : 0;
    const fishCount = data.inventory?.fish;
    state.inventory.fish = Number.isFinite(fishCount) && fishCount >= 0 ? Math.floor(fishCount) : 0;
    state.inventory.meals ??= { bread: 0, soup: 0, pie: 0, grilledFish: 0 };
    for (const id of ['bread', 'soup', 'pie', 'grilledFish']) {
      const amount = data.inventory?.meals?.[id];
      state.inventory.meals[id] = Number.isFinite(amount) && amount >= 0 ? Math.floor(amount) : 0;
    }
    state.inventory.resources ??= { stone: 0, copperOre: 0, ironOre: 0, crystal: 0, copperIngot: 0, ironIngot: 0, wood: 0, rope: 0, shells: 0, islandRelics: 0 };
    for (const id of ['stone','copperOre','ironOre','crystal','copperIngot','ironIngot','wood','rope','shells','islandRelics']) {
      const amount = data.inventory?.resources?.[id];
      state.inventory.resources[id] = Number.isFinite(amount) && amount >= 0 ? Math.floor(amount) : 0;
    }
    const livestock = data.livestock || {};
    for (const id of ['cows', 'chickens', 'pigs']) {
      const max = id === 'cows' ? 5 : id === 'chickens' ? 12 : 6;
      const amount = livestock[id];
      state.livestock[id] = Number.isFinite(amount) && amount >= 0 ? Math.min(max, Math.floor(amount)) : 0;
      const growth = livestock.growth?.[id];
      state.livestock.growth[id] = Number.isFinite(growth) && growth >= 0 ? Math.min(100, Math.floor(growth)) : 0;
    }
    for (const id of ['milk', 'eggs', 'pork']) {
      const amount = data.animalProducts?.[id];
      state.animalProducts[id] = Number.isFinite(amount) && amount >= 0 ? Math.floor(amount) : 0;
    }

    const pond = data.fishPond;
    state.fishPond.count = Number.isFinite(pond?.count) && pond.count >= 0 ? Math.min(5, Math.floor(pond.count)) : 0;
    state.fishPond.growth = Number.isFinite(pond?.growth) && pond.growth >= 0 ? Math.min(100, Math.floor(pond.growth)) : 0;

    // Khôi phục đơn giao hàng; các đơn chưa có trong save sẽ dùng trạng thái mặc định.
    const savedOrders = Array.isArray(data.deliveryOrders) ? data.deliveryOrders : [];
    for (const order of state.deliveryOrders) {
      const saved = savedOrders.find(item => item && item.id === order.id);
      order.accepted = Boolean(saved?.accepted || saved?.completed);
      order.completed = Boolean(saved?.completed);
    }

    // Khôi phục tiến độ nhiệm vụ; save cũ tự nhận nhiệm vụ mới ở mức 0.
    for (const id of ['harvest', 'sell', 'fish']) {
      const saved = data.quests?.[id];
      const quest = state.quests[id];
      if (!saved || !quest) continue;
      quest.progress = Number.isFinite(saved.progress) ? Math.max(0, Math.min(quest.target, Math.floor(saved.progress))) : 0;
      quest.claimed = Boolean(saved.claimed);
    }

    const timestamp = Number.isFinite(data.timestamp) ? data.timestamp : Date.now();
    // Không cộng thời gian âm nếu đồng hồ hệ thống bị chỉnh lùi.
    const elapsedSeconds = Math.max(0, (Date.now() - timestamp) / 1000);
    state.time += elapsedSeconds;

    return { plotsData: Array.isArray(data.plots) ? data.plots : [], elapsedSeconds };
  } catch (e) {
    console.error('Lỗi khi tải dữ liệu game:', e);
    return null;
  }
}
