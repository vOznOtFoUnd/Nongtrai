// Cập nhật toàn bộ giao diện UI chính (Top Nav Bar)
function updateUI() {
    const goldDisplay = document.getElementById('gold-display');
    const staminaDisplay = document.getElementById('stamina-display');
    const levelBadge = document.getElementById('player-level-badge');
    const expBar = document.getElementById('exp-bar');
    const expText = document.getElementById('exp-text');
    const gameTimeDisplay = document.getElementById('game-time-display');
    const dayCounterDisplay = document.getElementById('day-counter-display');
    const weatherIcon = document.getElementById('weather-icon');

    if (goldDisplay) goldDisplay.innerText = gameState.gold.toLocaleString('vi-VN');
    if (staminaDisplay) staminaDisplay.innerText = `${gameState.stamina} / ${gameState.maxStamina}`;
    if (levelBadge) levelBadge.innerText = `Lv.${gameState.level}`;

    const reqExp = gameState.level * 100;
    const expPct = Math.min(100, Math.floor((gameState.exp / reqExp) * 100));
    if (expBar) expBar.style.width = expPct + '%';
    if (expText) expText.innerText = `${gameState.exp} / ${reqExp} EXP`;

    const hrs = Math.floor(gameState.dayTimeSeconds / REAL_SECS_PER_GAME_HOUR);
    const mins = Math.floor(((gameState.dayTimeSeconds % REAL_SECS_PER_GAME_HOUR) * 60) / REAL_SECS_PER_GAME_HOUR);
    const formatStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    
    if (gameTimeDisplay) gameTimeDisplay.innerText = formatStr;
    if (dayCounterDisplay) dayCounterDisplay.innerText = `Ngày ${gameState.gameDay}`;
    if (weatherIcon) weatherIcon.innerText = WEATHER_ICONS[gameState.currentWeather] || '☀️';
}

// Chọn công cụ ở Thanh công cụ phía dưới (Hand / Water)
function selectTool(tool) {
    gameState.currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('bg-amber-500', 'text-white', 'scale-105');
        btn.classList.add('bg-slate-200', 'text-slate-700');
    });
    const selected = document.getElementById('tool-' + tool);
    if (selected) {
        selected.classList.remove('bg-slate-200', 'text-slate-700');
        selected.classList.add('bg-amber-500', 'text-white', 'scale-105');
    }
    if (tool === 'chop') showToast('Đã chọn Cuốc 🪓', 'Chạm vào cây ăn quả hoặc cây trồng để loại bỏ. Mọi cây trồng trong ô đất đều cần xác nhận.', '🪓');
}


// Hồ sơ chỉ hiển thị chân dung, thống kê nông trại và nút cài đặt.
function formatFarmPlayTime(totalSeconds) {
    const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days} ngày ${hours} giờ`;
    if (hours > 0) return `${hours} giờ ${minutes} phút`;
    return `${minutes} phút`;
}
function openPlayerProfile() {
    const name = gameState.playerName || 'Chibi Farmer';
    const nameNode = document.getElementById('profile-player-name');
    const avatarNode = document.getElementById('profile-avatar');
    const sourceAvatar = document.getElementById('avatar-icon');
    if (nameNode) nameNode.textContent = name;
    if (avatarNode && sourceAvatar) avatarNode.textContent = sourceAvatar.textContent || '🧑‍🌾';
    const stats = gameState.statistics || {};
    const rows = [
        ['🐔', 'Động vật đã xuất chuồng/bán', Number(stats.animalsSold) || 0],
        ['🍲', 'Món ăn đã nấu', Number(stats.mealsCooked) || 0],
        ['⏱️', 'Tổng thời gian chơi', formatFarmPlayTime(stats.playTimeSeconds)],
        ['🩺', 'Số lần động vật bị bệnh', Number(stats.animalSicknessEvents) || 0],
        ['🌱', 'Số cây đã trồng', Number(stats.cropsPlanted) || 0]
    ];
    const list = document.getElementById('profile-statistics-list');
    if (list) list.innerHTML = rows.map(([icon, label, value]) => `
        <div class="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white/90 px-3 py-2.5">
          <span class="text-xl w-7 text-center">${icon}</span>
          <span class="flex-1 min-w-0 text-xs font-semibold text-slate-600">${label}</span>
          <strong class="text-sm text-emerald-900 tabular-nums">${typeof value === 'number' ? value.toLocaleString('vi-VN') : value}</strong>
        </div>`).join('');
    openModal('modal-player-profile');
}
