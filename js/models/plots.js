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
            new THREE.BoxGeometry(1.8, 0.2, 1.8),
            new THREE.MeshStandardMaterial({ color: isUnlocked ? 0xc28544 : 0x475569, roughness: 0.9 })
        );
        plotMesh.position.set(posX, 0.1, posZ);
        plotMesh.receiveShadow = true;
        plotMesh.castShadow = true;
        plotMesh.userData = { type: 'plot', index: i };
        scene.add(plotMesh);

        plotMeshes.push(plotMesh);
        updatePlotVisual(i, true);
    }

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
        if (!gameState.unlockedPlots[i]) {
            const groupIndex = Math.floor(i / 6);
            const unlockLevelReq = groupIndex * 10;

            if (gameState.level >= unlockLevelReq) {
                mesh.material.color.setHex(0xeab308);
            } else {
                mesh.material.color.setHex(0x475569);
            }
        }
    });
}

// Cập nhật hình ảnh Cây trồng trên ô đất 3D
function updatePlotVisual(idx, fullRebuild = false) {
    const mesh = plotMeshes[idx];
    if (!mesh) return;
    const plot = gameState.plots[idx];
    if (!plot) return;

    if (mesh.material && mesh.material.color) { const req = Math.floor(idx / 6) * 10; const lockedColor = gameState.level >= req ? 0xeab308 : 0x475569; mesh.material.color.setHex(!gameState.unlockedPlots[idx] ? lockedColor : (plot.watered ? 0x6f8f86 : 0xc28544)); }

    if (mesh.userData.cropMesh) {
        mesh.remove(mesh.userData.cropMesh);
        mesh.userData.cropMesh = null;
    }

    if (gameState.unlockedPlots[idx] && plot.cropId) {
        const group = new THREE.Group();
        const crop = CROPS_DB[plot.cropId];
        if (!crop) return;

        if (plot.isDead) {
            const deadMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6), deadMat);
            stem.position.y = 0.3;
            stem.rotation.z = 0.4;
            group.add(stem);
        } else {
            const effTime = crop.growTime - (plot.reducedSecs || 0);
            const elapsed = (Date.now() - plot.plantedAt) / 1000;
            const ratio = Math.min(1.0, elapsed / effTime);

            const cropMat = new THREE.MeshStandardMaterial({ color: ratio >= 1.0 ? 0x22c55e : 0x84cc16 });
            const plant = new THREE.Mesh(new THREE.ConeGeometry(0.3 + ratio * 0.3, 0.6 + ratio * 0.8, 6), cropMat);
            plant.position.y = (0.6 + ratio * 0.8) / 2;
            group.add(plant);

            if (plot.hasPest) {
                const pestMat = new THREE.MeshBasicMaterial({ color: 0x9333ea });
                const pest = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), pestMat);
                pest.position.set(0, 0.8 + ratio * 0.8, 0);
                group.add(pest);
            }
        }

        mesh.add(group);
        mesh.userData.cropMesh = group;
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
                        showToast('Thu Hoạch! 🌱', `Thu hoạch ${crop.name} x${yieldAmount} (ô đất cấp ${plotLevel}), đợt ${harvestCount}/${regrowMax}. Cây sẽ tiếp tục ra quả!`, '🧺');
                    } else {
                        plot.cropId = null;
                        plot.watered = false;
                        plot.reducedSecs = 0;
                        plot.harvestCount = 0;
                        plot.regrowMax = 0;
                        updatePlotVisual(idx, true);
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
                if (plotMeshes[idx] && plotMeshes[idx].material) plotMeshes[idx].material.color.setHex(0x6f8f86);
                plot.reducedSecs = (plot.reducedSecs || 0) + 15;
                trackQuestProgress('water');
                showToast("Tưới Nước! 💧", "Đất đổi sang màu xanh đậm để nhận biết, rút ngắn 15 giây thời gian lớn!", "💧");
                updatePlotVisual(idx, true);
            }
        } else if (plot.watered) {
            showToast("Đã Tưới Nước 💧", "Ô đất này đã được tưới nước rồi!", "ℹ️");
        }
    }
}

// Mở Modal chọn hạt giống
function openSeedModal() {
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
