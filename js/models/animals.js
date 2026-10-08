let chickenMeshes = [], cowMeshes = [], pigMeshes = [];
let currentPenType = null;

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
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), bodyMat);
    body.scale.set(0.8, 0.9, 1.1);
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);

    const wingMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.7 });
    const leftWing = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), wingMat);
    leftWing.position.set(-0.2, 0.36, 0);
    leftWing.scale.set(0.3, 0.8, 1.2);
    leftWing.rotation.z = -0.2;
    group.add(leftWing);

    const rightWing = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), wingMat);
    rightWing.position.set(0.2, 0.36, 0);
    rightWing.scale.set(0.3, 0.8, 1.2);
    rightWing.rotation.z = 0.2;
    group.add(rightWing);

    const tailMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    for (let i = -1; i <= 1; i++) {
        const feather = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 5), tailMat);
        feather.position.set(i * 0.05, 0.45, -0.25);
        feather.rotation.x = -0.8;
        feather.rotation.y = i * 0.2;
        group.add(feather);
    }

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), bodyMat);
    head.position.set(0, 0.52, 0.22);
    head.castShadow = true;
    group.add(head);

    const combMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    for (let c = 0; c < 3; c++) {
        const combPart = new THREE.Mesh(new THREE.SphereGeometry(0.04 + c * 0.01, 8, 8), combMat);
        combPart.position.set(0, 0.68 + c * 0.01, 0.20 + (c - 1) * 0.04);
        group.add(combPart);
    }

    const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), combMat);
    wattle.position.set(0, 0.44, 0.34);
    group.add(wattle);

    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 6), beakMat);
    beak.position.set(0, 0.50, 0.36);
    beak.rotation.x = Math.PI / 2;
    group.add(beak);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
    lEye.position.set(-0.11, 0.54, 0.30);
    group.add(lEye);

    const rEye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
    rEye.position.set(0.11, 0.54, 0.30);
    group.add(rEye);

    const legMat = beakMat;
    [-0.08, 0.08].forEach(x => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2), legMat);
        leg.position.set(x, 0.1, 0);
        group.add(leg);

        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.1), legMat);
        foot.position.set(x, 0.01, 0.03);
        group.add(foot);
    });

    group.position.set(data.x, 0, data.z);
    group.userData = { type: 'chicken_pen' };
    scene.add(group);
    return group;
}

// Tạo Model 3D Con Bò
function createCowModel(data) {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    const spotMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 1.4), bodyMat);
    body.position.y = 0.85;
    body.castShadow = true;
    group.add(body);

    const spot1 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), spotMat);
    spot1.position.set(0.42, 0.95, 0.2);
    spot1.scale.set(0.2, 0.8, 1.0);
    group.add(spot1);

    const spot2 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), spotMat);
    spot2.position.set(-0.42, 0.8, -0.3);
    spot2.scale.set(0.2, 0.7, 0.9);
    group.add(spot2);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.55), bodyMat);
    head.position.set(0, 1.25, 0.75);
    head.castShadow = true;
    group.add(head);

    const snoutMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.6 });
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.25, 0.25), snoutMat);
    snout.position.set(0, 1.12, 1.02);
    group.add(snout);

    const nostrilMat = new THREE.MeshBasicMaterial({ color: 0x831843 });
    [-0.12, 0.12].forEach(nx => {
        const n = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), nostrilMat);
        n.position.set(nx, 1.14, 1.15);
        group.add(n);
    });

    const hornMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });
    [-0.24, 0.24].forEach(hx => {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 8), hornMat);
        horn.position.set(hx, 1.58, 0.75);
        horn.rotation.z = hx > 0 ? -0.3 : 0.3;
        group.add(horn);
    });

    [-0.28, 0.28].forEach(ex => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.1), bodyMat);
        ear.position.set(ex, 1.42, 0.72);
        ear.rotation.z = ex > 0 ? -0.2 : 0.2;
        group.add(ear);
    });

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-0.18, 0.18].forEach(ex => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
        eye.position.set(ex, 1.32, 1.0);
        group.add(eye);

        const shine = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), shineMat);
        shine.position.set(ex + 0.01, 1.33, 1.03);
        group.add(shine);
    });

    const udder = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), snoutMat);
    udder.position.set(0, 0.52, -0.1);
    udder.scale.set(1, 0.6, 1.2);
    group.add(udder);

    const legMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
    const hoofMat = spotMat;

    const legPositions = [
        { x: -0.32, z: 0.45 }, { x: 0.32, z: 0.45 },
        { x: -0.32, z: -0.45 }, { x: 0.32, z: -0.45 }
    ];

    legPositions.forEach(p => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.5), legMat);
        leg.position.set(p.x, 0.25, p.z);
        leg.castShadow = true;
        group.add(leg);

        const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), hoofMat);
        hoof.position.set(p.x, 0.04, p.z);
        group.add(hoof);
    });

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5), spotMat);
    tail.position.set(0, 0.8, -0.72);
    tail.rotation.x = 0.2;
    group.add(tail);

    group.position.set(data.x, 0, data.z);
    group.userData = { type: 'cow_barn' };
    scene.add(group);
    return group;
}

// Tạo Model 3D Con Heo
function createPigModel(data) {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 16), bodyMat);
    body.scale.set(0.9, 0.85, 1.2);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 14), bodyMat);
    head.position.set(0, 0.65, 0.45);
    head.castShadow = true;
    group.add(head);

    const snoutMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), snoutMat);
    snout.position.set(0, 0.60, 0.80);
    snout.rotation.x = Math.PI / 2;
    group.add(snout);

    const nostrilMat = new THREE.MeshBasicMaterial({ color: 0x881337 });
    [-0.05, 0.05].forEach(nx => {
        const n = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), nostrilMat);
        n.position.set(nx, 0.60, 0.84);
        group.add(n);
    });

    [-0.22, 0.22].forEach(ex => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 4), bodyMat);
        ear.position.set(ex, 0.88, 0.50);
        ear.rotation.z = ex > 0 ? -0.5 : 0.5;
        ear.rotation.x = 0.3;
        group.add(ear);
    });

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e1b4b });
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-0.15, 0.15].forEach(ex => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMat);
        eye.position.set(ex, 0.72, 0.72);
        group.add(eye);

        const shine = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), shineMat);
        shine.position.set(ex + 0.01, 0.73, 0.75);
        group.add(shine);
    });

    const tailMat = snoutMat;
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 12, Math.PI * 1.5), tailMat);
    tail.position.set(0, 0.6, -0.6);
    tail.rotation.y = Math.PI / 2;
    group.add(tail);

    const hoofMat = snoutMat;
    const legPositions = [
        { x: -0.22, z: 0.3 }, { x: 0.22, z: 0.3 },
        { x: -0.22, z: -0.3 }, { x: 0.22, z: -0.3 }
    ];

    legPositions.forEach(p => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.25), bodyMat);
        leg.position.set(p.x, 0.14, p.z);
        leg.castShadow = true;
        group.add(leg);

        const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.05), hoofMat);
        hoof.position.set(p.x, 0.02, p.z);
        group.add(hoof);
    });

    group.position.set(data.x, 0, data.z);
    group.userData = { type: 'pig_pen' };
    scene.add(group);
    return group;
}

function buildChickenPen() {
    buildPenFence(-20, -18, 8, 6, 'front');
    updateAnimalPen3DMeshes('chicken');
}

function buildCowBarn() {
    buildPenFence(-20, 10, 9, 7, 'front');
    updateAnimalPen3DMeshes('cow');
}

function buildPigPen() {
    buildPenFence(20, 14, 8, 6, 'front');
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
    currentPenType = penType;
    const titleMap = { chicken: '🐥 Chuồng Gà', cow: '🐮 Chuồng Bò', pig: '🐷 Chuồng Heo' };
    const titleEl = document.getElementById('animal-pen-title');
    if (titleEl) titleEl.innerText = titleMap[penType] || '🏡 Quản Lý Chuồng';

    let arrayName = penType === 'chicken' ? 'chickens' : (penType === 'cow' ? 'cows' : 'pigs');
    const items = gameState[arrayName] || [];

    let text = `Số lượng vật nuôi: <b>${items.length}</b><br>`;
    let hungryCount = items.filter(a => a.hungry).length;
    let sickCount = items.filter(a => a.sick).length;

    text += `Tình trạng: <span class="${hungryCount > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600'}">${hungryCount} con đói</span> | <span class="${sickCount > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}">${sickCount} con bệnh</span>`;
    const statusEl = document.getElementById('animal-pen-status');
    if (statusEl) statusEl.innerHTML = text;

    openModal('modal-animal-pen');
}

// Thực thi Hành động trong Chuồng Gia Súc (Đã FIX cơ chế Thanh Năng Lượng Hunger)
function executePenAction(action) {
    if (!currentPenType) return;
    let arrayName = currentPenType === 'chicken' ? 'chickens' : (currentPenType === 'cow' ? 'cows' : 'pigs');
    const items = gameState[arrayName] || [];

    if (action === 'feed') {
        const feedKey = 'feed_' + currentPenType;
        
        // Lọc ra các con có điểm hunger < 80 (cần ăn)
        const hungryList = items.filter(a => (a.hunger === undefined ? 100 : a.hunger) < 80 || a.hungry);
        
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
                a.starvingStartAt = null; // Xóa đếm giờ nhịn đói
            });

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
            showToast("Chữa Bệnh Thành Công! 💊", `Đã chữa khỏi bệnh cho tất cả vật nuôi!`, "✨");
            openAnimalPenModal(currentPenType);
            updateUI();
            saveGame();
        }
    } else if (action === 'add') {
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
                hunger: 100, // Khởi tạo năng lượng đầy đủ cho con giống mới
                hungry: false,
                sick: false,
                starvingStartAt: null,
                lastSickDay: 0,
                producedAt: Date.now(),
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
            pig: { growTime: 900, cycleTime: 480, prodKey: 'pork', meatKey: 'pork', name: 'Thịt Heo', meatName: 'Thịt Heo Tươi' }
        };

        const cfg = configMap[currentPenType];
        let harvestedProdCount = 0;
        let retiredCount = 0;

        items.forEach(a => {
            // Đang bệnh hoặc đói kiệt sức (hunger <= 0) thì dừng sản xuất
            if (a.sick || (a.hunger !== undefined && a.hunger <= 0)) return;

            const ageSecs = (now - a.bornAt) / 1000;
            if (ageSecs < cfg.growTime) return;

            const lastTime = a.producedAt || (a.bornAt + cfg.growTime * 1000);
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
                else if (currentPenType === 'pig') gameState.pigs = remaining;

                updateAnimalPen3DMeshes(currentPenType);

                if (retiredCount > 0) {
                    showToast("Thu Hoạch & Xuất Chuồng! 🧺", `Thu được ${harvestedProdCount} ${cfg.name}. Có ${retiredCount} con đẻ đủ 10 lần đã xuất chuồng!`, "🎉", 4000);
                } else {
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
