// Settings and portable save management for UPGRADE 07.
function openSettings() {
  const name = document.getElementById('setting-player-name');
  const sound = document.getElementById('setting-sound');
  if (name) name.value = gameState.playerName || 'Chibi Farmer';
  if (sound) sound.checked = !gameState.settings || gameState.settings.sound !== false;
  openModal('modal-settings');
}
function savePlayerName() {
  const input = document.getElementById('setting-player-name');
  const name = String(input && input.value || '').trim().slice(0, 24);
  if (!name) { showToast('Tên chưa hợp lệ', 'Nhập tên từ 1 đến 24 ký tự.', '⚠️'); return; }
  gameState.playerName = name;
  const display = document.getElementById('player-name-display'); if (display) display.textContent = name; const profileName = document.getElementById('profile-player-name'); if (profileName) profileName.textContent = name;
  saveGame(); showToast('Đã đổi tên', `Nhân vật hiện là ${name}.`, '🧑‍🌾');
}
function saveAudioSettings() {
  if (!gameState.settings) gameState.settings = { sound: true, music: false };
  gameState.settings.sound = !!document.getElementById('setting-sound')?.checked;
  // Giữ trường music cũ để tương thích save, nhưng không hiển thị tùy chọn nhạc khi chưa có nhạc nền.
  gameState.settings.music = false;
  saveGame();
  if (gameState.settings.sound) playUiSound('confirm');
  showToast('Đã lưu cài đặt', 'Hiệu ứng giao diện đã được cập nhật.', '🔊');
}
let uiAudioContext = null;
function playUiSound(kind = 'tap') {
  if (!gameState?.settings || gameState.settings.sound === false) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!uiAudioContext) uiAudioContext = new AudioCtx();
    if (uiAudioContext.state === 'suspended') uiAudioContext.resume().catch(() => {});
    const osc = uiAudioContext.createOscillator();
    const gain = uiAudioContext.createGain();
    const now = uiAudioContext.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(kind === 'confirm' ? 660 : 520, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'confirm' ? 880 : 390, now + 0.07);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain); gain.connect(uiAudioContext.destination);
    osc.start(now); osc.stop(now + 0.1);
  } catch (_) { /* Audio is optional; it must never block gameplay. */ }
}
function exportFarmSave() {
  saveGame();
  const payload = JSON.stringify({ format: 'nongtrai-save', version: 7, exportedAt: new Date().toISOString(), state: gameState }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = 'nongtrai-save-' + new Date().toISOString().slice(0,10) + '.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Đã xuất save', 'Tệp sao lưu đã được tạo.', '💾');
}
function importFarmSave(event) {
  const file = event?.target?.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ''));
      const state = parsed && parsed.format === 'nongtrai-save' ? parsed.state : parsed;
      if (!state || typeof state !== 'object' || Array.isArray(state) || !('gold' in state) || !('plots' in state)) throw new Error('Tệp không phải save nông trại hợp lệ');
      if (!confirm('Nhập save sẽ thay thế tiến trình hiện tại. Tiếp tục?')) return;
      localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(state));
      location.reload();
    } catch (error) { showToast('Không nhập được save', error.message || 'Tệp JSON không hợp lệ.', '❌'); }
    finally { event.target.value = ''; }
  };
  reader.onerror = () => showToast('Lỗi đọc tệp', 'Không thể đọc tệp save này.', '❌');
  reader.readAsText(file);
}
function startNewFarm() {
  if (!confirm('Tạo nông trại mới sẽ xóa save đang lưu trên thiết bị này. Hãy xuất save trước nếu muốn giữ tiến trình. Tiếp tục?')) return;
  localStorage.removeItem(CONFIG.SAVE_KEY);
  (CONFIG.LEGACY_SAVE_KEYS || []).forEach(key => localStorage.removeItem(key));
  location.reload();
}

// Phát hiệu ứng ngắn khi người chơi tương tác UI; AudioContext được mở trong cử chỉ người dùng.
(function installUiSoundDelegation() {
  if (window.__nongtraiUiSoundInstalled) return;
  window.__nongtraiUiSoundInstalled = true;
  document.addEventListener('pointerdown', (event) => {
    const target = event.target && event.target.closest && event.target.closest('button, [role="button"], .interactive-ui');
    if (!target || target.disabled || target.dataset.noUiSound === 'true') return;
    playUiSound(target.id === 'locked-plot-unlock-button' ? 'confirm' : 'tap');
  }, { capture: true, passive: true });
})();
