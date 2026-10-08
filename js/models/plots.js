let plotMeshes = [];
let selectedPlotIdx = null;

// Xây dựng Lưới 48 Ô Đất
function buildPlotsGrid() {
    plotMeshes = [];
    const startX = -12;
    const startZ = -9;

    for (let i = 0; i < CONFIG.TOTAL_PLOTS; i++) {
        const row = Math.floor(i / CONFIG.PLOTS_PER_ROW);
        const col = i % CONFIG.PLOTS_PER_ROW;
        const posX = startX + col * CONFIG.PLOT_SPACING;
        const posZ = startZ + row * CONFIG.PLOT_SPACING;

        const isUnlocked = gameState.unlockedPlots[i];
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
}

// Cập nhật màu đất dựa theo Level mở khóa
function updatePlotColorsByLevel() {
    plotMeshes.forEach((mesh, i) => {
        if (!gameState.unlockedPlots[i]) {
            const groupIndex = Math.floor(i / 6);
            const unlockLevelReq = groupIndex * 10;

            if (gameState.level >= unlockLevelReq) {
                mesh.material.color.setHex(0xeab308); // Ô đất có thể mở khoá
            } else {
                mesh.material.color.setHex(0x475569); // Ô đất khoá chìm
            }
        }
    });
}

// Cập nhật hình ảnh Cây trồng trên ô đất 3D
function updatePlotVisual(idx, fullRebuild = false) {
    const mesh = plotMeshes[idx];
    if (!mesh) return;
    const plot = gameState.plots[idx];

    if (mesh.userData.cropMesh) {
        mesh.remove(mesh.userData.cropMesh);
        mesh.userData.cropMesh = null;
    }

    if (gameState.unlockedPlots[idx] && plot && plot.cropId) {
        const group = new THREE.Group();
        const crop = CROPS_DB[plot.cropId];

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
    selectedPlotIdx = idx;

    if (!gameState.unlockedPlots[idx]) {
        const groupIndex = Math.floor(idx / 6);
        const unlockLevelReq = groupIndex * 10; 

        if (gameState.level < unlockLevelReq) {
            return; 
        }

        const cost = 200 + idx * 50;
        if (confirm(`Bạn đã đạt Level ${gameState.level}! Bạn có muốn mở khóa ô đất số ${idx + 1} với giá ${cost} 🪙 không?`)) {
            if (gameState.gold >= cost) {
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
            const effTime = crop.growTime - (plot.reducedSecs || 0);
            const elapsed = (Date.now() - plot.plantedAt) / 1000;

            if (elapsed >= effTime) {
                if (checkAndDeductStamina(2)) {
                    gameState.inventory[crop.id] = (gameState.inventory[crop.id] || 0) + 1;
                    addExp(crop.exp);
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
    Object.keys(CROPS_DB).forEach(key => {
        const crop = CROPS_DB[key];
        const seedKey = key + '_seed';
        const count = gameState.inventory[seedKey] || 0;

        html += `
            <div class="bg-amber-50 rounded-2xl p-3 border border-amber-200 flex flex-col justify-between items-center text-center">
                <div class="text-3xl mb-1">${crop.icon}</div>
                <div class="font-black text-xs text-slate-800">${crop.name}</div>
                <div class="text-[10px] text-slate-500 mb-2">Sở hữu: <b class="text-amber-600">${count}</b></div>
                <button onclick="plantSeed('${key}')" ${count <= 0 ? 'disabled' : ''} class="w-full py-1.5 ${count > 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-300 text-slate-500'} font-bold text-xs rounded-xl shadow">
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
    if (selectedPlotIdx === null) return;
    const seedKey = cropKey + '_seed';
    if ((gameState.inventory[seedKey] || 0) <= 0) {
        showToast("Hết Hạt Giống! 🌾", "Hãy ghé Cửa hàng để mua thêm hạt giống!", "❌");
        return;
    }

    if (checkAndDeductStamina(1)) {
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
}
