/* UPGRADE 24: offline-first audio manager. Local MP3s + Web Audio fallback, no libraries. */
(function () {
  const scriptUrl = document.currentScript && document.currentScript.src ? document.currentScript.src : location.href;
  const assetUrl = name => { try { return new URL('../../assets/audio/' + name, scriptUrl).href; } catch (_) { return 'assets/audio/' + name; } };
  const clips = {
    ui: assetUrl('ui-click.mp3'),
    water: assetUrl('water.mp3'),
    farm: assetUrl('plant-harvest.mp3'),
    bell: assetUrl('bell.mp3'),
    buy: assetUrl('buy.mp3'),
    yeah: assetUrl('yeah.mp3'),
    music: assetUrl('background.mp3')
  };
  const MAX_VOICES = 3;
  const active = new Set();
  const lastPlayed = Object.create(null);
  const minGap = { ui: 90, water: 450, farm: 220, buy: 180, yeah: 500, bell: 1800, notification: 1800 };
  let ctx = null, master = null, fallbackMusicGain = null, fallbackMusicTimer = null;
  let musicAudio = null, audioUnlocked = false;
  const musicNotes = [261.63,329.63,392,329.63,293.66,349.23,440,349.23,261.63,329.63,392,523.25,440,392,329.63,293.66];
  let musicNoteIndex = 0;

  function settings() {
    if (typeof gameState === 'undefined' || !gameState) return { sound: true, music: false, soundVolume: 0.65, musicVolume: 0.3 };
    if (!gameState.settings || typeof gameState.settings !== 'object') gameState.settings = {};
    const s = gameState.settings;
    return {
      sound: s.sound !== false,
      music: s.music === true,
      soundVolume: clamp(s.soundVolume, 0.65),
      musicVolume: clamp(s.musicVolume, 0.3)
    };
  }
  function clamp(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
  }
  function soundEnabled() { return settings().sound; }
  function musicEnabled() { return settings().music; }
  function getCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = settings().soundVolume; master.connect(ctx.destination);
        fallbackMusicGain = ctx.createGain(); fallbackMusicGain.gain.value = 0; fallbackMusicGain.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    } catch (_) { return null; }
  }
  function syncVolumes() {
    if (master && ctx) master.gain.setTargetAtTime(soundEnabled() ? settings().soundVolume : 0, ctx.currentTime, 0.04);
    active.forEach(token => { if (token.audio) token.audio.volume = soundEnabled() ? Math.max(0, Math.min(1, settings().soundVolume * (token.multiplier || 1))) : 0; });
    if (musicAudio) musicAudio.volume = settings().musicVolume;
    if (fallbackMusicGain && ctx) fallbackMusicGain.gain.setTargetAtTime(musicEnabled() ? settings().musicVolume * 0.22 : 0, ctx.currentTime, 0.15);
  }
  function tone(freq, duration, type='sine', volume=0.025, endFreq=null, isMusic=false) {
    if (!isMusic && !soundEnabled()) return;
    const c = getCtx(); if (!c) return;
    if (!isMusic && active.size >= MAX_VOICES) return;
    let oscillator, gain;
    try {
      oscillator = c.createOscillator(); gain = c.createGain();
      const now = c.currentTime; oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, now);
      if (endFreq) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + Math.min(0.02, duration / 3));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain); gain.connect(isMusic ? fallbackMusicGain : master);
      const token = { stop: () => { try { oscillator.stop(); } catch (_) {} } };
      if (!isMusic) active.add(token);
      oscillator.onended = () => { active.delete(token); try { oscillator.disconnect(); gain.disconnect(); } catch (_) {} };
      oscillator.start(now); oscillator.stop(now + duration + 0.025);
    } catch (_) { if (oscillator) try { oscillator.disconnect(); } catch (_) {} }
  }
  function fallback(kind) {
    const presets = {
      ui: [520, 0.065, 'sine', 0.018, 390],
      water: [560, 0.12, 'sine', 0.025, 360],
      farm: [420, 0.13, 'triangle', 0.024, 650],
      bell: [880, 0.18, 'sine', 0.035, 660]
    };
    const p = presets[kind] || presets.ui;
    tone(p[0], p[1], p[2], p[3], p[4]);
  }
  function playClip(kind, multiplier=1) {
    if (!soundEnabled()) return false;
    const now = Date.now();
    if (now - (lastPlayed[kind] || 0) < (minGap[kind] || 300)) return false;
    if (active.size >= MAX_VOICES) return false;
    lastPlayed[kind] = now;
    if (typeof Audio !== 'function' || !clips[kind]) { fallback(kind); return false; }
    let audio;
    try {
      audio = new Audio(clips[kind]); audio.preload = 'auto'; audio.volume = Math.max(0, Math.min(1, settings().soundVolume * multiplier));
      if (kind === 'music') { audio.loop = true; }
      const token = { audio, multiplier };
      active.add(token);
      let finished = false;
      const finish = () => { if (finished) return; finished = true; active.delete(token); };
      audio.addEventListener('ended', finish, { once: true });
      audio.addEventListener('error', () => { finish(); fallback(kind); }, { once: true });
      const result = audio.play();
      if (result && typeof result.catch === 'function') result.catch(() => { finish(); if (audioUnlocked) fallback(kind); });
      return true;
    } catch (_) { fallback(kind); return false; }
  }
  function playFarmSound(kind) {
    if (!soundEnabled()) return;
    switch (kind) {
      case 'ui': case 'tap': playClip('ui', 0.8); break;
      case 'confirm': playClip('ui', 1); break;
      case 'plant': case 'harvest': case 'success': playClip('farm', 1); break;
      case 'water': playClip('water', 0.85); break;
      // One shared bell for animal/fish/kitchen/order notifications; cooldown prevents repeated alerts.
      case 'animal-harvest': case 'duck-harvest': case 'fish-harvest': playClip('yeah', 1); break;
      case 'buy': playClip('buy', 1); break;
      case 'animal': case 'hungry': case 'sick': case 'pond': case 'notification': case 'order': case 'kitchen-done': playClip('bell', 1); break;
      // Starting a cooking job or feeding/caring is an action cue, not a notification bell.
      case 'cook': case 'care': playClip('ui', 0.75); break;
      default: playClip('ui', 0.65);
    }
  }
  window.playFarmSound = playFarmSound;
  window.playUiSound = kind => playFarmSound(kind === 'confirm' ? 'confirm' : 'ui');

  function makeMusicAudio() {
    if (musicAudio || typeof Audio !== 'function') return musicAudio;
    try {
      musicAudio = new Audio(clips.music);
      musicAudio.loop = true; musicAudio.preload = 'auto'; musicAudio.playsInline = true;
      musicAudio.volume = settings().musicVolume;
      musicAudio.addEventListener('error', () => {
        // Web Audio fallback only if the bundled MP3 is inaccessible in this browser.
        musicAudio.pause(); musicAudio = null;
        if (musicEnabled() && audioUnlocked) startFallbackMusic();
      });
    } catch (_) { musicAudio = null; }
    return musicAudio;
  }
  function startFallbackMusic() {
    if (!musicEnabled() || document.hidden || fallbackMusicTimer) return;
    const c = getCtx(); if (!c) return;
    fallbackMusicGain.gain.setTargetAtTime(settings().musicVolume * 0.22, c.currentTime, 0.25);
    const tick = () => {
      if (!musicEnabled() || document.hidden || !ctx) return;
      tone(musicNotes[musicNoteIndex++ % musicNotes.length], 0.34, 'sine', 0.08, null, true);
    };
    tick(); fallbackMusicTimer = setInterval(tick, 430);
  }
  function stopFallbackMusic() {
    if (fallbackMusicTimer) { clearInterval(fallbackMusicTimer); fallbackMusicTimer = null; }
    if (fallbackMusicGain && ctx) fallbackMusicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
  }
  function startMusic() {
    // Try the bundled MP3 whenever music is enabled. Requiring the internal
    // audioUnlocked flag here can leave music permanently silent when settings
    // are restored or updateFarmMusic() is called before the first captured gesture.
    if (!musicEnabled() || document.hidden) return;
    syncVolumes();
    const audio = makeMusicAudio();
    if (audio) {
      audio.volume = settings().musicVolume;
      const result = audio.play();
      if (result && typeof result.then === 'function') result.then(() => stopFallbackMusic()).catch(() => {
        // Autoplay may be blocked. Keep the fallback available and retry the MP3
        // on every real user gesture below.
        if (musicEnabled()) startFallbackMusic();
      });
    } else startFallbackMusic();
  }
  function stopMusic() {
    if (musicAudio) { try { musicAudio.pause(); } catch (_) {} }
    stopFallbackMusic();
  }
  window.updateFarmMusic = function () {
    syncVolumes();
    if (musicEnabled()) {
      // Called directly by the settings checkbox/range handlers (user gesture).
      // Resume Web Audio as well as trying the MP3 so both paths can start.
      audioUnlocked = true;
      const c = getCtx();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
      startMusic();
    } else stopMusic();
  };
  window.updateFarmAudioVolumes = syncVolumes;

  function unlockAudio() {
    audioUnlocked = true;
    const c = getCtx(); if (c && c.state === 'suspended') c.resume().catch(() => {});
    if (musicEnabled()) startMusic();
  }
  ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(type => {
    document.addEventListener(type, unlockAudio, { passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopMusic(); else if (musicEnabled() && audioUnlocked) startMusic();
  });
  window.addEventListener('load', () => { syncVolumes(); }, { once: true });
})();
