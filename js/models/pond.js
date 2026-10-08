let pondFishMeshes = [];

// Build Ao Cá 3D
function buildFishPond() {
    const pondGroup = new THREE.Group();
    pondGroup.position.set(0, 0, 20);

    const rimMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.25, 24), rimMat);
    rim.position.y = 0.05;
    pondGroup.add(rim);

    const waterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.82, roughness: 0.1 });
    const water = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.2, 24), waterMat);
    water.position.y = 0.08;
    pondGroup.add(water);

    pondGroup.userData = { type: 'pond' };
    scene.add(pondGroup);

    updatePondFishVisuals();
}

// Render Cá bơi trong Ao
function updatePondFishVisuals() {
    pondFishMeshes.forEach(f => scene.remove(f.mesh));
    pondFishMeshes = [];

    gameState.fishPond.fishes.forEach((fish) => {
        const fishGroup = new THREE.Group();
        const isAdult = !fish.type.startsWith('fry_');
        
        const fishMat = new THREE.MeshStandardMaterial({
            color: fish.type.includes('goldfish') ? 0xf97316 : 0x0ea5e9,
            roughness: 0.3
        });

        const scale = isAdult ? 0.25 : 0.15;
        const body = new THREE.Mesh(new THREE.ConeGeometry(scale, scale * 2.5, 8), fishMat);
        body.rotation.x = Math.PI / 2;
        fishGroup.add(body);

        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.02, scale * 0.8, scale * 0.8), fishMat);
        tail.position.z = -scale * 1.2;
        fishGroup.add(tail);

        fishGroup.position.set(0, 0.15, 20);
        scene.add(fishGroup);

        pondFishMeshes.push({ mesh: fishGroup, data: fish });
    });
}

// Cập nhật Vị trí Cá Bơi
function updatePondFishMovement() {
    const now = Date.now();
    pondFishMeshes.forEach((item, idx) => {
        const mesh = item.mesh;
        const time = now * 0.001 + idx * 1.5;
        const radius = 1.8 + (idx % 3) * 0.6;
        const x = Math.cos(time * 0.6) * radius;
        const z = 20 + Math.sin(time * 0.6) * radius;
        
        mesh.position.x = x;
        mesh.position.z = z;
        mesh.position.y = 0.15 + Math.sin(time * 2) * 0.05;
        mesh.rotation.y = -time * 0.6 + Math.PI / 2;
    });
}

// Mở Modal Quản Lý Ao Cá
function openFishPondModal() {
    const list = document.getElementById('fish-stock-list');
    if (!list) return;

    let html = '';
    ['fry_goldfish', 'fry_carp'].forEach(fryKey => {
        const fInfo = FISH_DB[fryKey];
        const count = gameState.inventory[fryKey] || 0;

        html += `
            <div class="bg-sky-50 rounded-2xl p-3 border border-sky-200 flex flex-col justify-between items-center text-center">
                <div class="text-3xl mb-1">${fInfo.icon}</div>
                <div class="font-black text-xs text-slate-800">${fInfo.name}</div>
                <div class="text-[10px] text-slate-500 mb-2">Sở hữu: <b class="text-sky-600">${count}</b></div>
                <button onclick="addFishToPond('${fryKey}')" ${count <= 0 ? 'disabled' : ''} class="w-full py-1.5 ${count > 0 ? 'bg-sky-500 hover:bg-sky-600 text-white' : 'bg-slate-300 text-slate-500'} font-bold text-xs rounded-xl shadow">
                    Thả Cá
                </button>
            </div>
        `;
    });

    list.innerHTML = html;
    openModal('modal-fish-select');
}

// Thả Cá Giống Vào Ao
function addFishToPond(fryKey) {
    if (gameState.fishPond.fishes.length >= gameState.fishPond.capacity) {
        showToast("Ao Đã Đầy! 🐟", "Ao cá đã đạt giới hạn tối đa!", "❌");
        return;
    }
    if ((gameState.inventory[fryKey] || 0) <= 0) {
        showToast("Hết Cá Giống! 🐟", "Hãy mua thêm con giống trong Cửa Hàng!", "❌");
        return;
    }

    if (checkAndDeductStamina(1)) {
        gameState.inventory[fryKey] -= 1;
        gameState.fishPond.fishes.push({
            id: Date.now(),
            type: fryKey,
            plantedAt: Date.now()
        });
        updatePondFishVisuals();
        openFishPondModal();
        showToast("Thả Cá Giống! 🐟", `Đã thả 1 ${FISH_DB[fryKey].name} vào ao!`, "💦");
    }
}

// Thu Hoạch Tất Cả Cá Lớn Trong Ao
function harvestFishFromPond() {
    const now = Date.now();
    let count = 0;
    const remaining = [];

    gameState.fishPond.fishes.forEach(f => {
        const fInfo = FISH_DB[f.type];
        const elapsed = (now - f.plantedAt) / 1000;
        if (elapsed >= fInfo.growTime) {
            count++;
            const adultId = fInfo.adultId;
            gameState.inventory[adultId] = (gameState.inventory[adultId] || 0) + 1;
            addExp(FISH_DB[adultId].exp);
        } else {
            remaining.push(f);
        }
    });

    if (count > 0) {
        if (checkAndDeductStamina(2)) {
            gameState.fishPond.fishes = remaining;
            updatePondFishVisuals();
            trackQuestProgress('harvest_fish', null, count);
            showToast("Thu Hoạch Ao Cá! 🐟", `Thu hoạch được ${count} cá lớn!`, "🧺");
            openFishPondModal();
        }
    } else {
        showToast("Chưa Có Cá Lớn 🐟", "Cá trong ao vẫn chưa đủ lớn!", "ℹ️");
    }
}
