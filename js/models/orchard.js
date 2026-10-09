let orchardPlotMeshes = [];
if (typeof selectedPlotIdx === 'undefined') var selectedPlotIdx = null;

// Một nguồn thời gian duy nhất cho cả HUD, hình cây và thao tác thu hoạch.
function getOrchardTiming(tree, now = Date.now()) {
    const info = tree && tree.treeType ? TREES_DB[tree.treeType] : null;
    if (!tree || !info) return { info: null, readyAt: 0, remainingSecs: 0, ready: false, progress: 0 };
    const cycleMs = Math.max(1, Number(info.harvestTime) || 240) * 1000;
    const plantedAt = Number(tree.plantedAt) || now;
    const lastHarvestAt = Number(tree.lastHarvestAt) || 0;
    const readyAt = lastHarvestAt > 0 ? lastHarvestAt + cycleMs : plantedAt + cycleMs;
    const elapsed = Math.max(0, now - (lastHarvestAt > 0 ? lastHarvestAt : plantedAt));
    return { info, readyAt, remainingSecs: Math.max(0, Math.ceil((readyAt - now) / 1000)), ready: now >= readyAt, progress: Math.min(1, elapsed / cycleMs) };
}

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
            if (!treeInfo) return;
            const timing = getOrchardTiming(tree, Date.now());
            const ratio = timing.progress;

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
    if (!tree) return;

    if (!tree.unlocked) {
        const requiredLevel = Math.floor(idx / 2) + 1;
        if (requiredLevel > (Number(gameState.orchardLevel) || 1)) {
            showToast('Cần nâng cấp khu vườn 🌳', `Ô này cần Vườn cấp ${requiredLevel}. Hãy nâng cấp trong bảng trồng cây.`, '🔒');
            openSaplingModal(idx);
            return;
        }
        const cost = 800 + Math.floor(idx / 2) * 350;
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

    if (gameState.currentTool === 'chop') {
        chopOrchardTree(idx);
        return;
    }

    if (!tree.treeType) {
        openSaplingModal(idx);
    } else {
        const treeInfo = TREES_DB[tree.treeType];
        if (!treeInfo) {
            showToast('Dữ Liệu Cây Lỗi 🌳', 'Không tìm thấy loại cây này; dữ liệu vẫn được giữ lại.', '⚠️');
            return;
        }
        
        // Dùng chung mốc sẵn sàng với floating HUD: cây mới trồng chín sau
        // harvestTime; các lần sau tính từ đúng lần thu hoạch gần nhất.
        const timing = getOrchardTiming(tree, now);
        const growTime = Number(treeInfo.harvestTime) || 240;

        if (timing.ready) {
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
            showToast(tree.lastHarvestAt ? "Cây Đang Ra Trái 🍊" : "Cây Đang Lớn 🌳", `Còn ${formatTime(timing.remainingSecs)} đến lúc thu hoạch!`, "⏳");
        }
    }
}

// Chặt cây bằng công cụ Cuốc. Cây đã trưởng thành/đã cho quả sẽ hỏi xác nhận.
function chopOrchardTree(idx) {
    const tree = gameState.orchardPlots[idx];
    if (!tree || !tree.unlocked || !tree.treeType) {
        showToast('Không có cây để chặt', 'Chọn một ô vườn đang có cây ăn quả.', '🌱');
        return;
    }
    const treeInfo = TREES_DB[tree.treeType];
    if (!treeInfo) { showToast('Dữ liệu cây lỗi', 'Không thể chặt cây do thiếu thông tin loại cây.', '⚠️'); return; }
    const timing = getOrchardTiming(tree, Date.now());
    const mature = timing.ready || Number(tree.yieldCount || 0) > 0;
    if (mature && !confirm(`🌳 ${treeInfo.name} đã trưởng thành/đã cho quả. Chặt cây này? Cây sẽ bị loại bỏ và nhận +3 Gỗ.`)) return;
    if (!checkAndDeductStamina(3)) return;

    const mesh = orchardPlotMeshes[idx];
    const treeMesh = mesh && mesh.userData ? mesh.userData.treeMesh : null;
    if (treeMesh && typeof requestAnimationFrame === 'function') {
        const started = performance.now();
        const duration = 420;
        const animate = (now) => {
            const progress = Math.min(1, (now - started) / duration);
            treeMesh.rotation.z = Math.sin(progress * Math.PI * 5) * 0.08 * (1 - progress);
            treeMesh.scale.setScalar(Math.max(0.02, 1 - progress));
            if (progress < 1) requestAnimationFrame(animate);
            else finishChop();
        };
        requestAnimationFrame(animate);
    } else finishChop();

    function finishChop() {
        // Kiểm tra lại ô trước khi sửa để tránh ghi đè nếu state đã thay đổi.
        if (!tree.treeType) return;
        const choppedName = (TREES_DB[tree.treeType] || treeInfo).name;
        tree.treeType = null;
        tree.plantedAt = 0;
        tree.lastHarvestAt = 0;
        tree.yieldCount = 0;
        gameState.inventory.wood = (gameState.inventory.wood || 0) + 3;
        updateOrchardVisual(idx);
        updateUI();
        saveGame();
        showToast('Đã chặt cây 🪓', `Đốn ${choppedName}, nhận +3 Gỗ.`, '🪵');
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

    const lvl = Number(gameState.orchardLevel) || 1;
    const nextCost = lvl < 5 ? lvl * 1200 : 0;
    const unlocked = gameState.orchardPlots.filter(t => t.unlocked).length;
    list.innerHTML = `<div class="col-span-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-left"><div class="font-black text-emerald-900">🌳 Khu cây ăn quả — Cấp ${lvl}/5</div><div class="text-xs text-emerald-800 mt-1">Đang mở ${unlocked}/10 ô • Cấp tiếp theo mở thêm ô trồng và tăng quy mô khu vườn.</div><button onclick="upgradeOrchardArea()" ${lvl>=5?'disabled':''} class="mt-2 w-full rounded-xl py-2 text-xs font-black ${lvl>=5?'bg-slate-300 text-slate-500':'bg-emerald-600 text-white'}">${lvl>=5?'Đã tối đa cấp':'Nâng cấp vườn — '+nextCost+' 🪙'}</button></div>` + html;
    openModal('modal-tree-saplings');
}

// Trồng Cây Giống Ăn Quả
function plantSapling(treeKey) {
    if (selectedPlotIdx === null) return;
    if (!gameState.orchardPlots[selectedPlotIdx] || !gameState.orchardPlots[selectedPlotIdx].unlocked) { showToast('Ô cây chưa mở khóa 🌳','Hãy nâng cấp khu vườn để mở ô này trước.','🔒'); return; }
    if (gameState.orchardPlots[selectedPlotIdx].treeType) { showToast('Ô đã có cây 🌳','Hãy chọn một ô trống để trồng cây giống.','ℹ️'); return; }
    const saplingKey = 'sapling_' + treeKey;
    if ((gameState.inventory[saplingKey] || 0) <= 0) {
        showToast("Hết Cây Giống! 🌳", "Hãy ghé Cửa hàng mua cây giống!", "❌");
        return;
    }

    if (checkAndDeductStamina(2)) {
        gameState.inventory[saplingKey] -= 1;
        gameState.orchardPlots[selectedPlotIdx].treeType = treeKey;
        gameState.orchardPlots[selectedPlotIdx].plantedAt = Date.now();
        gameState.orchardPlots[selectedPlotIdx].lastHarvestAt = 0;
        gameState.orchardPlots[selectedPlotIdx].yieldCount = 0;
        if (!gameState.statistics || typeof gameState.statistics !== 'object') gameState.statistics = { animalsSold: 0, mealsCooked: 0, playTimeSeconds: 0, animalSicknessEvents: 0, cropsPlanted: 0 };
        gameState.statistics.cropsPlanted = (Number(gameState.statistics.cropsPlanted) || 0) + 1;
        updateOrchardVisual(selectedPlotIdx);
        closeModal('modal-tree-saplings');
        showToast("Trồng Cây Ăn Quả! 🌳", `Đã trồng ${TREES_DB[treeKey].name}!`, "✨");
        saveGame();
    }
}

function upgradeOrchardArea() {
 const lvl = Number(gameState.orchardLevel)||1; if(lvl>=5){showToast('Đã tối đa 🌳','Khu vườn đã đạt cấp cao nhất.','ℹ️');return;} const cost=lvl*1200; if(gameState.gold<cost){showToast('Thiếu vàng 🪙',`Cần ${cost} vàng để nâng cấp vườn.`,'❌');return;} gameState.gold-=cost; gameState.orchardLevel=lvl+1; const slots=Math.min(10, gameState.orchardLevel*2); gameState.orchardPlots.forEach((t,i)=>{if(i<slots)t.unlocked=true;}); gameState.orchardPlots.forEach((_,i)=>updateOrchardVisual(i)); updateUI(); saveGame(); openSaplingModal(selectedPlotIdx===null?0:selectedPlotIdx); showToast('Nâng cấp vườn thành công 🌳',`Khu vườn đã lên cấp ${gameState.orchardLevel}.`,'✨');
}
