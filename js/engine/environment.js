// Kiểm tra vị trí trống để đặt vật thể trang trí
function isLocationFree(x, z) {
    if (x > -15 && x < 8 && z > -12 && z < 13) return false;
    if (x > -26 && x < -14 && z > -23 && z < -13) return false;
    if (x > -26 && x < -14 && z > 5 && z < 15) return false;
    if (x > 14 && x < 26 && z > 9 && z < 19) return false;
    if (x > -7 && x < 7 && z > -26 && z < -14) return false;
    if (x > 4 && x < 15 && z > 4 && z < 15) return false;
    if (Math.abs(x) > 31 || Math.abs(z) > 31) return false;
    return true;
}

// Xây dựng trang trí môi trường (Mặt trời, Núi 2D Panorama, Mây, Cỏ, Đá)
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
    });

    // 4. Cỏ dại & Đá
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.8 });
    for (let g = 0; g < 35; g++) {
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
        }
    }

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    for (let r = 0; r < 20; r++) {
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
