let orchardPlotMeshes = [];

// Xây dựng Khu vực Vườn Cây Ăn Quả
function buildOrchardArea() {
    orchardPlotMeshes = [];
    for (let i = 0; i < 10; i++) {
        const posX = 16 + (i % 2) * 3;
        const posZ = -12 + Math.floor(i / 2) * 3.5;

        const treeData = gameState.orchardPlots[i];
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

    if (mesh.userData.treeMesh) {
        mesh.remove(mesh.userData.treeMesh);
        mesh.userData.treeMesh = null;
    }

    if (tree.unlocked) {
        if (tree.treeType) {
            const treeInfo = TREES_DB[tree.treeType];
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
    const tree = gameState.orchardPlots[idx];
    const now = Date.now();

    if (!tree.unlocked) {
        const cost = 800;
        if (confirm(`Bạn có muốn mở khóa vị trí trồng cây ăn quả số ${idx + 1} với giá ${cost} 🪙?`)) {
            if (gameState.gold >= cost) {
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
        
        // Cấu hình: 15 phút đầu lớn (900s), sau đó mỗi 8 phút (480s) cho trái 1 lần
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
                addExp(treeInfo.exp);

                // Sau 10 lần thu hoạch -> Cây già cỗi, chặt cây nhận Gỗ
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
    Object.keys(TREES_DB).forEach(key => {
        const tree = TREES_DB[key];
        const saplingKey = 'sapling_' + key;
        const count = gameState.inventory[saplingKey] || 0;

        html += `
            <div class="bg-emerald-50 rounded-2xl p-3 border border-emerald-200 flex flex-col justify-between items-center text-center">
                <div class="text-3xl mb-1">${tree.icon}</div>
                <div class="font-black text-xs text-slate-800">${tree.name}</div>
                <div class="text-[10px] text-slate-500 mb-2">Sở hữu: <b class="text-emerald-600">${count}</b></div>
                <button onclick="plantSapling('${key}')" ${count <= 0 ? 'disabled' : ''} class="w-full py-1.5 ${count > 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-300 text-slate-500'} font-bold text-xs rounded-xl shadow">
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
    if (selectedPlotIdx === null) return;
    const saplingKey = 'sapling_' + treeKey;
    if ((gameState.inventory[saplingKey] || 0) <= 0) {
        showToast("Hết Cây Giống! 🌳", "Hãy ghé Cửa hàng mua cây giống!", "❌");
        return;
    }

    if (checkAndDeductStamina(2)) {
        gameState.inventory[saplingKey] -= 1;
        gameState.orchardPlots[selectedPlotIdx].treeType = treeKey;
        gameState.orchardPlots[selectedPlotIdx].plantedAt = Date.now();
        updateOrchardVisual(selectedPlotIdx);
        closeModal('modal-tree-saplings');
        showToast("Trồng Cây Ăn Quả! 🌳", `Đã trồng ${TREES_DB[treeKey].name}!`, "✨");
    }
}
