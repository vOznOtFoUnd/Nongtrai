// Settings and portable save management for UPGRADE 07.
function openSettings() {
  const name = document.getElementById('setting-player-name');
  const sound = document.getElementById('setting-sound');
  const music = document.getElementById('setting-music');
  if (name) name.value = gameState.playerName || 'Chibi Farmer';
  if (sound) sound.checked = !gameState.settings || gameState.settings.sound !== false;
  if (music) music.checked = !!(gameState.settings && gameState.settings.music === true);
  const soundVolume = document.getElementById('setting-sound-volume');
  const musicVolume = document.getElementById('setting-music-volume');
  if (soundVolume) soundVolume.value = Math.round(Math.max(0, Math.min(1, Number((gameState.settings && gameState.settings.soundVolume) ?? 0.65)) * 100));
  if (musicVolume) musicVolume.value = Math.round(Math.max(0, Math.min(1, Number((gameState.settings && gameState.settings.musicVolume) ?? 0.3)) * 100));
  updateAudioVolumeLabels();
  const control = document.getElementById('setting-control-mode');
  if (control) control.value = (gameState.settings && gameState.settings.controlMode === 'direct') ? 'direct' : 'click';
  if (typeof updateControlModeUI === 'function') updateControlModeUI();
  if (typeof updateCameraAngleUI === 'function') updateCameraAngleUI();
  const cameraMode = document.getElementById('setting-camera-mode');
  if (cameraMode) cameraMode.value = (gameState.settings && gameState.settings.cameraMode === 'topdown') ? 'topdown' : 'thirdPerson';
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
function updateAudioVolumeLabels() {
  const sound = document.getElementById('setting-sound-volume');
  const music = document.getElementById('setting-music-volume');
  const soundLabel = document.getElementById('setting-sound-volume-label');
  const musicLabel = document.getElementById('setting-music-volume-label');
  if (soundLabel && sound) soundLabel.textContent = `${sound.value}%`;
  if (musicLabel && music) musicLabel.textContent = `${music.value}%`;
}
function previewAudioVolume(which, value) {
  if (!gameState.settings || typeof gameState.settings !== 'object') gameState.settings = { sound: true, music: false, soundVolume: 0.65, musicVolume: 0.3 };
  const level = Math.max(0, Math.min(100, Number(value) || 0)) / 100;
  if (which === 'music') gameState.settings.musicVolume = level;
  else gameState.settings.soundVolume = level;
  updateAudioVolumeLabels();
  if (typeof updateFarmAudioVolumes === 'function') updateFarmAudioVolumes();
  if (which === 'music' && gameState.settings.music && typeof updateFarmMusic === 'function') updateFarmMusic();
}
function saveAudioSettings() {
  if (!gameState.settings || typeof gameState.settings !== 'object') gameState.settings = { sound: true, music: false, soundVolume: 0.65, musicVolume: 0.3 };
  gameState.settings.sound = !!document.getElementById('setting-sound')?.checked;
  gameState.settings.music = !!document.getElementById('setting-music')?.checked;
  const soundVolume = document.getElementById('setting-sound-volume');
  const musicVolume = document.getElementById('setting-music-volume');
  if (soundVolume) gameState.settings.soundVolume = Math.max(0, Math.min(100, Number(soundVolume.value) || 0)) / 100;
  if (musicVolume) gameState.settings.musicVolume = Math.max(0, Math.min(100, Number(musicVolume.value) || 0)) / 100;
  updateAudioVolumeLabels();
  if (typeof updateFarmAudioVolumes === 'function') updateFarmAudioVolumes();
  if (typeof updateFarmMusic === 'function') updateFarmMusic();
  saveGame();
  if (gameState.settings.sound) playUiSound('confirm');
  showToast('Đã lưu cài đặt âm thanh', `Hiệu ứng ${gameState.settings.sound ? 'bật' : 'tắt'} · Nhạc nền ${gameState.settings.music ? 'bật' : 'tắt'}.`, '🔊');
}
let uiAudioContext = null;
function playUiSound(kind = 'tap') {
  if (typeof playFarmSound === 'function') playFarmSound(kind === 'confirm' ? 'confirm' : 'ui');
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


function saveControlSettings() {
  if (!gameState.settings || typeof gameState.settings !== 'object') gameState.settings = {};
  const control = document.getElementById('setting-control-mode');
  gameState.settings.controlMode = control && control.value === 'direct' ? 'direct' : 'click';
  if (typeof setPlayerControlMode === 'function') setPlayerControlMode(gameState.settings.controlMode);
  saveGame();
  showToast('Đã đổi kiểu điều khiển', gameState.settings.controlMode === 'direct' ? 'Joystick / WASD đã bật.' : 'Đã quay về chạm để di chuyển.', '🎮');
}


function saveCameraModeSetting() {
  if (!gameState.settings || typeof gameState.settings !== 'object') gameState.settings = {};
  const select = document.getElementById('setting-camera-mode');
  const mode = select && select.value === 'topdown' ? 'topdown' : 'thirdPerson';
  if (typeof setCameraMode === 'function') setCameraMode(mode, true);
  else gameState.settings.cameraMode = mode;
  saveGame();
}

function saveCameraAngleSetting(delta) {
  if (!gameState.settings || typeof gameState.settings !== 'object') gameState.settings = {};
  const current = Math.max(1, Math.min(5, Math.floor(Number(gameState.settings.cameraAngle) || 3)));
  gameState.settings.cameraAngle = Math.max(1, Math.min(5, current + delta));
  if (typeof setCameraAngleLevel === 'function') setCameraAngleLevel(gameState.settings.cameraAngle);
  if (typeof updateCameraAngleUI === 'function') updateCameraAngleUI();
  saveGame();
}

function requestLandscapeFullscreen() {
  const target = document.documentElement;
  const request = target.requestFullscreen || target.webkitRequestFullscreen;
  const go = () => {
    try {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    } catch (_) {}
  };
  if (document.fullscreenElement) { go(); return; }
  if (request) {
    try {
      const result = request.call(target);
      if (result && typeof result.then === 'function') result.then(go).catch(() => {});
      else go();
    } catch (_) { go(); }
  } else {
    go();
    showToast('Toàn màn hình', 'Thiết bị/trình duyệt hiện không hỗ trợ khóa ngang tự động.', '📱');
  }
}
