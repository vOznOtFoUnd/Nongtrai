let pondFishMeshes = [];
let pondDuckMeshes = [];
let fishPondWorldScale = 1;

// Build Ao Cá 3D
function buildFishPond() {
    const pondGroup = new THREE.Group();
    pondGroup.position.set(0, 0, 20);
    fishPondWorldScale = 1 + ((Number(gameState.fishPond.level)||1)-1)*0.12;
    pondGroup.scale.set(fishPondWorldScale,1,fishPondWorldScale);

    // Không tạo đáy ao: chỉ có 4 dải bờ mỏng ở mép, để mặt đất bên dưới không bị
    // một khối hộp lớn che khuất hoặc gây z-fighting với địa hình.
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x8b6b45, roughness: 0.92 });
    const edgeSpecs = [
        [18, 0.18, 0.34, 0, 0.05, -5.58],
        [18, 0.18, 0.34, 0, 0.05,  5.58],
        [0.34, 0.18, 11.0, -8.83, 0.05, 0],
        [0.34, 0.18, 11.0,  8.83, 0.05, 0]
    ];
    edgeSpecs.forEach(([w,h,d,x,y,z]) => {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), rimMat);
        edge.position.set(x,y,z);
        edge.castShadow = true;
        edge.receiveShadow = true;
        pondGroup.add(edge);
    });

    // Mặt nước là một mặt phẳng, không phải hộp đặc có đáy.
    const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x2dd4bf, emissive: 0x075e63, emissiveIntensity: 0.18, transparent: true, opacity: 0.94, roughness: 0.16, metalness: 0.08, clearcoat: 0.95, clearcoatRoughness: 0.12, reflectivity: 0.85, side: THREE.DoubleSide });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(17.2, 10.7), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.12;
    water.receiveShadow = true;
    pondGroup.add(water);
    // Vệt sáng nhẹ trên mặt ao tạo cảm giác phản chiếu ngay cả khi không có environment map.
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xd1faf5, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
    [[-3.8,-1.9,2.8,0.12],[1.8,-2.7,3.6,0.10],[4.0,1.3,1.8,0.10],[-1.2,2.7,2.5,0.08]].forEach(([x,z,w,h])=>{const glint=new THREE.Mesh(new THREE.PlaneGeometry(w,h),glintMat);glint.rotation.x=-Math.PI/2;glint.position.set(x,0.125,z);pondGroup.add(glint);});

    pondGroup.userData = { type: 'pond' };
    scene.add(pondGroup);

    updatePondFishVisuals();
    updatePondDuckVisuals();
}

// Render Cá bơi trong Ao
function updatePondFishVisuals() {
    pondFishMeshes.forEach(f => scene.remove(f.mesh));
    pondFishMeshes = [];

    (gameState.fishPond && Array.isArray(gameState.fishPond.fishes) ? gameState.fishPond.fishes : []).forEach((fish) => {
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

        fishGroup.position.set((Math.random()-0.5)*13.8, 0.22, 20+(Math.random()-0.5)*8.4);
        fishGroup.userData.swim = { phase: Math.random()*Math.PI*2, speed: 0.22+Math.random()*0.18, drift: (Math.random()-0.5)*0.8, originX: fishGroup.position.x, originZ: fishGroup.position.z };
        scene.add(fishGroup);

        pondFishMeshes.push({ mesh: fishGroup, data: fish });
    });
}

// Vịt bơi trong cùng ao nhưng có giới hạn riêng, không chiếm chỗ của cá.
function updatePondDuckVisuals() {
    if (typeof scene === 'undefined' || !scene) return;
    pondDuckMeshes.forEach(mesh => scene.remove(mesh));
    pondDuckMeshes = [];
    const ducks = gameState.fishPond && Array.isArray(gameState.fishPond.ducks) ? gameState.fishPond.ducks : [];
    ducks.forEach((duck, idx) => {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0xfff4c2, roughness: 0.7 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat);
        body.scale.set(1.2, 0.8, 1.5); body.position.y = 0.23; group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), mat);
        head.position.set(0, 0.42, 0.3); group.add(head);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0xf97316 }));
        beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.4, 0.48); group.add(beak);
        group.userData.duckIndex = idx; group.userData.swim = {phase:Math.random()*Math.PI*2, speed:0.12+Math.random()*0.08, x:(Math.random()-0.5)*13.8, z:20+(Math.random()-0.5)*8.2}; scene.add(group); pondDuckMeshes.push(group);
    });
}
function updatePondDuckMovement() {
    const now = performance.now() * 0.001;
    pondDuckMeshes.forEach((mesh, idx) => {
        const d=mesh.userData.swim || {phase:idx, speed:0.15, x:0, z:20}; const a=now*d.speed+d.phase;
        const boundX=7.35*fishPondWorldScale, minZ=20-4.45*fishPondWorldScale, maxZ=20+4.45*fishPondWorldScale; const x=Math.max(-boundX,Math.min(boundX,d.x+Math.sin(a)*1.25)); const z=Math.max(minZ,Math.min(maxZ,d.z+Math.cos(a*0.73)*0.8));
        mesh.position.set(x,0, z); mesh.rotation.y=Math.atan2(Math.cos(a),Math.sin(a*0.73));
    });
}
function addDuckToPond() {
    const pond = gameState.fishPond;
    if (!pond) return;
    if (!Array.isArray(pond.ducks)) pond.ducks = [];
    if (pond.ducks.length >= (Number(pond.duckCapacity) || 2)) { showToast('Ao Đã Đủ Vịt 🦆', 'Ao cấp hiện tại đã đủ chỗ vịt.', 'ℹ️'); return; }
    if ((Number(gameState.inventory.buy_duck) || 0) < 1) { showToast('Thiếu Vịt Giống 🦆', 'Mua vịt con tại cửa hàng trước nhé.', '❌'); return; }
    if (!checkAndDeductStamina(1)) return;
    gameState.inventory.buy_duck -= 1;
    const bornAt = Date.now();
    pond.ducks.push({ id: bornAt, bornAt, producedAt: bornAt, hunger: 100, hungry: false, sick: false, starvingStartAt: null, eggCount: 0 });
    updatePondDuckVisuals(); renderPondDuckControls(); saveGame();
    showToast('Đã Thả Vịt 🦆', 'Vịt con đã xuống ao. Cho ăn bằng Cám Vịt để duy trì sản lượng trứng.', '🦆');
}
function collectDuckEggs() {
    const pond = gameState.fishPond; const ducks = pond && Array.isArray(pond.ducks) ? pond.ducks : [];
    const now = Date.now(); let count = 0;
    ducks.forEach(duck => {
        if (!duck.sick && Number(duck.hunger) > 40 && now - (Number(duck.bornAt) || now) >= 180000 && now - (Number(duck.producedAt) || Number(duck.bornAt) || now) >= 180000 && (Number(duck.eggCount)||0) < 8) { count++; duck.producedAt = now; duck.eggCount = (Number(duck.eggCount)||0) + 1; }
    });
    const retired = ducks.filter(duck => (Number(duck.eggCount)||0) >= 8);
    if (retired.length) { pond.ducks = ducks.filter(duck => (Number(duck.eggCount)||0) < 8); gameState.gold += retired.length * 350; gameState.inventory.duck_meat = (Number(gameState.inventory.duck_meat)||0) + retired.length; updatePondDuckVisuals(); showToast('Vịt xuất chuồng', `${retired.length} vịt đã đẻ đủ 8 trứng; nhận ${retired.length} thịt vịt và +${retired.length*350} vàng.`, '🦆'); }
    if (!count) { if (!retired.length) showToast('Chưa Có Trứng Vịt 🥚', 'Vịt cần lớn 3 phút, sau đó mỗi 3 phút đẻ 1 trứng và cần đủ no.', 'ℹ️'); updateUI(); saveGame(); renderPondDuckControls(); return; }
    gameState.inventory.duck_egg = (Number(gameState.inventory.duck_egg) || 0) + count;
    trackQuestProgress('collect_animal', 'duck_egg', count); updateUI(); saveGame(); renderPondDuckControls();
    if (typeof playFarmSound === 'function') playFarmSound('duck-harvest');
    showToast('Thu Trứng Vịt 🥚', `Thu được ${count} trứng vịt!`, '🥚');
}
function feedPondDucks() {
    const ducks = gameState.fishPond && gameState.fishPond.ducks;
    if (!Array.isArray(ducks) || !ducks.length) { showToast('Chưa Có Vịt 🦆', 'Hãy mua vịt giống và thả xuống ao trước.', 'ℹ️'); return; }
    const hungry = ducks.filter(d => (Number(d.hunger) || 0) <= 40 || d.hungry);
    if (!hungry.length) { showToast('Vịt đã no 🦆', 'Đàn vịt hiện không cần ăn.', 'ℹ️'); return; }
    const qty = Number(gameState.inventory.feed_duck) || 0;
    if (qty < hungry.length) { showToast('Hết Cám Vịt 🌾', `Cần ${hungry.length} phần cám, hiện có ${qty}.`, '❌'); return; }
    if (!checkAndDeductStamina(1)) return;
    gameState.inventory.feed_duck = qty - hungry.length;
    hungry.forEach(duck => { duck.hunger = 100; duck.hungry = false; duck.starvingStartAt = null; });
    saveGame(); updateUI(); renderPondDuckControls(); renderPondFishCare(); updateFloatingHUD(); if (typeof playFarmSound === 'function') playFarmSound('animal');
    showToast('Đã Cho Vịt Ăn 🌾', `Đã dùng ${hungry.length} phần cám vịt.`, '🦆');
}
function healPondDucks() {
    const ducks = gameState.fishPond && gameState.fishPond.ducks || [];
    const sick = ducks.filter(d => d.sick);
    if (!sick.length) { showToast('Vịt khỏe mạnh 💊', 'Không có vịt nào cần chữa bệnh.', 'ℹ️'); return; }
    const medicine = Number(gameState.inventory.medicine) || 0;
    if (medicine < sick.length) { showToast('Thiếu thuốc thú y', `Cần ${sick.length} liều thuốc, hiện có ${medicine}.`, '💊'); return; }
    if (!checkAndDeductStamina(1)) return;
    gameState.inventory.medicine = medicine - sick.length;
    sick.forEach(d => { d.sick = false; d.hunger = Math.max(45, Number(d.hunger) || 0); d.hungry = d.hunger <= 40; d.starvingStartAt = null; });
    saveGame(); updateUI(); renderPondDuckControls(); renderPondFishCare(); showToast('Đã chữa bệnh cho vịt', `Đã chữa ${sick.length} con vịt.`, '💊');
}
function feedPondFish() {
    const fishes = gameState.fishPond && gameState.fishPond.fishes;
    if (!Array.isArray(fishes) || !fishes.length) { showToast('Chưa có cá 🐟', 'Thả cá giống xuống ao trước nhé.', 'ℹ️'); return; }
    const hungry = fishes.filter(f => (Number(f.hunger) || 0) <= 40 || f.hungry || f.sick);
    if (!hungry.length) { showToast('Cá đã no 🐟', 'Đàn cá hiện không cần ăn.', 'ℹ️'); return; }
    const qty = Number(gameState.inventory.feed_fish) || 0;
    if (qty < hungry.length) { showToast('Thiếu thức ăn cá', `Cần ${hungry.length} phần, hiện có ${qty}.`, '🐟'); return; }
    if (!checkAndDeductStamina(1)) return;
    gameState.inventory.feed_fish = qty - hungry.length;
    hungry.forEach(f => { f.hunger = 100; f.hungry = false; f.starvingStartAt = null; });
    saveGame(); updateUI(); renderPondFishCare(); renderPondDuckControls(); if (typeof playFarmSound === 'function') playFarmSound('pond');
    showToast('Đã cho cá ăn 🐟', `Đã dùng ${hungry.length} phần thức ăn cá.`, '✨');
}
function healPondFish() {
    const fishes = gameState.fishPond && gameState.fishPond.fishes || [];
    const sick = fishes.filter(f => f.sick);
    if (!sick.length) { showToast('Cá khỏe mạnh 💊', 'Không có cá nào cần chữa bệnh.', 'ℹ️'); return; }
    if ((Number(gameState.inventory.medicine)||0) < sick.length) { showToast('Thiếu thuốc thú y', `Cần ${sick.length} liều thuốc.`, '💊'); return; }
    if (!checkAndDeductStamina(1)) return;
    gameState.inventory.medicine -= sick.length; sick.forEach(f => { f.sick = false; f.hunger = Math.max(45, Number(f.hunger)||0); f.starvingStartAt = null; });
    saveGame(); updateUI(); renderPondFishCare(); renderPondDuckControls(); showToast('Đã chữa bệnh cho cá', `Đã chữa ${sick.length} con cá.`, '💊');
}

let activePondTab = 'fish';
function setPondManagementTab(tab) {
    activePondTab = ['fish', 'duck', 'upgrade'].includes(tab) ? tab : 'fish';
    ['fish', 'duck', 'upgrade'].forEach(key => {
        const panel = document.getElementById(`pond-panel-${key}`);
        const button = document.getElementById(`pond-tab-${key}`);
        if (panel) panel.classList.toggle('hidden', key !== activePondTab);
        if (button) {
            const activeClasses = key === 'fish' ? 'bg-sky-600 text-white border-sky-700' : key === 'duck' ? 'bg-amber-400 text-amber-950 border-amber-500' : 'bg-emerald-600 text-white border-emerald-700';
            const inactiveClasses = key === 'fish' ? 'bg-sky-50 text-sky-900 border-sky-200' : key === 'duck' ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-emerald-50 text-emerald-900 border-emerald-200';
            button.className = `py-2.5 rounded-xl text-xs font-black border ${key === activePondTab ? activeClasses : inactiveClasses}`;
        }
    });
}

function renderPondDuckControls() {
    const el = document.getElementById('pond-duck-controls'); if (!el) return;
    const ducks = gameState.fishPond && Array.isArray(gameState.fishPond.ducks) ? gameState.fishPond.ducks : [];
    const count = ducks.length;
    const hungryDucks = ducks.filter(d => d.hungry || Number(d.hunger) <= 40).length;
    const sickDucks = ducks.filter(d => d.sick).length;
    const capacity = (gameState.fishPond && gameState.fishPond.duckCapacity) || 2;
    el.innerHTML = `<section class="rounded-2xl bg-amber-50 border border-amber-200 p-3 mb-3"><div class="flex items-center justify-between gap-2"><div><div class="font-black text-sm text-amber-950">🦆 Đàn vịt</div><div class="text-xs text-amber-800 mt-1">${count}/${capacity} con · ${hungryDucks} đói · ${sickDucks} bệnh</div></div><div class="text-3xl">🦆</div></div><div class="grid grid-cols-2 gap-2 mt-3"><button onclick="addDuckToPond()" class="min-h-11 rounded-xl bg-amber-400 text-amber-950 font-black text-sm px-2">➕ Thả vịt (${Number(gameState.inventory.buy_duck)||0})</button><button onclick="feedPondDucks()" class="min-h-11 rounded-xl bg-emerald-600 text-white font-black text-sm px-2">🌾 Cho ăn (${Number(gameState.inventory.feed_duck)||0})</button><button onclick="collectDuckEggs()" class="min-h-11 rounded-xl bg-sky-600 text-white font-black text-sm px-2">🥚 Thu trứng</button><button onclick="healPondDucks()" class="min-h-11 rounded-xl bg-rose-400 text-rose-950 font-black text-sm px-2">💊 Chữa bệnh</button></div></section><div class="rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-600 leading-relaxed">Mỗi vịt cần 1 phần cám khi đói. Đói nhẹ làm chậm đẻ trứng; kiệt sức hoặc bệnh sẽ tạm dừng sản xuất.</div>`;
}

function renderPondFishCare() {
    const el = document.getElementById('pond-fish-care'); if (!el) return;
    const fishes = gameState.fishPond && Array.isArray(gameState.fishPond.fishes) ? gameState.fishPond.fishes : [];
    const hungry = fishes.filter(f => f.hungry || Number(f.hunger) <= 40).length;
    const sick = fishes.filter(f => f.sick).length;
    el.innerHTML = `<section class="rounded-2xl bg-sky-50 border border-sky-200 p-3"><div class="flex items-center justify-between gap-2"><div><div class="font-black text-sm text-sky-950">🐟 Sức khỏe đàn cá</div><div class="text-xs text-sky-800 mt-1">${fishes.length}/${(gameState.fishPond && gameState.fishPond.capacity)||6} con · ${hungry} đói · ${sick} bệnh</div><div class="text-[11px] text-sky-800 mt-1">Cám cá: ${Number(gameState.inventory.feed_fish)||0} · Thuốc: ${Number(gameState.inventory.medicine)||0}</div></div><div class="text-3xl">🐟</div></div><div class="grid grid-cols-2 gap-2 mt-3"><button onclick="feedPondFish()" class="min-h-11 rounded-xl bg-cyan-600 text-white font-black text-sm px-2">🌾 Cho cá ăn</button><button onclick="healPondFish()" class="min-h-11 rounded-xl bg-rose-400 text-rose-950 font-black text-sm px-2">💊 Chữa cá</button></div></section>`;
}

// Cập nhật Vị trí Cá Bơi
function updatePondFishMovement() {
    const now = performance.now()*0.001;
    pondFishMeshes.forEach((item, idx) => {
        const mesh=item.mesh; const sw=mesh.userData.swim || {phase:idx,speed:0.25,originX:0,originZ:20}; const t=now*sw.speed+sw.phase;
        // Đường bơi uốn lượn ngẫu nhiên, có giới hạn trong ao chữ nhật thay vì quay vòng tròn cố định.
        const boundX=7.35*fishPondWorldScale, minZ=20-4.45*fishPondWorldScale, maxZ=20+4.45*fishPondWorldScale; const x=Math.max(-boundX,Math.min(boundX,sw.originX+Math.sin(t)*2.3+Math.sin(t*0.43+idx)*0.65));
        const z=Math.max(minZ,Math.min(maxZ,sw.originZ+Math.cos(t*0.71)*1.1+Math.sin(t*0.31)*0.45));
        mesh.position.set(x,0.22+Math.sin(t*2.4)*0.025,z); mesh.rotation.y=Math.atan2(Math.cos(t),-Math.sin(t*0.71));
    });
}

// Mở Modal Quản Lý Ao Cá
function openFishPondModal() {
    // Play only when entering the panel, not when refreshing it after an action.
    const pondModal = document.getElementById('modal-fish-select');
    if ((!pondModal || pondModal.classList.contains('hidden')) && typeof playFarmSound === 'function') playFarmSound('ui');
    const list = document.getElementById('fish-stock-list');
    if (!list) return;

    let html = '';
    const pond=gameState.fishPond; const level=Number(pond.level)||1; const cost=level*1500;
    const fishCount=Array.isArray(pond.fishes)?pond.fishes.length:0; const duckCount=Array.isArray(pond.ducks)?pond.ducks.length:0;
    const summary=document.getElementById('pond-summary'); if(summary) summary.innerHTML=`<div class="grid grid-cols-3 gap-2 text-center"><div class="rounded-xl bg-sky-50 border border-sky-200 p-2 rounded-xl"><div class="text-lg">🐟</div><b>${fishCount}/${pond.capacity}</b><div class="text-[10px]">Cá trong ao</div></div><div class="rounded-xl bg-amber-50 border border-amber-200 p-2 rounded-xl"><div class="text-lg">🦆</div><b>${duckCount}/${pond.duckCapacity}</b><div class="text-[10px]">Vịt trong ao</div></div><div class="rounded-xl bg-emerald-50 border border-emerald-200 p-2 rounded-xl"><div class="text-lg">🏡</div><b>${level}/5</b><div class="text-[10px]">Cấp ao</div></div></div>`;
    const upgrade=document.getElementById('pond-upgrade-panel'); if(upgrade) upgrade.innerHTML=`<section class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div class="text-3xl mb-2">🏡</div><div class="font-black text-base text-emerald-950">Nâng cấp ao cấp ${level}/5</div><div class="text-sm text-emerald-900 mt-1">Mỗi cấp tăng thêm 6 chỗ cá và 2 chỗ vịt.</div><div class="text-xs text-emerald-800 mt-2">Sức chứa hiện tại: ${pond.capacity} cá · ${pond.duckCapacity} vịt</div><button onclick="upgradeFishPond()" ${level>=5?'disabled':''} class="mt-4 w-full min-h-12 py-3 rounded-xl font-black text-sm ${level>=5?'bg-slate-300 text-slate-500':'bg-emerald-600 text-white'}">${level>=5?'Ao đã đạt cấp tối đa':`Nâng cấp — ${cost} 🪙`}</button></section>`;
    ['fry_goldfish', 'fry_carp'].forEach(fryKey => {
        const fInfo = FISH_DB[fryKey];
        const count = gameState.inventory[fryKey] || 0;
        const pondCount = (gameState.fishPond.fishes || []).filter(f => f.type === fryKey).length;
        const growSecs = Number(fInfo.growTime) || 0;

        html += `
            <div class="bg-sky-50 rounded-2xl p-3 border border-sky-200 flex flex-col justify-between items-center text-center">
                <div class="text-3xl mb-1">${fInfo.icon}</div>
                <div class="font-black text-xs text-slate-800">${fInfo.name}</div>
                <div class="text-[10px] text-slate-500 mt-1">Thời gian lớn: <b>${Math.ceil(growSecs/60)} phút</b></div>
                <div class="text-[10px] text-slate-500">Trong ao: <b class="text-sky-700">${pondCount}</b> • Trong túi: <b class="text-sky-600">${count}</b></div>
                <div class="text-[10px] text-slate-500 mb-2">Sản lượng: ${fInfo.adultId && FISH_DB[fInfo.adultId] ? FISH_DB[fInfo.adultId].name : 'Cá giống'}</div>
                <button onclick="addFishToPond('${fryKey}')" ${count <= 0 ? 'disabled' : ''} class="w-full py-1.5 ${count > 0 ? 'bg-sky-500 hover:bg-sky-600 text-white' : 'bg-slate-300 text-slate-500'} font-bold text-xs rounded-xl shadow">
                    Thả Cá
                </button>
            </div>
        `;
    });

    list.innerHTML = html;
    renderPondDuckControls();
    renderPondFishCare();
    setPondManagementTab(activePondTab);
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
            plantedAt: Date.now(),
            hunger: 100, hungry: false, sick: false, starvingStartAt: null
        });
        updatePondFishVisuals();
        saveGame(); updateUI();
        openFishPondModal();
        showToast("Thả Cá Giống! 🐟", `Đã thả 1 ${FISH_DB[fryKey].name} vào ao!`, "💦");
    }
}

// Thu Hoạch Tất Cả Cá Lớn Trong Ao
function harvestFishFromPond() {
    const pond = gameState.fishPond;
    if (!pond || !Array.isArray(pond.fishes)) {
        showToast("Ao Cá Bị Lỗi 🐟", "Dữ liệu ao cá không hợp lệ.", "❌");
        return;
    }

    const now = Date.now();
    const matureFish = [];
    const remaining = [];

    // Chỉ xác định cá đủ lớn; chưa cộng vật phẩm/EXP hoặc sửa dữ liệu ao.
    for (const fish of pond.fishes) {
        const info = fish && FISH_DB[fish.type];
        if (!info || !Number.isFinite(fish.plantedAt) || !Number.isFinite(info.growTime)) {
            // Giữ dữ liệu lạ lại để tránh vô tình làm mất cá trong save.
            remaining.push(fish);
            continue;
        }

        if ((now - fish.plantedAt) / 1000 >= info.growTime && info.adultId && FISH_DB[info.adultId] && !fish.sick && (Number(fish.hunger) || 0) > 0) {
            matureFish.push({ fish, adultId: info.adultId });
        } else {
            remaining.push(fish);
        }
    }

    if (matureFish.length === 0) {
        showToast("Chưa Có Cá Thu Hoạch 🐟", "Cá cần đủ lớn, không bị đói kiệt sức hoặc bệnh mới thu hoạch được.", "ℹ️");
        return;
    }

    // Trừ thể lực trước khi thay đổi kho, EXP hoặc danh sách cá.
    if (!checkAndDeductStamina(2)) return;

    // Giao dịch đã hợp lệ: chuyển cá trưởng thành vào kho và bỏ chúng khỏi ao.
    for (const item of matureFish) {
        const current = Number(gameState.inventory[item.adultId]) || 0;
        gameState.inventory[item.adultId] = current + 1;
    }
    pond.fishes = remaining;

    // Cộng EXP sau khi giao dịch đã được áp dụng.
    for (const item of matureFish) {
        addExp(Number(FISH_DB[item.adultId].exp) || 0);
    }

    updatePondFishVisuals();
    trackQuestProgress('harvest_fish', null, matureFish.length);
    if (typeof playFarmSound === 'function') playFarmSound('fish-harvest');
    showToast("Thu Hoạch Ao Cá! 🐟", `Thu hoạch được ${matureFish.length} cá lớn!`, "🧺");
    openFishPondModal();
    if (typeof updateUI === 'function') updateUI();
    saveGame();
}

function upgradeFishPond(){const p=gameState.fishPond;const lvl=Number(p.level)||1;if(lvl>=5){showToast('Ao đã tối đa','Ao đã đạt cấp 5.','ℹ️');return;}const cost=lvl*1500;if(gameState.gold<cost){showToast('Thiếu vàng',`Cần ${cost} vàng để nâng cấp ao.`,'❌');return;}gameState.gold-=cost;p.level=lvl+1;p.capacity=p.level*6;p.duckCapacity=p.level*2;updateUI();saveGame();openFishPondModal();showToast('Nâng cấp ao thành công',`Ao cấp ${p.level}: ${p.capacity} cá, ${p.duckCapacity} vịt.`,'✨');}
