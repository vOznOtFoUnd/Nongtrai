let chickenMeshes = [], cowMeshes = [], pigMeshes = [];
let currentPenType = null;
let animalPenFenceMeshes = {};

// Hàm dựng Hàng rào Chuồng
function buildPenFence(x, z, width, depth, gateSide = 'front') {
    const fenceGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8);
    const railGeoH = new THREE.BoxGeometry(width, 0.08, 0.05);
    const railGeoV = new THREE.BoxGeometry(0.05, 0.08, depth);

    const hW = width / 2;
    const hD = depth / 2;

    const corners = [
        { x: -hW, z: -hD }, { x: hW, z: -hD },
        { x: -hW, z: hD },  { x: hW, z: hD }
    ];

    corners.forEach(c => {
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.set(c.x, 0.45, c.z);
        post.castShadow = true;
        post.receiveShadow = true;
        fenceGroup.add(post);
    });

    if (gateSide !== 'back') {
        [0.3, 0.65].forEach(y => {
            const rail = new THREE.Mesh(railGeoH, woodMat);
            rail.position.set(0, y, -hD);
            rail.castShadow = true;
            fenceGroup.add(rail);
        });
    }

    if (gateSide !== 'front') {
        [0.3, 0.65].forEach(y => {
            const rail = new THREE.Mesh(railGeoH, woodMat);
            rail.position.set(0, y, hD);
            rail.castShadow = true;
            fenceGroup.add(rail);
        });
    } else {
        const gateWidth = 1.4;
        const sideWidth = (width - gateWidth) / 2;
        [ -hW + sideWidth / 2, hW - sideWidth / 2 ].forEach(posX => {
            [0.3, 0.65].forEach(y => {
                const r = new THREE.Mesh(new THREE.BoxGeometry(sideWidth, 0.08, 0.05), woodMat);
                r.position.set(posX, y, hD);
                r.castShadow = true;
                fenceGroup.add(r);
            });
            const p = new THREE.Mesh(postGeo, woodMat);
            p.position.set(posX > 0 ? hW - sideWidth : -hW + sideWidth, 0.45, hD);
            p.castShadow = true;
            fenceGroup.add(p);
        });
    }

    [0.3, 0.65].forEach(y => {
        const rail = new THREE.Mesh(railGeoV, woodMat);
        rail.position.set(-hW, y, 0);
        rail.castShadow = true;
        fenceGroup.add(rail);
    });

    [0.3, 0.65].forEach(y => {
        const rail = new THREE.Mesh(railGeoV, woodMat);
        rail.position.set(hW, y, 0);
        rail.castShadow = true;
        fenceGroup.add(rail);
    });

    fenceGroup.position.set(x, 0, z);
    scene.add(fenceGroup);
    return fenceGroup;
}

// Tạo Model 3D Con Gà
function createChickenModel(data) {
    // UPGRADE 32 prototype: handcrafted rounded chibi chicken.
    // Keep the public factory, world coordinates, scene registration and userData contract unchanged.
    const group = new THREE.Group();
    const mat = (color, roughness = 0.72) => new THREE.MeshStandardMaterial({ color, roughness });
    const cream = mat(0xfff7e8, 0.82);
    const wingCream = mat(0xffe8ad, 0.78);
    const orange = mat(0xffa51f, 0.56);
    const combRed = mat(0xf04f62, 0.58);
    const eyeWhite = mat(0xffffff, 0.32);
    const eyeDark = new THREE.MeshBasicMaterial({ color: 0x241b22 });
    const blush = new THREE.MeshBasicMaterial({ color: 0xff9ca9, transparent: true, opacity: 0.8 });

    function egg(geometry, material, position, scale, rotation) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position[0], position[1], position[2]);
        mesh.scale.set(scale[0], scale[1], scale[2]);
        if (rotation) mesh.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    }
    const sphere = new THREE.SphereGeometry(1, 16, 12);
    // Plump body and a softly oversized head.
    egg(sphere, cream, [0, 0.38, 0], [0.30, 0.31, 0.37]);
    egg(sphere, cream, [0, 0.59, 0.20], [0.225, 0.225, 0.22]);
    // Wings sit visibly on either side of the body.
    egg(sphere, wingCream, [-0.245, 0.39, 0.015], [0.085, 0.16, 0.21], [0, 0, -0.18]);
    egg(sphere, wingCream, [0.245, 0.39, 0.015], [0.085, 0.16, 0.21], [0, 0, 0.18]);
    // Three tail feathers, angled upward at the rear.
    for (let i = -1; i <= 1; i++) {
        egg(new THREE.SphereGeometry(1, 10, 8), orange,
            [i * 0.075, 0.52 + (1 - Math.abs(i)) * 0.025, -0.30],
            [0.065, 0.12, 0.075], [-0.45, i * 0.16, i * 0.22]);
    }
    // Comb: rounded lobes rather than sharp spikes.
    for (let i = 0; i < 3; i++) {
        egg(sphere, combRed, [(i - 1) * 0.065, 0.80 - Math.abs(i - 1) * 0.012, 0.18], [0.055, 0.065, 0.052]);
    }
    egg(sphere, combRed, [0, 0.48, 0.355], [0.045, 0.075, 0.035]);
    // Short, soft triangular beak pointing forward (+Z).
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.12, 7), orange);
    beak.position.set(0, 0.565, 0.415);
    beak.rotation.x = Math.PI / 2;
    beak.castShadow = true;
    group.add(beak);
    // Big glossy eyes with tiny highlights, placed on the forward-facing head.
    [-1, 1].forEach(side => {
        egg(sphere, eyeWhite, [side * 0.105, 0.625, 0.374], [0.052, 0.061, 0.027]);
        egg(sphere, eyeDark, [side * 0.105, 0.625, 0.397], [0.029, 0.038, 0.016]);
        egg(sphere, eyeWhite, [side * 0.095, 0.644, 0.411], [0.010, 0.012, 0.007]);
        egg(sphere, blush, [side * 0.17, 0.555, 0.365], [0.043, 0.025, 0.012]);
    });
    // Little orange legs and flat feet remain close to the ground for stable placement.
    [-0.105, 0.105].forEach(x => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.13, 8), orange);
        leg.position.set(x, 0.105, 0.035);
        leg.castShadow = true;
        group.add(leg);
        egg(new THREE.SphereGeometry(1, 10, 8), orange, [x, 0.035, 0.075], [0.075, 0.025, 0.095]);
        egg(new THREE.SphereGeometry(1, 8, 6), orange, [x + (x < 0 ? -0.035 : 0.035), 0.032, 0.12], [0.04, 0.018, 0.035]);
    });

    group.position.set(data.x, 0, data.z);
    group.userData = { type: 'chicken_pen' };
    group.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    scene.add(group);
    return group;
}

// Tạo Model 3D Con Bò
function createCowModel(data) {
    // Rounded chibi cow. Preserve factory name, placement and interaction contract.
    const group = new THREE.Group();
    const mat = (color, roughness = 0.76) => new THREE.MeshStandardMaterial({ color, roughness });
    const cream = mat(0xfff5df), spot = mat(0x4a3440), pink = mat(0xf59caf, 0.62);
    const hornMat = mat(0xffe8a3, 0.55), hoofMat = mat(0x5b4a4b);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x241b22 });
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    function ball(position, scale, material, rotation = null) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), material);
        m.position.set(...position); m.scale.set(...scale);
        if (rotation) m.rotation.set(...rotation);
        m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
    }
    // Plush oval body with soft patches.
    ball([0, 0.68, -0.02], [0.52, 0.48, 0.72], cream);
    ball([0.43, 0.72, 0.16], [0.09, 0.28, 0.28], spot, [0.2, 0, -0.15]);
    ball([-0.42, 0.66, -0.22], [0.085, 0.25, 0.24], spot, [-0.15, 0, 0.1]);
    // Oversized head and muzzle facing forward (+Z).
    ball([0, 1.04, 0.53], [0.39, 0.40, 0.37], cream);
    ball([0, 0.91, 0.83], [0.29, 0.20, 0.15], pink);
    [-0.105, 0.105].forEach(x => ball([x, 0.93, 0.958], [0.035, 0.045, 0.018], mat(0x9d4560)));
    // Large friendly eyes with highlights.
    [-0.17, 0.17].forEach(x => {
        ball([x, 1.12, 0.84], [0.075, 0.09, 0.045], eyeMat);
        ball([x - 0.018, 1.15, 0.88], [0.024, 0.027, 0.012], shineMat);
    });
    // Ears and tiny rounded horns.
    [-1, 1].forEach(side => {
        ball([side * 0.39, 1.20, 0.49], [0.18, 0.09, 0.14], pink, [0, 0, side * -0.2]);
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 10), hornMat);
        horn.position.set(side * 0.22, 1.43, 0.50); horn.rotation.z = side * -0.18;
        horn.castShadow = true; group.add(horn);
    });
    // Four short legs and rounded hooves.
    [[-0.31,0.34],[0.31,0.34],[-0.31,-0.43],[0.31,-0.43]].forEach(([x,z]) => {
        ball([x, 0.27, z], [0.105, 0.25, 0.11], cream);
        ball([x, 0.075, z + 0.015], [0.115, 0.075, 0.12], hoofMat);
    });
    // Tail and tuft.
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.48, 8), cream);
    tail.position.set(0, 0.70, -0.72); tail.rotation.x = -0.25; tail.castShadow = true; group.add(tail);
    ball([0, 0.47, -0.91], [0.075, 0.10, 0.07], spot);
    // Udder remains visible underneath for the farm-animal silhouette.
    ball([0, 0.35, -0.02], [0.22, 0.12, 0.24], pink);
    group.position.set(data.x, 0, data.z);
    group.userData = { type: 'cow_barn' };
    scene.add(group);
    return group;
}

// Tạo Model 3D Con Heo
function createPigModel(data) {
    // Rounded chibi pig with preserved world placement and pig_pen type.
    const group = new THREE.Group();
    const pink = new THREE.MeshStandardMaterial({ color: 0xff9eb5, roughness: 0.72 });
    const lightPink = new THREE.MeshStandardMaterial({ color: 0xffc1cd, roughness: 0.62 });
    const snoutPink = new THREE.MeshStandardMaterial({ color: 0xf06f8b, roughness: 0.58 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x9e6473, roughness: 0.8 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x34212a });
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    function ball(position, scale, material, rotation = null) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), material);
        m.position.set(...position); m.scale.set(...scale);
        if (rotation) m.rotation.set(...rotation);
        m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
    }
    ball([0, 0.53, -0.02], [0.48, 0.42, 0.59], pink);
    ball([0, 0.68, 0.43], [0.37, 0.36, 0.35], pink);
    // Snout projects forward so it reads clearly from the game camera.
    ball([0, 0.57, 0.735], [0.22, 0.15, 0.105], snoutPink);
    [-0.075, 0.075].forEach(x => ball([x, 0.59, 0.824], [0.027, 0.045, 0.012], hoofMat));
    [-0.15, 0.15].forEach(x => {
        ball([x, 0.78, 0.70], [0.065, 0.078, 0.035], eyeMat);
        ball([x - 0.015, 0.805, 0.728], [0.021, 0.024, 0.012], shine);
    });
    // Floppy triangular ears with a lighter inner surface.
    [-1, 1].forEach(side => {
        ball([side * 0.245, 0.98, 0.42], [0.13, 0.20, 0.085], pink, [0, 0, side * -0.48]);
        ball([side * 0.245, 0.99, 0.49], [0.065, 0.12, 0.025], lightPink, [0, 0, side * -0.48]);
    });
    // Short legs, hooves and a curly tail.
    [[-0.27,0.30],[0.27,0.30],[-0.27,-0.34],[0.27,-0.34]].forEach(([x,z]) => {
        ball([x, 0.20, z], [0.095, 0.18, 0.10], pink);
        ball([x, 0.065, z + 0.01], [0.10, 0.06, 0.105], hoofMat);
    });
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 8, 14, Math.PI * 1.7), snoutPink);
    tail.position.set(0, 0.62, -0.58); tail.rotation.y = Math.PI / 2; tail.castShadow = true; group.add(tail);
    // Soft cheek blush.
    [-1, 1].forEach(side => ball([side * 0.265, 0.62, 0.665], [0.055, 0.035, 0.018], lightPink));
    group.position.set(data.x, 0, data.z);
    group.userData = { type: 'pig_pen' };
    scene.add(group);
    return group;
}

function buildChickenPen() {
    animalPenFenceMeshes.chicken = buildPenFence(-20, -18, 8, 6, 'front');
    const sc=1+((Number(gameState.penLevels?.chicken)||1)-1)*0.12; animalPenFenceMeshes.chicken.scale.set(sc,1,sc);
    updateAnimalPen3DMeshes('chicken');
}

function buildCowBarn() {
    animalPenFenceMeshes.cow = buildPenFence(-20, 10, 9, 7, 'front');
    const sc=1+((Number(gameState.penLevels?.cow)||1)-1)*0.12; animalPenFenceMeshes.cow.scale.set(sc,1,sc);
    updateAnimalPen3DMeshes('cow');
}

function buildPigPen() {
    animalPenFenceMeshes.pig = buildPenFence(20, 14, 8, 6, 'front');
    const sc=1+((Number(gameState.penLevels?.pig)||1)-1)*0.12; animalPenFenceMeshes.pig.scale.set(sc,1,sc);
    updateAnimalPen3DMeshes('pig');
}

function updateAnimalPen3DMeshes(type) {
    if (type === 'chicken') {
        chickenMeshes.forEach(item => scene.remove(item.mesh));
        chickenMeshes = [];
        gameState.chickens.forEach(data => {
            const mesh = createChickenModel(data);
            chickenMeshes.push({ mesh, data });
        });
    } else if (type === 'cow') {
        cowMeshes.forEach(item => scene.remove(item.mesh));
        cowMeshes = [];
        gameState.cows.forEach(data => {
            const mesh = createCowModel(data);
            cowMeshes.push({ mesh, data });
        });
    } else if (type === 'pig') {
        pigMeshes.forEach(item => scene.remove(item.mesh));
        pigMeshes = [];
        gameState.pigs.forEach(data => {
            const mesh = createPigModel(data);
            pigMeshes.push({ mesh, data });
        });
    }
}

// Cập nhật chuyển động AI vật nuôi
function updateAnimalMovement() {
    const now = Date.now();

    chickenMeshes.forEach(item => {
        const c = item.data;
        const mesh = item.mesh;

        if (!c.targetX || Math.hypot(c.targetX - mesh.position.x, c.targetZ - mesh.position.z) < 0.2) {
            if (!c.nextMoveTime || now > c.nextMoveTime) {
                c.targetX = -20 + (Math.random() - 0.5) * 5;
                c.targetZ = -18 + (Math.random() - 0.5) * 3.5;
                c.nextMoveTime = now + 2000 + Math.random() * 4000;
            }
        } else {
            const dx = c.targetX - mesh.position.x;
            const dz = c.targetZ - mesh.position.z;
            const angle = Math.atan2(dx, dz);
            mesh.rotation.y = angle;
            mesh.position.x += (dx / Math.hypot(dx, dz)) * 0.03;
            mesh.position.z += (dz / Math.hypot(dx, dz)) * 0.03;
            mesh.position.y = Math.abs(Math.sin(now * 0.01)) * 0.05;
            c.x = mesh.position.x;
            c.z = mesh.position.z;
        }
    });

    cowMeshes.forEach(item => {
        const c = item.data;
        const mesh = item.mesh;

        if (!c.targetX || Math.hypot(c.targetX - mesh.position.x, c.targetZ - mesh.position.z) < 0.2) {
            if (!c.nextMoveTime || now > c.nextMoveTime) {
                c.targetX = -20 + (Math.random() - 0.5) * 6.5;
                c.targetZ = 10 + (Math.random() - 0.5) * 4.5;
                c.nextMoveTime = now + 4000 + Math.random() * 6000;
            }
        } else {
            const dx = c.targetX - mesh.position.x;
            const dz = c.targetZ - mesh.position.z;
            const angle = Math.atan2(dx, dz);
            mesh.rotation.y = angle;
            mesh.position.x += (dx / Math.hypot(dx, dz)) * 0.015;
            mesh.position.z += (dz / Math.hypot(dx, dz)) * 0.015;
            c.x = mesh.position.x;
            c.z = mesh.position.z;
        }
    });

    pigMeshes.forEach(item => {
        const p = item.data;
        const mesh = item.mesh;

        if (!p.targetX || Math.hypot(p.targetX - mesh.position.x, p.targetZ - mesh.position.z) < 0.2) {
            if (!p.nextMoveTime || now > p.nextMoveTime) {
                p.targetX = 20 + (Math.random() - 0.5) * 5.5;
                p.targetZ = 14 + (Math.random() - 0.5) * 3.8;
                p.nextMoveTime = now + 3000 + Math.random() * 5000;
            }
        } else {
            const dx = p.targetX - mesh.position.x;
            const dz = p.targetZ - mesh.position.z;
            const angle = Math.atan2(dx, dz);
            mesh.rotation.y = angle;
            mesh.position.x += (dx / Math.hypot(dx, dz)) * 0.02;
            mesh.position.z += (dz / Math.hypot(dx, dz)) * 0.02;
            p.x = mesh.position.x;
            p.z = mesh.position.z;
        }
    });
}

// Mở Modal Quản lý Chuồng Vật Nuôi
function openAnimalPenModal(penType) {
    // Play only when entering a pen panel, not when refreshing it after an action.
    const animalPenModal = document.getElementById('modal-animal-pen');
    if ((!animalPenModal || animalPenModal.classList.contains('hidden')) && typeof playFarmSound === 'function') playFarmSound('ui');
    currentPenType = penType;
    const titleMap = { chicken: '🐥 Chuồng Gà', cow: '🐮 Chuồng Bò', pig: '🐷 Chuồng Heo' };
    const titleEl = document.getElementById('animal-pen-title');
    if (titleEl) titleEl.innerText = titleMap[penType] || '🏡 Quản Lý Chuồng';

    let arrayName = penType === 'chicken' ? 'chickens' : (penType === 'cow' ? 'cows' : 'pigs');
    const items = gameState[arrayName] || [];

    const level=Number((gameState.penLevels||{})[penType])||1; const capacity=2+(level-1)*2; const feedKey='feed_'+penType; const buyKey='buy_'+penType;
    const now = Date.now();
    const animalTiming = {
        chicken: { growTime: 300, cycleTime: 180 },
        cow: { growTime: 600, cycleTime: 360 },
        pig: { growTime: 900, cycleTime: 480 }
    }[penType];
    const readyToHarvest = items.filter(a => {
        if (a.sick || (a.hunger !== undefined && Number(a.hunger) <= 0)) return false;
        const ageSecs = (now - Number(a.bornAt || now)) / 1000;
        if (ageSecs < animalTiming.growTime) return false;
        if (penType === 'pig') return true;
        const lastTime = Math.max(Number(a.producedAt) || 0, Number(a.bornAt || now) + animalTiming.growTime * 1000);
        return (now - lastTime) / 1000 >= animalTiming.cycleTime && (Number(a.yieldCount) || 0) < 10;
    }).length;
    const feedCount = Number(gameState.inventory[feedKey]) || 0;
    const medicineCount = Number(gameState.inventory.medicine) || 0;
    const seedCount = Number(gameState.inventory[buyKey]) || 0;
    let text = `<div class="grid grid-cols-2 gap-2 mb-2"><div class="rounded-lg bg-white p-2 border"><b>🏡 Cấp chuồng ${level}/5</b><div class="text-[10px]">Sức chứa ${items.length}/${capacity}</div></div><div class="rounded-lg bg-white p-2 border"><b>📦 Kho hiện có</b><div class="text-[10px]">${feedCount} cám • ${seedCount} giống • ${medicineCount} thuốc</div><div class="text-[10px] mt-1">🧺 Có thể thu ngay: ${readyToHarvest}</div></div></div>`;
    let hungryCount = items.filter(a => a.hungry).length;
    let sickCount = items.filter(a => a.sick).length;
    if ((hungryCount > 0 || sickCount > 0) && typeof playFarmSound === 'function') playFarmSound(sickCount > 0 ? 'sick' : 'hungry');

    text += `Tình trạng: <span class="${hungryCount > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600'}">${hungryCount} con đói</span> | <span class="${sickCount > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}">${sickCount} con bệnh</span>`;
    const statusEl = document.getElementById('animal-pen-status');
    text += `<div class="mt-2 text-[10px]">Sức khỏe: ${items.length-hungryCount-sickCount} ổn • ${hungryCount} đói • ${sickCount} bệnh</div>`;
    if (statusEl) statusEl.innerHTML = text;
    const upgrade=document.getElementById('pen-upgrade-button'); if(upgrade){const cost=level*1000;upgrade.disabled=level>=5;upgrade.className=`w-full mt-2 py-2 rounded-xl text-xs font-black ${level>=5?'bg-slate-300 text-slate-500':'bg-violet-600 text-white'}`;upgrade.textContent=level>=5?'Chuồng đã tối đa cấp':`⬆️ Nâng cấp chuồng (+2 slot) — ${cost} 🪙`;upgrade.onclick=upgradeAnimalPen;}
    const counterLabels = {
        'pen-feed-count': `x${feedCount}`,
        'pen-seed-count': `x${seedCount}`,
        'pen-harvest-count': `x${readyToHarvest}`,
        'pen-medicine-count': `x${medicineCount}`
    };
    Object.entries(counterLabels).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value; });
    openModal('modal-animal-pen');
}

// Làm mới số lượng trên các nút mà không dựng lại nội dung modal mỗi giây.
function updateAnimalPenActionCounters() {
    const modal = document.getElementById('modal-animal-pen');
    if (!modal || modal.classList.contains('hidden') || !currentPenType) return;
    const arrayName = currentPenType === 'chicken' ? 'chickens' : (currentPenType === 'cow' ? 'cows' : 'pigs');
    const items = gameState[arrayName] || [];
    const timing = {
        chicken: { growTime: 300, cycleTime: 180 },
        cow: { growTime: 600, cycleTime: 360 },
        pig: { growTime: 900, cycleTime: 480 }
    }[currentPenType];
    const now = Date.now();
    const readyCount = items.filter(a => {
        if (a.sick || (a.hunger !== undefined && Number(a.hunger) <= 0)) return false;
        const bornAt = Number(a.bornAt) || now;
        if ((now - bornAt) / 1000 < timing.growTime) return false;
        if (currentPenType === 'pig') return true;
        const lastTime = Math.max(Number(a.producedAt) || 0, bornAt + timing.growTime * 1000);
        return (now - lastTime) / 1000 >= timing.cycleTime && (Number(a.yieldCount) || 0) < 10;
    }).length;
    const values = {
        'pen-feed-count': `x${Number(gameState.inventory['feed_' + currentPenType]) || 0}`,
        'pen-seed-count': `x${Number(gameState.inventory['buy_' + currentPenType]) || 0}`,
        'pen-harvest-count': `x${readyCount}`,
        'pen-medicine-count': `x${Number(gameState.inventory.medicine) || 0}`
    };
    Object.entries(values).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

// Thực thi Hành động trong Chuồng Gia Súc (ĐÃ FIX CHUẨN: HEO XUẤT CHUỒNG 1 LẦN & ĐỒNG BỘ HUNGER)
function executePenAction(action) {
    if (!currentPenType) return;
    let arrayName = currentPenType === 'chicken' ? 'chickens' : (currentPenType === 'cow' ? 'cows' : 'pigs');
    const items = gameState[arrayName] || [];

    if (action === 'feed') {
        const feedKey = 'feed_' + currentPenType;
        
        // Lọc các con có điểm hunger < 80 (cần ăn)
        const hungryList = items.filter(a => (a.hunger === undefined ? 100 : a.hunger) <= 40 || a.hungry);
        
        if (hungryList.length === 0) {
            showToast("Vật Nuôi Đã No 🌾", "Tất cả vật nuôi trong chuồng đều đang no căng bụng!", "ℹ️");
            return;
        }

        const currentFeedQty = gameState.inventory[feedKey] || 0;
        if (currentFeedQty < hungryList.length) {
            const feedInfo = getItemInfo(feedKey);
            showToast("Thiếu Thức Ăn! 🌾", `Bạn cần ${hungryList.length} ${feedInfo.name} (Đang có: ${currentFeedQty})!`, "❌");
            return;
        }

        if (checkAndDeductStamina(1)) {
            gameState.inventory[feedKey] -= hungryList.length;
            
            // RESET THANH NĂNG LƯỢNG VỀ 100
            hungryList.forEach(a => {
                a.hunger = 100;
                a.hungry = false;
                a.starvingStartAt = null;
            });

            if (typeof playFarmSound === 'function') playFarmSound('animal');
            showToast("Cho Ăn Thành Công! 🌾", `Đã dùng ${hungryList.length} ${getItemInfo(feedKey).name}. Tất cả đã no 100%!`, "✨");
            openAnimalPenModal(currentPenType);
            updateUI();
            saveGame();
        }
    } else if (action === 'heal') {
        const sickList = items.filter(a => a.sick);
        if (sickList.length === 0) {
            showToast("Không Có Bệnh 💊", "Tất cả vật nuôi hoàn toàn khỏe mạnh!", "ℹ️");
            return;
        }

        const currentMedQty = gameState.inventory.medicine || 0;
        if (currentMedQty < sickList.length) {
            showToast("Thiếu Thuốc! 💊", `Bạn cần ${sickList.length} Thuốc Thú Y (Đang có: ${currentMedQty})!`, "❌");
            return;
        }

        if (checkAndDeductStamina(1)) {
            gameState.inventory.medicine -= sickList.length;
            sickList.forEach(a => {
                a.sick = false;
                a.starvingStartAt = null;
            });
            if (typeof playFarmSound === 'function') playFarmSound('care');
            showToast("Chữa Bệnh Thành Công! 💊", `Đã chữa khỏi bệnh cho tất cả vật nuôi!`, "✨");
            openAnimalPenModal(currentPenType);
            updateUI();
            saveGame();
        }
    } else if (action === 'add') {
        const level=Number((gameState.penLevels||{})[currentPenType])||1; const capacity=2+(level-1)*2;
        if(items.length>=capacity){showToast('Chuồng đã đầy 🏡',`Chuồng cấp ${level} chứa tối đa ${capacity} con. Hãy nâng cấp chuồng.`,'ℹ️');return;}
        const buyKey = 'buy_' + currentPenType;
        if ((gameState.inventory[buyKey] || 0) <= 0) {
            showToast("Hết Con Giống! 🐥", "Hãy ghé Cửa Hàng mua con giống mới!", "❌");
            return;
        }
        if (checkAndDeductStamina(1)) {
            gameState.inventory[buyKey] -= 1;
            const posX = currentPenType === 'chicken' ? -20 : (currentPenType === 'cow' ? -20 : 20);
            const posZ = currentPenType === 'chicken' ? -18 : (currentPenType === 'cow' ? 10 : 14);

            items.push({
                id: Date.now(),
                bornAt: Date.now(),
                yieldCount: 0,
                hunger: 100,
                hungry: false,
                sick: false,
                starvingStartAt: null,
                lastSickDay: 0,
                producedAt: Date.now() + ((currentPenType === 'chicken' ? 300 : currentPenType === 'cow' ? 600 : 900) * 1000),
                x: posX,
                z: posZ
            });
            updateAnimalPen3DMeshes(currentPenType);
            showToast("Thả Con Giống! 🐣", "Đã thả con giống mới vào chuồng!", "🎉");
            openAnimalPenModal(currentPenType);
            updateUI();
            saveGame();
        }
    } else if (action === 'harvest') {
        const now = Date.now();

        const configMap = {
            chicken: { growTime: 300, cycleTime: 180, prodKey: 'egg', meatKey: 'chicken_meat', name: 'Trứng Gà', meatName: 'Thịt Gà' },
            cow: { growTime: 600, cycleTime: 360, prodKey: 'milk', meatKey: 'beef_meat', name: 'Sữa Bò', meatName: 'Thịt Bò' },
            pig: { growTime: 900, cycleTime: 480, prodKey: 'pork', meatKey: 'pork', name: 'Thịt Heo Tươi', meatName: 'Thịt Heo Tươi' }
        };

        const cfg = configMap[currentPenType];

        // 🟢 FIX RIÊNG LOGIC HEO: LỚN ĐỦ 15 PHÚT -> THU HOẠCH THỊT & XUẤT CHUỒNG LỜI LẠI 1 LẦN
        if (currentPenType === 'pig') {
            const readyPigs = items.filter(p => !p.sick && (p.hunger === undefined || p.hunger > 0) && ((now - p.bornAt) / 1000) >= cfg.growTime);

            if (readyPigs.length > 0) {
                if (checkAndDeductStamina(2)) {
                    // Giữ lại những con heo chưa lớn hoặc đang bệnh/đói
                    const remainingPigs = items.filter(p => p.sick || (p.hunger !== undefined && p.hunger <= 0) || ((now - p.bornAt) / 1000) < cfg.growTime);
                    const pigYieldCount = readyPigs.length;
                    if (!gameState.statistics || typeof gameState.statistics !== 'object') gameState.statistics = { animalsSold: 0, mealsCooked: 0, playTimeSeconds: 0, animalSicknessEvents: 0, cropsPlanted: 0 };
                    gameState.statistics.animalsSold = (Number(gameState.statistics.animalsSold) || 0) + pigYieldCount;

                    gameState.inventory['pork'] = (gameState.inventory['pork'] || 0) + pigYieldCount;
                    addExp(pigYieldCount * 30);

                    gameState.pigs = remainingPigs;
                    updateAnimalPen3DMeshes('pig');

                    showToast("Xuất Chuồng Heo! 🥩", `Đã thu hoạch ${pigYieldCount} Thịt Heo Tươi và xuất chuồng thành công!`, "🎉", 4000);
                    openAnimalPenModal('pig');
                    updateUI();
                    saveGame();
                }
            } else {
                showToast("Chưa Thể Xuất Chuồng ⏳", "Heo chưa đủ lớn (15 phút) hoặc đang bị đói/bệnh!", "ℹ️");
            }
        } 
        // 🟡 LOGIC CHO GÀ VÀ BÒ: THU HOẠCH SẢN PHẨM NHIỀU LẦN (ĐỦ 10 LẦN MỚI XUẤT CHUỒNG)
        else {
            let harvestedProdCount = 0;
            let retiredCount = 0;

            items.forEach(a => {
                if (a.sick || (a.hunger !== undefined && a.hunger <= 0)) return;

                const ageSecs = (now - a.bornAt) / 1000;
                if (ageSecs < cfg.growTime) return;

                const lastTime = Math.max(Number(a.producedAt) || 0, a.bornAt + cfg.growTime * 1000);
                const elapsed = (now - lastTime) / 1000;

                if (elapsed >= cfg.cycleTime && (a.yieldCount || 0) < 10) {
                    a.yieldCount = (a.yieldCount || 0) + 1;
                    a.producedAt = now;
                    harvestedProdCount++;
                }
            });

            if (harvestedProdCount > 0) {
                if (checkAndDeductStamina(2)) {
                    gameState.inventory[cfg.prodKey] = (gameState.inventory[cfg.prodKey] || 0) + harvestedProdCount;
                    addExp(harvestedProdCount * 20);

                    const remaining = [];
                    items.forEach(a => {
                        if ((a.yieldCount || 0) >= 10) {
                            retiredCount++;
                            gameState.inventory[cfg.meatKey] = (gameState.inventory[cfg.meatKey] || 0) + 1;
                        } else {
                            remaining.push(a);
                        }
                    });

                    if (currentPenType === 'chicken') gameState.chickens = remaining;
                    else if (currentPenType === 'cow') gameState.cows = remaining;

                    updateAnimalPen3DMeshes(currentPenType);

                    if (retiredCount > 0) {
                        if (typeof playFarmSound === 'function') playFarmSound('animal-harvest');
                        if (!gameState.statistics || typeof gameState.statistics !== 'object') gameState.statistics = { animalsSold: 0, mealsCooked: 0, playTimeSeconds: 0, animalSicknessEvents: 0, cropsPlanted: 0 };
                        gameState.statistics.animalsSold = (Number(gameState.statistics.animalsSold) || 0) + retiredCount;
                        showToast("Thu Hoạch & Xuất Chuồng! 🧺", `Thu được ${harvestedProdCount} ${cfg.name}. Có ${retiredCount} con đã cho đủ 10 lần sản phẩm và xuất chuồng!`, "🎉", 4000);
                    } else {
                        if (typeof playFarmSound === 'function') playFarmSound('animal-harvest');
                        showToast("Thu Hoạch Sản Phẩm! 🧺", `Thu được ${harvestedProdCount} ${cfg.name}!`, "✨");
                    }

                    openAnimalPenModal(currentPenType);
                    updateUI();
                    saveGame();
                }
            } else {
                showToast("Chưa Có Sản Phẩm ⏳", "Vật nuôi đang lớn, chưa tới giờ cho sản phẩm hoặc đang quá đói!", "ℹ️");
            }
        }
    }
}

function upgradeAnimalPen(){if(!currentPenType)return;const levels=gameState.penLevels||(gameState.penLevels={chicken:1,cow:1,pig:1});const lvl=Number(levels[currentPenType])||1;if(lvl>=5){showToast('Chuồng đã tối đa','Chuồng đã đạt cấp 5.','ℹ️');return;}const cost=lvl*1000;if(gameState.gold<cost){showToast('Thiếu vàng',`Cần ${cost} vàng để nâng cấp chuồng.`,'❌');return;}gameState.gold-=cost;levels[currentPenType]=lvl+1;const fence=animalPenFenceMeshes[currentPenType];if(fence){const scale=1+(levels[currentPenType]-1)*0.12;fence.scale.set(scale,1,scale);}updateUI();saveGame();openAnimalPenModal(currentPenType);showToast('Nâng cấp chuồng thành công',`Chuồng ${currentPenType} lên cấp ${lvl+1}, sức chứa ${2+lvl*2} con.`,'✨');}
