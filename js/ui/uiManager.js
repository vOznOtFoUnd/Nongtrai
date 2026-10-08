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
    const mins = Math.floor((gameState.dayTimeSeconds % REAL_SECS_PER_GAME_HOUR) * (60 / REAL_SECS_PER_GAME_HOUR));
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
}
