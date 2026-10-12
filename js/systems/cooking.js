import { state, saveGame } from '../data/state.js';
import { addExp } from '../data/state.js';
import { canCarry } from './inventory.js';

// Recipes use existing farm products; meal inventory is saved with the regular game save.
export const RECIPES = {
  bread: { id: 'bread', name: 'Bánh mì', emoji: '🍞', ingredients: { wheat: 2 }, fish: 0, sell: 70, exp: 5, description: '2 lúa mì → 1 bánh mì' },
  soup: { id: 'soup', name: 'Súp rau củ', emoji: '🥣', ingredients: { carrot: 1, tomato: 1 }, fish: 0, sell: 115, exp: 8, description: '1 cà rốt + 1 cà chua → 1 súp' },
  pie: { id: 'pie', name: 'Bánh bí ngô', emoji: '🥧', ingredients: { pumpkin: 1, wheat: 1 }, fish: 0, sell: 190, exp: 12, description: '1 bí ngô + 1 lúa mì → 1 bánh' },
  grilledFish: { id: 'grilledFish', name: 'Cá nướng', emoji: '🐟', ingredients: { carrot: 1 }, fish: 1, sell: 100, exp: 10, description: '1 cá + 1 cà rốt → 1 cá nướng' }
};

export function canCook(recipeId) {
  const recipe = RECIPES[recipeId];
  if (!recipe) return false;
  if ((state.inventory.fish || 0) < recipe.fish) return false;
  return Object.entries(recipe.ingredients).every(([id, qty]) => (state.inventory.crops?.[id] || 0) >= qty);
}

export function cookMeal(recipeId) {
  const recipe = RECIPES[recipeId];
  if (!recipe) return { ok: false, message: 'Công thức nấu ăn không tồn tại.' };
  if (!canCook(recipeId)) return { ok: false, message: `Chưa đủ nguyên liệu để nấu ${recipe.name}.` };
  const ingredientCount = Object.values(recipe.ingredients).reduce((sum, qty) => sum + qty, 0) + recipe.fish;
  if (!canCarry(1 - ingredientCount)) return { ok: false, message: 'Ba lô đã đầy. Hãy cất bớt đồ vào kho trước khi nấu.' };
  for (const [id, qty] of Object.entries(recipe.ingredients)) state.inventory.crops[id] -= qty;
  if (recipe.fish) state.inventory.fish -= recipe.fish;
  state.inventory.meals ??= { bread: 0, soup: 0, pie: 0, grilledFish: 0 };
  state.inventory.meals[recipe.id] = (state.inventory.meals[recipe.id] || 0) + 1;
  addExp(recipe.exp);
  saveGame();
  return { ok: true, recipe, message: `Nấu thành công ${recipe.emoji} ${recipe.name}! +${recipe.exp} EXP.` };
}

export function sellMeal(mealId) {
  const recipe = RECIPES[mealId];
  if (!recipe || !(state.inventory.meals?.[mealId] > 0)) return { ok: false, message: 'Không có món ăn này trong túi.' };
  state.inventory.meals[mealId] -= 1;
  state.money += recipe.sell;
  saveGame();
  return { ok: true, recipe, message: `Đã bán ${recipe.name}, nhận ${recipe.sell}💰.` };
}
