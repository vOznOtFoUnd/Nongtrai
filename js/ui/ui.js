import { CROPS } from '../core/config.js';
import { state, saveGame } from '../data/state.js';

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
      const buyRows = Object.values(CROPS).map(c => `<div class="management-row"><span>${c.emoji} <b>${c.name}</b><small>Hạt giống trong kho: ${state.inventory.seeds[c.id] || 0}</small></span><button type="button" data-buy-seed="${c.id}">Mua 5 · ${Math.floor(c.cost * 4)}💰</button></div>`).join('');
      const sellRows = Object.values(CROPS).map(c => `<div class="management-row"><span>${c.emoji} <b>${c.name}</b><small>Trong túi: ${state.inventory.crops?.[c.id] || 0} · Giá bán: ${c.sell}💰/cây</small></span><button type="button" data-sell-crop="${c.id}" ${(state.inventory.crops?.[c.id] || 0) < 1 ? 'disabled' : ''}>Bán 1</button></div>`).join('');
      const fishSellValue = Math.max(0, Math.floor(state.inventory.fish || 0)) * 45;
      const totalSellValue = Object.values(CROPS).reduce((sum, c) => sum + c.sell * (state.inventory.crops?.[c.id] || 0), 0) + fishSellValue;
      this.content.innerHTML = `<div class="shop-balance">💰 Số dư: <b>${state.money}</b></div><h3>🌱 Mua hạt giống</h3><p class="management-note">Mỗi gói có 5 hạt, giá gói bằng 4 lần giá mua lẻ.</p>${buyRows}<h3>🧺 Bán nông sản</h3>${sellRows}<div class="management-row"><span><b>🐟 Cá trong túi: ${state.inventory.fish || 0}</b><small>Giá bán: 45💰/con</small></span><button type="button" data-sell-fish ${(state.inventory.fish || 0) < 1 ? 'disabled' : ''}>Bán 1 cá</button></div><div class="management-row"><span><b>Bán toàn bộ hàng hóa</b><small>Nhận tối đa ${totalSellValue}💰 theo số hàng hiện có</small></span><button type="button" data-sell-all ${totalSellValue < 1 ? 'disabled' : ''}>Bán tất cả</button></div>`;
      this.content.querySelectorAll('[data-buy-seed]').forEach(btn => btn.addEventListener('click', () => {
        const crop = CROPS[btn.dataset.buySeed], price = Math.floor(crop.cost * 4);
        if (state.money < price) { this.showMessage('Không đủ tiền mua gói hạt giống! 💸'); return; }
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
        if (!soldCount) return;
        state.money += earned; saveGame(); this.showMessage(`Đã bán ${soldCount} món hàng, nhận ${earned}💰!`); this.update(); this.openManagement('shop');
      });
    } else if (page === 'inventory') {
      title.textContent = '🎒 Túi đồ nông trại';
      this.content.innerHTML = `<div class="inventory-summary"><span>💰 Tiền: <b>${state.money}</b></span><span>🧺 Đã thu hoạch: <b>${state.harvested}</b></span><span>⭐ Cấp độ: <b>${state.level}</b></span><span>💵 Giá trị nông sản: <b>${Object.values(CROPS).reduce((sum,c)=>sum+c.sell*(state.inventory.crops?.[c.id]||0),0)}</b></span></div><h3>🌱 Hạt giống</h3>` + Object.values(CROPS).map(c => `<div class="management-row"><span>${c.emoji} ${c.name}</span><b>× ${state.inventory.seeds[c.id] || 0}</b></div>`).join('') + '<h3>🧺 Nông sản</h3>' + Object.values(CROPS).map(c => `<div class="management-row"><span>${c.emoji} ${c.name}</span><b>× ${state.inventory.crops?.[c.id] || 0} <small>(${c.sell}💰/cây)</small></b></div>`).join('') + `<div class="management-row"><span>🐟 Cá</span><b>× ${state.inventory.fish || 0} <small>(45💰/con)</small></b></div><p class="management-note">Hạt giống sẽ tự dùng trước khi game trừ tiền mua lẻ. Nông sản và cá cần bán tại cửa hàng để đổi thành tiền.</p>`;
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
        const amount = pond.count; state.inventory.fish = (state.inventory.fish || 0) + amount;
        state.quests.fish.progress = Math.min(state.quests.fish.target, state.quests.fish.progress + amount);
        pond.count = 0; pond.growth = 0; saveGame(); this.update();
        this.showMessage(`Thu hoạch ${amount} cá nuôi! Bán tại cửa hàng để nhận ${amount * 45}💰 🐟`); this.openManagement('fishing');
      });
      this.content.querySelector('[data-cast-fishing]')?.addEventListener('click', () => {
        if (Math.random() < 0.6) {
          state.inventory.fish = (state.inventory.fish || 0) + 1; state.quests.fish.progress = Math.min(state.quests.fish.target, state.quests.fish.progress + 1); saveGame(); this.update();
          this.showMessage('Câu được 1 con cá! Bán tại cửa hàng để nhận 45💰 🎣');
        } else this.showMessage('Cá hôm nay chưa cắn câu, thử lại nhé! 🎣');
        this.openManagement('fishing');
      });
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