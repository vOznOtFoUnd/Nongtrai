/* FIX 71: mobile-friendly crop GLB upload and live transform tester.
 * Uploaded blobs and adjustments intentionally live for this page session only. */
(function (global) {
  'use strict';
  const cropIds = ['rice','corn','tomato','pumpkin','watermelon','strawberry','potato','carrot','eggplant','chili','pineapple'];
  const state = global.FarmCropAssetTest = global.FarmCropAssetTest || { config: Object.create(null), urls: Object.create(null), cache: Object.create(null), selected: 'rice' };
  cropIds.forEach(id => { if (!state.config[id]) state.config[id] = { scale: 1, x: 0, y: 0, z: 0, url: '' }; });
  const names = {rice:'🌾 Lúa',corn:'🌽 Bắp ngô',tomato:'🍅 Cà chua',pumpkin:'🎃 Bí ngô',watermelon:'🍉 Dưa hấu',strawberry:'🍓 Dâu tây',potato:'🥔 Khoai tây',carrot:'🥕 Cà rốt',eggplant:'🍆 Cà tím',chili:'🌶️ Ớt đỏ',pineapple:'🍍 Dứa'};

  function loadCropAssetTestModel(cropKey) {
    const cfg = state.config[cropKey];
    if (!cfg || !cfg.url || !global.THREE || typeof THREE.GLTFLoader !== 'function') return Promise.resolve(null);
    const cached = state.cache[cropKey];
    if (cached && cached.url === cfg.url) return Promise.resolve(cached.model.clone(true));
    return new Promise(resolve => {
      try {
        new THREE.GLTFLoader().load(cfg.url, gltf => {
          if (!gltf || !gltf.scene) { resolve(null); return; }
          const model = gltf.scene;
          model.traverse(n => { if (n && n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
          state.cache[cropKey] = { url: cfg.url, model, animations:gltf.animations||[] };
          if(global.FarmAssetStudio)global.FarmAssetStudio.onLoaded(cropKey);
          resolve(model.clone(true));
        }, undefined, err => { console.warn('[CropAssetTest] Không tải được GLB:', err); resolve(null); });
      } catch (e) { console.warn('[CropAssetTest] Lỗi loader:', e); resolve(null); }
    });
  }
  global.loadCropAssetTestModel = loadCropAssetTestModel;

  function createUploadList() {
    const host = document.getElementById('crop-asset-upload-list');
    if (!host || host.dataset.ready) return;
    host.dataset.ready = '1';
    host.innerHTML = cropIds.map(id => `<div class="rounded-xl border border-emerald-100 bg-white p-2 min-w-0"><div class="text-xs font-black mb-1">${names[id]}</div><input class="block w-full text-[10px]" type="file" accept=".glb,model/gltf-binary" aria-label="Tải model ${names[id]}" onchange="uploadCropAssetTest('${id}',this)"><div id="crop-asset-upload-status-${id}" class="text-[10px] text-slate-500 mt-1">Chưa tải model</div></div>`).join('');
  }
  function createToolSelect() {
    const sel = document.getElementById('crop-asset-tool-select');
    if (!sel || sel.dataset.ready) return;
    sel.dataset.ready = '1';
    sel.innerHTML = cropIds.map(id => `<option value="${id}">${names[id]}</option>`).join('');
    sel.value = state.selected;
    syncControls();
  }
  function setStatus(id, text) {
    const el = document.getElementById('crop-asset-upload-status-' + id);
    if (el) el.textContent = text;
    const tool = document.getElementById('crop-asset-tool-status');
    if (tool && state.selected === id) tool.textContent = text;
  }
  function rebuildCrop(cropKey) {
    if (typeof global.updatePlotVisual !== 'function' || typeof gameState === 'undefined' || !gameState.plots) return;
    gameState.plots.forEach((plot, idx) => {
      if (plot && plot.cropId === cropKey && !plot.isDead) global.updatePlotVisual(idx, true);
    });
  }
  global.uploadCropAssetTest = function (cropKey, input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    if (!/\.glb$/i.test(file.name)) { setStatus(cropKey, 'Chỉ hỗ trợ .glb'); input.value = ''; return; }
    const oldUrl = state.urls[cropKey];
    const url = URL.createObjectURL(file);
    state.urls[cropKey] = url;
    state.config[cropKey].url = url;
    delete state.cache[cropKey];
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    state.selected = cropKey;
    const sel = document.getElementById('crop-asset-tool-select'); if (sel) sel.value = cropKey;
    setStatus(cropKey, 'Đang nạp ' + file.name + '…');
    loadCropAssetTestModel(cropKey).then(model => {
      if (!model) { setStatus(cropKey, 'Lỗi tải file. Thử GLB khác.'); return; }
      setStatus(cropKey, '✓ ' + file.name + ' · đã nạp');
      rebuildCrop(cropKey);
      toggleCropAssetTool(true);
      syncControls();
    });
  };
  global.toggleCropAssetTool = function (show) {
    const panel = document.getElementById('crop-asset-tool');
    if (!panel) return;
    const visible = typeof show === 'boolean' ? show : panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !visible);
    const btn = document.getElementById('crop-asset-tool-toggle');
    if (btn) btn.textContent = visible ? '🧰 Đóng tool' : '🧰 Cây 3D';
    if (visible) { createToolSelect(); syncControls(); }
  };
  global.selectCropAssetToolCrop = function (id) { if (!state.config[id]) return; state.selected = id; syncControls(); };
  function syncControls() {
    const id = state.selected, cfg = state.config[id]; if (!cfg) return;
    const sel = document.getElementById('crop-asset-tool-select'); if (sel && sel.value !== id) sel.value = id;
    [['scale','crop-asset-scale','crop-asset-scale-label',v=>Number(v).toFixed(2)+'×'],['x','crop-asset-x','crop-asset-x-label',v=>Number(v).toFixed(2)],['y','crop-asset-y','crop-asset-y-label',v=>Number(v).toFixed(2)],['z','crop-asset-z','crop-asset-z-label',v=>Number(v).toFixed(2)]].forEach(([key,inputId,labelId,format])=>{
      const input=document.getElementById(inputId), label=document.getElementById(labelId); if(input) input.value=cfg[key]; if(label) label.textContent=format(cfg[key]);
    });
    const status=document.getElementById('crop-asset-tool-status'); if(status) status.textContent=cfg.url ? '✓ Model đã chọn; kéo thanh để căn chỉnh.' : 'Chưa chọn model GLB cho cây này. Tải lên trong Cài đặt.';
  }
  global.updateCropAssetTransform = function (key, value) {
    const cfg = state.config[state.selected]; if (!cfg || !['scale','x','y','z'].includes(key)) return;
    cfg[key] = Number(value);
    syncControls();
    if (typeof plotMeshes === 'undefined') return;
    plotMeshes.forEach(mesh => {
      const group = mesh && mesh.userData && mesh.userData.cropMesh;
      const model = group && group.userData && group.userData.cropAssetModel;
      if (!model || group.userData.cropAssetKey !== state.selected) return;
      const baseScale = Number(model.userData.cropAssetBaseScale) || 1;
      model.scale.setScalar(baseScale * cfg.scale);
      model.position.x = cfg.x;
      model.position.y = (Number(model.userData.cropAssetBaseY) || 0) + cfg.y;
      model.position.z = cfg.z;
    });
  };
  global.resetCropAssetTransform = function () {
    const cfg = state.config[state.selected]; if (!cfg) return;
    cfg.scale=1; cfg.x=0; cfg.y=0; cfg.z=0; syncControls();
    ['scale','x','y','z'].forEach(k => global.updateCropAssetTransform(k, cfg[k]));
  };
  document.addEventListener('DOMContentLoaded', function () { createUploadList(); createToolSelect(); });
  // In case this script is evaluated after DOMContentLoaded.
  if (document.readyState !== 'loading') { createUploadList(); createToolSelect(); }
})(window);
