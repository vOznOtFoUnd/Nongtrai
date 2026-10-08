// Render Danh Sách Đơn Hàng Tại Sạp Hàng
function renderMarketOrders() {
    const container = document.getElementById('market-orders-container');
    if (!container) return;

    const orders = Array.isArray(gameState.marketOrders) ? gameState.marketOrders : [];
    if (orders.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 py-8 font-bold">Chưa có đơn hàng nào.</div>';
        return;
    }

    let html = '';
    orders.forEach(o => {
        let canFulfill = true;
        let reqsHtml = (o.reqs || []).map(r => {
            const hasQty = gameState.inventory[r.id] || 0;
            if (hasQty < r.qty) canFulfill = false;
            return `<span class="inline-flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-800">${r.icon} ${r.name} (${hasQty}/${r.qty})</span>`;
        }).join(' ');

        html += `
            <div class="bg-amber-50/80 rounded-2xl p-3 border border-amber-200 flex flex-col gap-2">
                <div class="flex justify-between items-center">
                    <span class="font-extrabold text-xs text-slate-800">👤 Khách hàng: ${o.customer || 'Khách'}</span>
                    <span class="text-xs font-black text-amber-600">+${o.rewardGold || 0}🪙 | +${o.rewardExp || 0}EXP</span>
                </div>
                <div class="flex flex-wrap gap-1">${reqsHtml}</div>
                <button onclick="fulfillMarketOrder('${o.id}')" ${!canFulfill || o.completed ? 'disabled' : ''} class="py-2 ${canFulfill && !o.completed ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-300 text-slate-500'} font-bold rounded-xl text-xs shadow-sm">
                    ${o.completed ? 'Đã Hoàn Thành' : 'Giao Hàng'}
                </button>
            </div>
        `;
    });

    container.innerHTML = html || `<div class="text-center text-slate-400 py-8 font-bold">Chưa có đơn hàng mới!</div>`;
}

// Thực Hiện Giao Hàng Cho Khách
function fulfillMarketOrder(orderId) {
    const orders = Array.isArray(gameState.marketOrders) ? gameState.marketOrders : [];
    const order = orders.find(o => o.id === orderId);
    if (!order || order.completed) return;

    const inventory = gameState.inventory || {};
    for (const r of order.reqs || []) {
        const currentQty = inventory[r.id] || 0;
        if (currentQty < r.qty) {
            showToast("Thiếu Hàng! 📦", `Bạn không có đủ ${r.name} để giao đơn này.`, "❌");
            return;
        }
    }

    (order.reqs || []).forEach(r => {
        gameState.inventory[r.id] = (gameState.inventory[r.id] || 0) - r.qty;
    });

    order.completed = true;
    gameState.gold = (gameState.gold || 0) + order.rewardGold;
    addExp(order.rewardExp);

    showToast("Giao Hàng Thành Công! 📦", `Nhận được +${order.rewardGold || 0} Vàng & +${order.rewardExp || 0} EXP!`, "🎉");

    if ((gameState.marketOrders || []).every(o => o.completed)) {
        generateMarketOrders();
        showToast("Sạp Hàng Mới! 🏪", "Đã cập nhật đơn hàng khách mới!", "✨");
    }

    renderMarketOrders();
    updateUI();
    saveGame();
}

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

    const fishes = Array.isArray(gameState.fishPond?.fishes) ? gameState.fishPond.fishes : [];
    fishes.forEach((fish) => {
        const fishGroup = new THREE.Group();
        const isAdult = !String(fish.type || '').startsWith('fry_');

        const fishMat = new THREE.MeshStandardMaterial({
            color: String(fish.type || '').includes('goldfish') ? 0xf97316 : 0x0ea5e9,
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
                <button onclick="addFishToPond('${fryKey}')" ${count <= 0 ? 'disabled' : ''} class="w-full py-1.5 ${count > 0 ? 'bg-sky-500 hover:bg-sky-600 text-white' : 'bg-slate-300 text-slate-500'} font-bold rounded-xl text-[10px]">
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
    const fishPond = gameState.fishPond || { capacity: 6, fishes: [] };
    if ((fishPond.fishes || []).length >= fishPond.capacity) {
        showToast("Ao Đã Đầy! 🐟", "Ao cá đã đạt giới hạn tối đa!", "❌");
        return;
    }
    if ((gameState.inventory[fryKey] || 0) <= 0) {
        showToast("Hết Cá Giống! 🐟", "Hãy mua thêm con giống trong Cửa Hàng!", "❌");
        return;
    }

    if (!checkAndDeductStamina(1)) return;

    gameState.inventory[fryKey] -= 1;
    fishPond.fishes.push({
        id: Date.now(),
        type: fryKey,
        plantedAt: Date.now()
    });
    updatePondFishVisuals();
    openFishPondModal();
    showToast("Thả Cá Giống! 🐟", `Đã thả 1 ${FISH_DB[fryKey].name} vào ao!`, "💦");
}

// Thu Hoạch Tất Cả Cá Lớn Trong Ao
function harvestFishFromPond() {
    const now = Date.now();
    let count = 0;
    const remaining = [];

    const fishes = Array.isArray(gameState.fishPond?.fishes) ? gameState.fishPond.fishes : [];
    fishes.forEach(f => {
        const fInfo = FISH_DB[f.type];
        if (!fInfo) return;
        const elapsed = (now - f.plantedAt) / 1000;
        if (elapsed >= fInfo.growTime) {
            count++;
            const adultId = fInfo.adultId;
            gameState.inventory[adultId] = (gameState.inventory[adultId] || 0) + 1;
            addExp(FISH_DB[adultId].exp || 0);
        } else {
            remaining.push(f);
        }
    });

    if (count > 0) {
        if (!checkAndDeductStamina(2)) return;
        gameState.fishPond.fishes = remaining;
        updatePondFishVisuals();
        trackQuestProgress('harvest_fish', null, count);
        showToast("Thu Hoạch Ao Cá! 🐟", `Thu hoạch được ${count} cá lớn!`, "🧺");
        openFishPondModal();
    } else {
        showToast("Chưa Có Cá Lớn 🐟", "Cá trong ao vẫn chưa đủ lớn!", "ℹ️");
    }
}
