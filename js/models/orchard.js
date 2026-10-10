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

    if (tree.unlocked && tree.treeType) {
        const treeInfo = TREES_DB[tree.treeType];
        if (!treeInfo) return;
        const timing = getOrchardTiming(tree, Date.now());
        // The sapling's whole shape grows together: trunk, branches and canopy.
        // After the first harvest, the tree stays mature; harvest timing only
        // controls fruit visibility and never shrinks the established tree.
        const ratio = (tree.lastHarvestAt > 0 || Number(tree.yieldCount || 0) > 0) ? 1 : timing.progress;
        const growthScale = 0.42 + ratio * 0.58;
        const group = new THREE.Group();
        // Handcrafted chibi fruit tree prototype: rounded canopy clusters and soft colors.
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x98613a, roughness: 0.88 });
        const branchMat = new THREE.MeshStandardMaterial({ color: 0x80502f, roughness: 0.9 });
        const leafColors = [0x63b85b, 0x78c968, 0x4fae58];
        const leafMats = leafColors.map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.82 }));
        const trunkHeight = 1.75;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.25, trunkHeight, 10), trunkMat);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);
        // Short branches peeking from the canopy add a little handmade character.
        [-1, 1].forEach(side => {
            const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.72, 7), branchMat);
            branch.position.set(side * 0.36, 1.55, 0.02);
            branch.rotation.z = side * -0.62;
            branch.castShadow = true;
            group.add(branch);
        });
        const canopy = new THREE.Group();
        const canopyParts = [
            { p: [0, 2.20, 0], s: [0.88, 0.80, 0.82], m: 0 },
            { p: [-0.52, 1.92, 0.02], s: [0.62, 0.62, 0.62], m: 1 },
            { p: [0.52, 1.95, 0.00], s: [0.64, 0.66, 0.62], m: 2 },
            { p: [0.02, 2.60, -0.02], s: [0.62, 0.60, 0.62], m: 1 },
            { p: [0.02, 1.84, -0.46], s: [0.55, 0.55, 0.54], m: 0 }
        ];
        canopyParts.forEach(part => {
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 12), leafMats[part.m]);
            leaf.position.set(part.p[0], part.p[1], part.p[2]);
            leaf.scale.set(part.s[0], part.s[1], part.s[2]);
            leaf.castShadow = true;
            leaf.receiveShadow = true;
            canopy.add(leaf);
        });
        // Keep canopy proportions fixed; the parent scales the whole tree.
        canopy.position.y = 0.12;
        group.add(canopy);

        // Fruit meshes are created once with the tree, then toggled by the shared
        // harvest timer. This lets fruit appear automatically when the tree ripens
        // without rebuilding the whole tree or changing its mature size.
        const fruitGroup = new THREE.Group();
        const fruitColors = { apple: 0xef5350, orange: 0xffa726, peach: 0xffa4a8, mango: 0xffd34e };
        const fruitColor = fruitColors[tree.treeType] || 0xef5350;
        const fruitMat = new THREE.MeshStandardMaterial({ color: fruitColor, roughness: 0.42, metalness: 0.0 });
        const fruitPositions = [
            [-0.56, 2.05, 0.38], [0.48, 2.22, 0.40], [-0.12, 2.62, 0.34],
            [0.15, 1.88, -0.45], [0.62, 1.90, -0.12], [-0.54, 2.40, -0.18]
        ];
        fruitPositions.forEach((pos, i) => {
            const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), fruitMat);
            fruit.position.set(pos[0], pos[1] + 0.12, pos[2]);
            fruit.scale.set(1, 1.05, 1);
            fruit.castShadow = true;
            fruitGroup.add(fruit);
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.07, 5), branchMat);
            stem.position.set(pos[0], pos[1] + 0.23, pos[2]);
            stem.rotation.z = (i % 2 ? -0.18 : 0.18);
            fruitGroup.add(stem);
        });
        fruitGroup.visible = timing.ready;
        group.add(fruitGroup);
        group.userData.fruitGroup = fruitGroup;
        group.scale.setScalar(growthScale);
        mesh.add(group);
        mesh.userData.treeMesh = group;
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
                    if (typeof playFarmSound === 'function') playFarmSound('harvest');
                    showToast("Cây Già Cỗi! 🪵", `Đã thu hoạch lần cuối và đốn cây (+5 Gỗ Cây)!`, "🪵", 4000);
                } else {
                    if (typeof playFarmSound === 'function') playFarmSound('harvest');
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
