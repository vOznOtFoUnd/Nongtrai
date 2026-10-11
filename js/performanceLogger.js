/* Chibi Farmer performance logger. Opt-in only; no telemetry/network requests. */
(function () {
  'use strict';
  if (window.FarmPerf) return;
  const state = {
    recording: false, startedAt: 0, endedAt: 0, lastSampleAt: 0,
    frames: 0, frameMs: [], updateMs: [], renderMs: [], longFrames: 0,
    calls: [], triangles: [], geometries: [], textures: [], samples: [], errors: [],
    phases: {}, lastPhaseStart: 0, currentPhase: 'frame', device: {},
    sessionId: 'farmperf-' + Date.now().toString(36)
  };
  const MAX = 18000;
  const now = () => performance.now();
  function pushLimited(arr, value) { if (arr.length < MAX) arr.push(value); }
  function percentile(values, p) {
    if (!values.length) return 0;
    const a = values.slice().sort((x, y) => x - y);
    return Number(a[Math.min(a.length - 1, Math.floor((a.length - 1) * p))].toFixed(3));
  }
  function average(values) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }
  function deviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform || null,
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      deviceMemoryGB: navigator.deviceMemory || null,
      language: navigator.language,
      online: navigator.onLine,
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio: devicePixelRatio || 1 },
      screen: { width: screen.width, height: screen.height, colorDepth: screen.colorDepth },
      connection: navigator.connection ? { effectiveType: navigator.connection.effectiveType || null, downlink: navigator.connection.downlink || null, saveData: !!navigator.connection.saveData } : null
    };
  }
  function rendererStats() {
    const r = (typeof renderer !== 'undefined' ? renderer : window.renderer);
    if (!r || !r.info) return null;
    const i = r.info;
    return {
      renderCalls: i.render ? i.render.calls : null,
      triangles: i.render ? i.render.triangles : null,
      points: i.render ? i.render.points : null,
      lines: i.render ? i.render.lines : null,
      geometries: i.memory ? i.memory.geometries : null,
      textures: i.memory ? i.memory.textures : null,
      programs: i.programs ? i.programs.length : null,
      shadowMapEnabled: !!(r.shadowMap && r.shadowMap.enabled),
      pixelRatio: typeof r.getPixelRatio === 'function' ? r.getPixelRatio() : null
    };
  }
  function sample() {
    const rs = rendererStats();
    return {
      elapsedSeconds: Number(((now() - state.startedAt) / 1000).toFixed(2)),
      fpsWindow: state._windowFrames || 0,
      frameMs: Number(average(state.frameMs.slice(-120)).toFixed(3)),
      frameP95Ms: percentile(state.frameMs.slice(-120), .95),
      updateMsAvg: Number(average(state.updateMs.slice(-120)).toFixed(3)),
      renderCpuMsAvg: Number(average(state.renderMs.slice(-120)).toFixed(3)),
      render: rs,
      visibility: document.visibilityState,
      weather: (typeof gameState !== 'undefined' && gameState) ? gameState.currentWeather : null,
      plotsCount: (typeof gameState !== 'undefined' && gameState && Array.isArray(gameState.plots)) ? gameState.plots.length : null,
      animals: (typeof gameState !== 'undefined' && gameState) ? {
        chickens: Array.isArray(gameState.chickens) ? gameState.chickens.length : null,
        cows: Array.isArray(gameState.cows) ? gameState.cows.length : null,
        pigs: Array.isArray(gameState.pigs) ? gameState.pigs.length : null
      } : null
    };
  }
  function reset() {
    state.startedAt = now(); state.endedAt = 0; state.lastSampleAt = state.startedAt;
    state.frames = 0; state.frameMs = []; state.updateMs = []; state.renderMs = [];
    state.longFrames = 0; state.calls = []; state.triangles = []; state.geometries = []; state.textures = [];
    state.samples = []; state.errors = []; state.phases = {}; state._windowFrames = 0; state._lastFrameAt = 0;
    state.device = deviceInfo();
  }
  function start() {
    reset(); state.recording = true;
    state.samples.push({ event: 'recording-start', at: new Date().toISOString(), device: state.device });
    setStatus();
  }
  function stop() {
    if (!state.recording) return;
    state.recording = false; state.endedAt = now();
    state.samples.push({ event: 'recording-stop', at: new Date().toISOString(), durationSeconds: Number(((state.endedAt - state.startedAt) / 1000).toFixed(2)) });
    setStatus(); renderSummary();
  }
  function beginFrame(t) {
    if (!state.recording) return;
    const n = typeof t === 'number' ? t : now();
    if (state._lastFrameAt) {
      const dt = n - state._lastFrameAt;
      pushLimited(state.frameMs, dt);
      state.frames++;
      state._windowFrames++;
      if (dt > 33.4) state.longFrames++;
    }
    state._lastFrameAt = n;
    state._updateStart = now();
  }
  function phase(name, duration) {
    if (!state.recording || !Number.isFinite(duration)) return;
    const a = state.phases[name] || (state.phases[name] = { count: 0, totalMs: 0, maxMs: 0 });
    a.count++; a.totalMs += duration; a.maxMs = Math.max(a.maxMs, duration);
  }
  function updateDone() { if (state.recording && state._updateStart) pushLimited(state.updateMs, now() - state._updateStart); }
  function renderDone(startAt) {
    if (!state.recording) return;
    pushLimited(state.renderMs, now() - startAt);
    const rs = rendererStats();
    if (rs) {
      pushLimited(state.calls, rs.renderCalls || 0); pushLimited(state.triangles, rs.triangles || 0);
      pushLimited(state.geometries, rs.geometries || 0); pushLimited(state.textures, rs.textures || 0);
    }
    const n = now();
    if (n - state.lastSampleAt >= 1000) {
      const s = sample(); s.fpsWindow = state._windowFrames || 0;
      state.samples.push(s); state.lastSampleAt = n; state._windowFrames = 0;
      if (state.samples.length % 5 === 0) renderSummary();
    }
  }
  function logError(type, message, source, line) {
    if (!state.recording) return;
    state.errors.push({ at: new Date().toISOString(), type, message: String(message || '').slice(0, 1200), source: source || null, line: line || null });
    if (state.errors.length > 200) state.errors.shift();
  }
  window.addEventListener('error', e => logError('error', e.message, e.filename, e.lineno));
  window.addEventListener('unhandledrejection', e => logError('unhandledrejection', e.reason && (e.reason.stack || e.reason.message) || e.reason));

  function report() {
    const elapsed = (state.endedAt || now()) - state.startedAt;
    const rs = rendererStats();
    return {
      format: 'ChibiFarmer-FIX68-performance-log', version: 1, sessionId: state.sessionId,
      exportedAt: new Date().toISOString(), recording: state.recording,
      durationSeconds: state.startedAt ? Number((elapsed / 1000).toFixed(2)) : 0,
      device: state.device || deviceInfo(),
      summary: {
        frames: state.frames,
        fpsAverage: elapsed > 0 ? Number((state.frames / (elapsed / 1000)).toFixed(2)) : 0,
        frameMsAverage: Number(average(state.frameMs).toFixed(3)), frameMsP50: percentile(state.frameMs, .5), frameMsP95: percentile(state.frameMs, .95), frameMsP99: percentile(state.frameMs, .99),
        framesOver33ms: state.longFrames, updateMsAverage: Number(average(state.updateMs).toFixed(3)), renderCpuMsAverage: Number(average(state.renderMs).toFixed(3)),
        renderCallsAverage: Number(average(state.calls).toFixed(2)), trianglesAverage: Number(average(state.triangles).toFixed(0)), geometriesAverage: Number(average(state.geometries).toFixed(0)), texturesAverage: Number(average(state.textures).toFixed(0)),
        phases: state.phases, finalRendererStats: rs, errorsCount: state.errors.length
      }, samples: state.samples, errors: state.errors
    };
  }
  function download() {
    const blob = new Blob([JSON.stringify(report(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'chibi-farmer-performance-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copy() {
    const text = JSON.stringify(report(), null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; }
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
  let panel, statusEl, summaryEl;
  function setStatus() {
    if (statusEl) statusEl.textContent = state.recording ? 'ĐANG GHI LOG' : (state.endedAt ? 'ĐÃ DỪNG' : 'SẴN SÀNG');
    if (statusEl) statusEl.style.color = state.recording ? '#b91c1c' : '#166534';
    const b = panel && panel.querySelector('[data-action="record"]');
    if (b) b.textContent = state.recording ? 'Dừng ghi' : 'Bắt đầu ghi';
  }
  function renderSummary() {
    if (!summaryEl) return;
    const r = report(), s = r.summary;
    summaryEl.textContent = [
      `Thời gian: ${r.durationSeconds.toFixed(1)} giây`,
      `FPS trung bình: ${s.fpsAverage} | frame P95: ${s.frameMsP95} ms`,
      `Frame >33 ms: ${s.framesOver33ms}`,
      `CPU JS update TB: ${s.updateMsAverage} ms/frame`,
      `Render CPU submit TB: ${s.renderCpuMsAverage} ms/frame`,
      `Draw calls TB: ${s.renderCallsAverage} | triangles TB: ${s.trianglesAverage}`,
      `Geometry: ${s.geometriesAverage} | texture: ${s.texturesAverage}`,
      `Lỗi JS: ${s.errorsCount}`,
      'Lưu ý: thời gian render ở đây đo CPU gọi renderer.render(), không phải GPU time trực tiếp.'
    ].join('\n');
  }
  function makeButton(label, action) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.dataset.action = action;
    b.style.cssText = 'border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;background:#fff;color:#0f172a;font:600 13px system-ui;'; return b;
  }
  function mount() {
    if (panel || !document.body) return;
    const launcher = makeButton('📊 PERF', 'toggle');
    launcher.style.cssText += 'position:fixed;right:10px;bottom:10px;z-index:2147483000;box-shadow:0 2px 10px #0003;';
    panel = document.createElement('section');
    panel.style.cssText = 'display:none;position:fixed;right:10px;bottom:54px;z-index:2147483000;width:min(370px,calc(100vw - 20px));max-height:min(70vh,560px);overflow:auto;background:#f8fafc;color:#0f172a;border:1px solid #94a3b8;border-radius:12px;box-shadow:0 8px 30px #0004;padding:12px;font:13px system-ui;white-space:normal;';
    const title = document.createElement('div'); title.textContent = 'Chibi Farmer · Performance Logger'; title.style.cssText = 'font-weight:800;font-size:15px;margin-bottom:5px;';
    statusEl = document.createElement('div'); statusEl.style.cssText = 'font-weight:800;margin-bottom:8px;';
    const help = document.createElement('p'); help.textContent = 'Bấm Bắt đầu ghi, chơi 2–3 phút và tái hiện lúc máy nóng/giật. Sau đó Dừng ghi → Tải JSON và gửi file đó lại cho ChatGPT. Logger không gửi dữ liệu qua mạng.'; help.style.cssText = 'line-height:1.4;margin:6px 0 10px;';
    const actions = document.createElement('div'); actions.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
    actions.append(makeButton('Bắt đầu ghi', 'record'), makeButton('Tải JSON', 'download'), makeButton('Sao chép log', 'copy'), makeButton('Đóng', 'close'));
    summaryEl = document.createElement('pre'); summaryEl.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;background:#e2e8f0;border-radius:8px;padding:8px;line-height:1.4;margin:10px 0 0;';
    panel.append(title, statusEl, help, actions, summaryEl); document.body.append(launcher, panel);
    launcher.addEventListener('click', () => { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; renderSummary(); });
    panel.addEventListener('click', async e => {
      const b = e.target.closest('button[data-action]'); if (!b) return;
      if (b.dataset.action === 'record') state.recording ? stop() : start();
      if (b.dataset.action === 'download') { renderSummary(); download(); }
      if (b.dataset.action === 'copy') { try { const ok = await copy(); b.textContent = ok ? 'Đã sao chép' : 'Không sao chép được'; } catch (_) { b.textContent = 'Không sao chép được'; } }
      if (b.dataset.action === 'close') panel.style.display = 'none';
    });
    setStatus(); renderSummary();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
  window.FarmPerf = { start, stop, beginFrame, updateDone, renderDone, phase, report, download, logError, get recording() { return state.recording; } };
})();
