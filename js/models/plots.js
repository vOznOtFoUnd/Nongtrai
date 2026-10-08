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
        const groupIndex = Math.floor(idx / 6);
        const unlockLevelReq = groupIndex * 10;

        if (gameState.level < unlockLevelReq) {
            return;
        }

        const cost = 200 + idx * 50;
        if (confirm(`Bạn đã đạt Level ${gameState.level}! Bạn có muốn mở khóa ô đất số ${idx + 1} với giá ${cost} 🪙 không?`)) {
            if ((gameState.gold || 0) >= cost) {
                gameState.gold -= cost;
                gameState.unlockedPlots[idx] = true;
                plotMeshes[idx].material.color.setHex(0xc28544);
                showToast("Mở Khoá Đất! 🌾", `Đã mở khóa ô đất ${idx + 1}!`, "🔓");
                updateUI();
                saveGame();
            } else {
                showToast("Thiếu Vàng! 🪙", "Bạn không đủ vàng để mở ô đất này.", "❌");
            }
        }
        return;
    }

    const plot = gameState.plots[idx];
    if (!plot) return;

    if (plot.isDead) {
        if (checkAndDeductStamina(2)) {
            plot.cropId = null;
            plot.isDead = false;
            plot.hasPest = false;
            updatePlotVisual(idx, true);
            showToast("Dọn Đất 🧹", "Đã dọn dẹp cây chết!", "🌱");
        }
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
                    gameState.inventory[crop.id] = (gameState.inventory[crop.id] || 0) + 1;
                    addExp(crop.exp || 0);
                    trackQuestProgress('harvest_crop', crop.id);
                    plot.cropId = null;
                    plot.watered = false;
                    plot.reducedSecs = 0;
                    updatePlotVisual(idx, true);
                    showToast("Thu Hoạch! 🌾", `Thu hoạch được 1 ${crop.name}!`, "🧺");
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
                showToast("Tưới Nước! 💧", "Đã tưới nước, rút ngắn 15s thời gian lớn!", "💧");
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
    gameState.plots[selectedPlotIdx] = {
        cropId: cropKey,
        plantedAt: Date.now(),
        watered: false,
        reducedSecs: 0,
        hasPest: false,
        pestAppearedAt: 0,
        pestImmune: false,
        isDead: false
    };
    updatePlotVisual(selectedPlotIdx, true);
    closeModal('modal-seeds');
    showToast("Đã Trồng Cây! 🌱", `Gieo hạt ${CROPS_DB[cropKey].name} thành công!`, "✨");
}

// Xây dựng Khu vực Vườn Cây Ăn Quả
function buildOrchardArea() {
    orchardPlotMeshes = [];
    const orchardPlots = Array.isArray(gameState.orchardPlots) ? gameState.orchardPlots : [];

    for (let i = 0; i < 10; i++) {
        const posX = 16 + (i % 2) * 3;
        const posZ = -12 + Math.floor(i / 2) * 3.5;

        const treeData = orchardPlots[i] || { unlocked: false, treeType: null, plantedAt: 0 };
        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(1.2, 1.2, 0.2, 16),
            new THREE.MeshStandardMaterial({ color: treeData.unlocked ? 0x854d0e : 0x334155 })
        );
        mesh.position.set(posX, 0.1, posZ);
        mesh.receiveShadow = true;
        mesh.userData = { type: 'orchard', index: i };
        scene.add(mesh);
        orchardPlotMeshes.push(mesh);
        updateOrchardVisual(i);
    }
}

// Cập nhật Render Cây ăn quả 3D
function updateOrchardVisual(idx) {
    const mesh = orchardPlotMeshes[idx];
    if (!mesh) return;
    const tree = gameState.orchardPlots[idx];
    if (!tree) return;

    if (mesh.userData.treeMesh) {
        mesh.remove(mesh.userData.treeMesh);
        mesh.userData.treeMesh = null;
    }

    if (tree.unlocked) {
        if (tree.treeType) {
            const treeInfo = TREES_DB[tree.treeType];
            if (!treeInfo) return;
            const elapsed = (Date.now() - tree.plantedAt) / 1000;
            const ratio = Math.min(1.0, elapsed / treeInfo.harvestTime);

            const group = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.0), new THREE.MeshStandardMaterial({ color: 0x78350f }));
            trunk.position.y = 1.0;
            group.add(trunk);

            const foliageScale = 0.5 + ratio * 0.7;
            const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 * foliageScale), new THREE.MeshStandardMaterial({ color: 0x15803d }));
            leaves.position.y = 2.4 * foliageScale;
            group.add(leaves);

            if (ratio >= 1.0) {
                for (let f = 0; f < 5; f++) {
                    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
                    fruit.position.set(
                        (Math.random() - 0.5) * 1.2,
                        2.0 + Math.random() * 0.8,
                        (Math.random() - 0.5) * 1.2
                    );
                    group.add(fruit);
                }
            }

            mesh.add(group);
            mesh.userData.treeMesh = group;
        }
    }
}

// Click vào Cây ăn quả
function handleOrchardClick(idx) {
    if (!gameState.orchardPlots || !gameState.orchardPlots[idx]) return;
    const tree = gameState.orchardPlots[idx];
    const now = Date.now();

    if (!tree.unlocked) {
        const cost = 800;
        if (confirm(`Bạn có muốn mở khóa vị trí trồng cây ăn quả số ${idx + 1} với giá ${cost} 🪙?`)) {
            if ((gameState.gold || 0) >= cost) {
                gameState.gold -= cost;
                tree.unlocked = true;
                orchardPlotMeshes[idx].material.color.setHex(0x854d0e);
                showToast("Mở Khoá Cây Ăn Quả! 🌳", `Đã mở ô cây ăn quả ${idx + 1}!`, "🔓");
                updateUI();
                saveGame();
            }
        }
        return;
    }

    if (!tree.treeType) {
        openSaplingModal(idx);
    } else {
        const treeInfo = TREES_DB[tree.treeType];
        if (!treeInfo) return;

        const growTime = 900;
        const cycleTime = 480;

        const ageSecs = (now - tree.plantedAt) / 1000;
        if (ageSecs < growTime) {
            const remSecs = Math.ceil(growTime - ageSecs);
            showToast("Cây Đang Lớn 🌳", `Cây cần thêm ${formatTime(remSecs)} để trưởng thành!`, "⏳");
            return;
        }

        const lastHarvest = tree.lastHarvestAt || (tree.plantedAt + growTime * 1000);
        const elapsed = (now - lastHarvest) / 1000;

        if (elapsed >= cycleTime) {
            if (checkAndDeductStamina(2)) {
                tree.yieldCount = (tree.yieldCount || 0) + 1;
                tree.lastHarvestAt = now;

                gameState.inventory[tree.treeType] = (gameState.inventory[tree.treeType] || 0) + 3;
                addExp(treeInfo.exp || 0);

                if (tree.yieldCount >= 10) {
                    tree.treeType = null;
                    tree.yieldCount = 0;
                    tree.lastHarvestAt = 0;
                    gameState.inventory.wood = (gameState.inventory.wood || 0) + 5;
                    showToast("Cây Già Cỗi! 🪵", `Đã thu hoạch lần cuối và đốn cây (+5 Gỗ Cây)!`, "🪵", 4000);
                } else {
                    showToast("Thu Hoạch Trái Cây! 🧺", `Thu được 3 Quả ${treeInfo.name} (${tree.yieldCount}/10 lần)!`, "🍎");
                }

                updateOrchardVisual(idx);
                saveGame();
            }
        } else {
            const remSecs = Math.ceil(cycleTime - elapsed);
            showToast("Cây Đang Ra Trái 🍊", `Lần thu hoạch tiếp theo sau: ${formatTime(remSecs)}!`, "⏳");
        }
    }
}

// Mở Modal trồng Cây Giống
function openSaplingModal(idx) {
    selectedPlotIdx = idx;
    const list = document.getElementById('sapling-list');
    if (!list) return;

    let html = '';
    Object.keys(TREES_DB || {}).forEach(key => {
        const tree = TREES_DB[key];
        const saplingKey = 'sapling_' + key;
        const count = gameState.inventory[saplingKey] || 0;

        html += `
            <div class="bg-emerald-50 rounded-2xl p-3 border border-emerald-200 flex flex-col justify-between items-center text-center">
                <div class="text-3xl mb-1">${tree.icon}</div>
                <div class="font-black text-xs text-slate-800">${tree.name}</div>
                <div class="text-[10px] text-slate-500 mb-2">Sở hữu: <b class="text-emerald-600">${count}</b></div>
                <button onclick="plantSapling('${key}')" ${count <= 0 ? 'disabled' : ''} class="w-full py-1.5 ${count > 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-300 text-slate-500'} font-bold rounded-xl text-[10px]">
                    Trồng Cây
                </button>
            </div>
        `;
    });

    list.innerHTML = html;
    openModal('modal-tree-saplings');
}

// Trồng Cây Giống Ăn Quả
function plantSapling(treeKey) {
    if (selectedPlotIdx === null || selectedPlotIdx < 0 || selectedPlotIdx >= gameState.orchardPlots.length) return;
    const saplingKey = 'sapling_' + treeKey;
    if ((gameState.inventory[saplingKey] || 0) <= 0) {
        showToast("Hết Cây Giống! 🌳", "Hãy ghé Cửa hàng mua cây giống!", "❌");
        return;
    }

    if (!checkAndDeductStamina(2)) return;

    gameState.inventory[saplingKey] -= 1;
    gameState.orchardPlots[selectedPlotIdx].treeType = treeKey;
    gameState.orchardPlots[selectedPlotIdx].plantedAt = Date.now();
    updateOrchardVisual(selectedPlotIdx);
    closeModal('modal-tree-saplings');
    showToast("Trồng Cây Ăn Quả! 🌳", `Đã trồng ${TREES_DB[treeKey].name}!`, "✨");
}
