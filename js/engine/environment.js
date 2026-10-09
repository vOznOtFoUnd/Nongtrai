
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
    const pathMat=new THREE.MeshStandardMaterial({color:0xd6b47a,roughness:1});
    const paths = [
        {x:6,z:8,w:2.2,d:12}, {x:3,z:8,w:8,d:2.2},
        {x:8,z:4,w:2.0,d:10}, {x:10.5,z:-1,w:5,d:2.0}, {x:13,z:-3,w:2.0,d:10},
        {x:13.5,z:-4.5,w:2.0,d:11}, {x:14,z:-9.5,w:8,d:2.0}, {x:10.5,z:-11.5,w:2.0,d:3.0},
        {x:23,z:5,w:2.0,d:10}, {x:12,z:8,w:12,d:2.0}, {x:20.5,z:8,w:5,d:2.0},
        {x:-14.5,z:-5,w:1.5,d:18}, {x:-18,z:-13.5,w:8,d:1.5}, {x:-18,z:5.5,w:8,d:1.5},
        {x:-12,z:-14,w:5,d:2.0}, {x:-9.5,z:-15,w:2.0,d:10}, {x:-10.5,z:-20,w:8,d:2.0},
        {x:30.5,z:14,w:1.5,d:14}, {x:22.5,z:2,w:3,d:2.0}
    ];
    paths.forEach(({x,z,w,d})=>{const path=new THREE.Mesh(new THREE.BoxGeometry(w,0.04,d),pathMat);path.position.set(x,0.025,z);path.receiveShadow=true;scene.add(path);});

    // Bầu cua cũng mở từ nút Giải trí, không chiếm diện tích bản đồ.

    // Xe hàng 3D với tên rõ ràng và vùng tương tác lớn.
    const market=new THREE.Group();market.position.set(-2,0,11.8);
    const wood=new THREE.MeshStandardMaterial({color:0x92400e,roughness:0.8});
    const green=new THREE.MeshStandardMaterial({color:0x166534,roughness:0.7});
    const body=new THREE.Mesh(new THREE.BoxGeometry(3.5,0.85,2.0),wood);body.position.set(0,0.85,0);body.userData={type:'market_sign'};market.add(body);
    const counter=new THREE.Mesh(new THREE.BoxGeometry(3.7,0.14,2.15),new THREE.MeshStandardMaterial({color:0xfbbf24,roughness:0.6}));counter.position.set(0,1.34,0);counter.userData={type:'market_sign'};market.add(counter);
    for(const wx of [-1.25,1.25]) {const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.38,0.18,16),new THREE.MeshStandardMaterial({color:0x292524,roughness:0.9}));wheel.rotation.z=Math.PI/2;wheel.position.set(wx,0.42,0.82);wheel.userData={type:'market_sign'};market.add(wheel);}
    const canopy=new THREE.Mesh(new THREE.BoxGeometry(3.8,0.18,2.25),green);canopy.position.set(0,2.15,-0.05);canopy.userData={type:'market_sign'};market.add(canopy);
    const signFace=new THREE.Mesh(new THREE.BoxGeometry(3.2,0.75,0.12),green);signFace.position.set(0,1.8,1.02);signFace.userData={type:'market_sign'};market.add(signFace);
    const signText=new THREE.Mesh(new THREE.PlaneGeometry(3.0,0.62),new THREE.MeshBasicMaterial({map:makeFarmSignTexture('SẠP CHỢ','NHẤN ĐỂ GIAO ĐƠN','#166534')}));signText.position.set(0,1.8,1.09);signText.userData={type:'market_sign'};market.add(signText);
    [0xdc2626,0xf59e0b,0x65a30d,0x9333ea].forEach((c,i)=>{const fruit=new THREE.Mesh(new THREE.SphereGeometry(0.22,10,8),new THREE.MeshStandardMaterial({color:c,roughness:0.55}));fruit.position.set(-1.0+i*0.65,1.52,0.35);fruit.userData={type:'market_sign'};market.add(fruit);});
    market.userData={type:'market_sign'};scene.add(market);

    // Nhãn khu vực kiểu chibi pastel: bảng kẹo bo tròn, không có biển gỗ hay HUD nổi.
    function addAreaWorldLabel(title, emoji, x, z, width = 5.2) {
        const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 176;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const rr = (x,y,w,h,r) => { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); };
        ctx.shadowColor = 'rgba(89, 72, 125, 0.22)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 7;
        rr(18, 18, 732, 140, 48); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.lineWidth = 7; ctx.strokeStyle = '#f5c6d8'; ctx.stroke();
        ctx.fillStyle = '#dff7e8'; rr(36, 34, 104, 108, 36); ctx.fill();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '58px sans-serif'; ctx.fillStyle = '#42536b'; ctx.fillText(emoji, 88, 88);
        ctx.fillStyle = '#56617c'; ctx.font = 'bold 42px sans-serif'; ctx.fillText(title, 440, 89, 570);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: true }));
        sprite.position.set(x, 3.15, z); sprite.scale.set(width, 0.9, 1); sprite.userData = { type: 'area_label' }; sprite.raycast = () => {}; scene.add(sprite);
    }
    addAreaWorldLabel('KHU TRỒNG TRỌT', '🌱', -4.2, -3.5, 5.8);
    addAreaWorldLabel('VƯỜN CÂY ĂN QUẢ', '🍑', 18, -4.2, 6.0);
    addAreaWorldLabel('AO CÁ & VỊT', '🦆', 0, 20, 4.8);
    addAreaWorldLabel('SẠP CHỢ', '🧺', -2, 11.8, 3.5);

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
