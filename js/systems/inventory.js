import { state, saveGame } from '../data/state.js';

export const BACKPACK_BASE_CAPACITY = 80;
export const BACKPACK_CAPACITY_PER_LEVEL = 40;
export const WAREHOUSE_BASE_CAPACITY = 250;
export const WAREHOUSE_CAPACITY_PER_LEVEL = 150;
export const MAX_STORAGE_LEVEL = 5;

export function backpackCapacity() {
  return BACKPACK_BASE_CAPACITY + (Number(state.backpack?.level) || 0) * BACKPACK_CAPACITY_PER_LEVEL;
}

export function warehouseCapacity() {
  return WAREHOUSE_BASE_CAPACITY + (Number(state.warehouse?.level) || 0) * WAREHOUSE_CAPACITY_PER_LEVEL;
}

function sumObject(obj) {
  if (!obj || typeof obj !== 'object') return 0;
  return Object.values(obj).reduce((sum, value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return sum + Math.max(0, Math.floor(value));
    if (value && typeof value === 'object') return sum + sumObject(value);
    return sum;
  }, 0);
}

export function backpackUsed() {
  const inv = state.inventory || {};
  return sumObject(inv) + Math.max(0, Number(state.livestockFeed) || 0) +
    Math.max(0, Number(state.medicine) || 0) +
    sumObject(state.animalProducts || {});
}

export function warehouseUsed() {
  return sumObject(state.warehouse?.items || {});
}

export function canCarry(amount = 1) {
  return backpackUsed() + amount <= backpackCapacity();
}

export function tryCarry(amount = 1, label = 'vật phẩm') {
  if (!canCarry(amount)) return false;
  return true;
}

export function storageDeposit(path, amount = Infinity) {
  const value = Number(getItemPath(path));
  if (!Number.isFinite(value) || value <= 0) return 0;
  const free = warehouseCapacity() - warehouseUsed();
  const moved = Math.max(0, Math.min(Math.floor(value), Number.isFinite(amount) ? Math.floor(amount) : Math.floor(value), free));
  if (!moved) return 0;
  setItemPath(path, value - moved);
  state.warehouse.items[path] = (state.warehouse.items[path] || 0) + moved;
  saveGame();
  return moved;
}

export function storageWithdraw(path, amount = Infinity) {
  const value = Number(state.warehouse?.items?.[path]) || 0;
  if (value <= 0) return 0;
  const free = backpackCapacity() - backpackUsed();
  const moved = Math.max(0, Math.min(Math.floor(value), Number.isFinite(amount) ? Math.floor(amount) : Math.floor(value), free));
  if (!moved) return 0;
  setItemPath(path, (Number(getItemPath(path)) || 0) + moved);
  state.warehouse.items[path] = value - moved;
  if (!state.warehouse.items[path]) delete state.warehouse.items[path];
  saveGame();
  return moved;
}

function getItemPath(path) {
  const rootItem = ['livestockFeed', 'medicine'].includes(path) || path.startsWith('animalProducts.');
  return path.split('.').reduce((value, key) => value?.[key], rootItem ? state : state.inventory);
}
function setItemPath(path, value) {
  const rootItem = ['livestockFeed', 'medicine'].includes(path) || path.startsWith('animalProducts.');
  const obj = rootItem ? state : state.inventory;
  const parts = path.split('.');
  const key = parts.pop();
  const target = parts.reduce((current, part) => current[part] ??= {}, obj);
  target[key] = Math.max(0, Math.floor(value));
}

export function upgradeBackpack() {
  const level = Number(state.backpack?.level) || 0;
  if (level >= MAX_STORAGE_LEVEL) return { ok: false, message: 'Ba lô đã đạt cấp tối đa.' };
  const cost = 180 + level * 140;
  if (state.money < cost) return { ok: false, message: `Cần ${cost} xu để nâng cấp ba lô.` };
  state.money -= cost;
  state.backpack.level = level + 1;
  saveGame();
  return { ok: true, cost, level: state.backpack.level };
}

export function upgradeWarehouse() {
  const level = Number(state.warehouse?.level) || 0;
  if (level >= MAX_STORAGE_LEVEL) return { ok: false, message: 'Kho chứa đã đạt cấp tối đa.' };
  const cost = 300 + level * 220;
  if (state.money < cost) return { ok: false, message: `Cần ${cost} xu để nâng cấp kho.` };
  state.money -= cost;
  state.warehouse.level = level + 1;
  saveGame();
  return { ok: true, cost, level: state.warehouse.level };
}
