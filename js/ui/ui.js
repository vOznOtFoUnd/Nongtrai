import { CROPS } from '../core/config.js';
import { state, saveGame } from '../data/state.js';
import { RECIPES, canCook, cookMeal, sellMeal } from '../systems/cooking.js';
import { backpackCapacity, backpackUsed, warehouseCapacity, warehouseUsed, storageDeposit, storageWithdraw, upgradeBackpack, upgradeWarehouse, MAX_STORAGE_LEVEL } from '../systems/inventory.js';
import { ISLANDS, mineResources, smeltOre, craftPickaxe, upgradeBoat, exploreIsland } from '../systems/exploration.js';

export class UI {
  constructor() {
    this.moneyEl = document.getElementById('money');
    this.harvestedEl = document.getElementById('harvested');
    this.dayEl = document.getElementById('day');
    this.clockEl = document.getElementById('game-clock');
    this.levelEl = document.getElementById('level');
    this.expEl = document.getElementById('exp');
    this.messageEl = document.getElementById('message');
    this.seedListEl = document.getElementById('seed-list');
    this.instructionsEl = document.getElementById('instructions');
    this._buildSeeds();
    this._bindTools();
    this._bindUtilityButtons();
    this._bindManagement();
  }

  _buildSeeds() {
    this.seedListEl.innerHTML = '';
    Object.values(CROPS).forEach((crop, i) => {
      const btn = document.createElement('button');
      btn.className = 'seed-btn' + (i === 0 ? ' selected' : '');
      btn.dataset.crop = crop.id;
      btn.textContent = `${crop.emoji} ${crop.name} ×${state.inventory.seeds[crop.id] || 0}`;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.seed-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.selectedCrop = crop.id;
        this.showMessage(`Đã chọn ${crop.name}. Kho: ${state.inventory.seeds[crop.id] || 0} hạt 🌱`);
      });
      this.seedListEl.appendChild(btn);
    });
  }

  _bindTools() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.tool = btn.dataset.tool;
      });
    });
  }

  _bindUtilityButtons() {
    const toggle = document.getElementById('toggle-instructions');
    if (toggle && this.instructionsEl) {
      toggle.addEventListener('click', () => {
        const willHide = !this.instructionsEl.classList.contains('instructions-hidden');
        this.instructionsEl.classList.toggle('instructions-hidden', willHide);
        toggle.setAttribute('aria-expanded', String(!willHide));
        toggle.classList.toggle('utility-active', !willHide);
        toggle.title = willHide ? 'Hiện hướng dẫn' : 'Ẩn hướng dẫn';
      });
    }
    const fullscreen = document.getElementById('toggle-fullscreen');
    if (fullscreen) {
      const syncFullscreenButton = () => {
        const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
        fullscreen.setAttribute('aria-pressed', String(active));
        fullscreen.setAttribute('aria-label', active ? 'Thoát toàn màn hình' : 'Bật toàn màn hình');
        fullscreen.title = active ? 'Thoát toàn màn hình' : 'Bật toàn màn hình';
        fullscreen.textContent = active ? '⤢' : '⛶';
        fullscreen.classList.toggle('utility-active', active);
      };
      fullscreen.addEventListener('click', async () => {
        try {
          if (document.fullscreenElement || document.webkitFullscreenElement) {
            const exit = document.exitFullscreen || document.webkitExitFullscreen;
            if (exit) await exit.call(document);
            else this.showMessage('Trình duyệt không hỗ trợ thoát toàn màn hình bằng nút này.');
          } else {
            const target = document.getElementById('game-container');
            const request = target?.requestFullscreen || target?.webkitRequestFullscreen;
            if (request) await request.call(target);
            else this.showMessage('Trình duyệt này chưa hỗ trợ toàn màn hình. Thử mở game bằng Chrome.');
          }
        } catch (error) {
          this.showMessage('Không bật được toàn màn hình. Hãy thử chạm lại nút ⛶.');
        }
        syncFullscreenButton();
      });
      document.addEventListener('fullscreenchange', syncFullscreenButton);
      document.addEventListener('webkitfullscreenchange', syncFullscreenButton);
      syncFullscreenButton();
    }
  }

  setManagementContext(showMessage) { this.managementMessage = showMessage; }

  _bindManagement() {
    this.modal = document.getElementById('management-modal');
    this.content = document.getElementById('management-content');
    document.getElementById('open-shop')?.addEventListener('click', () => this.openManagement('shop'));
    document.getElementById('open-inventory')?.addEventListener('click', () => this.openManagement('inventory'));
    document.getElementById('open-quests')?.addEventListener('click', () => this.openManagement('quests'));
    document.getElementById('open-assets')?.addEventListener('click', () => this.openManagement('assets'));
    document.getElementById('open-fishing')?.addEventListener('click', () => this.openManagement('fishing'));
    document.getElementById('open-cooking')?.addEventListener('click', () => this.openManagement('cooking'));
    document.getElementById('open-livestock')?.addEventListener('click', () => this.openManagement('livestock'));
    document.getElementById('open-forge')?.addEventListener('click', () => this.openManagement('forge'));
    document.getElementById('open-beach')?.addEventListener('click', () => this.openManagement('beach'));
    document.getElementById('open-pets')?.addEventListener('click', () => this.openManagement('pets'));
    document.getElementById('close-management')?.addEventListener('click', () => this.closeManagement());
    this.modal?.addEventListener('click', e => { if (e.target === this.modal) this.closeManagement(); });
  }

  setAssetContext(context) { this.assetContext = context; this.assetPreview = null; this.pendingPlayerModel = null; }

  openManagement(page) {
    if (!this.modal || !this.content) return;
    this.modal.hidden = false;
    const title = document.getElementById('management-title');
    if (page === 'shop') {
      title.textContent = '🛒 Cửa hàng & quầy bán nông sản';
      const buyRows = Object.values(CROPS).map(c => `<div class="management-row"><span>${c.emoji} <b>${c.name}</b><small>Hạt giống trong kho: ${state.inventory.seeds[c.id] || 0}</small></span><button type="button" data-buy-seed="${c.id}" ${backpackUsed()+5>backpackCapacity()?'disabled':''}>Mua 5 · ${Math.floor(c.cost * 4)}💰</button></div>`).join('');
      const sellRows = Object.values(CROPS).map(c => `<div class="management-row"><span>${c.emoji} <b>${c.name}</b><small>Trong túi: ${state.inventory.crops?.[c.id] || 0} · Giá bán: ${c.sell}💰/cây</small></span><button type="button" data-sell-crop="${c.id}" ${(state.inventory.crops?.[c.id] || 0) < 1 ? 'disabled' : ''}>Bán 1</button></div>`).join('');
      const fishSellValue = Math.max(0, Math.floor(state.inventory.fish || 0)) * 45 + Math.max(0,Math.floor(state.inventory.beachFish||0))*70;
      const totalSellValue = Object.values(CROPS).reduce((sum, c) => sum + c.sell * (state.inventory.crops?.[c.id] || 0), 0) + fishSellValue;
      this.content.innerHTML = `<div class="shop-balance">💰 Số dư: <b>${state.money}</b> · 🎒 Ba lô ${backpackUsed()}/${backpackCapacity()}</div><h3>🌱 Mua hạt giống</h3><p class="management-note">Mỗi gói có 5 hạt, giá gói bằng 4 lần giá mua lẻ.</p>${buyRows}<h3>🧺 Bán nông sản</h3>${sellRows}<h3>🐄 Vật tư chăn nuôi</h3><div class="management-row"><span><b>🌾 Thức ăn chăn nuôi</b><small>20💰 mua 5 phần · dùng để cho bò, gà, lợn ăn</small></span><button type="button" data-buy-feed ${state.money<20?'disabled':''}>Mua 5 · 20💰</button></div><div class="management-row"><span><b>💊 Thuốc thú y</b><small>35💰/liều · chữa bệnh cho một đàn</small></span><button type="button" data-buy-medicine ${state.money<35?'disabled':''}>Mua 1 · 35💰</button></div><div class="management-row"><span><b>🐟 Cá biển: ${state.inventory.beachFish||0}</b><small>Giá bán: 70💰/con</small></span><button type="button" data-sell-beach-fish ${(state.inventory.beachFish||0)<1?'disabled':''}>Bán 1 cá biển</button></div><div class="management-row"><span><b>🐟 Cá trong túi: ${state.inventory.fish || 0}</b><small>Giá bán: 45💰/con</small></span><button type="button" data-sell-fish ${(state.inventory.fish || 0) < 1 ? 'disabled' : ''}>Bán 1 cá</button></div><div class="management-row"><span><b>Bán toàn bộ hàng hóa</b><small>Nhận tối đa ${totalSellValue}💰 theo số hàng hiện có</small></span><button type="button" data-sell-all ${totalSellValue < 1 ? 'disabled' : ''}>Bán tất cả</button></div>`;
      this.content.querySelectorAll('[data-buy-seed]').forEach(btn => btn.addEventListener('click', () => {
        const crop = CROPS[btn.dataset.buySeed], price = Math.floor(crop.cost * 4);
        if (state.money < price) { this.showMessage('Không đủ tiền mua gói hạt giống! 💸'); return; }
        if (backpackUsed()+5>backpackCapacity()) { this.showMessage('Ba lô không đủ chỗ cho 5 hạt giống. Hãy cất đồ vào kho hoặc nâng cấp ba lô.'); return; }
        state.money -= price; state.inventory.seeds[crop.id] = (state.inventory.seeds[crop.id] || 0) + 5;
        saveGame(); this.showMessage(`Đã mua 5 hạt ${crop.name}! 🌱`); this.update(); this.openManagement('shop');
      }));
      this.content.querySelectorAll('[data-sell-crop]').forEach(btn => btn.addEventListener('click', () => {
        const crop = CROPS[btn.dataset.sellCrop];
        if ((state.inventory.crops?.[crop.id] || 0) < 1) return;
        state.inventory.crops[crop.id] -= 1; state.money += crop.sell;
        state.quests.sell.progress = Math.min(state.quests.sell.target, state.quests.sell.progress + 1);
        saveGame(); this.showMessage(`Đã bán ${crop.name}, nhận ${crop.sell}💰`); this.update(); this.openManagement('shop');
      }));
      this.content.querySelector('[data-buy-feed]')?.addEventListener('click', () => { if(state.money<20)return; if(backpackUsed()+5>backpackCapacity()){this.showMessage('Ba lô không đủ chỗ cho thức ăn. Hãy cất đồ vào kho.');return;} state.money-=20; state.livestockFeed=(state.livestockFeed||0)+5; saveGame(); this.showMessage('Đã mua 5 phần thức ăn chăn nuôi.'); this.update(); this.openManagement('shop'); });
      this.content.querySelector('[data-buy-medicine]')?.addEventListener('click', () => { if(state.money<35)return; if(backpackUsed()+1>backpackCapacity()){this.showMessage('Ba lô không đủ chỗ cho thuốc. Hãy cất đồ vào kho.');return;} state.money-=35; state.medicine=(state.medicine||0)+1; saveGame(); this.showMessage('Đã mua 1 liều thuốc thú y.'); this.update(); this.openManagement('shop'); });
      this.content.querySelector('[data-sell-beach-fish]')?.addEventListener('click',()=>{if(state.inventory.beachFish<1)return;state.inventory.beachFish--;state.money+=70;saveGame();this.showMessage('Đã bán cá biển, nhận 70 xu.');this.update();this.openManagement('shop');});
      this.content.querySelector('[data-sell-fish]')?.addEventListener('click', () => {
        if ((state.inventory.fish || 0) < 1) return;
        state.inventory.fish -= 1; state.money += 45; saveGame();
        this.showMessage('Đã bán 1 cá, nhận 45💰 🐟'); this.update(); this.openManagement('shop');
      });
      this.content.querySelector('[data-sell-all]')?.addEventListener('click', () => {
        let soldCount = 0, earned = 0;
        for (const crop of Object.values(CROPS)) {
          const amount = Math.max(0, Math.floor(state.inventory.crops?.[crop.id] || 0));
          soldCount += amount; earned += amount * crop.sell;
          state.quests.sell.progress = Math.min(state.quests.sell.target, state.quests.sell.progress + amount);
          state.inventory.crops[crop.id] = 0;
        }
        const fishAmount = Math.max(0, Math.floor(state.inventory.fish || 0));
        soldCount += fishAmount; earned += fishAmount * 45; state.inventory.fish = 0;
        const beachFishAmount=Math.max(0,Math.floor(state.inventory.beachFish||0)); soldCount+=beachFishAmount; earned+=beachFishAmount*70; state.inventory.beachFish=0;
        if (!soldCount) return;
        state.money += earned; saveGame(); this.showMessage(`Đã bán ${soldCount} món hàng, nhận ${earned}💰!`); this.update(); this.openManagement('shop');
      });
    } else if (page === 'inventory') {
      title.textContent = '🎒 Túi đồ & kho chứa';
      const stored = state.warehouse?.items || {};
      const itemRows = [];
      Object.values(CROPS).forEach(c => {
        itemRows.push({path:`seeds.${c.id}`, label:`🌱 Hạt ${c.name}`, value:state.inventory.seeds[c.id]||0});
        itemRows.push({path:`crops.${c.id}`, label:`${c.emoji} ${c.name}`, value:state.inventory.crops?.[c.id]||0});
      });
      itemRows.push({path:'fish',label:'🐟 Cá hồ',value:state.inventory.fish||0});
      itemRows.push({path:'beachFish',label:'🐠 Cá biển',value:state.inventory.beachFish||0});
      itemRows.push({path:'pests',label:'🐛 Sâu bệnh',value:state.inventory.pests||0});
      itemRows.push({path:'bait',label:'🪱 Mồi câu',value:state.inventory.bait||0});
      Object.values(RECIPES).forEach(r=>itemRows.push({path:`meals.${r.id}`,label:`${r.emoji} ${r.name}`,value:state.inventory.meals?.[r.id]||0}));
      itemRows.push({path:'livestockFeed',label:'🌾 Thức ăn chăn nuôi',value:state.livestockFeed||0});
      itemRows.push({path:'medicine',label:'💊 Thuốc thú y',value:state.medicine||0});
      itemRows.push({path:'animalProducts.milk',label:'🥛 Sữa',value:state.animalProducts?.milk||0});
      itemRows.push({path:'animalProducts.eggs',label:'🥚 Trứng',value:state.animalProducts?.eggs||0});
      itemRows.push({path:'animalProducts.pork',label:'🥩 Thịt lợn',value:state.animalProducts?.pork||0});
      const resourceNames={stone:'🪨 Đá',copperOre:'🟠 Quặng đồng',ironOre:'⚙️ Quặng sắt',crystal:'💎 Tinh thể',copperIngot:'🟠 Thỏi đồng',ironIngot:'⚙️ Thỏi sắt',wood:'🪵 Gỗ',rope:'🪢 Dây thừng',shells:'🐚 Vỏ sò',islandRelics:'🏺 Cổ vật đảo'};
      Object.entries(resourceNames).forEach(([id,label])=>itemRows.push({path:`resources.${id}`,label,value:state.inventory.resources?.[id]||0}));
      const storageRows = itemRows.map(item => {
        const inStore = Number(stored[item.path])||0;
        return `<div class="management-row"><span><b>${item.label}</b><small>Trong túi: ${item.value} · Trong kho: ${inStore}</small></span><span class="management-actions"><button type="button" data-store="${item.path}" ${item.value<1||warehouseUsed()>=warehouseCapacity()?'disabled':''}>Cất hết</button><button type="button" data-withdraw="${item.path}" ${inStore<1||backpackUsed()>=backpackCapacity()?'disabled':''}>Lấy hết</button></span></div>`;
      }).join('');
      this.content.innerHTML = `<div class="inventory-summary"><span>💰 Tiền: <b>${state.money}</b></span><span>🎒 Ba lô: <b>${backpackUsed()}/${backpackCapacity()}</b></span><span>🏚️ Kho: <b>${warehouseUsed()}/${warehouseCapacity()}</b></span><span>⭐ Cấp độ: <b>${state.level}</b></span></div><h3>🎒 Nâng cấp ba lô</h3><div class="management-row"><span><b>Cấp ${state.backpack?.level||0} · ${backpackCapacity()} chỗ</b><small>Thêm 40 chỗ mỗi cấp · tối đa cấp ${MAX_STORAGE_LEVEL}</small></span><button type="button" data-upgrade-backpack ${state.backpack?.level>=MAX_STORAGE_LEVEL||state.money<180+(state.backpack?.level||0)*140?'disabled':''}>Nâng cấp · ${180+(state.backpack?.level||0)*140}💰</button></div><h3>🏚️ Nâng cấp kho chứa</h3><div class="management-row"><span><b>Cấp ${state.warehouse?.level||0} · ${warehouseCapacity()} chỗ</b><small>Thêm 150 chỗ mỗi cấp · tối đa cấp ${MAX_STORAGE_LEVEL}</small></span><button type="button" data-upgrade-warehouse ${state.warehouse?.level>=MAX_STORAGE_LEVEL||state.money<300+(state.warehouse?.level||0)*220?'disabled':''}>Nâng cấp · ${300+(state.warehouse?.level||0)*220}💰</button></div><h3>📦 Chuyển đồ giữa túi và kho</h3><p class="management-note">Mỗi đơn vị vật phẩm chiếm một chỗ. Ba lô mặc định 80 chỗ; kho mặc định 250 chỗ. Cất hoặc lấy hết từng loại vật phẩm; nếu túi/kho đã đầy, nút tương ứng sẽ bị khóa.</p>${storageRows}`;
      this.content.querySelectorAll('[data-store]').forEach(btn=>btn.addEventListener('click',()=>{const n=storageDeposit(btn.dataset.store);this.showMessage(n?`Đã cất ${n} vật phẩm vào kho.`:'Kho đã đầy hoặc không có vật phẩm.');this.openManagement('inventory');}));
      this.content.querySelectorAll('[data-withdraw]').forEach(btn=>btn.addEventListener('click',()=>{const n=storageWithdraw(btn.dataset.withdraw);this.showMessage(n?`Đã lấy ${n} vật phẩm từ kho.`:'Ba lô đã đầy hoặc kho không có vật phẩm.');this.openManagement('inventory');}));
      this.content.querySelector('[data-upgrade-backpack]')?.addEventListener('click',()=>{const r=upgradeBackpack();this.showMessage(r.ok?`Ba lô nâng lên cấp ${r.level}!`:`${r.message}`);this.update();this.openManagement('inventory');});
      this.content.querySelector('[data-upgrade-warehouse]')?.addEventListener('click',()=>{const r=upgradeWarehouse();this.showMessage(r.ok?`Kho chứa nâng lên cấp ${r.level}!`:`${r.message}`);this.update();this.openManagement('inventory');});
    } else if (page === 'cooking') {
      title.textContent = '🍳 Bếp nấu ăn';
      const mealCount = Object.values(RECIPES).reduce((sum, r) => sum + (state.inventory.meals?.[r.id] || 0), 0);
      const recipeRows = Object.values(RECIPES).map(r => {
        const ingredients = Object.entries(r.ingredients).map(([id, qty]) => {
          const names = { wheat: '🌾 Lúa mì', carrot: '🥕 Cà rốt', tomato: '🍅 Cà chua', pumpkin: '🎃 Bí ngô' };
          return `${names[id] || id} ×${qty}`;
        });
        if (r.fish) ingredients.push(`🐟 Cá ×${r.fish}`);
        const ready = canCook(r.id);
        return `<div class="management-row"><span><b>${r.emoji} ${r.name}</b><small>${r.description}</small><small>Nguyên liệu: ${ingredients.join(' + ')}</small><small>Giá bán: ${r.sell}💰 · Thưởng: ${r.exp} EXP</small></span><button type="button" data-cook="${r.id}" ${ready ? '' : 'disabled'}>Nấu 1</button></div>`;
      }).join('');
      const mealRows = Object.values(RECIPES).map(r => `<div class="management-row"><span><b>${r.emoji} ${r.name} ×${state.inventory.meals?.[r.id] || 0}</b><small>Bán được ${r.sell}💰/món</small></span><button type="button" data-sell-meal="${r.id}" ${(state.inventory.meals?.[r.id] || 0) > 0 ? '' : 'disabled'}>Bán 1</button></div>`).join('');
      this.content.innerHTML = `<div class="inventory-summary"><span>💰 Tiền: <b>${state.money}</b></span><span>🍽️ Món đã nấu: <b>${mealCount}</b></span><span>🌾 Lúa mì: <b>${state.inventory.crops?.wheat || 0}</b></span><span>🐟 Cá: <b>${state.inventory.fish || 0}</b></span></div><p class="management-note">Dùng nông sản và cá trong túi để nấu món ăn. Mỗi lần nấu tiêu hao nguyên liệu, nhận EXP; món ăn có thể bán ngay tại bếp để kiếm tiền.</p><h3>📖 Công thức</h3>${recipeRows}<h3>🧺 Món ăn trong túi</h3>${mealRows}`;
      this.content.querySelectorAll('[data-cook]').forEach(btn => btn.addEventListener('click', () => {
        const result = cookMeal(btn.dataset.cook);
        this.showMessage(result.message); this.update(); this.openManagement('cooking');
      }));
      this.content.querySelectorAll('[data-sell-meal]').forEach(btn => btn.addEventListener('click', () => {
        const result = sellMeal(btn.dataset.sellMeal);
        this.showMessage(result.message); this.update(); this.openManagement('cooking');
      }));
    } else if (page === 'livestock') {
      title.textContent = '🐄 Trang trại chăn nuôi';
      const animals = [
        { id: 'cows', name: 'Bò sữa', emoji: '🐄', cost: 250, max: 5, product: 'milk', productName: 'Sữa', productEmoji: '🥛', sell: 65, feed: 2, description: 'Cần 2 phần thức ăn mua tại cửa hàng; đủ lớn sẽ thu được sữa.' },
        { id: 'chickens', name: 'Gà', emoji: '🐔', cost: 80, max: 12, product: 'eggs', productName: 'Trứng', productEmoji: '🥚', sell: 25, feed: 1, description: 'Cần 1 phần thức ăn mua tại cửa hàng; đủ lớn sẽ thu được trứng.' },
        { id: 'pigs', name: 'Lợn', emoji: '🐖', cost: 180, max: 6, product: 'pork', productName: 'Thịt lợn', productEmoji: '🥩', sell: 90, feed: 2, description: 'Cần 2 phần thức ăn mua tại cửa hàng; đủ lớn sẽ thu được sản phẩm thịt.' }
      ];
      const totalAnimals = animals.reduce((n, a) => n + state.livestock[a.id], 0);
      const productCount = Object.values(state.animalProducts).reduce((n, x) => n + x, 0);
      const rows = animals.map(a => {
        const count = state.livestock[a.id], growth = state.livestock.growth[a.id];
        return `<div class="management-row"><span><b>${a.emoji} ${a.name}: ${count}/${a.max}</b><small>${a.description}</small><small>Độ lớn: ${count ? growth : 0}% · ${state.livestockHealth[a.id]?'🤒 Đang mắc bệnh':'💚 Khỏe mạnh'} · Giá mua: ${a.cost}💰/con</small></span><button type="button" data-buy-animal="${a.id}" ${count >= a.max || state.money < a.cost ? 'disabled' : ''}>Mua 1</button><button type="button" data-feed-animal="${a.id}" ${count < 1 || growth >= 100 || (state.livestockFeed || 0) < a.feed || state.livestockHealth[a.id] ? 'disabled' : ''}>Cho ăn</button><button type="button" data-collect-animal="${a.id}" ${count < 1 || growth < 100 || state.livestockHealth[a.id] ? 'disabled' : ''}>Thu hoạch</button></div>`;
      }).join('');
      const productRows = animals.map(a => `<div class="management-row"><span><b>${a.productEmoji} ${a.productName}: ${state.animalProducts[a.product]}</b><small>Giá bán: ${a.sell}💰/đơn vị</small></span><button type="button" data-sell-animal-product="${a.id}" ${(state.animalProducts[a.product] || 0) < 1 ? 'disabled' : ''}>Bán 1</button><button type="button" data-sell-all-animal-product="${a.id}" ${(state.animalProducts[a.product] || 0) < 1 ? 'disabled' : ''}>Bán tất cả</button></div>`).join('');
      this.content.innerHTML = `<div class="inventory-summary"><span>🐾 Tổng đàn: <b>${totalAnimals}</b></span><span>🌾 Lúa mì: <b>${state.inventory.crops?.wheat || 0}</b></span><span>📦 Sản phẩm: <b>${productCount}</b></span><span>💰 Tiền: <b>${state.money}</b></span></div><p class="management-note">Thức ăn mua tại cửa hàng (1 phần/gà, 2 phần/bò hoặc lợn). Vật nuôi có thể mắc bệnh; mua thuốc ở cửa hàng rồi chữa bệnh tại đây. Khi trưởng thành, thu hoạch sản phẩm; đủ 10 lượt sản phẩm từ một loài mới mở khóa bán vật nuôi lấy tiền. Thức ăn còn: ${state.livestockFeed||0} · Thuốc: ${state.medicine||0}.</p><h3>🏡 Đàn vật nuôi</h3>${rows}<h3>🧺 Sản phẩm chăn nuôi</h3>${productRows}<h3>🩺 Chăm sóc & bán vật nuôi</h3>${animals.map(a=>`<div class="management-row"><span><b>${a.emoji} ${a.name}</b><small>Đã tạo ${state.livestockProductsMade[a.id]||0}/10 sản phẩm · Thuốc còn ${state.medicine||0}</small></span><button type="button" data-cure-animal="${a.id}" ${!state.livestockHealth[a.id]||!(state.medicine>0)?'disabled':''}>Chữa bệnh</button><button type="button" data-sell-animal="${a.id}" ${(state.livestock[a.id]<1||(state.livestockProductsMade[a.id]||0)<10)?'disabled':''}>Bán 1 con · ${Math.floor(a.cost*.65)}💰</button></div>`).join('')}`;
      const defs = Object.fromEntries(animals.map(a => [a.id, a]));
      this.content.querySelectorAll('[data-buy-animal]').forEach(btn => btn.addEventListener('click', () => {
        const a = defs[btn.dataset.buyAnimal]; if (!a || state.livestock[a.id] >= a.max || state.money < a.cost) return;
        state.money -= a.cost; state.livestock[a.id] += 1; saveGame(); this.update(); this.showMessage(`Đã mua ${a.name} ${a.emoji}!`); this.openManagement('livestock');
      }));
      this.content.querySelectorAll('[data-feed-animal]').forEach(btn => btn.addEventListener('click', () => {
        const a = defs[btn.dataset.feedAnimal]; if (!a || !state.livestock[a.id] || state.livestock.growth[a.id] >= 100 || (state.livestockFeed || 0) < a.feed || state.livestockHealth[a.id]) return;
        state.livestockFeed -= a.feed; state.livestock.growth[a.id] = Math.min(100, state.livestock.growth[a.id] + 25); const sick = Math.random() < 0.12; if (sick) state.livestockHealth[a.id] = 1; saveGame(); this.update(); this.showMessage(sick ? `${a.emoji} Phát hiện bệnh trong đàn ${a.name.toLowerCase()}! Mua thuốc ở cửa hàng để chữa.` : `${a.emoji} Đã cho ${a.name.toLowerCase()} ăn. Độ lớn ${state.livestock.growth[a.id]}%.`); this.openManagement('livestock');
      }));
      this.content.querySelectorAll('[data-collect-animal]').forEach(btn => btn.addEventListener('click', () => {
        const a = defs[btn.dataset.collectAnimal]; if (!a || !state.livestock[a.id] || state.livestock.growth[a.id] < 100) return;
        const amount = state.livestock[a.id];
        if (backpackUsed()+amount>backpackCapacity()) { this.showMessage('Ba lô không đủ chỗ nhận sản phẩm. Hãy cất đồ vào kho trước khi thu hoạch.'); return; }
        state.animalProducts[a.product] += amount; state.livestockProductsMade[a.id] = (state.livestockProductsMade[a.id]||0)+amount; state.livestock.growth[a.id] = 0; saveGame(); this.update(); this.showMessage(`Thu được ${amount} ${a.productName.toLowerCase()} ${a.productEmoji}!`); this.openManagement('livestock');
      }));
      this.content.querySelectorAll('[data-cure-animal]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.cureAnimal;if(!state.livestockHealth[id]||state.medicine<1)return;state.medicine--;state.livestockHealth[id]=0;saveGame();this.showMessage('Đã chữa bệnh cho đàn vật nuôi.');this.update();this.openManagement('livestock');}));
      this.content.querySelectorAll('[data-sell-animal]').forEach(btn=>btn.addEventListener('click',()=>{const a=defs[btn.dataset.sellAnimal];if(!a||state.livestock[a.id]<1||(state.livestockProductsMade[a.id]||0)<10)return;state.livestock[a.id]--;state.money+=Math.floor(a.cost*.65);state.livestockProductsMade[a.id]-=10;state.livestock.growth[a.id]=state.livestock[a.id]?state.livestock.growth[a.id]:0;saveGame();this.showMessage(`Đã bán 1 ${a.name}, nhận ${Math.floor(a.cost*.65)} xu.`);this.update();this.openManagement('livestock');}));
      this.content.querySelectorAll('[data-sell-animal-product],[data-sell-all-animal-product]').forEach(btn => btn.addEventListener('click', () => {
        const a = defs[btn.dataset.sellAnimalProduct || btn.dataset.sellAllAnimalProduct]; if (!a) return;
        const amount = btn.hasAttribute('data-sell-all-animal-product') ? state.animalProducts[a.product] : Math.min(1, state.animalProducts[a.product]);
        if (amount < 1) return; state.animalProducts[a.product] -= amount; state.money += amount * a.sell; saveGame(); this.update(); this.showMessage(`Đã bán ${amount} ${a.productName.toLowerCase()}, nhận ${amount*a.sell}💰.`); this.openManagement('livestock');
      }));
    } else if (page === 'fishing') {
      title.textContent = '🐟 Hồ cá & câu cá';
      const pond = state.fishPond;
      const ready = pond.count > 0 && pond.growth >= 100;
      this.content.innerHTML = `<div class="inventory-summary"><span>🐠 Cá nuôi: <b>${pond.count}/5</b></span><span>🌿 Độ lớn: <b>${pond.count ? pond.growth : 0}%</b></span><span>🎒 Cá trong túi: <b>${state.inventory.fish || 0}</b></span><span>💰 Tiền: <b>${state.money}</b></span></div><p class="management-note">Đến khu hồ câu cá ở phía đông bản đồ. Cá nuôi cần được cho ăn nhiều lần trước khi thu hoạch. Câu cá có cơ hội nhận cá ngẫu nhiên.</p><div class="management-row"><span><b>🐟 Mua 3 cá giống</b><small>30💰/con · tối đa 5 cá</small></span><button type="button" data-buy-fry ${pond.count >= 5 || state.money < 90 ? 'disabled' : ''}>Mua cá giống</button></div><div class="management-row"><span><b>🥬 Cho cá ăn</b><small>Tốn 10💰, tăng độ lớn của đàn cá 25%</small></span><button type="button" data-feed-fish ${pond.count < 1 || pond.growth >= 100 || state.money < 10 ? 'disabled' : ''}>Cho ăn</button></div><div class="management-row"><span><b>🧺 Thu hoạch cá nuôi</b><small>${ready ? `Thu ${pond.count} cá` : 'Chỉ thu hoạch khi độ lớn đạt 100%'}</small></span><button type="button" data-harvest-fish ${ready ? '' : 'disabled'}>Thu cá</button></div><div class="management-row"><span><b>🎣 Thả cần câu</b><small>Có 60% cơ hội câu được 1 cá · không tốn tiền</small></span><button type="button" data-cast-fishing>Câu cá</button></div>`;
      this.content.querySelector('[data-buy-fry]')?.addEventListener('click', () => {
        if (pond.count >= 5 || state.money < 90) return;
        const added = Math.min(3, 5 - pond.count);
        state.money -= added * 30; pond.count += added; pond.growth = 0;
        saveGame(); this.update(); this.showMessage(`Đã thả ${added} cá giống xuống hồ! 🐟`); this.openManagement('fishing');
      });
      this.content.querySelector('[data-feed-fish]')?.addEventListener('click', () => {
        if (pond.count < 1 || pond.growth >= 100 || state.money < 10) return;
        state.money -= 10; pond.growth = Math.min(100, pond.growth + 25);
        saveGame(); this.update(); this.showMessage(`Cá ăn no rồi! Độ lớn ${pond.growth}% 🥬`); this.openManagement('fishing');
      });
      this.content.querySelector('[data-harvest-fish]')?.addEventListener('click', () => {
        if (pond.count < 1 || pond.growth < 100) return;
        const amount = pond.count;
        if (backpackUsed()+amount>backpackCapacity()) { this.showMessage('Ba lô không đủ chỗ nhận cá. Hãy cất bớt đồ vào kho trước.'); return; }
        state.inventory.fish = (state.inventory.fish || 0) + amount;
        state.quests.fish.progress = Math.min(state.quests.fish.target, state.quests.fish.progress + amount);
        pond.count = 0; pond.growth = 0; saveGame(); this.update();
        this.showMessage(`Thu hoạch ${amount} cá nuôi! Bán tại cửa hàng để nhận ${amount * 45}💰 🐟`); this.openManagement('fishing');
      });
      this.content.querySelector('[data-cast-fishing]')?.addEventListener('click', () => {
        if (Math.random() < 0.6) {
          if (backpackUsed()+1>backpackCapacity()) { this.showMessage('Ba lô đã đầy, không thể nhận thêm cá. Hãy cất đồ vào kho.'); this.openManagement('fishing'); return; }
          state.inventory.fish = (state.inventory.fish || 0) + 1; state.quests.fish.progress = Math.min(state.quests.fish.target, state.quests.fish.progress + 1); saveGame(); this.update();
          this.showMessage('Câu được 1 con cá! Bán tại cửa hàng để nhận 45💰 🎣');
        } else this.showMessage('Cá hôm nay chưa cắn câu, thử lại nhé! 🎣');
        this.openManagement('fishing');
      });
    } else if (page === 'beach') {
      title.textContent = '🏖️ Câu cá bãi biển';
      const rod=state.forge.rodLevel>0, durability=state.forge.durability||0;
      this.content.innerHTML = `<div class="inventory-summary"><span>🎣 Cần câu: <b>${rod?'Có':'Chưa chế tạo'}</b></span><span>🪱 Mồi: <b>${state.inventory.bait||0}</b></span><span>🐛 Sâu: <b>${state.inventory.pests||0}</b></span><span>🐟 Cá biển: <b>${state.inventory.beachFish||0}</b></span></div><p class="management-note">Đến một trong các vị trí câu cá trên bãi cát gần bến tàu. Cần câu được chế tạo ở lò rèn; sâu bắt từ cây trồng là mồi câu. Mỗi lần câu tốn 1 mồi và 1 độ bền cần câu.</p><div class="management-row"><span><b>🪱 Đổi sâu thành mồi câu</b><small>1 sâu bệnh → 1 mồi câu</small></span><button data-bait ${!(state.inventory.pests>0)?'disabled':''}>Làm mồi</button></div><div class="management-row"><span><b>🎣 Câu cá biển</b><small>Tỉ lệ trúng khoảng ${Math.round(62+state.forge.rodLevel*8)}% · độ bền cần: ${durability}/10 · cá biển bán được 70 xu</small></span><button data-beach-cast ${!rod||durability<1||!(state.inventory.bait>0)?'disabled':''}>Thả câu</button></div><h3>⛵ Nâng cấp thuyền</h3><div class="inventory-summary"><span>🚤 Cấp thuyền: <b>${state.forge.boatLevel||0}/3</b></span><span>🪵 Gỗ: <b>${state.inventory.resources?.wood||0}</b></span><span>🪢 Dây: <b>${state.inventory.resources?.rope||0}</b></span></div><p class="management-note">Thuyền cấp 0 có thể đi chuyến ngắn tới Đảo Gỗ Trôi. Nâng cấp giúp đi xa hơn: cấp 1 mở Rạn San Hô, cấp 2 mở Đảo Sương Mù.</p><div class="management-row"><span><b>🔨 Nâng cấp thuyền lên cấp ${Math.min(3,(state.forge.boatLevel||0)+1)}</b><small>${[80,150,250][state.forge.boatLevel||0]??'Đã tối đa'} xu · gỗ ${[2,4,6][state.forge.boatLevel||0]??0} · dây ${[1,2,3][state.forge.boatLevel||0]??0} · ${state.forge.boatLevel===0?'1 thỏi đồng':'2 thỏi sắt'}</small></span><button data-upgrade-boat ${(state.forge.boatLevel||0)>=3?'disabled':''}>${(state.forge.boatLevel||0)>=3?'Đã tối đa':'Nâng cấp'}</button></div><h3>🗺️ Chuyến thám hiểm đảo</h3>${Object.values(ISLANDS).map(island=>`<div class="management-row"><span><b>${island.emoji} ${island.name}</b><small>${island.description}</small><small>Phí chuyến đi: ${island.cost} xu · yêu cầu thuyền cấp ${island.minBoat}${state.forge.exploredIslands?.includes(island.id)?' · Đã khám phá':''}</small></span><button data-explore-island="${island.id}" ${state.money<island.cost||(state.forge.boatLevel||0)<island.minBoat?'disabled':''}>Ra khơi</button></div>`).join('')}<p class="management-note">Các chuyến đi hiện là hệ thống thám hiểm qua menu, nhận nguyên liệu và cổ vật; bản đồ 3D riêng cho từng đảo sẽ là phần phát triển tiếp theo.</p>`;
      this.content.querySelector('[data-bait]')?.addEventListener('click',()=>{if(state.inventory.pests<1)return;state.inventory.pests--;state.inventory.bait++;saveGame();this.showMessage('Đã làm 1 mồi câu từ sâu bệnh.');this.openManagement('beach');});
      this.content.querySelector('[data-beach-cast]')?.addEventListener('click',()=>{if(!rod||state.forge.durability<1||state.inventory.bait<1)return;const pos=window.farmPlayer?.root?.position;if(pos){const spots=[[70,-17],[70,17],[45,94]];if(!spots.some(([x,z])=>Math.hypot(pos.x-x,pos.z-z)<12)){this.showMessage('Hãy đi tới một trong các biển báo câu cá trên bãi biển trước khi thả câu. 🏖️');return;}}state.inventory.bait--;state.forge.durability--;if(Math.random()<(0.62+state.forge.rodLevel*0.08)){if(backpackUsed()+1>backpackCapacity()){this.showMessage('Ba lô đầy nên cá tuột mất! Hãy cất đồ vào kho trước khi câu tiếp.');}else{state.inventory.beachFish=(state.inventory.beachFish||0)+1;this.showMessage('Câu được cá biển! 🐟');}}else this.showMessage('Cá thoát mất rồi, mồi đã bị ăn. Thử lại nhé!');saveGame();this.openManagement('beach');});
      this.content.querySelector('[data-upgrade-boat]')?.addEventListener('click',()=>{const r=upgradeBoat();this.showMessage(r.ok?`Thuyền nâng lên cấp ${r.level}!` : r.message);this.openManagement('beach');});
      this.content.querySelectorAll('[data-explore-island]').forEach(btn=>btn.addEventListener('click',()=>{const r=exploreIsland(btn.dataset.exploreIsland);if(!r.ok){this.showMessage(r.message);return;}const names={stone:'đá',copperOre:'quặng đồng',ironOre:'quặng sắt',crystal:'tinh thể',copperIngot:'thỏi đồng',ironIngot:'thỏi sắt',wood:'gỗ',rope:'dây thừng',shells:'vỏ sò',islandRelics:'cổ vật'};const rewardText=Object.entries(r.rewards).map(([id,n])=>`${names[id]||id} ×${n}`).join(', ');this.showMessage(`Khám phá ${r.island.name}! Thu được ${rewardText}.`);this.update();this.openManagement('beach');}));
    } else if (page === 'forge') {
      title.textContent = '⚒️ Lò rèn & chế tạo';
      const hasRod=state.forge.rodLevel>0;
      state.forge.upgrades ??= {};
      const hoeLevel = Number(state.forge.upgrades.hoe) || 0;
      const canLevel = Number(state.forge.upgrades.wateringCan) || 0;
      this.content.innerHTML = `<div class="inventory-summary"><span>💰 Tiền: <b>${state.money}</b></span><span>🎣 Cần câu: <b>${hasRod?'Cấp '+state.forge.rodLevel:'Chưa có'}</b></span><span>🛠️ Độ bền: <b>${state.forge.durability||0}/10</b></span><span>⛏️ Cuốc: <b>Cấp ${hoeLevel}</b></span><span>💧 Bình tưới: <b>Cấp ${canLevel}</b></span></div><p class="management-note">Chế tạo và nâng cấp công cụ nông nghiệp tại lò rèn. Cuốc tốt giúp cây lớn nhanh hơn; bình tưới nâng cao giúp tưới nhiều ô cùng lúc.</p><h3>🎣 Cần câu</h3><div class="management-row"><span><b>🎣 Chế tạo cần câu cơ bản</b><small>120 xu + 2 lúa mì (nguyên liệu gỗ đang được mô phỏng)</small></span><button data-forge-rod ${hasRod||state.money<120||(state.inventory.crops.wheat||0)<2?'disabled':''}>Chế tạo</button></div><div class="management-row"><span><b>🔧 Sửa cần câu</b><small>25 xu, khôi phục 10 độ bền</small></span><button data-repair-rod ${!hasRod||state.money<25||state.forge.durability>=10?'disabled':''}>Sửa chữa</button></div><div class="management-row"><span><b>⬆️ Nâng cấp cần câu</b><small>180 xu · tăng tỉ lệ câu trúng, tối đa cấp 3</small></span><button data-upgrade-rod ${!hasRod||state.forge.rodLevel>=3||state.money<180?'disabled':''}>Nâng cấp</button></div><h3>🌾 Công cụ nông nghiệp</h3><div class="management-row"><span><b>⛏️ ${hoeLevel===0?'Chế tạo cuốc thép':'Nâng cấp cuốc'} · Cấp ${Math.min(3,hoeLevel+1)}</b><small>${hoeLevel===0?'150 xu + 3 lúa mì':'200 xu + 2 lúa mì'} · tăng tốc độ sinh trưởng cây ${hoeLevel===0?'12%':'thêm 12%'}</small></span><button data-upgrade-tool="hoe" ${hoeLevel>=3||state.money<(hoeLevel===0?150:200)||(state.inventory.crops.wheat||0)<(hoeLevel===0?3:2)?'disabled':''}>${hoeLevel===0?'Chế tạo':'Nâng cấp'}</button></div><div class="management-row"><span><b>💧 ${canLevel===0?'Chế tạo bình tưới đồng':'Nâng cấp bình tưới'} · Cấp ${Math.min(3,canLevel+1)}</b><small>${canLevel===0?'120 xu + 2 lúa mì':'180 xu + 2 lúa mì'} · cấp 2 tưới các ô lân cận 3×3</small></span><button data-upgrade-tool="wateringCan" ${canLevel>=3||state.money<(canLevel===0?120:180)||(state.inventory.crops.wheat||0)<2?'disabled':''}>${canLevel===0?'Chế tạo':'Nâng cấp'}</button></div><p class="management-note">Cấp cuốc tăng tốc độ cây sinh trưởng 12% mỗi cấp. Bình tưới cấp 1 không đổi phạm vi; từ cấp 2 trở lên, một lần tưới sẽ tưới cây trong vùng 3×3 quanh ô được chọn.</p><h3>⛏️ Khai thác khoáng sản</h3><div class="inventory-summary"><span>🪨 Đá: <b>${state.inventory.resources?.stone||0}</b></span><span>🟠 Quặng đồng: <b>${state.inventory.resources?.copperOre||0}</b></span><span>⚙️ Quặng sắt: <b>${state.inventory.resources?.ironOre||0}</b></span><span>💎 Tinh thể: <b>${state.inventory.resources?.crystal||0}</b></span></div><div class="management-row"><span><b>⛏️ ${state.forge.pickaxeLevel?'Cuốc chim cấp '+state.forge.pickaxeLevel:'Chế tạo cuốc chim cơ bản'}</b><small>${state.forge.pickaxeLevel===0?'100 xu + 2 lúa mì':state.forge.pickaxeLevel===1?'120 xu + 2 thỏi đồng để lên cấp 2':state.forge.pickaxeLevel===2?'220 xu + 2 thỏi sắt để lên cấp 3':'Đã đạt cấp tối đa'} · cấp cao tăng cơ hội tìm quặng quý</small></span><button data-craft-pickaxe ${state.forge.pickaxeLevel>=3?'disabled':''}>${state.forge.pickaxeLevel?'Nâng cấp':'Chế tạo'}</button></div><div class="management-row"><span><b>🪨 Khai thác mỏ</b><small>Mỗi lượt nhận đá và có cơ hội tìm quặng đồng, sắt hoặc tinh thể. Cần cuốc chim.</small></span><button data-mine ${state.forge.pickaxeLevel<1||backpackUsed()>=backpackCapacity()?'disabled':''}>Khai thác</button></div><h3>🔥 Lò nung kim loại</h3><div class="management-row"><span><b>🟠 Nung thỏi đồng</b><small>3 quặng đồng + 12 xu → 1 thỏi đồng</small></span><button data-smelt="copper" ${(state.inventory.resources?.copperOre||0)<3||state.money<12?'disabled':''}>Nung</button></div><div class="management-row"><span><b>⚙️ Nung thỏi sắt</b><small>3 quặng sắt + 20 xu → 1 thỏi sắt</small></span><button data-smelt="iron" ${(state.inventory.resources?.ironOre||0)<3||state.money<20?'disabled':''}>Nung</button></div><p class="management-note">Đá, quặng và thỏi kim loại được lưu trong túi đồ và có thể cất vào kho. Thỏi đồng/sắt dùng để nâng cấp cuốc chim, thuyền và các công cụ mới trong những bản sau.</p>`;
      this.content.querySelector('[data-forge-rod]')?.addEventListener('click',()=>{if(hasRod||state.money<120||state.inventory.crops.wheat<2)return;state.money-=120;state.inventory.crops.wheat-=2;state.forge.rodLevel=1;state.forge.durability=10;saveGame();this.showMessage('Đã chế tạo cần câu cấp 1!');this.openManagement('forge');});
      this.content.querySelector('[data-repair-rod]')?.addEventListener('click',()=>{if(!hasRod||state.money<25||state.forge.durability>=10)return;state.money-=25;state.forge.durability=10;state.forge.repairedCount++;saveGame();this.showMessage('Cần câu đã được sửa chữa.');this.openManagement('forge');});
      this.content.querySelector('[data-upgrade-rod]')?.addEventListener('click',()=>{if(!hasRod||state.forge.rodLevel>=3||state.money<180)return;state.money-=180;state.forge.rodLevel++;state.forge.durability=10;saveGame();this.showMessage(`Cần câu đã nâng lên cấp ${state.forge.rodLevel}!`);this.openManagement('forge');});
      this.content.querySelectorAll('[data-upgrade-tool]').forEach(btn=>btn.addEventListener('click',()=>{
        const id=btn.dataset.upgradeTool; state.forge.upgrades ??= {};
        const level=Number(state.forge.upgrades[id])||0;
        if(level>=3)return;
        const cost= id==='hoe'?(level===0?150:200):(level===0?120:180);
        const wheatCost=id==='hoe'&&level===0?3:2;
        if(state.money<cost||(state.inventory.crops.wheat||0)<wheatCost)return;
        state.money-=cost;state.inventory.crops.wheat-=wheatCost;state.forge.upgrades[id]=level+1;
        saveGame();
        this.showMessage(id==='hoe'?`Cuốc đã lên cấp ${level+1}! Cây trồng sinh trưởng nhanh hơn.`:`Bình tưới đã lên cấp ${level+1}!`);
        this.openManagement('forge');
      }));
      this.content.querySelector('[data-craft-pickaxe]')?.addEventListener('click',()=>{const r=craftPickaxe();this.showMessage(r.ok?(r.level===1?'Đã chế tạo cuốc chim!':`Cuốc chim đã nâng lên cấp ${r.level}.`):r.message);this.openManagement('forge');});
      this.content.querySelector('[data-mine]')?.addEventListener('click',()=>{const r=mineResources();if(!r.ok){this.showMessage(r.message);return;}const labels={stone:'đá',copperOre:'quặng đồng',ironOre:'quặng sắt',crystal:'tinh thể'};this.showMessage('Khai thác được '+Object.entries(r.loot).map(([id,n])=>`${labels[id]} ×${n}`).join(', ')+'.');this.update();this.openManagement('forge');});
      this.content.querySelectorAll('[data-smelt]').forEach(btn=>btn.addEventListener('click',()=>{const r=smeltOre(btn.dataset.smelt);this.showMessage(r.message);this.update();this.openManagement('forge');}));
    } else if (page === 'pets') {
      title.textContent = '🐾 Thú cưng đồng hành';
      this.content.innerHTML = `<p class="management-note">Mua chó hoặc mèo để chúng chạy theo nhân vật. Có thể chọn một thú cưng làm bạn đồng hành; thú cưng được lưu trong dữ liệu game.</p><div class="management-row"><span><b>🐕 Chó nông trại</b><small>Sát cánh cùng m · Giá 220 xu · Sở hữu: ${state.pets.dog?'Có':'Chưa có'}</small></span><button data-buy-pet="dog" ${state.pets.dog||state.money<220?'disabled':''}>Mua</button><button data-select-pet="dog" ${!state.pets.dog?'disabled':''}>Đi theo</button></div><div class="management-row"><span><b>🐈 Mèo nông trại</b><small>Lang thang bên cạnh m · Giá 180 xu · Sở hữu: ${state.pets.cat?'Có':'Chưa có'}</small></span><button data-buy-pet="cat" ${state.pets.cat||state.money<180?'disabled':''}>Mua</button><button data-select-pet="cat" ${!state.pets.cat?'disabled':''}>Đi theo</button></div><div class="management-row"><span><b>🐾 Bạn đồng hành hiện tại</b><small>${state.pets.active&&state.pets[state.pets.active]?'Đang theo: '+(state.pets.active==='dog'?'chó':'mèo'):'Chưa chọn'}</small></span><button data-no-pet>Không theo</button></div>`;
      this.content.querySelectorAll('[data-buy-pet]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.buyPet,cost=id==='dog'?220:180;if(state.pets[id]||state.money<cost)return;state.money-=cost;state.pets[id]=1;state.pets.active=id;saveGame();this.showMessage(`Đã nhận nuôi ${id==='dog'?'chó':'mèo'}!`);this.openManagement('pets');}));
      this.content.querySelectorAll('[data-select-pet]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.selectPet;if(!state.pets[id])return;state.pets.active=id;saveGame();this.showMessage('Thú cưng đang theo nhân vật.');this.openManagement('pets');}));
      this.content.querySelector('[data-no-pet]')?.addEventListener('click',()=>{state.pets.active=null;saveGame();this.openManagement('pets');});
    } else if (page === 'assets') {
      title.textContent = '🧊 Quản lý model 3D';
      this.content.innerHTML = `<p class="management-note">Bước này hỗ trợ tải một tệp GLB/GLTF cho Player, xem trước, áp dụng hoặc khôi phục model chibi mặc định. Model mặc định vẫn được giữ để dự phòng.</p><label class="asset-file-label" for="asset-model-file">Chọn model GLB / GLTF</label><input id="asset-model-file" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json"><div id="asset-status" class="asset-status" role="status">Chưa chọn model. Model mặc định đang hoạt động.</div><div id="asset-preview" class="asset-preview"><div class="asset-preview-placeholder">🧊<br>Chọn tệp để xem trước model 3D</div></div><div class="asset-actions"><button id="asset-apply" type="button" disabled>Áp dụng cho Player</button><button id="asset-reset" type="button">Khôi phục mặc định</button></div><p class="management-note">Lưu ý: GLTF có thể phụ thuộc texture/buffer bên ngoài; bước này phù hợp nhất với GLB đóng gói một tệp. Tệp chỉ được giữ trong phiên hiện tại, chưa lưu lâu dài.</p>`;
      this._bindAssetPanel();
    } else {
      title.textContent = '📜 Bác trưởng làng — Nhiệm vụ & giao hàng';
      const quests = [
        { id: 'harvest', emoji: '🌾', name: 'Người nông dân chăm chỉ', description: `Thu hoạch ${state.quests.harvest.target} cây bất kỳ.`, reward: 150, exp: 30 },
        { id: 'sell', emoji: '🧺', name: 'Giúp quầy chợ', description: `Bán ${state.quests.sell.target} nông sản tại cửa hàng.`, reward: 100, exp: 20 },
        { id: 'fish', emoji: '🐟', name: 'Bữa ăn bên hồ', description: `Câu hoặc thu hoạch ${state.quests.fish.target} con cá.`, reward: 120, exp: 25 }
      ];
      const orders = state.deliveryOrders || [];
      const cropNames = { wheat: 'Lúa mì', carrot: 'Cà rốt', tomato: 'Cà chua', pumpkin: 'Bí ngô' };
      const cropEmojis = { wheat: '🌾', carrot: '🥕', tomato: '🍅', pumpkin: '🎃' };
      const dialogue = `<div class="npc-dialogue"><div class="npc-dialogue-avatar">👨🏻‍🌾</div><div><b>Bác trưởng làng</b><p>Chào cháu! Dạo này dân làng cần nông sản. Cháu có thể nhận đơn, gom đúng số lượng rồi giao cho bác. Giao đủ hàng sẽ nhận tiền và EXP nhé!</p></div></div>`;
      const questCards = quests.map(def => {
        const q = state.quests[def.id], done = q.progress >= q.target;
        return `<div class="quest-card"><div class="quest-emoji">${def.emoji}</div><h3>${def.name}</h3><p>${def.description}</p><div class="quest-progress"><span style="width:${Math.min(100, q.progress / q.target * 100)}%"></span></div><p>Tiến độ: ${Math.min(q.progress,q.target)}/${q.target}</p><p class="management-note">Phần thưởng: ${def.reward}💰 + ${def.exp} EXP</p><button type="button" data-claim-quest="${def.id}" ${( !done || q.claimed) ? 'disabled' : ''}>${q.claimed ? 'Đã nhận thưởng ✓' : done ? 'Nhận thưởng 🎁' : 'Đang thực hiện'}</button></div>`;
      }).join('');
      const orderCards = orders.map(order => {
        const amount = Math.max(0, Math.floor(state.inventory.crops?.[order.crop] || 0));
        const enough = amount >= order.quantity;
        const status = order.completed ? 'Đã giao thành công ✓' : order.accepted ? `Trong túi: ${amount}/${order.quantity}` : 'Chưa nhận đơn';
        const action = order.completed
          ? '<button type="button" disabled>Đã hoàn tất</button>'
          : !order.accepted
            ? `<button type="button" data-accept-order="${order.id}">Nhận đơn</button>`
            : `<button type="button" data-deliver-order="${order.id}" ${enough ? '' : 'disabled'}>Giao hàng</button>`;
        return `<div class="quest-card delivery-card"><div class="quest-emoji">📦</div><h3>Đơn hàng: ${cropNames[order.crop] || order.crop}</h3><p>Cần ${order.quantity} ${cropNames[order.crop] || order.crop.toLowerCase()} ${cropEmojis[order.crop] || '🌱'}.</p><p class="delivery-status">${status}</p><p class="management-note">Thưởng: ${order.reward}💰 + ${order.exp} EXP</p>${action}</div>`;
      }).join('');
      this.content.innerHTML = dialogue + '<h3>📦 Đơn giao hàng</h3><p class="management-note">Nhận đơn trước, sau đó giao đủ nông sản từ túi đồ. Hàng giao sẽ bị trừ khỏi kho.</p>' + orderCards + '<h3>🌟 Nhiệm vụ trong làng</h3>' + questCards;
      this.content.querySelectorAll('[data-accept-order]').forEach(btn => btn.addEventListener('click', () => {
        const order = state.deliveryOrders.find(item => item.id === btn.dataset.acceptOrder);
        if (!order || order.accepted || order.completed) return;
        order.accepted = true; saveGame(); this.showMessage('Đã nhận đơn giao hàng! Gom đủ nông sản rồi quay lại nhé. 📦'); this.openManagement('quests');
      }));
      this.content.querySelectorAll('[data-deliver-order]').forEach(btn => btn.addEventListener('click', () => {
        const order = state.deliveryOrders.find(item => item.id === btn.dataset.deliverOrder);
        const amount = order ? Math.max(0, Math.floor(state.inventory.crops?.[order.crop] || 0)) : 0;
        if (!order || !order.accepted || order.completed || amount < order.quantity) return;
        state.inventory.crops[order.crop] -= order.quantity;
        order.completed = true;
        state.money += order.reward; state.exp += order.exp;
        while (state.exp >= state.level * 100) { state.exp -= state.level * 100; state.level += 1; }
        saveGame(); this.update(); this.showMessage(`Giao hàng thành công! +${order.reward}💰 +${order.exp} EXP 🎉`); this.openManagement('quests');
      }));
      this.content.querySelectorAll('[data-claim-quest]').forEach(btn => btn.addEventListener('click', () => {
        const def = quests.find(item => item.id === btn.dataset.claimQuest);
        const q = state.quests[btn.dataset.claimQuest];
        if (!def || !q || q.progress < q.target || q.claimed) return;
        q.claimed = true; state.money += def.reward; state.exp += def.exp;
        while (state.exp >= state.level * 100) { state.exp -= state.level * 100; state.level += 1; }
        saveGame(); this.update(); this.showMessage(`Hoàn thành nhiệm vụ! +${def.reward}💰 +${def.exp} EXP 🎉`); this.openManagement('quests');
      }));
    }
  }

  async _bindAssetPanel() {
    const ctx=this.assetContext; if(!ctx) return;
    const fileInput=this.content.querySelector('#asset-model-file'), previewHost=this.content.querySelector('#asset-preview'), status=this.content.querySelector('#asset-status'), apply=this.content.querySelector('#asset-apply'), reset=this.content.querySelector('#asset-reset');
    this.pendingPlayerModel=null;
    try { this.assetPreview?.dispose(); } catch (_) {}
    this.assetPreview=new ctx.AssetPreview(previewHost);
    fileInput.addEventListener('change', async () => {
      const file=fileInput.files?.[0]; if(!file) return;
      apply.disabled=true; status.textContent=`Đang tải ${file.name}…`;
      try {
        const ext=file.name.split('.').pop().toLowerCase();
        if(!['glb','gltf'].includes(ext)) throw new Error('Giai đoạn này chỉ hỗ trợ xem trước GLB/GLTF. FBX và OBJ sẽ được bổ sung sau.');
        if(file.size>80*1024*1024) throw new Error('Model vượt quá 80 MB. Hãy dùng model nhẹ hơn để phù hợp điện thoại.');
        const result=await ctx.assetManager.loadFromFile(file,{id:'player-preview-'+Date.now(),targetHeight:2});
        this.pendingPlayerModel=result.object;
        this.assetPreview.setModel(result.object);
        apply.disabled=false;
        status.textContent=`Đã tải: ${file.name}. Kiểm tra model rồi bấm “Áp dụng cho Player”.`;
      } catch(error) { status.textContent=`Không tải được model: ${error.message}. Player vẫn dùng model mặc định.`; ctx.showMessage?.('Model lỗi — vẫn giữ nhân vật mặc định.'); console.warn('[AssetManager UI]',error); }
    });
    apply.addEventListener('click',()=>{
      if(!this.pendingPlayerModel) return;
      try {
        // Preview scene và game dùng chung Object3D nên tách khỏi preview trước khi áp dụng.
        const model=this.pendingPlayerModel; this.assetPreview.scene.remove(model); this.assetPreview.model=null;
        ctx.player.applyCustomModel(model); this.pendingPlayerModel=null;
        status.textContent='Đã áp dụng model tùy chỉnh cho Player. Model mặc định vẫn được giữ để khôi phục.';
        ctx.showMessage?.('Đã áp dụng model Player tùy chỉnh!');
      } catch(error) { status.textContent=`Không thể áp dụng model: ${error.message}`; }
    });
    reset.addEventListener('click',()=>{
      ctx.player.resetDefaultModel(); this.pendingPlayerModel=null; apply.disabled=true;
      status.textContent='Đã khôi phục model chibi mặc định.'; ctx.showMessage?.('Đã khôi phục nhân vật mặc định.');
      if(this.assetPreview) { this.assetPreview.scene.remove(this.assetPreview.model); this.assetPreview.model=null; }
    });
  }

  closeManagement() { if (this.modal) this.modal.hidden = true; try { this.assetPreview?.dispose(); this.assetPreview=null; } catch (_) {} }

  update() {
    this.moneyEl.textContent = state.money;
    this.harvestedEl.textContent = state.harvested;
    this.dayEl.textContent = state.day;
    if (this.clockEl) {
      const dayLength = Math.max(1, Number(state.dayLength) || 3600);
      const daySeconds = ((state.time % dayLength) + dayLength) % dayLength;
      // Ánh xạ tiến trình một ngày trong game thành đồng hồ 24 giờ.
      const totalMinutes = Math.floor((daySeconds / dayLength) * 24 * 60) % (24 * 60);
      const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const minutes = String(totalMinutes % 60).padStart(2, '0');
      this.clockEl.textContent = `${hours}:${minutes}`;
    }
    if (this.levelEl) this.levelEl.textContent = state.level;
    if (this.expEl) this.expEl.textContent = `${state.exp}/${state.level * 100}`;
    this.seedListEl?.querySelectorAll('[data-crop]').forEach(btn => {
      const crop = CROPS[btn.dataset.crop];
      if (crop) btn.textContent = `${crop.emoji} ${crop.name} ×${state.inventory.seeds[crop.id] || 0}`;
    });
  }

  showMessage(text) {
    this.messageEl.textContent = text;
    this.messageEl.classList.add('show');
    clearTimeout(this._t);
    this._t = setTimeout(() => this.messageEl.classList.remove('show'), 2000);
  }

  hideLoading() { 
    document.getElementById('loading').classList.add('hidden'); 
  }
}