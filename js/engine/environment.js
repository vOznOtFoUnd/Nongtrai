
// Kiểm tra vị trí trống để đặt vật thể trang trí
function isLocationFree(x, z) {
    if (x > -15 && x < 8 && z > -12 && z < 13) return false;
    if (x > -26 && x < -14 && z > -23 && z < -13) return false;
    if (x > -26 && x < -14 && z > 5 && z < 15) return false;
    if (x > 14 && x < 26 && z > 9 && z < 19) return false;
    if (x > -7 && x < 7 && z > -26 && z < -14) return false;
    if (x > 6 && x < 32 && z > -28 && z < -12) return false; // Đường đua ngựa
    if (x > -10 && x < 10 && z > 13 && z < 27) return false; // Ao cá
    if (x > 23 && x < 31 && z > -2 && z < 6) return false; // Xe hàng
    if (x > 23 && x < 31 && z > 17 && z < 25) return false; // Bầu cua
    if (x > 4 && x < 15 && z > 4 && z < 15) return false;
    if (Math.abs(x) > 31 || Math.abs(z) > 31) return false;
    return true;
}

// Xây dựng trang trí môi trường (Mặt trời, Núi 2D Panorama, Mây, Cỏ, Đá)
let farmClouds = [];
let farmGrassPatches = [];
let farmWindStreaks = [];
let farmWindParticles = [];
let farmWindLastTime = 0;
let farmWindNextChange = 0;
let farmWindGustUntil = 0;
const farmWind = { angle: 0.35, targetAngle: 0.35, strength: 0.24, targetStrength: 0.24, gustStrength: 0 };


// UPGRADE 41 — Chibi Environment Foundation
// Decorative-only layer: never receives gameplay raycasts and never changes
// crop/plot positions, collision zones, save data, or gameplay state.
let farmGroundDetails = [];

function addNonBlockingMesh(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.raycast = () => {};
    mesh.userData = Object.assign({}, mesh.userData, { decorative: true, nonBlocking: true });
    scene.add(mesh);
    farmGroundDetails.push(mesh);
    return mesh;
}

function createChibiPebbleCluster(x, z, scale = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    const mats = [
        new THREE.MeshStandardMaterial({ color: 0x8b8176, roughness: 0.95 }),
        new THREE.MeshStandardMaterial({ color: 0xa79b8c, roughness: 0.95 }),
        new THREE.MeshStandardMaterial({ color: 0x6f665d, roughness: 0.98 })
    ];
    const sizes = [
        [0.18, 0.09, 0.15], [0.13, 0.07, 0.11], [0.10, 0.06, 0.09]
    ];
    sizes.forEach((size, i) => {
        const pebble = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mats[i]);
        pebble.position.set((i - 1) * 0.16, size[1] * 0.72, (i % 2) * 0.10 - 0.05);
        pebble.scale.set(size[0], size[1], size[2]);
        pebble.rotation.set(0.2 + i * 0.3, i * 0.7, 0.15 - i * 0.12);
        group.add(pebble);
    });
    group.traverse(obj => { if (obj.isMesh) obj.raycast = () => {}; });
    scene.add(group);
    farmGroundDetails.push(group);
    return group;
}

function createChibiGrassClump(x, z, scale = 1, flower = false) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    const grassMats = [
        new THREE.MeshStandardMaterial({ color: 0x55a85a, roughness: 0.88 }),
        new THREE.MeshStandardMaterial({ color: 0x78bd63, roughness: 0.86 }),
        new THREE.MeshStandardMaterial({ color: 0x3f8f4e, roughness: 0.9 })
    ];
    for (let i = 0; i < 5; i++) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.30 + (i % 3) * 0.06, 5), grassMats[i % grassMats.length]);
        const a = (i / 5) * Math.PI * 2;
        blade.position.set(Math.cos(a) * 0.055, 0.16 + (i % 2) * 0.025, Math.sin(a) * 0.055);
        blade.rotation.z = Math.cos(a) * 0.22;
        blade.rotation.x = Math.sin(a) * 0.16;
        group.add(blade);
    }
    if (flower) {
        const center = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 7, 5),
            new THREE.MeshStandardMaterial({ color: 0xf6c453, roughness: 0.7 })
        );
        center.position.y = 0.42;
        group.add(center);
        const petalMat = new THREE.MeshStandardMaterial({ color: [0xf7a8c4, 0xf8d36b, 0xb8a5f5][Math.floor(Math.random() * 3)], roughness: 0.76 });
        for (let i = 0; i < 4; i++) {
            const petal = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 5), petalMat);
            const a = i * Math.PI / 2;
            petal.position.set(Math.cos(a) * 0.075, 0.42, Math.sin(a) * 0.075);
            petal.scale.set(0.85, 0.42, 0.85);
            group.add(petal);
        }
    }
    group.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.raycast = () => {}; } });
    scene.add(group);
    farmGroundDetails.push(group);
    return group;
}

function createGroundEdgeTuft(x, z, rotation = 0, scale = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    group.scale.setScalar(scale);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6daf5c, roughness: 0.9 });
    for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.55 + i * 0.04, 5), mat);
        blade.position.set((i - 1.5) * 0.13, 0.27, (i % 2 ? 0.05 : -0.04));
        blade.rotation.z = (i - 1.5) * 0.14;
        group.add(blade);
    }
    group.traverse(obj => { if (obj.isMesh) obj.raycast = () => {}; });
    scene.add(group);
    farmGroundDetails.push(group);
    return group;
}

function buildChibiGroundDetails() {
    farmGroundDetails.forEach(obj => { if (obj && obj.parent) obj.parent.remove(obj); });
    farmGroundDetails = [];

    // Soft decorative meadow patches stay well outside the crop grid and interactable zones.
    const grassSpots = [
        [-28, -18, 1.0], [-27, 10, 0.9], [-22, 28, 1.05], [-7, 29, 0.85],
        [9, 29, 0.95], [24, 28, 1.05], [29, 12, 0.9], [29, -8, 1.0],
        [27, -27, 0.9], [10, -29, 0.85], [-5, -29, 1.0], [-27, -29, 0.95],
        [-31, -2, 0.9], [30, 2, 0.85], [-22, 17, 0.8], [22, 15, 0.9]
    ];
    grassSpots.forEach(([x, z, s], i) => createChibiGrassClump(x, z, s, i % 3 === 0));

    // A few small clusters create a hand-placed, non-uniform silhouette around the island.
    const pebbleSpots = [
        [-31, -20, 1.1], [-30, 22, 0.9], [-18, 30, 0.85], [18, 30, 1.0],
        [31, 21, 0.85], [31, -20, 1.0], [18, -31, 0.9], [-17, -31, 1.0],
        [-32, 8, 0.8], [32, 7, 0.8], [25, 31, 0.7], [-25, 31, 0.75]
    ];
    pebbleSpots.forEach(([x, z, s]) => createChibiPebbleCluster(x, z, s));

    // Taller grass at selected island edges gives the flat ground a softer chibi silhouette.
    [
        [-33.0, -14, 0.0, 0.9], [-33.0, 12, 0.1, 0.85], [33.0, -13, Math.PI, 0.9],
        [33.0, 12, Math.PI, 0.85], [-14, 33.0, Math.PI / 2, 0.8], [13, 33.0, Math.PI / 2, 0.9],
        [-14, -33.0, -Math.PI / 2, 0.85], [13, -33.0, -Math.PI / 2, 0.8]
    ].forEach(([x, z, r, s]) => createGroundEdgeTuft(x, z, r, s));
}

function buildEnvironmentDecorations() {
    // 1. Mặt trời
    const sunGeo = new THREE.SphereGeometry(3.5, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(30, 42, -35);
    scene.add(sunMesh);

    // 2. Tấm Panorama núi xa xăm bằng Canvas 2D
    const mountainTextureCanvas = document.createElement('canvas');
    mountainTextureCanvas.width = 1024;
    mountainTextureCanvas.height = 256;
    const ctx = mountainTextureCanvas.getContext('2d');

    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 1024, 256);
    
    ctx.fillStyle = '#2d4a3e';
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(0, 120);
    for (let x = 0; x <= 1024; x += 60) {
        ctx.lineTo(x, 80 + Math.sin(x * 0.01) * 40 + Math.cos(x * 0.03) * 20);
    }
    ctx.lineTo(1024, 256);
    ctx.fill();

    ctx.fillStyle = '#1e332a';
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(0, 160);
    for (let x = 0; x <= 1024; x += 50) {
        ctx.lineTo(x, 130 + Math.cos(x * 0.02) * 35);
    }
    ctx.lineTo(1024, 256);
    ctx.fill();

    const mountainTexture = new THREE.CanvasTexture(mountainTextureCanvas);
    mountainTexture.wrapS = THREE.RepeatWrapping;
    mountainTexture.wrapT = THREE.ClampToEdgeWrapping;

    const mountainMat = new THREE.MeshBasicMaterial({
        map: mountainTexture,
        transparent: true,
        side: THREE.DoubleSide
    });

    const mtnWidth = 120;
    const mtnHeight = 30;
    const mtnDistance = 55;

    const directions = [
        { x: 0, z: -mtnDistance, rotY: 0 },
        { x: 0, z: mtnDistance, rotY: Math.PI },
        { x: -mtnDistance, z: 0, rotY: Math.PI / 2 },
        { x: mtnDistance, z: 0, rotY: -Math.PI / 2 }
    ];

    directions.forEach(d => {
        const mtnPlane = new THREE.Mesh(new THREE.PlaneGeometry(mtnWidth, mtnHeight), mountainMat);
        mtnPlane.position.set(d.x, mtnHeight / 2 - 2, d.z);
        mtnPlane.rotation.y = d.rotY;
        scene.add(mtnPlane);
    });

    // 3. Mây trắng
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.88 });
    const cloudPositions = [
        { x: -25, y: 24, z: -15 }, { x: 15, y: 28, z: -25 }, { x: 30, y: 22, z: 10 },
        { x: -30, y: 26, z: 20 }, { x: 0, y: 30, z: -30 }, { x: 22, y: 25, z: 25 }
    ];

    farmClouds = [];
    cloudPositions.forEach(p => {
        const group = new THREE.Group();
        group.position.set(p.x, p.y, p.z);
        for (let c = 0; c < 5; c++) {
            const cloudPart = new THREE.Mesh(
                new THREE.DodecahedronGeometry(2 + Math.random() * 1.5),
                cloudMat
            );
            cloudPart.position.set(
                (c - 2) * 1.8,
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 1.2
            );
            group.add(cloudPart);
        }
        scene.add(group);
        farmClouds.push({ mesh: group, baseY: p.y, phase: Math.random() * Math.PI * 2 });
    });

    // 4. Cỏ dại & Đá
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.8 });
    farmGrassPatches = [];
    for (let g = 0; g < 48; g++) {
        const rx = (Math.random() - 0.5) * 50;
        const rz = (Math.random() - 0.5) * 50;
        if (isLocationFree(rx, rz)) {
            const grassGroup = new THREE.Group();
            grassGroup.position.set(rx, 0, rz);
            for (let b = 0; b < 3; b++) {
                const blade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4 + Math.random() * 0.2, 4), grassMat);
                blade.position.set((b - 1) * 0.08, 0.2, (Math.random() - 0.5) * 0.08);
                blade.rotation.z = (b - 1) * 0.2;
                grassGroup.add(blade);
            }
            scene.add(grassGroup);
            farmGrassPatches.push({ mesh: grassGroup, phase: Math.random() * Math.PI * 2, baseRotX: grassGroup.rotation.x, baseRotZ: grassGroup.rotation.z });
        }
    }

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    for (let r = 0; r < 24; r++) {
        const rx = (Math.random() - 0.5) * 50;
        const rz = (Math.random() - 0.5) * 50;
        if (isLocationFree(rx, rz)) {
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + Math.random() * 0.25), rockMat);
            rock.position.set(rx, 0.15, rz);
            rock.scale.set(1.2, 0.7, 1.0);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            scene.add(rock);
        }
    }
}

// Xây dựng mặt đảo nông trại & Dòng sông Fake bằng 2D Canvas Texture (Tối ưu performance)

// Cây thông chibi và chim trang trí; mesh trang trí không chặn raycast điều khiển.
let farmBirds = [];
let farmBirdTrees = [];
let farmBirdDestinations = [];
function makeNonBlockingDecoration(group) {
    group.traverse(obj => { if (obj.isMesh) obj.raycast = () => {}; });
    return group;
}
// Hệ thống gió dùng chung cho mây, cây cỏ, hạt lá/cánh hoa và chim.
// Tất cả hạt được tạo một lần rồi tái sử dụng để tránh cấp phát liên tục mỗi frame.
function buildFarmWindEffects() {
    farmWindStreaks = [];
    farmWindParticles = [];
    const streakMat = new THREE.LineBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.22, depthWrite: false });
    for (let i = 0; i < 5; i++) {
        const points = [new THREE.Vector3(-1.2, 0, 0), new THREE.Vector3(-0.4, 0.05, 0.08), new THREE.Vector3(0.45, 0.02, 0.02), new THREE.Vector3(1.2, 0, 0)];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, streakMat);
        line.position.set((Math.random() - 0.5) * 48, 0.18 + Math.random() * 1.4, (Math.random() - 0.5) * 48);
        line.rotation.y = farmWind.angle;
        line.userData = { phase: Math.random() * Math.PI * 2, speed: 1.6 + Math.random() * 1.0 };
        makeNonBlockingDecoration(line);
        scene.add(line);
        farmWindStreaks.push(line);
    }

    const leafGeo = new THREE.SphereGeometry(0.11, 6, 4);
    const petalGeo = new THREE.SphereGeometry(0.085, 6, 4);
    const leafMats = [
        new THREE.MeshBasicMaterial({ color: 0x86a85a, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
        new THREE.MeshBasicMaterial({ color: 0xb5c96a, transparent: true, opacity: 0.88, side: THREE.DoubleSide }),
        new THREE.MeshBasicMaterial({ color: 0xf9a8d4, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
        new THREE.MeshBasicMaterial({ color: 0xffd6a5, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    ];
    for (let i = 0; i < 12; i++) {
        const petal = i >= 8;
        const mesh = new THREE.Mesh(petal ? petalGeo : leafGeo, leafMats[petal ? 2 + (i % 2) : i % 2]);
        mesh.scale.set(petal ? 1.25 : 1.8, 0.35, 0.72);
        mesh.position.set((Math.random() - 0.5) * 48, 0.25 + Math.random() * 2.1, (Math.random() - 0.5) * 48);
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        mesh.userData = { phase: Math.random() * Math.PI * 2, speed: 0.7 + Math.random() * 1.15, flutter: 1.2 + Math.random() * 2.5, fall: 0.08 + Math.random() * 0.12 };
        makeNonBlockingDecoration(mesh);
        scene.add(mesh);
        farmWindParticles.push(mesh);
    }
    farmWindLastTime = 0;
    farmWindNextChange = 0;
    farmWindGustUntil = 0;
}

function updateFarmWindEffects() {
    const now = performance.now() * 0.001;
    const dt = farmWindLastTime ? Math.min(0.05, Math.max(0, now - farmWindLastTime)) : 0.016;
    farmWindLastTime = now;
    if (now >= farmWindNextChange) {
        farmWind.targetAngle += (Math.random() - 0.5) * 1.1;
        farmWind.targetStrength = 0.16 + Math.random() * 0.2;
        farmWindNextChange = now + 7 + Math.random() * 8;
        if (now > farmWindGustUntil && Math.random() < 0.42) {
            farmWindGustUntil = now + 2.5 + Math.random() * 2.5;
            farmWind.gustStrength = 0.28 + Math.random() * 0.18;
        }
    }
    const gust = now < farmWindGustUntil ? farmWind.gustStrength : 0;
    const desiredStrength = Math.min(0.72, farmWind.targetStrength + gust);
    farmWind.strength += (desiredStrength - farmWind.strength) * Math.min(1, dt * 0.65);
    let angleDelta = ((farmWind.targetAngle - farmWind.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    farmWind.angle += angleDelta * Math.min(1, dt * 0.24);
    const windX = Math.cos(farmWind.angle), windZ = Math.sin(farmWind.angle);
    const intensity = farmWind.strength;

    // Mây trôi chậm theo cùng hướng gió; wrap-around để không cần tạo mây mới.
    farmClouds.forEach((cloud, i) => {
        const mesh = cloud.mesh;
        mesh.position.x += windX * (0.08 + intensity * 0.16) * dt;
        mesh.position.z += windZ * (0.08 + intensity * 0.16) * dt;
        mesh.position.y = cloud.baseY + Math.sin(now * 0.18 + cloud.phase) * 0.12;
        if (mesh.position.x > 38) mesh.position.x = -38;
        if (mesh.position.x < -38) mesh.position.x = 38;
        if (mesh.position.z > 38) mesh.position.z = -38;
        if (mesh.position.z < -38) mesh.position.z = 38;
    });

    // Cây thông và bụi cỏ nghiêng rất nhẹ, với độ lệch pha riêng cho từng cụm.
    farmBirdTrees.forEach((tree, i) => {
        const sway = Math.sin(now * (1.15 + intensity) + i * 1.7) * (0.012 + intensity * 0.035);
        tree.mesh.rotation.z = sway * (0.65 + Math.abs(windX) * 0.6);
        tree.mesh.rotation.x = Math.cos(now * 0.9 + i * 1.3) * (0.008 + intensity * 0.018) * windZ;
    });
    farmGrassPatches.forEach((patch, i) => {
        patch.mesh.rotation.z = Math.sin(now * 2.2 + patch.phase) * (0.025 + intensity * 0.055) * (0.5 + Math.abs(windX));
        patch.mesh.rotation.x = Math.cos(now * 1.8 + patch.phase) * (0.012 + intensity * 0.025) * windZ;
    });

    // Luồng gió mờ chạy ngang mặt đất, xuất hiện rõ hơn khi có cơn gió mạnh.
    farmWindStreaks.forEach((line, i) => {
        line.rotation.y = farmWind.angle;
        line.position.x += windX * line.userData.speed * (0.35 + intensity) * dt;
        line.position.z += windZ * line.userData.speed * (0.35 + intensity) * dt;
        line.position.y = 0.18 + (i % 4) * 0.32 + Math.sin(now * 2 + line.userData.phase) * 0.08;
        const mat = line.material;
        mat.opacity = 0.06 + intensity * 0.28 + (now < farmWindGustUntil ? 0.07 : 0);
        if (line.position.x > 34 || line.position.x < -34 || line.position.z > 34 || line.position.z < -34) {
            line.position.x = -windX * 31 + (Math.random() - 0.5) * 10;
            line.position.z = -windZ * 31 + (Math.random() - 0.5) * 10;
        }
    });

    // Lá và cánh hoa tái sử dụng, lượn nhẹ theo gió rồi được đưa trở lại rìa bản đồ.
    farmWindParticles.forEach((particle) => {
        const d = particle.userData;
        particle.position.x += (windX * d.speed * (0.45 + intensity) + Math.sin(now * d.flutter + d.phase) * 0.16) * dt;
        particle.position.z += (windZ * d.speed * (0.45 + intensity) + Math.cos(now * d.flutter * 0.8 + d.phase) * 0.13) * dt;
        particle.position.y += (Math.sin(now * d.flutter + d.phase) * 0.18 - d.fall) * dt;
        particle.rotation.x += dt * d.flutter;
        particle.rotation.y += dt * (0.8 + intensity);
        particle.rotation.z += dt * (windX * 0.7 + Math.sin(now + d.phase) * 0.4);
        if (particle.position.y < 0.12 || Math.abs(particle.position.x) > 33 || Math.abs(particle.position.z) > 33) {
            particle.position.set(-windX * (27 + Math.random() * 5) + (Math.random() - 0.5) * 8, 0.35 + Math.random() * 1.7, -windZ * (27 + Math.random() * 5) + (Math.random() - 0.5) * 8);
        }
    });
}

function createChibiPineTree(x, z, scale = 1) {
    const tree = new THREE.Group(); tree.position.set(x, 0, z); tree.scale.setScalar(scale);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x80502b, roughness: 1 });
    const greens = [0x2f855a, 0x368b60, 0x28734e];
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 0.9, 7), trunkMat); trunk.position.y = 0.45; tree.add(trunk);
    for (let i = 0; i < 3; i++) {
        const layer = new THREE.Mesh(new THREE.ConeGeometry(0.78 - i * 0.12, 1.15, 8), new THREE.MeshStandardMaterial({ color: greens[i], roughness: 0.92 }));
        layer.position.set(0, 0.9 + i * 0.62, 0); layer.rotation.y = (i % 2) * 0.35; tree.add(layer);
    }
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshStandardMaterial({ color: 0x91c788, roughness: 0.8 }));
    tip.position.set(-0.12, 2.55, 0.02); tree.add(tip);
    tree.userData.decorative = true; makeNonBlockingDecoration(tree); scene.add(tree); return tree;
}
function createChibiBird(color, bellyColor, start, landing, phase = 0) {
    const bird = new THREE.Group();
    const feather = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: bellyColor, roughness: 0.9 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.8 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), feather); body.scale.set(1.25, 0.82, 0.9); bird.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), bellyMat); belly.position.set(0.015, -0.075, 0.12); belly.scale.set(1, 0.82, 0.55); bird.add(belly);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), feather); head.position.set(0.19, 0.13, 0.08); bird.add(head);
    const eyeGeo = new THREE.SphereGeometry(0.026, 8, 6);
    [-1, 1].forEach(side => { const eye = new THREE.Mesh(eyeGeo, darkMat); eye.position.set(0.245, 0.155, 0.08 + side * 0.105); bird.add(eye); });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.13, 5), beakMat); beak.rotation.z = -Math.PI / 2; beak.position.set(0.35, 0.105, 0.08); bird.add(beak);
    const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), bellyMat); wingL.scale.set(0.55, 0.22, 0.8); wingL.position.set(-0.02, 0.02, -0.13); bird.add(wingL);
    const wingR = wingL.clone(); wingR.position.z = 0.13; bird.add(wingR);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.25, 5), feather); tail.rotation.z = Math.PI / 2; tail.position.set(-0.27, 0.03, 0); bird.add(tail);
    const feet = [];
    for (const z of [-0.07, 0.07]) { const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 5), beakMat); foot.position.set(0, -0.22, z); bird.add(foot); feet.push(foot); }
    bird.position.set(start.x, start.y, start.z);
    bird.userData = { phase, wingL, wingR, feet, head, state: 'perched', activity: 'rest', stateUntil: 0, flightStart: null, flightEnd: null, flightControl: null, flightDuration: 4.4 + phase * 0.45, previousX: start.x, previousZ: start.z, startledUntil: 0, home: landing, perchY: start.y };
    makeNonBlockingDecoration(bird); scene.add(bird); return bird;
}
function buildChibiNatureDecorations() {
    const treeSpots = [
        [-29, -27, 0.92], [-29, 1, 0.86], [-29, 26, 0.9],
        [0, -30, 0.88], [27, -29, 0.9], [28, 26, 0.86]
    ];
    farmBirdTrees = [];
    treeSpots.forEach(([x,z,s]) => { if (isLocationFree(x,z)) farmBirdTrees.push({ mesh: createChibiPineTree(x,z,s), x, z, scale: s }); });

    // Điểm đến nhẹ, cố định: cành cây, bờ ao và rìa khu trồng trọt.
    farmBirdDestinations = farmBirdTrees.map((tree, index) => ({
        type: 'tree', x: tree.x + (index % 2 ? 0.32 : -0.28), z: tree.z + (index % 2 ? -0.12 : 0.22),
        y: 1.92 * tree.scale, treeIndex: index
    }));
    [
        { type: 'pond', x: -6.9, y: 0.34, z: 17.0 },
        { type: 'pond', x: 0.5, y: 0.34, z: 14.9 },
        { type: 'pond', x: 6.9, y: 0.34, z: 17.8 },
        { type: 'crop', x: -13.1, y: 0.92, z: -7.7 },
        { type: 'crop', x: 3.5, y: 0.92, z: -7.7 },
        { type: 'crop', x: -13.1, y: 0.92, z: 6.8 },
        { type: 'crop', x: 3.5, y: 0.92, z: 6.8 }
    ].forEach(p => farmBirdDestinations.push(p));

    const birdSpecs = [
        [0x60a5fa, 0xe0f2fe, 0], [0xf472b6, 0xfff1f2, 1], [0xfacc15, 0xfffbeb, 2],
        [0x34d399, 0xecfdf5, 3], [0xc084fc, 0xf5f3ff, 4], [0xfb923c, 0xffedd5, 5],
        [0xf87171, 0xffe4e6, 6]
    ];
    farmBirds = birdSpecs.map(([bodyColor, bellyColor, index]) => {
        const destination = farmBirdDestinations[index % Math.max(1, farmBirdDestinations.length)] || { x: -25, y: 2, z: -25 };
        const start = { x: destination.x, y: destination.y, z: destination.z };
        const bird = createChibiBird(bodyColor, bellyColor, start, start, 0.2 + index * 0.31);
        bird.userData.destinationIndex = index % Math.max(1, farmBirdDestinations.length);
        bird.userData.stateUntil = performance.now() * 0.001 + 1.5 + index * 0.8;
        bird.userData.activity = destination.type === 'pond' ? 'drink' : destination.type === 'crop' ? 'forage' : 'rest';
        return bird;
    });
}
function birdChooseDestination(bird, now, startled = false) {
    const d = bird.userData;
    if (!farmBirdDestinations.length) return;
    const current = d.destinationIndex;
    const player = typeof playerGroup !== 'undefined' && playerGroup ? playerGroup.position : null;
    const options = [];
    farmBirdDestinations.forEach((point, index) => {
        if (index === current && farmBirdDestinations.length > 1) return;
        // In fase bay tránh, chọn điểm xa người chơi để chim không vừa bay đi đã quay lại.
        const playerDist = player ? Math.hypot(point.x - player.x, point.z - player.z) : 99;
        if (startled && playerDist < 8) return;
        options.push({ point, index, weight: point.type === 'tree' ? 1.2 : 1 });
    });
    if (!options.length) farmBirdDestinations.forEach((point,index) => { if (index !== current) options.push({ point,index,weight:1 }); });
    if (!options.length) return;
    const total = options.reduce((sum, item) => sum + item.weight, 0);
    let pick = Math.random() * total, chosen = options[0];
    for (const item of options) { pick -= item.weight; if (pick <= 0) { chosen = item; break; } }
    const start = { x: bird.position.x, y: bird.position.y, z: bird.position.z };
    const end = { x: chosen.point.x, y: chosen.point.y, z: chosen.point.z };
    const dx = end.x - start.x, dz = end.z - start.z;
    const length = Math.max(1, Math.hypot(dx, dz));
    const bend = (Math.random() < 0.5 ? -1 : 1) * Math.min(4.8, length * (0.16 + Math.random() * 0.18));
    const control = {
        x: (start.x + end.x) * 0.5 + (-dz / length) * bend,
        y: Math.max(start.y, end.y) + 1.6 + Math.random() * 1.3,
        z: (start.z + end.z) * 0.5 + (dx / length) * bend
    };
    d.flightStart = start; d.flightEnd = end; d.flightControl = control;
    d.flightDuration = Math.max(2.8, Math.min(7.2, 2.8 + length * 0.12 + Math.random() * 0.8));
    d.flightStartedAt = now; d.state = 'flying'; d.activity = startled ? 'startled' : 'travel';
    d.destinationIndex = chosen.index; d.landingType = chosen.point.type; d.startledUntil = startled ? now + 3.5 : d.startledUntil;
    d.previousX = start.x; d.previousZ = start.z;
    d.wingL.visible = true; d.wingR.visible = true; d.feet.forEach(f => { f.visible = false; });
}
function updateChibiBirds() {
    if (!farmBirds.length) return;
    const now = performance.now() * 0.001;
    const player = typeof playerGroup !== 'undefined' && playerGroup ? playerGroup.position : null;
    farmBirds.forEach((bird, i) => {
        const d = bird.userData;
        const playerDistance = player ? Math.hypot(player.x - bird.position.x, player.z - bird.position.z) : 999;
        if (d.state !== 'flying' && playerDistance < 4.4 && now > d.startledUntil) {
            birdChooseDestination(bird, now, true);
        }
        if (d.state === 'flying' && d.flightStart && d.flightEnd && d.flightControl) {
            const raw = Math.min(1, Math.max(0, (now - d.flightStartedAt) / d.flightDuration));
            // Ease-in/ease-out giúp cất cánh và giảm tốc khi tiếp đất; đường cong bậc hai tạo cung bay mềm.
            const t = raw * raw * (3 - 2 * raw), inv = 1 - t;
            const a = d.flightStart, c = d.flightControl, b = d.flightEnd;
            const x = inv * inv * a.x + 2 * inv * t * c.x + t * t * b.x;
            const y = inv * inv * a.y + 2 * inv * t * c.y + t * t * b.y + Math.sin(Math.PI * raw) * 0.42;
            const windNow = farmWind || { angle: 0, strength: 0 };
            const windDrift = Math.sin(Math.PI * raw) * windNow.strength * 0.32;
            const xWind = x + Math.cos(windNow.angle) * windDrift;
            const z = inv * inv * a.z + 2 * inv * t * c.z + t * t * b.z;
            const zWind = z + Math.sin(windNow.angle) * windDrift;
            const vx = xWind - d.previousX, vz = zWind - d.previousZ;
            const speedDir = Math.atan2(-vz, vx);
            const bank = Math.max(-0.38, Math.min(0.38, (vx * (d.flightControl.z - b.z) - vz * (d.flightControl.x - b.x)) * 0.012));
            bird.position.set(xWind, y, zWind);
            bird.rotation.y = speedDir;
            bird.rotation.z = Math.max(-0.24, Math.min(0.24, (d.flightEnd.y - d.flightStart.y) * -0.035));
            bird.rotation.x = bank + Math.sin(now * 7 + i) * 0.035;
            d.previousX = xWind; d.previousZ = zWind;
            const flap = Math.sin(now * 18 + d.phase * 3.2) * (0.65 + (1 - raw) * 0.35);
            d.wingL.rotation.x = flap; d.wingR.rotation.x = -flap;
            d.head.rotation.z = 0; d.feet.forEach(f => { f.visible = raw > 0.82; });
            if (raw >= 1) {
                bird.position.set(b.x, b.y, b.z); d.state = 'perched'; d.flightStart = d.flightEnd = d.flightControl = null;
                d.activity = d.landingType === 'pond' ? 'drink' : d.landingType === 'crop' ? 'forage' : 'rest';
                d.perchY = b.y;
                d.stateUntil = now + (d.activity === 'drink' ? 3.8 : d.activity === 'forage' ? 3.0 : 4.5) + Math.random() * 3.5;
                bird.rotation.set(0, speedDir, 0); d.wingL.rotation.x = 0; d.wingR.rotation.x = 0; d.feet.forEach(f => { f.visible = true; });
            }
            return;
        }
        // Chim đậu vẫn có chuyển động nhỏ; uống nước thì cúi đầu, tìm thức ăn thì mổ nhẹ.
        bird.rotation.x = 0; bird.rotation.z = 0;
        if (d.activity === 'drink') {
            d.head.rotation.z = 0.16 + Math.max(0, Math.sin(now * 4.2 + d.phase)) * 0.22;
            bird.position.y = d.perchY + Math.sin(now * 1.8 + d.phase) * 0.006;
        } else if (d.activity === 'forage') {
            d.head.rotation.z = Math.max(0, Math.sin(now * 5 + d.phase)) * 0.18;
            bird.position.y = d.perchY + Math.sin(now * 2.3 + i) * 0.025;
        } else {
            d.head.rotation.z = Math.sin(now * 1.7 + d.phase) * 0.045;
            bird.position.y = d.perchY + Math.sin(now * 2 + d.phase) * 0.012;
        }
        d.wingL.rotation.x = Math.sin(now * 2.2 + d.phase) * 0.035;
        d.wingR.rotation.x = -d.wingL.rotation.x;
        d.feet.forEach(f => { f.visible = true; });
        if (now >= d.stateUntil) birdChooseDestination(bird, now, false);
    });
}

// Góc giải trí trên bản đồ: chiếu đua ngựa và chiếu bầu cua.
function makeFarmSignTexture(title, subtitle, bg='#166534') {
 const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,c.width,c.height);x.strokeStyle='#fbbf24';x.lineWidth=12;x.strokeRect(8,8,496,240);x.textAlign='center';x.fillStyle='#fff7ed';x.font='bold 46px sans-serif';x.fillText(title,256,112);x.fillStyle='#fde68a';x.font='bold 25px sans-serif';x.fillText(subtitle,256,164);return new THREE.CanvasTexture(c);
}
let worldRaceHorses = [];
let worldRaceActive = false;
function makeWorldHorse(color, number) {
    const g=new THREE.Group(); const coat=new THREE.MeshStandardMaterial({color,roughness:0.85});
    const body=new THREE.Mesh(new THREE.SphereGeometry(0.48,12,10),coat); body.scale.set(1.35,0.8,0.72); body.position.y=0.78; g.add(body);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.23,0.58,8),coat); neck.position.set(0.36,1.04,0.16); neck.rotation.z=-0.48; g.add(neck);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.23,10,8),coat); head.position.set(0.48,1.34,0.22); g.add(head);
    const mane=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.48,7),new THREE.MeshStandardMaterial({color:0x292524})); mane.position.set(0.24,1.37,0.12); mane.rotation.z=-0.25; g.add(mane);
    g.userData.legs=[];
    for(const x of [-0.28,0.32]) for(const z of [-0.22,0.22]) {const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.075,0.55,6),coat);leg.position.set(x,0.34,z);g.add(leg);g.userData.legs.push(leg);}
    const saddle=new THREE.Mesh(new THREE.BoxGeometry(0.48,0.12,0.52),new THREE.MeshStandardMaterial({color:[0xdc2626,0x2563eb,0x16a34a,0xf59e0b][number-1]}));saddle.position.set(-0.03,1.13,0);g.add(saddle);
    g.userData.raceNumber=number; return g;
}
function buildMinigameMats() {
    // Đua ngựa chuyển sang giao diện giải trí cố định trên màn hình; không dựng đường đua 3D lỗi nữa.
    worldRaceHorses=[];
    // Đường đi phân khu: ruộng ở trung tâm, mỗi khu có lối vào riêng.
    // Texture đất vẽ bằng Canvas để không cần tải ảnh ngoài: đất nâu ấm, hạt sỏi nhỏ.
    const dirtCanvas = document.createElement('canvas'); dirtCanvas.width = 256; dirtCanvas.height = 256;
    const dirtCtx = dirtCanvas.getContext('2d');
    dirtCtx.fillStyle = '#b88954'; dirtCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1150; i++) {
        const x = Math.random() * 256, y = Math.random() * 256;
        const r = 0.5 + Math.random() * 2.1;
        dirtCtx.fillStyle = ['rgba(91,57,31,.18)','rgba(239,202,139,.28)','rgba(255,230,180,.18)','rgba(121,78,42,.20)'][i % 4];
        dirtCtx.beginPath(); dirtCtx.ellipse(x, y, r * 1.5, r, Math.random() * Math.PI, 0, Math.PI * 2); dirtCtx.fill();
    }
    for (let i = 0; i < 36; i++) {
        dirtCtx.fillStyle = 'rgba(235,218,183,.58)'; dirtCtx.beginPath();
        dirtCtx.ellipse(Math.random()*256, Math.random()*256, 1.2+Math.random()*2.3, .7+Math.random(), Math.random(), 0, Math.PI*2); dirtCtx.fill();
    }
    const dirtTexture = new THREE.CanvasTexture(dirtCanvas); dirtTexture.wrapS = dirtTexture.wrapT = THREE.RepeatWrapping;
    dirtTexture.repeat.set(1.6, 1.6); dirtTexture.anisotropy = 4;
    const roadTopMat = new THREE.MeshStandardMaterial({ map: dirtTexture, color: 0xffffff, roughness: 1 });
    const roadSideMat = new THREE.MeshStandardMaterial({ color: 0x80552f, roughness: 1 });
    const pathMats = [roadSideMat, roadSideMat, roadTopMat, roadSideMat, roadSideMat, roadSideMat];
    // UPGRADE 42: road network visual rework. Existing path meshes remain the
    // walkable/raycast surfaces; a soft shoulder + rounded junction/cap visuals
    // are layered underneath so the road reads as one continuous chibi path.
    const paths = [
        {x:6,z:8,w:2.2,d:12}, {x:3,z:8,w:8,d:2.2},
        {x:8,z:4,w:2.0,d:10}, {x:10.5,z:-1,w:5,d:2.0}, {x:13,z:-3,w:2.0,d:10},
        {x:13.5,z:-4.5,w:2.0,d:11}, {x:14,z:-9.5,w:8,d:2.0}, {x:10.5,z:-11.5,w:2.0,d:3.0},
        {x:23,z:5,w:2.0,d:10}, {x:12,z:8,w:12,d:2.0}, {x:20.5,z:8,w:5,d:2.0},
        {x:-14.5,z:-5,w:1.5,d:18}, {x:-18,z:-13.5,w:8,d:1.5}, {x:-18,z:5.5,w:8,d:1.5},
        {x:-12,z:-14,w:5,d:2.0}, {x:-9.5,z:-15,w:2.0,d:10}, {x:-10.5,z:-20,w:8,d:2.0},
        {x:30.5,z:14,w:1.5,d:14}, {x:22.5,z:2,w:3,d:2.0}
    ];

    const roadShoulderMat = new THREE.MeshStandardMaterial({ color: 0x8b5a35, roughness: 1 });
    const roadEdgeMat = new THREE.MeshStandardMaterial({ color: 0x9f6b40, roughness: 1 });
    const roadVisual = new THREE.Group();
    roadVisual.name = 'chibiRoadVisual';

    const addRoundPatch = (x, z, radius, material, y) => {
        const patch = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), material);
        patch.rotation.x = -Math.PI / 2;
        patch.position.set(x, y, z);
        patch.receiveShadow = true;
        patch.raycast = () => {};
        roadVisual.add(patch);
    };

    // Slightly wider shoulder makes adjacent segments visually merge.
    paths.forEach(({x,z,w,d}) => {
        const shoulder = new THREE.Mesh(new THREE.BoxGeometry(w + 0.30, 0.035, d + 0.30), roadShoulderMat);
        shoulder.position.set(x, 0.014, z);
        shoulder.receiveShadow = true;
        shoulder.raycast = () => {};
        roadVisual.add(shoulder);

        const edge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.10, 0.018, d + 0.10), roadEdgeMat);
        edge.position.set(x, 0.033, z);
        edge.receiveShadow = true;
        edge.raycast = () => {};
        roadVisual.add(edge);

        // Rounded caps/ends hide the hard rectangular seams at turns and dead ends.
        const r = Math.min(w, d) * 0.52;
        if (d > w) {
            addRoundPatch(x, z - d / 2, r + 0.15, roadShoulderMat, 0.015);
            addRoundPatch(x, z + d / 2, r + 0.15, roadShoulderMat, 0.015);
        } else {
            addRoundPatch(x - w / 2, z, r + 0.15, roadShoulderMat, 0.015);
            addRoundPatch(x + w / 2, z, r + 0.15, roadShoulderMat, 0.015);
        }
    });

    // Explicit junctions where several legacy segments meet.
    [
        [3,8,1.55],[12,8,1.45],[10.5,-1,1.25],[14,-9.5,1.30],
        [-18,-13.5,1.20],[-18,5.5,1.20],[-10.5,-20,1.15],[22.5,2,1.15]
    ].forEach(([x,z,r]) => addRoundPatch(x, z, r, roadShoulderMat, 0.016));

    scene.add(roadVisual);

    paths.forEach(({x,z,w,d})=>{
        const path = new THREE.Mesh(new THREE.BoxGeometry(w, 0.045, d), pathMats);
        path.position.set(x, 0.040, z); path.receiveShadow = true; path.castShadow = false;
        // Keep the exact existing gameplay contract: path remains walkable and raycastable.
        path.userData = { type: 'path', walkable: true };
        scene.add(path);
    });
    // Bầu cua cũng mở từ nút Giải trí, không chiếm diện tích bản đồ.

    // UPGRADE 43: sạp bán hàng chibi mới, đặt giữa chuồng gà (-20,-18) và chuồng bò (-20,10).
    // Giữ nguyên type market_sign để không thay đổi luồng tương tác.
    const market = new THREE.Group();
    market.position.set(-20, 0, -4);
    market.name = 'chibiMarketStall';

    const marketWood = new THREE.MeshStandardMaterial({ color: 0x8b5a36, roughness: 0.78 });
    const marketWoodDark = new THREE.MeshStandardMaterial({ color: 0x5f3b25, roughness: 0.88 });
    const marketCream = new THREE.MeshStandardMaterial({ color: 0xffe6a7, roughness: 0.72 });
    const marketRoof = new THREE.MeshStandardMaterial({ color: 0xe86f51, roughness: 0.7 });
    const marketRoofDark = new THREE.MeshStandardMaterial({ color: 0xc84f3d, roughness: 0.78 });
    const basketMat = new THREE.MeshStandardMaterial({ color: 0xd69b4d, roughness: 0.82 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f9d45, roughness: 0.82 });
    const fruitMats = [0xdc4a3d, 0xf0ad3d, 0x7aa84a, 0xb94b7d].map(c => new THREE.MeshStandardMaterial({ color:c, roughness:0.6 }));
    const mark = (obj) => { obj.userData = { type:'market_sign' }; obj.castShadow = true; obj.receiveShadow = true; return obj; };

    // Bệ quầy và mặt bàn bo kiểu chibi.
    const base = mark(new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.18, 2.05), marketWoodDark)); base.position.y = 0.28; market.add(base);
    const counter = mark(new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.22, 1.92), marketCream)); counter.position.set(0, 1.18, 0.02); market.add(counter);
    const front = mark(new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.78, 0.16), marketWood)); front.position.set(0,0.72,0.86); market.add(front);

    // Bốn trụ gỗ, xà ngang và mái hai tầng.
    [-1.58,1.58].forEach(x => {
        [-0.76,0.76].forEach(z => {
            const post = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.105,0.13,2.35,8), marketWoodDark)); post.position.set(x,1.55,z); market.add(post);
        });
    });
    const beamFront = mark(new THREE.Mesh(new THREE.BoxGeometry(3.55,0.16,0.16), marketWoodDark)); beamFront.position.set(0,2.55,0.78); market.add(beamFront);
    const beamBack = mark(new THREE.Mesh(new THREE.BoxGeometry(3.55,0.16,0.16), marketWoodDark)); beamBack.position.set(0,2.55,-0.78); market.add(beamBack);
    const roofMain = mark(new THREE.Mesh(new THREE.BoxGeometry(4.05,0.22,2.32), marketRoof)); roofMain.position.set(0,2.72,0); roofMain.rotation.z=0; market.add(roofMain);
    const roofTrim = mark(new THREE.Mesh(new THREE.BoxGeometry(4.18,0.12,2.42), marketRoofDark)); roofTrim.position.set(0,2.58,0); market.add(roofTrim);

    // Mái nhỏ phía trước + bảng hiệu, tạo silhouette nhận ra sạp từ xa.
    const awning = mark(new THREE.Mesh(new THREE.BoxGeometry(3.82,0.16,0.52), marketCream)); awning.position.set(0,2.36,0.93); awning.rotation.x=-0.12; market.add(awning);
    const signBoard = mark(new THREE.Mesh(new THREE.BoxGeometry(2.65,0.58,0.12), marketWoodDark)); signBoard.position.set(0,2.06,0.91); market.add(signBoard);
    const signText = mark(new THREE.Mesh(new THREE.PlaneGeometry(2.38,0.43), new THREE.MeshBasicMaterial({ map:makeFarmSignTexture('SẠP NÔNG SẢN','BÁN • ĐỔI • GIAO','#8b5a36'), transparent:true })));
    signText.position.set(0,2.06,0.985); market.add(signText);

    // Hộp/giỏ hàng trưng bày.
    [-1.25,-0.42,0.42,1.25].forEach((x,i)=>{
        const basket = mark(new THREE.Mesh(new THREE.BoxGeometry(0.58,0.25,0.52), basketMat)); basket.position.set(x,1.40,0.18); market.add(basket);
        const produce = mark(new THREE.Mesh(new THREE.SphereGeometry(0.15,10,8), fruitMats[i])); produce.position.set(x,1.61,0.18); market.add(produce);
        const leaf = mark(new THREE.Mesh(new THREE.SphereGeometry(0.06,7,6), leafMat)); leaf.position.set(x+0.08,1.69,0.18); leaf.scale.set(1,0.55,1); market.add(leaf);
    });
    const crate = mark(new THREE.Mesh(new THREE.BoxGeometry(0.9,0.5,0.65), basketMat)); crate.position.set(-1.25,0.67,-0.2); market.add(crate);
    const crate2 = mark(new THREE.Mesh(new THREE.BoxGeometry(0.72,0.38,0.58), marketWood)); crate2.position.set(1.18,0.61,-0.22); market.add(crate2);

    // Hai đèn/lồng nhỏ để model có chiều sâu mà không cần UI label.
    [-1.48,1.48].forEach(x=>{
        const lantern = mark(new THREE.Mesh(new THREE.SphereGeometry(0.14,10,8), new THREE.MeshStandardMaterial({color:0xffd166, emissive:0x5a3a12, emissiveIntensity:0.28, roughness:0.5})));
        lantern.position.set(x,2.2,0.83); market.add(lantern);
    });
    market.userData = { type:'market_sign' };
    market.traverse(o => { if (o.isMesh && (!o.userData || !o.userData.type)) o.userData={type:'market_sign'}; o.raycast = o.raycast || undefined; });
    scene.add(market);

    // NPC bù nhìn cạnh ruộng: tương tác để mở chung bảng mở khóa/nâng cấp ô đất.
    const strawman = new THREE.Group(); strawman.position.set(-15.5, 0, -8.5);
    const straw = new THREE.MeshStandardMaterial({ color: 0xb98950, roughness: 1 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.95 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 1 });
    const npcBody = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.15, 8), cloth); npcBody.position.y = 1.15; npcBody.userData.type = 'plot_upgrade_npc'; strawman.add(npcBody);
    const npcHead = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), straw); npcHead.position.y = 1.95; npcHead.userData.type = 'plot_upgrade_npc'; strawman.add(npcHead);
    const npcHat = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0x92400e })); npcHat.position.y = 2.32; npcHat.userData.type = 'plot_upgrade_npc'; strawman.add(npcHat);
    const eyeGeo = new THREE.SphereGeometry(0.035, 6, 6);
    [-0.11, 0.11].forEach(x => { const eye = new THREE.Mesh(eyeGeo, dark); eye.position.set(x, 2.0, 0.29); eye.userData.type = 'plot_upgrade_npc'; strawman.add(eye); });
    const arms = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.12, 0.12), straw); arms.position.y = 1.48; arms.rotation.z = -0.08; arms.userData.type = 'plot_upgrade_npc'; strawman.add(arms);
    const legGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.62, 6);
    [-0.18, 0.18].forEach(x => { const leg = new THREE.Mesh(legGeo, dark); leg.position.set(x, 0.32, 0); leg.userData.type = 'plot_upgrade_npc'; strawman.add(leg); });
    strawman.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.userData.type = 'plot_upgrade_npc'; } });
    scene.add(strawman);
    const npcSign = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeFarmSignTexture('BÙ NHÌN','MỞ / NÂNG CẤP ĐẤT','#854d0e'), transparent: true, depthTest: false }));
    npcSign.position.set(-15.5, 3.05, -8.5); npcSign.scale.set(3.1, 1.15, 1); scene.add(npcSign);
}
function updateMarketReadyIndicator() {
    const orders = Array.isArray(gameState.marketOrders) ? gameState.marketOrders : [];
    const readyCount = orders.filter(order => {
        if (order.completed || !Array.isArray(order.reqs) || !order.reqs.length) return false;
        const totals = new Map();
        order.reqs.forEach(req => { if (req && typeof req.id === 'string') totals.set(req.id, (totals.get(req.id) || 0) + Math.max(0, Number(req.qty) || 0)); });
        return Array.from(totals.entries()).every(([id, qty]) => (Number(gameState.inventory && gameState.inventory[id]) || 0) >= qty);
    }).length;
    const countBadge = document.getElementById('market-order-count');
    if (countBadge) { countBadge.textContent = String(readyCount); countBadge.classList.toggle('hidden', readyCount === 0); }
}
function setWorldRaceProgress(progress) {
    if(!worldRaceHorses.length)return;
    worldRaceActive=progress!==null;
    worldRaceHorses.forEach((horse,i)=>{const p=progress===null?0:Math.max(0,Math.min(1,progress[i]||0));const angle=-Math.PI/2+p*Math.PI*2;const rx=8.2-i*0.75,rz=3.25-i*0.36;horse.position.set(19+Math.cos(angle)*rx,0,-20+Math.sin(angle)*rz);horse.rotation.y=-angle+Math.PI/2;horse.userData.legs.forEach((leg,j)=>{leg.rotation.z=progress===null?0:Math.sin(p*28+j*Math.PI)*0.45;});});
}
function updateWorldRaceIdle(){if(!worldRaceActive&&worldRaceHorses.length){const t=performance.now()*0.00004;worldRaceHorses.forEach((h,i)=>{const a=t+i*1.57;h.position.set(19+Math.cos(a)*(8.2-i*0.75),0,-20+Math.sin(a)*(3.25-i*0.36));h.rotation.y=-a+Math.PI/2;});}}

function buildFarmIslandBase() {
    // 1. Mặt đất đảo chính (Cỏ xanh - 68x68)
    const island = new THREE.Mesh(
        new THREE.BoxGeometry(68, 2, 68),
        new THREE.MeshStandardMaterial({ color: 0x52b788, roughness: 0.8 })
    );
    island.position.y = -1;
    island.receiveShadow = true;
    island.userData = { type: 'ground' };
    scene.add(island);

    // 2. Viền đất bãi bồi ven sông (72x72)
    const beach = new THREE.Mesh(
        new THREE.BoxGeometry(72, 1.8, 72),
        new THREE.MeshStandardMaterial({ color: 0xc28544, roughness: 0.9 })
    );
    beach.position.y = -1.05;
    beach.receiveShadow = true;
    scene.add(beach);

    // 3. TẠO AẢNH DÒNG SÔNG BẰNG CANVAS 2D (ĐÁNH LỪA THỊ GIÁC)
    const riverCanvas = document.createElement('canvas');
    riverCanvas.width = 512;
    riverCanvas.height = 512;
    const ctx = riverCanvas.getContext('2d');

    // Tạo Radial Gradient mờ chuyển từ viền bờ ra lòng sông rồi tới núi
    const gradient = ctx.createRadialGradient(256, 256, 120, 256, 256, 256);
    gradient.addColorStop(0, '#0284c7'); // Xanh ngọc sông
    gradient.addColorStop(0.4, '#0369a1'); // Xanh đậm lòng sông
    gradient.addColorStop(0.8, '#0f172a'); // Tối dần về phía chân núi
    gradient.addColorStop(1.0, '#1e293b');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    // Vẽ thêm vài gợn sóng nước lăn tăn nhẹ dạng vòng tròn mờ
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3;
    for (let r = 140; r < 250; r += 20) {
        ctx.beginPath();
        ctx.arc(256, 256, r + Math.sin(r) * 5, 0, Math.PI * 2);
        ctx.stroke();
    }

    const riverTexture = new THREE.CanvasTexture(riverCanvas);

    // 4. Tấm Plane dán Ảnh Sông bao phủ toàn bộ khoảng không đến chân núi
    const riverPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(120, 120),
        new THREE.MeshBasicMaterial({
            map: riverTexture,
            side: THREE.DoubleSide
        })
    );
    riverPlane.rotation.x = -Math.PI / 2;
    riverPlane.position.y = -0.12; // Đặt ngay dưới bờ đất
    scene.add(riverPlane);
}
