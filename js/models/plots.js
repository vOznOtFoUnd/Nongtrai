
// UPGRADE 42: stylized soil visuals are children of the existing plot hitbox.
// The hitbox/index/click contract stays unchanged; only its rendered surface changes.
// FIX79: shared immutable procedural geometries; per-plot colors are kept independent.
const soilGeometryCache = new Map();
function sharedSoilGeometry(key, factory) {
    if (!soilGeometryCache.has(key)) soilGeometryCache.set(key, factory());
    return soilGeometryCache.get(key);
}
const soilMaterialCache = new Map();
function sharedSoilMaterial(key, factory) {
    if (!soilMaterialCache.has(key)) soilMaterialCache.set(key, factory());
    return soilMaterialCache.get(key);
}
function createRoundedSoilTop(width = 1.82, depth = 1.82, radius = 0.18) {
    const shape = new THREE.Shape();
    const x = width / 2, z = depth / 2, r = Math.min(radius, width / 2, depth / 2);
    shape.moveTo(-x + r, -z);
    shape.lineTo(x - r, -z);
    shape.quadraticCurveTo(x, -z, x, -z + r);
    shape.lineTo(x, z - r);
    shape.quadraticCurveTo(x, z, x - r, z);
    shape.lineTo(-x + r, z);
    shape.quadraticCurveTo(-x, z, -x, z - r);
    shape.lineTo(-x, -z + r);
    shape.quadraticCurveTo(-x, -z, -x + r, -z);
    const geo = sharedSoilGeometry("top", () => new THREE.ShapeGeometry(shape, 3));
    const mat = sharedSoilMaterial("top", () => new THREE.MeshStandardMaterial({ color: 0xb97943, roughness: 0.96, metalness: 0 }));
    const top = new THREE.Mesh(geo, mat);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.104;
    top.name = 'soilTop';
    top.receiveShadow = true;
    top.raycast = () => {};
    return top;
}

let soilFurrowInstances = null;
let soilClodInstances = null;
const soilDetailInstanceColors = { locked: 0x34404b, dry: 0x754522, wet: 0x031b2a, lockedClod: 0x7b8792, dryClod: 0xc58a55, wetClod: 0x14506b };

function addSoilVisualToPlot(plotMesh, unlocked) {
    if (!plotMesh || plotMesh.userData.soilVisual) return;
    const soil = new THREE.Group();
    soil.name = 'chibiSoilVisual';

    const base = new THREE.Mesh(
        sharedSoilGeometry("base", () => new THREE.BoxGeometry(1.86, 0.18, 1.86)),
        new THREE.MeshStandardMaterial({ color: unlocked ? 0x9a5d34 : 0x3f4750, roughness: 0.98 })
    );
    base.name = 'soilBase'; base.position.y = 0.01; base.receiveShadow = true; base.castShadow = true; base.raycast = () => {};
    soil.add(base);

    const top = createRoundedSoilTop();
    top.material = top.material.clone(); // independent mutable color for fallback
    soil.add(top);

    const rim = new THREE.Mesh(
        sharedSoilGeometry("rim", () => new THREE.RingGeometry(0.83, 0.91, 4)),
        new THREE.MeshStandardMaterial({ color: unlocked ? 0x7d4a2b : 0x64707b, roughness: 0.92, side: THREE.DoubleSide })
    );
    rim.rotation.x = -Math.PI / 2; rim.position.y = 0.109; rim.scale.set(1, 1, 1); rim.name = 'soilStatusRim'; rim.raycast = () => {};
    soil.add(rim);

    // Furrows and clods are batched into shared InstancedMeshes after all plots are built.
    // Keep the legacy material declarations out of per-plot allocations.

    // Trạng thái khóa: huy hiệu khóa nhỏ, chỉ là visual nên không chặn click.
    const lockGroup = new THREE.Group(); lockGroup.name = 'soilLockBadge'; lockGroup.position.set(0.61, 0.18, 0.61);
    const lockBody = new THREE.Mesh(sharedSoilGeometry("lockBody", () => new THREE.BoxGeometry(0.22, 0.18, 0.14)), sharedSoilMaterial("lockBody", () => new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.72 })));
    lockBody.position.y = 0.02; lockBody.raycast = () => {}; lockGroup.add(lockBody);
    const shackle = new THREE.Mesh(sharedSoilGeometry("shackle", () => new THREE.TorusGeometry(0.07, 0.026, 6, 12, Math.PI)), sharedSoilMaterial("shackle", () => new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.62 })));
    shackle.rotation.x = Math.PI / 2; shackle.position.y = 0.12; shackle.raycast = () => {}; lockGroup.add(shackle);
    lockGroup.raycast = () => {}; soil.add(lockGroup);

    // Trạng thái ướt: phủ xanh đậm lên toàn bộ mặt đất + các vệt ẩm bóng.
    // Lớp này là visual thật, không dùng hitbox trong suốt để biểu diễn trạng thái.
    const wetGroup = new THREE.Group(); wetGroup.name = 'soilWetDetails'; wetGroup.visible = false;
    const wetShape = new THREE.Shape();
    const wetW = 1.82 / 2, wetD = 1.82 / 2, wetR = 0.18;
    wetShape.moveTo(-wetW + wetR, -wetD);
    wetShape.lineTo(wetW - wetR, -wetD);
    wetShape.quadraticCurveTo(wetW, -wetD, wetW, -wetD + wetR);
    wetShape.lineTo(wetW, wetD - wetR);
    wetShape.quadraticCurveTo(wetW, wetD, wetW - wetR, wetD);
    wetShape.lineTo(-wetW + wetR, wetD);
    wetShape.quadraticCurveTo(-wetW, wetD, -wetW, wetD - wetR);
    wetShape.lineTo(-wetW, -wetD + wetR);
    wetShape.quadraticCurveTo(-wetW, -wetD, -wetW + wetR, -wetD);
    const wetSurface = new THREE.Mesh(
        sharedSoilGeometry("wetSurface", () => new THREE.ShapeGeometry(wetShape, 3)),
        new THREE.MeshStandardMaterial({ color: 0x063a63, roughness: 0.28, metalness: 0.04, transparent: true, opacity: 0.82, side: THREE.DoubleSide })
    );
    wetSurface.rotation.x = -Math.PI / 2;
    wetSurface.position.y = 0.122;
    wetSurface.name = 'soilWetSurface';
    wetSurface.receiveShadow = true;
    wetSurface.raycast = () => {};
    wetGroup.add(wetSurface);
    const wetMat = sharedSoilMaterial("puddle", () => new THREE.MeshStandardMaterial({ color: 0x1f5f8b, roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.86 }));
    [[-0.48,-0.2,0.24,0.08],[0.02,0.28,0.34,0.075],[0.45,-0.52,0.18,0.06]].forEach(([x,z,sx,sy]) => {
        const puddle = new THREE.Mesh(sharedSoilGeometry("puddle", () => new THREE.CircleGeometry(1, 12)), wetMat);
        puddle.rotation.x = -Math.PI / 2; puddle.position.set(x, 0.121, z); puddle.scale.set(sx, sy, 1); puddle.raycast = () => {}; wetGroup.add(puddle);
    });
    soil.add(wetGroup);

    plotMesh.add(soil); plotMesh.userData.soilVisual = soil;
    plotMesh.userData.soilRefs = {base,top,rim,lock:lockGroup,wetDetails:wetGroup,wetSurface};
    if (typeof registerGameAssetTarget === 'function') registerGameAssetTarget(soil, 'soil');
}


// Gộp 3 rãnh và 4 cục đất của mỗi ô thành 2 draw-call instanced.
// Các mesh mặt đất/hitbox/trạng thái khóa-tưới vẫn độc lập để giữ gameplay.
function buildSoilDetailInstances() {
    if (soilFurrowInstances) { scene.remove(soilFurrowInstances); soilFurrowInstances.geometry.dispose(); soilFurrowInstances = null; }
    if (soilClodInstances) { scene.remove(soilClodInstances); soilClodInstances.geometry.dispose(); soilClodInstances = null; }
    const count = plotMeshes.length;
    if (!count) return;
    const furrowGeo = new THREE.BoxGeometry(1.28, 0.018, 0.055);
    const furrowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    soilFurrowInstances = new THREE.InstancedMesh(furrowGeo, furrowMat, count * 3);
    soilFurrowInstances.name = 'soilFurrowInstances';
    soilFurrowInstances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const clodGeo = new THREE.IcosahedronGeometry(1, 0);
    const clodMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    soilClodInstances = new THREE.InstancedMesh(clodGeo, clodMat, count * 4);
    soilClodInstances.name = 'soilClodInstances';
    soilClodInstances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const dummy = new THREE.Object3D();
    const furrowOffsets = [-0.48, 0, 0.48];
    const clodOffsets = [[-0.63,-0.62],[0.57,-0.34],[-0.52,0.36],[0.48,0.58]];
    plotMeshes.forEach((plot, i) => {
        furrowOffsets.forEach((z, j) => {
            dummy.position.set(plot.position.x + (j - 1) * 0.025, plot.position.y + 0.115, plot.position.z + z);
            dummy.rotation.set(0, (j - 1) * 0.035, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
            const idx = i * 3 + j; soilFurrowInstances.setMatrixAt(idx, dummy.matrix);
            soilFurrowInstances.setColorAt(idx, new THREE.Color(0x754522));
        });
        clodOffsets.forEach(([x,z], j) => {
            dummy.position.set(plot.position.x + x, plot.position.y + 0.128, plot.position.z + z);
            dummy.rotation.set(0, 0, 0); dummy.scale.set(0.045 + (j % 2) * 0.012, (0.045 + (j % 2) * 0.012) * 0.55, (0.045 + (j % 2) * 0.012) * 0.8); dummy.scale.x *= 1.35; dummy.updateMatrix();
            const idx = i * 4 + j; soilClodInstances.setMatrixAt(idx, dummy.matrix);
            soilClodInstances.setColorAt(idx, new THREE.Color(0xc58a55));
        });
    });
    soilFurrowInstances.instanceMatrix.needsUpdate = true; soilClodInstances.instanceMatrix.needsUpdate = true;
    soilFurrowInstances.castShadow = false; soilFurrowInstances.receiveShadow = false;
    soilClodInstances.castShadow = false; soilClodInstances.receiveShadow = false;
    scene.add(soilFurrowInstances, soilClodInstances);
    updateSoilDetailInstanceColors();
}
function updateSoilDetailInstanceColors() {
    if (!soilFurrowInstances || !soilClodInstances) return;
    plotMeshes.forEach((_, i) => {
        const plot = gameState.plots?.[i] || {};
        const unlocked = !!gameState.unlockedPlots?.[i];
        const wet = unlocked && !!plot.watered;
        const furrowHex = !unlocked ? soilDetailInstanceColors.locked : wet ? soilDetailInstanceColors.wet : soilDetailInstanceColors.dry;
        const clodHex = !unlocked ? soilDetailInstanceColors.lockedClod : wet ? soilDetailInstanceColors.wetClod : soilDetailInstanceColors.dryClod;
        for (let j = 0; j < 3; j++) soilFurrowInstances.setColorAt(i * 3 + j, new THREE.Color(furrowHex));
        for (let j = 0; j < 4; j++) soilClodInstances.setColorAt(i * 4 + j, new THREE.Color(clodHex));
    });
    if (soilFurrowInstances.instanceColor) soilFurrowInstances.instanceColor.needsUpdate = true;
    if (soilClodInstances.instanceColor) soilClodInstances.instanceColor.needsUpdate = true;
}

// FIX79 hybrid: one InstancedMesh per compatible procedural soil layer.
// Gameplay hitboxes, soilVisual and references remain intact for interactions/GLB fallback.
const soilBatches = new Map();
const soilBatchDummy = new THREE.Object3D();
function buildSoilBatches() {
    soilBatches.forEach(batch => { scene.remove(batch.mesh); batch.mesh.dispose?.(); batch.mesh.material.dispose(); });
    soilBatches.clear();
    const specs = ['base','top','rim'];
    specs.forEach(key => {
        const samples = plotMeshes.map(p => p.userData.soilRefs?.[key]);
        if (samples.some(m => !m || !m.isMesh)) return;
        const material = samples[0].material.clone();
        material.color.set(0xffffff);
        const batch = new THREE.InstancedMesh(samples[0].geometry, material, samples.length);
        batch.name = 'soilBatch-' + key;
        batch.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        batch.receiveShadow = true;
        batch.raycast = () => {};
        samples.forEach((mesh,i) => {
            mesh.updateMatrixWorld(true);
            soilBatchDummy.position.setFromMatrixPosition(mesh.matrixWorld);
            mesh.getWorldQuaternion(soilBatchDummy.quaternion);
            mesh.getWorldScale(soilBatchDummy.scale);
            soilBatchDummy.updateMatrix();
            batch.setMatrixAt(i,soilBatchDummy.matrix);
            mesh.visible = false;
        });
        batch.instanceMatrix.needsUpdate = true;
        scene.add(batch);
        soilBatches.set(key,{mesh:batch,samples});
    });
    updateSoilBatchColors();
}
function updateSoilBatchColors() {
    if (!soilBatches.size) return;
    soilBatches.forEach(({mesh,samples}) => {
        samples.forEach((sample,i) => mesh.setColorAt(i,sample.material.color));
        if(mesh.instanceColor)mesh.instanceColor.needsUpdate = true;
    });
}
function setSoilBatchVisibility(visible) {
    soilBatches.forEach(({mesh}) => {mesh.visible=visible;});
}
window.FarmSoilBatch = { setVisible:setSoilBatchVisibility, getStats:() => ({layers:soilBatches.size, plots:plotMeshes.length}) };

// Xây dựng Lưới 48 Ô Đất
function buildPlotsGrid() {
    plotMeshes = [];
    const startX = -12;
    const startZ = -9;
    const safePlots = Array.isArray(gameState.plots) ? gameState.plots : [];

    for (let i = 0; i < CONFIG.TOTAL_PLOTS; i++) {
        const row = Math.floor(i / CONFIG.PLOTS_PER_ROW);
        const col = i % CONFIG.PLOTS_PER_ROW;
        const posX = startX + col * CONFIG.PLOT_SPACING;
        const posZ = startZ + row * CONFIG.PLOT_SPACING;

        const isUnlocked = !!(gameState.unlockedPlots && gameState.unlockedPlots[i]);
        const plotMesh = new THREE.Mesh(
            sharedSoilGeometry("hitbox", () => new THREE.BoxGeometry(1.8, 0.2, 1.8)),
            // Invisible gameplay hitbox: visual soil is attached as a child below.
            new THREE.MeshStandardMaterial({ color: isUnlocked ? 0xc28544 : 0x475569, roughness: 0.9, transparent: true, opacity: 0 })
        );
        plotMesh.position.set(posX, 0.1, posZ);
        addSoilVisualToPlot(plotMesh, isUnlocked);
        plotMesh.receiveShadow = true;
        plotMesh.castShadow = true;
        plotMesh.userData.type = 'plot';
        plotMesh.userData.index = i;
        scene.add(plotMesh);

        plotMeshes.push(plotMesh);
        updatePlotVisual(i, true);
    }

    buildSoilDetailInstances();
    updatePlotColorsByLevel();
    buildSoilBatches();

    if (safePlots.length < CONFIG.TOTAL_PLOTS) {
        while (gameState.plots.length < CONFIG.TOTAL_PLOTS) {
            gameState.plots.push({
                cropId: null,
                plantedAt: 0,
                watered: false,
                reducedSecs: 0,
                hasPest: false,
                pestAppearedAt: 0,
                pestImmune: false,
                isDead: false
            });
        }
    }
}

// Cập nhật màu đất dựa theo Level mở khóa
function updatePlotColorsByLevel() {
    if (!Array.isArray(plotMeshes)) return;
    plotMeshes.forEach((mesh, i) => {
        const plot = gameState.plots?.[i] || {};
        const unlocked = !!gameState.unlockedPlots[i];
        const req = Math.floor(i / 6) * 10;
        const levelReady = gameState.level >= req;
        const wet = unlocked && !!plot.watered;
        const soil = mesh.userData && mesh.userData.soilVisual;
        const {base,top,rim,lock,wetDetails,wetSurface} = mesh.userData.soilRefs || {};

        // Trạng thái visual tách biệt hoàn toàn: khóa / đã mở / đã tưới.
        // Khi ướt, đổi trực tiếp palette của MẶT ĐẤT và toàn bộ chi tiết nâu,
        // thay vì dựa vào một lớp xanh trong suốt phủ lên màu nâu.
        if (!unlocked) {
            mesh.material.color.setHex(0x4b5563);
            if (base?.material) base.material.color.setHex(levelReady ? 0x4b5563 : 0x303844);
            if (top?.material) top.material.color.setHex(levelReady ? 0x66717d : 0x3f4750);
            if (rim?.material) rim.material.color.setHex(levelReady ? 0x9ca3af : 0x475569);
            if (lock) lock.visible = true;
            if (wetDetails) wetDetails.visible = false;
        } else if (wet) {
            // WET = xanh đậm thật sự trên toàn bộ soil palette.
            // Không còn màu nâu ở soilTop/base/rim/furrow/clod.
            mesh.material.color.setHex(0x061d2d);
            if (base?.material) { base.material.color.setHex(0x062238); base.material.roughness = 0.46; }
            if (top?.material) { top.material.color.setHex(0x083b57); top.material.roughness = 0.30; }
            if (rim?.material) rim.material.color.setHex(0x0b5475);
            if (wetSurface?.material) {
                // Chỉ giữ lớp này làm highlight/bóng nước, không dùng nó để nhuộm nền.
                wetSurface.material.color.setHex(0x1a6b8f);
                wetSurface.material.opacity = 0.24;
                wetSurface.material.roughness = 0.18;
            }
            if (lock) lock.visible = false;
            if (wetDetails) wetDetails.visible = true;
        } else {
            mesh.material.color.setHex(0xc28544);
            if (base?.material) base.material.color.setHex(0x9a5d34);
            if (top?.material) top.material.color.setHex(0xb97943);
            if (rim?.material) rim.material.color.setHex(0x7d4a2b);
            if (wetSurface?.material) wetSurface.material.opacity = 0.82;
            if (lock) lock.visible = false;
            if (wetDetails) wetDetails.visible = false;
        }
    });
    updateSoilDetailInstanceColors();
    updateSoilBatchColors();
}


// Trả về bậc hình ảnh ổn định theo tiến trình sinh trưởng. Các ngưỡng bao phủ
// cả mốc ra quả riêng của từng cây và mốc trưởng thành của lúa.
function getCropVisualStage(plot, now = Date.now()) {
    if (!plot || !plot.cropId || plot.isDead) return -1;
    const crop = CROPS_DB && CROPS_DB[plot.cropId];
    if (!crop) return -1;
    const growTime = Math.max(1, Number(crop.growTime) || 1);
    const effTime = Math.max(1, growTime - Math.max(0, Number(plot.reducedSecs) || 0));
    const plantedAt = Math.max(0, Number(plot.plantedAt) || 0);
    const ratio = plantedAt > 0 ? Math.max(0, Math.min(1, (now - plantedAt) / 1000 / effTime)) : 0;
    const thresholds = [0.2, 0.45, 0.55, 0.6, 0.65, 0.82, 1];
    return thresholds.reduce((stage, threshold) => stage + (ratio >= threshold ? 1 : 0), 0);
}

// Chỉ dựng lại model khi cây vượt một ngưỡng hình ảnh, không dựng mỗi frame.
function updateGrowingCropVisuals(now = Date.now()) {
    if (!Array.isArray(gameState.plots) || !Array.isArray(plotMeshes)) return;
    const count = Math.min(gameState.plots.length, plotMeshes.length);
    for (let idx = 0; idx < count; idx++) {
        const plot = gameState.plots[idx];
        const mesh = plotMeshes[idx];
        if (!plot || !mesh || !plot.cropId) continue;
        const stage = getCropVisualStage(plot, now);
        if (!mesh.userData || mesh.userData.cropVisualStage !== stage) updatePlotVisual(idx, true);
    }
}


// Shared crop resources: crop meshes keep their individual transforms and shadows,
// while repeated geometry/material allocations are reused across all 48 plots.
const cropGeometryCache = new Map();
const cropMaterialCache = new Map();
function getCropGeometry(key, factory) {
    if (!cropGeometryCache.has(key)) cropGeometryCache.set(key, factory());
    return cropGeometryCache.get(key);
}
function getCropMaterial(key, options) {
    if (!cropMaterialCache.has(key)) cropMaterialCache.set(key, new THREE.MeshStandardMaterial(options));
    return cropMaterialCache.get(key);
}
function getCropBasicMaterial(key, options) {
    const cacheKey = `basic-${key}`;
    if (!cropMaterialCache.has(cacheKey)) cropMaterialCache.set(cacheKey, new THREE.MeshBasicMaterial(options));
    return cropMaterialCache.get(cacheKey);
}
function clearCropGroup(group) {
    if (!group) return;
    // Keep cached geometry/material alive; they are shared by other crops.
    while (group.children.length) group.remove(group.children[group.children.length - 1]);
    group.rotation.set(0, 0, 0);
    group.scale.set(1, 1, 1);
    group.position.set(0, 0, 0);
}

// FIX 70: thử tải model GLB cho cây trồng; nếu thiếu asset hoặc loader lỗi,
// giữ nguyên cây procedural. Mỗi ô chỉ nhận kết quả nếu crop/group chưa đổi.
const cropAssetPending = new Map();
function tryApplyCropAsset(idx, cropKey, group, ratio) {
    if (!window.FarmAssetManager || !cropKey || !group) return;
    const assetId = 'crop.' + cropKey;
    const def = window.FarmAssetManager.getDefinition(assetId);
    const testConfig = window.FarmCropAssetTest && window.FarmCropAssetTest.config[cropKey];
    if (!def || (def.status !== 'ready' && !(testConfig && testConfig.url))) return;
    const mesh = plotMeshes[idx];
    const plot = gameState.plots[idx];
    if (!mesh || !plot || plot.isDead || plot.cropId !== cropKey) return;
    const requestKey = idx + ':' + assetId + ':' + (mesh.userData.cropVisualStage ?? -1);
    if (cropAssetPending.get(idx) === requestKey) return;
    cropAssetPending.set(idx, requestKey);
    const loadPromise = (testConfig && testConfig.url && typeof window.loadCropAssetTestModel === 'function')
        ? window.loadCropAssetTestModel(cropKey)
        : window.FarmAssetManager.loadModel(assetId);
    loadPromise.then(function (model) {
        if (!model) return; // asset chưa được đặt hoặc không đọc được: giữ fallback
        const currentMesh = plotMeshes[idx];
        const currentPlot = gameState.plots[idx];
        if (!currentMesh || !currentPlot || currentPlot.isDead || currentPlot.cropId !== cropKey || currentMesh.userData.cropMesh !== group || currentMesh.userData.cropVisualStage !== getCropVisualStage(currentPlot)) {
            // Không gắn model đã tải về một ô đã đổi cây/trạng thái.
            model.traverse(function (node) {
                if (node && node.isMesh) {
                    // Geometry/material của model cache đang được chia sẻ; không dispose.
                }
            });
            return;
        }
        window.FarmAssetManager.applyTransform(model, assetId);
        if (testConfig && testConfig.url && window.FarmAssetStudio) window.FarmAssetStudio.normalize(model, cropKey, true);
        // FIX71: transform chỉnh trong tool được áp riêng lên từng instance.
        const cfg = window.FarmCropAssetTest && window.FarmCropAssetTest.config[cropKey];
        const userScale = cfg && Number.isFinite(Number(cfg.scale)) ? Number(cfg.scale) : 1;
        const growth = 0.55 + Math.max(0, Math.min(1, Number(ratio) || 0)) * 0.99;
        model.scale.multiplyScalar(growth * userScale);
        if (cfg) model.position.set(Number(cfg.x)||0, model.position.y + (Number(cfg.y)||0), Number(cfg.z)||0);
        model.userData.cropAssetBaseScale = growth * (model.userData.studioNormalized ? model.scale.x / Math.max(0.00001, growth * userScale) : 1);
        model.userData.cropAssetBaseY = model.position.y - (cfg ? (Number(cfg.y)||0) : 0);
        model.name = 'cropAsset:' + cropKey;
        model.traverse(function (node) {
            if (node && node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        // Chỉ xóa các mesh procedural của group này; tài nguyên dùng chung được giữ cache.
        while (group.children.length) group.remove(group.children[group.children.length - 1]);
        group.add(model);
        group.userData.usingAsset = true;
        group.userData.cropAssetModel = model;
        group.userData.cropAssetKey = cropKey;
        if(window.FarmCropAnimation)FarmCropAnimation.attach(model,cropKey,idx);
        if (currentPlot.hasPest) {
            const pest = new THREE.Mesh(
                getCropGeometry('pest-sphere-8-8', () => new THREE.SphereGeometry(0.18, 8, 8)),
                getCropBasicMaterial('pest-purple', { color: 0x9333ea })
            );
            pest.position.set(0, 0.72 + (Number(ratio) || 0) * 0.35, 0);
            group.add(pest);
        }
    }).catch(function (error) {
        if (window.console && console.warn) console.warn('[CropAssets] Lỗi tải ' + assetId + '; dùng model procedural.', error);
    }).finally(function () {
        if (cropAssetPending.get(idx) === requestKey) cropAssetPending.delete(idx);
    });
}

// Cập nhật hình ảnh Cây trồng trên ô đất 3D
function updatePlotVisual(idx, fullRebuild = false) {
    const mesh = plotMeshes[idx];
    if (!mesh) return;
    const plot = gameState.plots[idx];
    if (!plot) return;

    updatePlotColorsByLevel();

    let group = mesh.userData.cropMesh;
    if (group) {
        mesh.remove(group);
        clearCropGroup(group);
    } else {
        group = new THREE.Group();
        group.name = 'cropVisualPool';
    }
    mesh.userData.cropVisualStage = getCropVisualStage(plot);

    if (gameState.unlockedPlots[idx] && plot.cropId) {
        const crop = CROPS_DB[plot.cropId];
        if (!crop) return;

        if (plot.isDead) {
            const deadMat = getCropMaterial('dead-plant', { color: 0x78350f, roughness: 0.86 });
            const stemGeo = getCropGeometry('dead-stem', () => new THREE.CylinderGeometry(0.05, 0.05, 0.6));
            const stem = new THREE.Mesh(stemGeo, deadMat);
            stem.position.y = 0.3;
            stem.rotation.z = 0.4;
            group.add(stem);
        } else {
            const effTime = Math.max(1, (Number(crop.growTime) || 1) - Math.max(0, Number(plot.reducedSecs) || 0));
            const elapsed = Math.max(0, (Date.now() - (Number(plot.plantedAt) || Date.now())) / 1000);
            const ratio = Math.max(0, Math.min(1.0, elapsed / effTime));

            // UPGRADE 37: crop-specific silhouettes, grounded to the top of the soil tile.
            // The crop group origin is the soil surface (plot mesh top = y 0.2).
            const cropKey = String(plot.cropId || '').toLowerCase();
            const mature = ratio >= 0.82;
            // Cây non bắt đầu nhỏ, tăng dần đến kích thước trưởng thành.
            const growth = 0.55 + Math.min(1, ratio) * 0.99;
            const leafMat = getCropMaterial(mature ? 'leaf-mature' : 'leaf-young', { color: mature ? 0x4b9a36 : 0x67ad43, roughness: 0.84 });
            const darkLeafMat = getCropMaterial('leaf-dark', { color: 0x286d32, roughness: 0.88 });
            const stemMat = getCropMaterial('stem-green', { color: 0x397d36, roughness: 0.86 });
            const produceColors = { tomato: 0xe94343, pumpkin: 0xf28b22, watermelon: 0x2c9c55, strawberry: 0xe83e5a, potato: 0xb98a52, carrot: 0xf47b20, eggplant: 0x7544a8, chili: 0xe63b2e, corn: 0xf4c430, pineapple: 0xdca92c, rice: 0xd9bd55 };
            const produceHex = produceColors[cropKey] || 0x85a83d;
            const produceMat = getCropMaterial(`produce-${produceHex}`, { color: produceHex, roughness: 0.62 });
            const sphere = (x,y,z,sx,sy,sz,mat,rz=0) => {
                const o = new THREE.Mesh(getCropGeometry('sphere-14-10', () => new THREE.SphereGeometry(1, 14, 10)), mat);
                o.position.set(x,y,z); o.scale.set(sx,sy,sz); o.rotation.z=rz;
                o.castShadow=true; o.receiveShadow=true; group.add(o); return o;
            };
            const blade = (x,y,z,h,w,mat,rz=0) => {
                const o = new THREE.Mesh(getCropGeometry(`cone-${w}-${h}-6`, () => new THREE.ConeGeometry(w,h,6)),mat);
                o.position.set(x,y,z); o.rotation.z=rz; o.castShadow=true; group.add(o); return o;
            };
            const stem = (x,z,h,r=0.045) => {
                const o = new THREE.Mesh(getCropGeometry(`stem-cylinder-${r}-${h}-8`, () => new THREE.CylinderGeometry(r*0.72,r,h,8)),stemMat);
                o.position.set(x,h/2,z); o.castShadow=true; group.add(o); return o;
            };
            // Growth changes the size, while crop type determines the silhouette and harvestable produce.
            if (cropKey === 'rice') {
                const h=1.22*growth;
                // A rice plant is a clump of many tillers, not one central stalk.
                for(let i=0;i<11;i++){
                    const a=i*Math.PI*2/11, r=(i===0?0:0.11+(i%3)*0.025);
                    const x=Math.cos(a)*r, z=Math.sin(a)*r;
                    const stalkH=h*(0.78+(i%4)*0.065);
                    stem(x,z,stalkH,0.018);
                    // Long upright blades start low; their tips stay below the grain heads.
                    for(let j=0;j<2;j++){
                        const side=j===0?-1:1;
                        const leafH=0.36*growth+(j%2)*0.06;
                        const leaf=sphere(x+side*0.045,leafH*0.68,z+side*0.018,0.045,leafH*0.72,0.025,leafMat,side*-0.14);
                        leaf.rotation.z=side*0.10;
                    }
                    if(mature){
                        const head=new THREE.Group();
                        const headStem=new THREE.Mesh(getCropGeometry(`rice-head-stem-${growth}`, () => new THREE.CylinderGeometry(0.009,0.012,0.23*growth,5)),stemMat);
                        headStem.position.y=0.115*growth; headStem.rotation.z=-0.24; head.add(headStem);
                        for(let k=0;k<7;k++){
                            const side=k%2?1:-1;
                            const grain=sphere(side*(0.018+(k%3)*0.009),0.035*growth+k*0.022*growth,0,0.035*growth,0.046*growth,0.027*growth,produceMat,-0.22);
                            head.add(grain);
                        }
                        head.position.set(x,stalkH-0.02,z);
                        head.rotation.z=(i%2?1:-1)*0.18;
                        group.add(head);
                    }
                }
            } else if (cropKey === 'corn') {
                const h=0.96*growth; stem(0,0,h,0.045);
                for(let i=0;i<7;i++){
                    const side=i%2?1:-1, y=0.15+i*0.095;
                    const leaf=sphere(side*(0.09+i*0.009),y,0,0.16,0.035,0.055,leafMat,side*-0.34);
                    leaf.rotation.y=side*0.12;
                }
                if(mature || ratio>0.55){
                    sphere(0.075,h*0.58,0.02,0.12,0.25,0.105,produceMat,-0.12);
                    for(let i=0;i<7;i++) sphere(0.075+(i%2)*0.012,h*0.54-0.13+i*0.035,0.105,0.012,0.026,0.012,getCropMaterial('corn-silk', {color:0xffe16b,roughness:0.7}));
                }
            } else if (cropKey === 'carrot') {
                // Carrot: one enlarged root with a compact leaf crown above it.
                // Leaves stay above the soil/root zone instead of forming a ring that
                // visually covers the harvestable carrot.
                const leafCount = 7;
                const leafBaseY = 0.39 * growth;
                const leafHeight = 0.34 * growth;
                for (let i = 0; i < leafCount; i++) {
                    const a = i * Math.PI * 2 / leafCount;
                    const r = 0.055 + (i % 2) * 0.018;
                    blade(
                        Math.cos(a) * r,
                        leafBaseY + leafHeight * 0.5,
                        Math.sin(a) * r,
                        leafHeight,
                        0.045,
                        i % 2 ? leafMat : darkLeafMat,
                        Math.cos(a) * 0.16
                    );
                }
                if (mature) {
                    // Single, larger carrot root centred under the leaf crown.
                    sphere(0, 0.17, 0, 0.19, 0.36, 0.17, produceMat, -0.08);
                }
            } else if (cropKey === 'potato') {
                // Potato: visible stem/foliage above the soil and one large tuber
                // offset beside the stem, rather than a cluster hidden by foliage.
                const stemHeight = 0.52 * growth;
                stem(0, 0, stemHeight, 0.038);

                const leafCount = 7;
                for (let i = 0; i < leafCount; i++) {
                    const a = i * Math.PI * 2 / leafCount;
                    const y = 0.20 * growth + (i % 3) * 0.055 * growth;
                    const leaf = sphere(
                        Math.cos(a) * 0.105,
                        y,
                        Math.sin(a) * 0.105,
                        0.13 * growth,
                        0.032 * growth,
                        0.060 * growth,
                        i % 2 ? leafMat : darkLeafMat,
                        Math.cos(a) * 0.30
                    );
                    leaf.rotation.y = a;
                }

                if (mature) {
                    // One enlarged tuber sits just below the soil surface, offset
                    // from the stem so its silhouette remains readable.
                    sphere(0.20, 0.12, 0.035, 0.16, 0.14, 0.15, produceMat, -0.10);
                }
            } else if (cropKey === 'pumpkin' || cropKey === 'watermelon' || cropKey === 'strawberry') {
                // Creeping vine: low horizontal runners, broad leaves, fruit resting close to the soil.
                for(let i=0;i<7;i++){
                    const a=i*Math.PI*2/7, r=0.16*growth;
                    const leaf=sphere(Math.cos(a)*r,0.12*growth,Math.sin(a)*r,0.12*growth,0.025*growth,0.075*growth, i%2?leafMat:darkLeafMat,Math.cos(a)*0.18);
                    leaf.rotation.y=a;
                }
                if(cropKey==='pumpkin' && mature) sphere(0.035,0.22,0.015,0.24,0.20,0.23,produceMat);
                if(cropKey==='watermelon' && mature) sphere(-0.04,0.20,0.02,0.25,0.18,0.23,produceMat);
                if(cropKey==='strawberry' && (mature || ratio>0.55)){
                    for(let i=0;i<4;i++) sphere((i%2?1:-1)*0.11,0.17,((i>>1)?1:-1)*0.08,0.065,0.078,0.065,produceMat);
                }
            } else if (cropKey === 'pineapple') {
                // Short, stout plant with a rosette of long leaves and a central fruit.
                for(let i=0;i<10;i++){
                    const a=i*Math.PI*2/10;
                    const leaf=sphere(Math.cos(a)*0.12,0.16*growth,Math.sin(a)*0.12,0.15,0.035,0.055,leafMat,Math.cos(a)*0.38);
                    leaf.rotation.y=a;
                }
                if(mature || ratio>0.6){
                    sphere(0,0.34*growth,0,0.145*growth,0.22*growth,0.145*growth,produceMat);
                    for(let i=0;i<5;i++) blade(Math.cos(i*1.25)*0.035,0.48*growth,Math.sin(i*1.25)*0.035,0.19*growth,0.04,leafMat,Math.cos(i*1.25)*0.2);
                }
            } else if (cropKey === 'eggplant' || cropKey === 'chili' || cropKey === 'tomato') {
                // Upright branching plant, not a creeping vine.
                const h=(cropKey==='chili'?0.66:0.74)*growth; stem(0,0,h,0.035);
                for(let i=0;i<8;i++){
                    const a=i*Math.PI/4, y=0.25*growth+(i%3)*0.12*growth;
                    sphere(Math.cos(a)*0.14,y,Math.sin(a)*0.14,0.12,0.035,0.075, i%2?leafMat:darkLeafMat,Math.cos(a)*0.25);
                }
                if(mature || ratio>0.65){
                    const count=cropKey==='tomato'?5:(cropKey==='chili'?5:2);
                    for(let i=0;i<count;i++){
                        const a=i*Math.PI*2/count;
                        if(cropKey==='eggplant') sphere(Math.cos(a)*0.14,0.48*growth,Math.sin(a)*0.14,0.085,0.19,0.085,produceMat,0.25);
                        else if(cropKey==='chili') sphere(Math.cos(a)*0.14,0.43*growth,Math.sin(a)*0.14,0.035,0.13,0.035,produceMat,0.35);
                        else sphere(Math.cos(a)*0.14,0.49*growth,Math.sin(a)*0.14,0.085,0.085,0.085,produceMat);
                    }
                }
            } else {
                // Safe fallback for any additional crop IDs.
                const h=0.62*growth; stem(0,0,h,0.035);
                for(let i=0;i<6;i++){ const a=i*Math.PI/3; sphere(Math.cos(a)*0.12,0.24*growth,Math.sin(a)*0.12,0.12,0.035,0.07,leafMat,Math.cos(a)*0.2); }
                if(mature) sphere(0,0.30,0,0.14,0.15,0.14,produceMat);
            }
            if (plot.hasPest) {
                const pestMat = getCropBasicMaterial('pest-purple', { color: 0x9333ea });
                const pestGeo = getCropGeometry('pest-sphere-8-8', () => new THREE.SphereGeometry(0.18, 8, 8));
                const pest = new THREE.Mesh(pestGeo, pestMat);
                pest.position.set(0, 0.72 + ratio * 0.35, 0);
                group.add(pest);
            }
        }

        mesh.add(group);
        mesh.userData.cropMesh = group;
        if (!plot.isDead) {
            const cropKeyForAsset = String(plot.cropId || '').toLowerCase();
            const effTimeForAsset = Math.max(1, (Number(crop.growTime) || 1) - Math.max(0, Number(plot.reducedSecs) || 0));
            const ratioForAsset = Math.max(0, Math.min(1, (Date.now() - (Number(plot.plantedAt) || Date.now())) / 1000 / effTimeForAsset));
            tryApplyCropAsset(idx, cropKeyForAsset, group, ratioForAsset);
        }
    }
}

// Xử lý Click vào ô đất
function handlePlotClick(idx) {
    if (typeof idx !== 'number' || idx < 0 || idx >= CONFIG.TOTAL_PLOTS) return;
    selectedPlotIdx = idx;

    if (!gameState.unlockedPlots[idx]) {
        // Chạm một lần chỉ xem thông tin; không bật bảng nâng cấp hàng loạt.
        if (typeof openLockedPlotInfo === 'function') openLockedPlotInfo(idx);
        else showToast('Ô đất đang khóa', 'Chạm NPC bù nhìn để quản lý đất.', '🔒');
        return;
    }

    const plot = gameState.plots[idx];
    if (!plot) return;

    if (plot.isDead) {
        if (gameState.currentTool === 'chop' && !confirm('🪓 Loại bỏ cây trồng đã chết khỏi ô đất này? Không hoàn lại hạt giống.')) return;
        if (checkAndDeductStamina(2)) {
            plot.cropId = null;
            plot.isDead = false;
            plot.hasPest = false;
            plot.watered = false;
            plot.reducedSecs = 0;
            updatePlotVisual(idx, true);
            showToast("Dọn Đất 🧹", "Đã dọn dẹp cây chết!", "🌱");
            saveGame();
        }
        return;
    }

    if (gameState.currentTool === 'chop') {
        if (!plot.cropId) {
            showToast('Ô đất trống', 'Chạm vào ô có cây trồng để loại bỏ cây.', '🌱');
            return;
        }
        const crop = CROPS_DB[plot.cropId];
        const cropName = crop ? crop.name : 'cây trồng';
        if (!confirm(`🪓 Loại bỏ ${cropName} khỏi ô đất này? Cây sẽ mất và không hoàn lại hạt giống.`)) return;
        if (!checkAndDeductStamina(2)) return;
        const mesh = plotMeshes[idx];
        const cropMesh = mesh && mesh.userData ? mesh.userData.cropMesh : null;
        const finishRemoval = () => {
            if (!plot.cropId) return;
            plot.cropId = null;
            plot.watered = false;
            plot.reducedSecs = 0;
            plot.hasPest = false;
            plot.pestAppearedAt = 0;
            plot.isDead = false;
            plot.harvestCount = 0;
            plot.regrowMax = 0;
            updatePlotVisual(idx, true);
            updateUI();
            saveGame();
            showToast('Đã loại bỏ cây 🪓', `${cropName} đã được dọn khỏi ô đất. Không hoàn lại hạt giống.`, '🧹');
        };
        if (cropMesh && typeof requestAnimationFrame === 'function') {
            const started = performance.now();
            const duration = 300;
            const animateRemoval = now => {
                const progress = Math.min(1, (now - started) / duration);
                cropMesh.rotation.y += 0.12;
                cropMesh.scale.setScalar(Math.max(0.02, 1 - progress));
                if (progress < 1) requestAnimationFrame(animateRemoval);
                else finishRemoval();
            };
            requestAnimationFrame(animateRemoval);
        } else finishRemoval();
        return;
    }

    if (gameState.currentTool === 'hand') {
        if (plot.hasPest) {
            if (checkAndDeductStamina(1)) {
                plot.hasPest = false;
                plot.pestImmune = true;
                gameState.inventory.worm = (gameState.inventory.worm || 0) + 1;
                addExp(5);
                trackQuestProgress('catch_bug');
                updatePlotVisual(idx, true);
                showToast("Bắt Sâu! 🐛", "Đã bắt 1 con sâu đất (+1 Sâu Đất)!", "✨");
            }
            return;
        }

        if (plot.cropId) {
            const crop = CROPS_DB[plot.cropId];
            if (!crop) return;
            const effTime = crop.growTime - (plot.reducedSecs || 0);
            const elapsed = (Date.now() - plot.plantedAt) / 1000;

            if (elapsed >= effTime) {
                if (checkAndDeductStamina(2)) {
                    const plotLevel = Math.max(1, Math.min(5, Number(plot.plotLevel) || 1));
                    const yieldAmount = plotLevel;
                    gameState.inventory[crop.id] = (gameState.inventory[crop.id] || 0) + yieldAmount;
                    addExp((crop.exp || 0) * yieldAmount);
                    trackQuestProgress('harvest_crop', crop.id);
                    const harvestCount = (Number(plot.harvestCount) || 0) + 1;
                    const regrowMax = Number(plot.regrowMax || crop.regrowHarvests) || 0;
                    if (regrowMax > 0 && harvestCount < regrowMax) {
                        plot.harvestCount = harvestCount;
                        plot.plantedAt = Date.now();
                        plot.watered = false;
                        plot.reducedSecs = 0;
                        updatePlotVisual(idx, true);
                        if (typeof playFarmSound === 'function') playFarmSound('harvest');
                        showToast('Thu Hoạch! 🌱', `Thu hoạch ${crop.name} x${yieldAmount} (ô đất cấp ${plotLevel}), đợt ${harvestCount}/${regrowMax}. Cây sẽ tiếp tục ra quả!`, '🧺');
                    } else {
                        plot.cropId = null;
                        plot.watered = false;
                        plot.reducedSecs = 0;
                        plot.harvestCount = 0;
                        plot.regrowMax = 0;
                        updatePlotVisual(idx, true);
                        if (typeof playFarmSound === 'function') playFarmSound('harvest');
                        showToast('Thu Hoạch! 🌾', `Thu hoạch được ${yieldAmount} ${crop.name} nhờ ô đất cấp ${plotLevel}! Cây đã hết đợt thu hoạch.`, '🧺');
                    }
                    saveGame();
                }
            } else {
                showToast("Cây Đang Phát Triển 🌱", `Cây chưa chín, hãy đợi chút nữa!`, "⏳");
            }
        } else {
            openSeedModal();
        }
    } else if (gameState.currentTool === 'water') {
        if (plot.cropId && !plot.watered) {
            if (checkAndDeductStamina(1)) {
                plot.watered = true;
                plot.reducedSecs = (plot.reducedSecs || 0) + 15;
                trackQuestProgress('water');
                if (typeof playFarmSound === 'function') playFarmSound('water');
                showToast("Tưới Nước! 💧", "Đất chuyển sang xanh đậm để nhận biết, rút ngắn 15 giây thời gian lớn!", "💧");
                updatePlotVisual(idx, true);
                saveGame();
            }
        } else if (plot.watered) {
            showToast("Đã Tưới Nước 💧", "Ô đất này đã được tưới nước rồi!", "ℹ️");
        }
    }
}

// Mở Modal chọn hạt giống
function openSeedModal() {
    if (window.FarmQuickCare) { FarmQuickCare.hide(); openQuickSeed('crop'); return; }
    const list = document.getElementById('seed-list');
    if (!list) return;

    let html = '';
    Object.keys(CROPS_DB || {}).forEach(key => {
        const crop = CROPS_DB[key];
        const seedKey = key + '_seed';
        const count = gameState.inventory[seedKey] || 0;

        html += `
            <div class="bg-amber-50 rounded-2xl p-3 border border-amber-200 flex flex-col justify-between items-center text-center">
                <div class="text-3xl mb-1">${crop.icon}</div>
                <div class="font-black text-xs text-slate-800">${crop.name}</div>
                <div class="text-[10px] text-slate-500 mb-2">Sở hữu: <b class="text-amber-600">${count}</b></div>
                <button onclick="plantSeed('${key}')" ${count <= 0 ? 'disabled' : ''} class="w-full py-1.5 ${count > 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-300 text-slate-500'} font-bold rounded-xl text-[10px]">
                    Trồng Cây
                </button>
            </div>
        `;
    });

    list.innerHTML = html;
    openModal('modal-seeds');
}

// Trồng Hạt Giống
function plantSeed(cropKey) {
    if (selectedPlotIdx === null || selectedPlotIdx < 0 || selectedPlotIdx >= CONFIG.TOTAL_PLOTS) return;
    const seedKey = cropKey + '_seed';
    if ((gameState.inventory[seedKey] || 0) <= 0) {
        showToast("Hết Hạt Giống! 🌾", "Hãy ghé Cửa hàng để mua thêm hạt giống!", "❌");
        return;
    }

    if (!checkAndDeductStamina(1)) return;

    gameState.inventory[seedKey] -= 1;
    if (!gameState.statistics || typeof gameState.statistics !== 'object') gameState.statistics = { animalsSold: 0, mealsCooked: 0, playTimeSeconds: 0, animalSicknessEvents: 0, cropsPlanted: 0 };
    gameState.statistics.cropsPlanted = (Number(gameState.statistics.cropsPlanted) || 0) + 1;
    gameState.plots[selectedPlotIdx] = {
        cropId: cropKey,
        plantedAt: Date.now(),
        watered: false,
        reducedSecs: 0,
        hasPest: false,
        pestAppearedAt: 0,
        pestImmune: false,
        isDead: false,
        harvestCount: 0,
        regrowMax: Number(CROPS_DB[cropKey].regrowHarvests) || 0,
        plotLevel: Math.max(1, Number((gameState.plots[selectedPlotIdx] || {}).plotLevel) || 1)
    };
    updatePlotVisual(selectedPlotIdx, true);
    closeModal('modal-seeds');
    if(window.FarmQuickCare)FarmQuickCare.hide();
    if (typeof playFarmSound === 'function') playFarmSound('plant');
    showToast("Đã Trồng Cây! 🌱", `Gieo hạt ${CROPS_DB[cropKey].name} thành công!`, "✨");
    saveGame();
}

// Nâng cấp ô đất: giá cao, yêu cầu cấp nhân vật và tăng sản lượng theo cấp ô.
const PLOT_UPGRADE_COSTS = {2:10000,3:50000,4:150000,5:400000};
const PLOT_UPGRADE_LEVELS = {2:5,3:12,4:22,5:35};
function openPlotUpgradeModal() {
    const modal = document.getElementById('modal-plot-upgrade'); const list = document.getElementById('plot-upgrade-list');
    if (!modal || !list) return;
    list.innerHTML = gameState.unlockedPlots.map((unlocked, idx) => {
        const groupIndex = Math.floor(idx / 6);
        const unlockReq = groupIndex * 10;
        const unlockCost = 200 + idx * 50;
        if (!unlocked) {
            const canUnlock = gameState.level >= unlockReq && gameState.gold >= unlockCost;
            return `<div class="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-2"><div class="flex-1"><b>🔒 Ô đất ${idx+1}</b><div class="text-[11px] text-slate-600">Mở ô đất · Cấp nhân vật ${unlockReq} · ${unlockCost.toLocaleString()} 🪙</div></div><button onclick="unlockPlotFromModal(${idx})" ${canUnlock?'':'disabled'} class="px-3 py-2 rounded-lg text-xs font-black ${canUnlock?'bg-amber-500 text-white':'bg-slate-200 text-slate-400'}">Mở ô</button></div>`;
        }
        const plot = gameState.plots[idx] || {}; const lvl = Math.max(1, Number(plot.plotLevel) || 1); const next = lvl + 1;
        if (lvl >= 5) return `<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center justify-between"><b>🌱 Ô ${idx+1} · Cấp 5</b><span class="text-xs font-black text-emerald-700">TỐI ĐA · x5 sản lượng</span></div>`;
        const cost = PLOT_UPGRADE_COSTS[next]; const req = PLOT_UPGRADE_LEVELS[next]; const can = gameState.level >= req && gameState.gold >= cost;
        return `<div class="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center gap-2"><div class="flex-1"><b>🌱 Ô ${idx+1} · Cấp ${lvl} → ${next}</b><div class="text-[11px] text-slate-600">Sản lượng x${lvl} → x${next} · Cấp nhân vật ${req} · ${cost.toLocaleString()} 🪙</div></div><button onclick="upgradePlotLevel(${idx})" ${can?'':'disabled'} class="px-3 py-2 rounded-lg text-xs font-black ${can?'bg-emerald-600 text-white':'bg-slate-200 text-slate-400'}">Nâng</button></div>`;
    }).join('');
    openModal('modal-plot-upgrade');
}
function unlockPlotFromModal(idx, showUpgradeAfter = true) {
    if (gameState.unlockedPlots[idx]) return;
    const req = Math.floor(idx / 6) * 10;
    const cost = 200 + idx * 50;
    if (gameState.level < req) { showToast('Chưa đủ cấp', `Cần cấp nhân vật ${req} để mở ô đất ${idx+1}.`, '🔒'); return; }
    if (gameState.gold < cost) { showToast('Chưa đủ vàng', `Cần ${cost.toLocaleString()} vàng để mở ô đất.`, '🪙'); return; }
    gameState.gold -= cost; gameState.unlockedPlots[idx] = true;
    updatePlotVisual(idx, true); updatePlotColorsByLevel(); updateUI(); saveGame();
    if (showUpgradeAfter) openPlotUpgradeModal();
    showToast('Mở khóa ô đất', `Đã mở ô ${idx+1}.`, '🔓');
}
function openLockedPlotInfo(idx) {
    if (gameState.unlockedPlots[idx]) return;
    const levelReq = Math.floor(idx / 6) * 10; const cost = 200 + idx * 50;
    const status = Number(gameState.level) < levelReq ? `Cần cấp ${levelReq}` : (Number(gameState.gold) < cost ? 'Chưa đủ vàng' : 'Đến bù nhìn để mở khóa');
    showToast(`🔒 Ô đất ${idx + 1}`, `Mở khóa: ${cost.toLocaleString()} 🪙 · Cấp ${levelReq}+ · ${status}`, '🌱', 3200);
}
function upgradePlotLevel(idx) {
    const plot = gameState.plots[idx]; if (!plot || !gameState.unlockedPlots[idx]) return;
    const lvl = Math.max(1, Number(plot.plotLevel) || 1); const next = lvl + 1; if (next > 5) return;
    const cost = PLOT_UPGRADE_COSTS[next], req = PLOT_UPGRADE_LEVELS[next];
    if (gameState.level < req) { showToast('Chưa đủ cấp', `Cần cấp nhân vật ${req} để nâng ô đất lên cấp ${next}.`, '🔒'); return; }
    if (gameState.gold < cost) { showToast('Chưa đủ vàng', `Cần ${cost.toLocaleString()} vàng.`, '🪙'); return; }
    gameState.gold -= cost; plot.plotLevel = next; updateUI(); updatePlotVisual(idx, true); saveGame(); openPlotUpgradeModal();
    showToast('Nâng cấp ô đất thành công', `Ô ${idx+1} lên cấp ${next}, sản lượng x${next}.`, '🌟');
}

// FIX74: shared plot decorations are drawn as 2 instanced batches, not 48 independent sets.
// Hide those procedural details while the full custom soil model is active.
function setCustomSoilDetailsVisible(visible) {
    if (soilFurrowInstances) soilFurrowInstances.visible=visible;
    if (soilClodInstances) soilClodInstances.visible=visible;
    setSoilBatchVisibility(visible);
}
