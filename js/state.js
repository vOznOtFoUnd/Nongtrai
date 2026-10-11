import { CONFIG } from './config.js';

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
  inventory: { seeds: { wheat: 5, carrot: 0, tomato: 0, pumpkin: 0 } },
  quests: { harvest: { target: 5, progress: 0, claimed: false } },
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
      quests: state.quests,
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
        dryTimer: p.dryTimer
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
    if (data.inventory && data.inventory.seeds && typeof data.inventory.seeds === 'object') {
      for (const id of ['wheat', 'carrot', 'tomato', 'pumpkin']) {
        const amount = data.inventory.seeds[id];
        state.inventory.seeds[id] = Number.isFinite(amount) && amount >= 0 ? Math.floor(amount) : 0;
      }
    }
    if (data.quests && data.quests.harvest) {
      const q = data.quests.harvest;
      state.quests.harvest.progress = Number.isFinite(q.progress) ? Math.max(0, q.progress) : 0;
      state.quests.harvest.claimed = Boolean(q.claimed);
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
