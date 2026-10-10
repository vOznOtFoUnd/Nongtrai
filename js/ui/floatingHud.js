// World-state indicators: use the same 3D Sprite pattern as the kitchen warning icon.
// The old HTML screen-projected HUD is intentionally removed to prevent mobile overlap.
const worldIndicatorCache = new WeakMap();
const worldIndicatorTextureCache = new Map();

function createWorldIndicatorTexture(kind = 'attention') {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const palette = {
        ready: '#10b981',
        attention: '#ef4444',
        hungry: '#f59e0b',
        sick: '#ef4444',
        pest: '#8b5cf6',
        dead: '#64748b',
        info: '#0ea5e9'
    };
    const color = palette[kind] || palette.attention;
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(64, 64, 55, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 88px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', 64, 67);
    return canvas;
}

function getWorldIndicatorSprite(target, kind = 'attention', scale = 0.7) {
    if (!target) return null;
    let entry = worldIndicatorCache.get(target);
    if (!entry) {
        let texture = worldIndicatorTextureCache.get(kind);
        if (!texture) {
            texture = new THREE.CanvasTexture(createWorldIndicatorTexture(kind));
            texture.needsUpdate = true;
            worldIndicatorTextureCache.set(kind, texture);
        }
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
        sprite.renderOrder = 100;
        target.add(sprite);
        entry = { sprite, kind: null };
        worldIndicatorCache.set(target, entry);
    }
    if (entry.kind !== kind) {
        entry.sprite.material.map = worldIndicatorTextureCache.get(kind) || null;
        entry.sprite.material.needsUpdate = true;
        entry.kind = kind;
    }
    entry.sprite.position.set(0, Math.max(1.25, target.userData?.indicatorY || 1.7), 0);
    entry.sprite.scale.set(scale, scale, 1);
    entry.sprite.visible = true;
    return entry.sprite;
}

function setWorldIndicator(target, kind, visible = true, scale = 0.7) {
    if (!target) return;
    if (!visible) {
        const entry = worldIndicatorCache.get(target);
        if (entry) entry.sprite.visible = false;
        return;
    }
    getWorldIndicatorSprite(target, kind, scale);
}

function getReadyMarketCount() {
    const orders = Array.isArray(gameState.marketOrders) ? gameState.marketOrders : [];
    return orders.filter(order => {
        if (order.completed || !Array.isArray(order.reqs) || !order.reqs.length) return false;
        const totals = new Map();
        order.reqs.forEach(req => { if (req && typeof req.id === 'string') totals.set(req.id, (totals.get(req.id) || 0) + Math.max(0, Number(req.qty) || 0)); });
        return Array.from(totals.entries()).every(([id, qty]) => (Number(gameState.inventory && gameState.inventory[id]) || 0) >= qty);
    }).length;
}

function updateWorldIndicators() {
    const now = Date.now();

    if (typeof plotMeshes !== 'undefined') {
        plotMeshes.forEach((mesh, i) => {
            const plot = gameState.plots[i];
            if (!gameState.unlockedPlots[i] || !plot || !plot.cropId) { setWorldIndicator(mesh, null, false); return; }
            let kind = null;
            if (plot.isDead) kind = 'dead';
            else if (plot.hasPest) kind = 'pest';
            else {
                const crop = CROPS_DB[plot.cropId];
                if (crop) {
                    const effTime = crop.growTime - (plot.reducedSecs || 0);
                    const elapsed = (now - plot.plantedAt) / 1000;
                    if (Math.max(0, Math.ceil(effTime - elapsed)) === 0) kind = 'ready';
                }
            }
            setWorldIndicator(mesh, kind, !!kind, 0.68);
        });
    }

    if (typeof orchardPlotMeshes !== 'undefined') {
        gameState.orchardPlots.forEach((tree, i) => {
            const mesh = orchardPlotMeshes[i]; if (!mesh || !tree?.unlocked || !tree.treeType) { if (mesh) setWorldIndicator(mesh, null, false); return; }
            const timing = typeof getOrchardTiming === 'function' ? getOrchardTiming(tree, now) : { ready: false };
            setWorldIndicator(mesh, 'ready', !!timing.ready, 0.72);
        });
    }

    if (typeof chickenMeshes !== 'undefined') chickenMeshes.forEach(item => {
        const c = item.data, mesh = item.mesh;
        const ageSecs = (now - c.bornAt) / 1000, growTime = 300, cycleTime = 180;
        let kind = null;
        if (c.sick) kind = 'sick';
        else if (c.hungry) kind = 'hungry';
        else if (ageSecs >= growTime) {
            const lastTime = Math.max(Number(c.producedAt) || 0, c.bornAt + growTime * 1000);
            if ((now - lastTime) / 1000 >= cycleTime && (c.yieldCount || 0) < 10) kind = 'ready';
        }
        setWorldIndicator(mesh, kind, !!kind, 0.58);
    });

    if (typeof cowMeshes !== 'undefined') cowMeshes.forEach(item => {
        const c = item.data, mesh = item.mesh;
        const ageSecs = (now - c.bornAt) / 1000, growTime = 600, cycleTime = 360;
        let kind = null;
        if (c.sick) kind = 'sick';
        else if (c.hungry) kind = 'hungry';
        else if (ageSecs >= growTime) {
            const lastTime = Math.max(Number(c.producedAt) || 0, c.bornAt + growTime * 1000);
            if ((now - lastTime) / 1000 >= cycleTime && (c.yieldCount || 0) < 10) kind = 'ready';
        }
        setWorldIndicator(mesh, kind, !!kind, 0.62);
    });

    if (typeof pigMeshes !== 'undefined') pigMeshes.forEach(item => {
        const p = item.data, mesh = item.mesh;
        const ageSecs = (now - p.bornAt) / 1000;
        let kind = null;
        if (p.sick) kind = 'sick';
        else if (p.hungry || (p.hunger !== undefined && p.hunger <= 40)) kind = 'hungry';
        else if (ageSecs >= 900) kind = 'ready';
        setWorldIndicator(mesh, kind, !!kind, 0.6);
    });

    if (typeof pondDuckMeshes !== 'undefined' && Array.isArray(gameState.fishPond?.ducks)) {
        pondDuckMeshes.forEach((mesh, idx) => {
            const duck = gameState.fishPond.ducks[idx]; if (!duck) return;
            const age = (now - (Number(duck.bornAt) || now)) / 1000, grown = 180, cycle = 180, eggs = Number(duck.eggCount) || 0;
            let kind = null;
            if (duck.sick) kind = 'sick';
            else if (duck.hunger <= 40) kind = 'hungry';
            else if (age >= grown) {
                const elapsed = (now - (Number(duck.producedAt) || Number(duck.bornAt) || now)) / 1000;
                if (eggs >= 8 || (elapsed >= cycle && eggs < 8)) kind = 'ready';
            }
            setWorldIndicator(mesh, kind, !!kind, 0.58);
        });
    }

    // Fish pond: one compact indicator on the pond rather than a large floating label.
    if (gameState.fishPond && gameState.fishPond.fishes?.length) {
        const fishTarget = scene?.getObjectByName('fishPondIndicatorAnchor') || (() => {
            const g = new THREE.Object3D(); g.name = 'fishPondIndicatorAnchor'; g.position.set(0, 0, 20); g.userData.indicatorY = 1.4; scene.add(g); return g;
        })();
        let adultCount = 0;
        gameState.fishPond.fishes.forEach(f => { const info = FISH_DB[f.type]; if (info && (now - f.plantedAt) / 1000 >= info.growTime && !f.sick && Number(f.hunger) > 0) adultCount++; });
        setWorldIndicator(fishTarget, 'ready', adultCount > 0, 0.7);
    }

    // Market: one world indicator on the stall, same sprite mechanism as the kitchen.
    const marketTarget = scene?.getObjectByName('marketIndicatorAnchor') || (() => {
        const found = scene?.getObjectByProperty?.('userData.type', 'market_sign');
        if (!found) return null;
        const g = new THREE.Object3D(); g.name = 'marketIndicatorAnchor'; g.position.set(0, 2.4, 0); found.add(g); return g;
    })();
    if (marketTarget) setWorldIndicator(marketTarget, 'attention', getReadyMarketCount() > 0, 0.72);
}

let floatingHudNextTick = 0;
let floatingHudNextPhoneTick = 0;
function updateFloatingHUDThrottled(now = performance.now()) {
    if (now >= floatingHudNextTick) {
        floatingHudNextTick = now + 250;
        updateWorldIndicators();
        if (typeof updateMarketReadyIndicator === 'function') updateMarketReadyIndicator();
    }
    if (now >= floatingHudNextPhoneTick) {
        floatingHudNextPhoneTick = now + 1000;
        if (typeof updateFarmPhoneNotification === 'function') updateFarmPhoneNotification();
    }
}
function updateFloatingHUD() {
    updateWorldIndicators();
    if (typeof updateMarketReadyIndicator === 'function') updateMarketReadyIndicator();
    if (typeof updateFarmPhoneNotification === 'function') updateFarmPhoneNotification();
}
