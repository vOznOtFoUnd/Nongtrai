import { CROPS } from './config.js';
import { state } from './state.js';

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
      btn.textContent = `${crop.emoji} ${crop.name} - ${crop.cost}$`;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.seed-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.selectedCrop = crop.id;
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
  }

  setManagementContext(showMessage) { this.managementMessage = showMessage; }

  _bindManagement() {
    this.modal = document.getElementById('management-modal');
    this.content = document.getElementById('management-content');
    document.getElementById('open-shop')?.addEventListener('click', () => this.openManagement('shop'));
    document.getElementById('open-inventory')?.addEventListener('click', () => this.openManagement('inventory'));
    document.getElementById('open-quests')?.addEventListener('click', () => this.openManagement('quests'));
    document.getElementById('close-management')?.addEventListener('click', () => this.closeManagement());
    this.modal?.addEventListener('click', e => { if (e.target === this.modal) this.closeManagement(); });
  }

  openManagement(page) {
    if (!this.modal || !this.content) return;
    this.modal.hidden = false;
    const title = document.getElementById('management-title');
    if (page === 'shop') {
      title.textContent = '🛒 Cửa hàng hạt giống';
      this.content.innerHTML = '<p class="management-note">Mỗi gói có 5 hạt giống, rẻ hơn mua lẻ 20%.</p>' + Object.values(CROPS).map(c => `<div class="management-row"><span>${c.emoji} <b>${c.name}</b><small>Kho: ${state.inventory.seeds[c.id] || 0}</small></span><button type="button" data-buy-seed="${c.id}">Mua 5 · ${Math.floor(c.cost * 4)}💰</button></div>`).join('');
      this.content.querySelectorAll('[data-buy-seed]').forEach(btn => btn.addEventListener('click', () => {
        const crop = CROPS[btn.dataset.buySeed], price = Math.floor(crop.cost * 4);
        if (state.money < price) { this.showMessage('Không đủ tiền mua gói hạt giống! 💸'); return; }
        state.money -= price; state.inventory.seeds[crop.id] = (state.inventory.seeds[crop.id] || 0) + 5;
        this.showMessage(`Đã mua 5 gói hạt ${crop.name}! 🌱`); this.update(); this.openManagement('shop');
        import('./state.js').then(m => m.saveGame());
      }));
    } else if (page === 'inventory') {
      title.textContent = '🎒 Túi đồ nông trại';
      this.content.innerHTML = `<div class="inventory-summary"><span>💰 Tiền: <b>${state.money}</b></span><span>🧺 Đã thu hoạch: <b>${state.harvested}</b></span><span>⭐ Cấp độ: <b>${state.level}</b></span></div><h3>Hạt giống</h3>` + Object.values(CROPS).map(c => `<div class="management-row"><span>${c.emoji} ${c.name}</span><b>× ${state.inventory.seeds[c.id] || 0}</b></div>`).join('') + '<p class="management-note">Hạt giống sẽ tự dùng trước khi game trừ tiền mua lẻ.</p>';
    } else {
      const q = state.quests.harvest, done = q.progress >= q.target;
      title.textContent = '📜 Nhiệm vụ nông trại';
      this.content.innerHTML = `<div class="quest-card"><div class="quest-emoji">🌾</div><h3>Người nông dân chăm chỉ</h3><p>Thu hoạch ${q.target} cây bất kỳ.</p><div class="quest-progress"><span style="width:${Math.min(100, q.progress / q.target * 100)}%"></span></div><p>Tiến độ: ${Math.min(q.progress,q.target)}/${q.target}</p><p class="management-note">Phần thưởng: 150💰 + 30 EXP</p><button id="claim-quest" type="button" ${(!done || q.claimed) ? 'disabled' : ''}>${q.claimed ? 'Đã nhận thưởng ✓' : done ? 'Nhận thưởng 🎁' : 'Chưa hoàn thành'}</button></div>`;
      this.content.querySelector('#claim-quest')?.addEventListener('click', () => {
        if (q.progress < q.target || q.claimed) return;
        q.claimed = true; state.money += 150; state.exp += 30;
        while (state.exp >= state.level * 100) { state.exp -= state.level * 100; state.level += 1; }
        import('./state.js').then(m => m.saveGame()); this.update(); this.showMessage('Hoàn thành nhiệm vụ! +150💰 +30 EXP 🎉'); this.openManagement('quests');
      });
    }
  }

  closeManagement() { if (this.modal) this.modal.hidden = true; }

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