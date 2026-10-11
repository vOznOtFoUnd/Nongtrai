import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from '../core/config.js';
import { Plot } from '../farming/plot.js';
import { state, loadGame } from '../data/state.js';
import { WORLD_MAP } from './mapData.js';

export class GameScene {
  constructor(container, onMessage) {
    this.container = container; this.onMessage = onMessage;
    this.scene = new THREE.Scene();
    this.staticCollisionBoxes = [];
    this.worldCollisionBounds = { ...WORLD_MAP.bounds };
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, CONFIG.world.fogNear, CONFIG.world.fogFar);
    
    this._createCamera(); 
    this._createRenderer(); 
    this._createControls();
    this._createLights(); 
    this._createEnvironment();
    this._createMapFoundation();
    this._createFarmPlots();
  }

  _createCamera() {
    const c = CONFIG.camera;
    this.camera = new THREE.PerspectiveCamera(c.fov, window.innerWidth / window.innerHeight, c.near, c.far);
    this.camera.position.set(...c.position);
  }

  _createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: CONFIG.renderer.antialias, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = CONFIG.renderer.toneMappingExposure;
    this.container.appendChild(this.renderer.domElement);
  }

  _createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = CONFIG.camera.maxPolarAngle;
    this.controls.minDistance = CONFIG.camera.minDistance;
    this.controls.maxDistance = CONFIG.camera.maxDistance;
    // Camera luôn theo sau Player; tắt pan để thao tác hai ngón không kéo lệch tâm bám.
    this.controls.enablePan = false;
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  }

  _createLights() {
    this.ambient = new THREE.AmbientLight(0xffffff, 0.45); this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
    this.sun.position.set(20, 30, 15); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(CONFIG.renderer.shadowMapSize, CONFIG.renderer.shadowMapSize);
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 80;
    this.sun.shadow.camera.left = -35; this.sun.shadow.camera.right = 35;
    this.sun.shadow.camera.top = 35; this.sun.shadow.camera.bottom = -35;
    this.sun.shadow.bias = -0.001; this.scene.add(this.sun);
    this.scene.add(new THREE.HemisphereLight(0x87CEEB, 0x3d7a37, 0.35));
  }

  _createEnvironment() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(CONFIG.world.groundSize, CONFIG.world.groundSize),
      new THREE.MeshStandardMaterial({ color: 0x3d8b40, roughness: 0.95, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.scene.add(ground);

    const path = new THREE.Mesh(new THREE.PlaneGeometry(4, 20), new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.9 }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, 20); path.receiveShadow = true; this.scene.add(path);

    this._createFence(); this._createTrees(); this._createBarn(); this._createWindmill();
  }

  _createFence() {
    // Hàng rào gỗ kiểu nông trại chibi: cọc vuông dày, nắp cọc, hai thanh ngang bo màu mật ong.
    const fence = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0x8a572d, roughness: 0.82 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xb77b3f, roughness: 0.78 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xa86b35, roughness: 0.86 });
    const braceMat = new THREE.MeshStandardMaterial({ color: 0x704321, roughness: 0.9 });
    const addBox = (w,h,d,mat,x,y,z, parent=fence) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
      mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
    };
    const sides = [
      {axis:'x', fixed:-16, start:-16, end:16}, {axis:'x', fixed:16, start:-16, end:16},
      {axis:'z', fixed:-16, start:-16, end:16}, {axis:'z', fixed:16, start:-16, end:16}
    ];
    for (const side of sides) {
      const length = side.end-side.start;
      const count = Math.floor(length/2);
      for (let j=0;j<=count;j++) {
        const along = side.start + length*j/count;
        const x = side.axis==='x' ? along : side.fixed;
        const z = side.axis==='x' ? side.fixed : along;
        addBox(0.27,1.25,0.27,postMat,x,0.625,z);
        addBox(0.34,0.12,0.34,capMat,x,1.31,z);
        // Đầu cọc và nắp tạo silhouette rõ, nhưng không quá nhọn để hợp phong cách dễ thương.
        addBox(0.22,0.07,0.22,braceMat,x,1.405,z);
      }
      // Ba thanh ngang chắc chắn, thanh trên hơi rộng để nhìn rõ từ góc camera.
      for (const y of [0.42,0.82]) {
        if (side.axis==='x') addBox(length+0.36,0.17,0.13,railMat,(side.start+side.end)/2,y,side.fixed);
        else addBox(0.13,0.17,length+0.36,railMat,side.fixed,y,(side.start+side.end)/2);
      }
      // Giằng chéo nhỏ theo từng nhịp, tạo cảm giác hàng rào thủ công.
      for (let j=0;j<count;j++) {
        const p0=side.start+j*length/count, p1=side.start+(j+1)*length/count;
        const mid=(p0+p1)/2;
        const brace=addBox(1.05,0.09,0.1,braceMat,side.axis==='x'?mid:side.fixed,0.62,side.axis==='x'?side.fixed:mid);
        brace.rotation.y = side.axis==='x' ? (j%2===0?0.55:-0.55) : (j%2===0?Math.PI/2+0.55:Math.PI/2-0.55);
      }
    }
    this.scene.add(fence);
    // Va chạm theo chu vi hàng rào liền mạch.
    this.staticCollisionBoxes.push(
      {minX:-16.3,maxX:-15.7,minZ:-16.3,maxZ:16.3,kind:'fence'},
      {minX:15.7,maxX:16.3,minZ:-16.3,maxZ:16.3,kind:'fence'},
      {minX:-16.3,maxX:16.3,minZ:-16.3,maxZ:-15.7,kind:'fence'},
      {minX:-16.3,maxX:16.3,minZ:15.7,maxZ:16.3,kind:'fence'}
    );
  }

  _createTrees() {
    [[-20,-14],[-20,12],[20,-14],[20,12],[-14,-20],[12,-20],[-12,20],[14,20]].forEach(([x,z]) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.8, 8), new THREE.MeshStandardMaterial({ color: 0x5c4033 }));
      trunk.position.y = 0.9; trunk.castShadow = true; g.add(trunk);
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), new THREE.MeshStandardMaterial({ color: 0x2d6b2d }));
      leaves.position.y = 2.4; leaves.castShadow = true; g.add(leaves);
      g.position.set(x, 0, z); this.scene.add(g);
      // Va chạm thân cây; tán lá chỉ trang trí.
      this.staticCollisionBoxes.push({ minX: x - 0.34, maxX: x + 0.34, minZ: z - 0.34, maxZ: z + 0.34, kind: 'tree' });
    });
  }

  _createBarn() {
    // Nhà kho gỗ phong cách cottage: tường gỗ sáng, khung dầm nổi, mái xanh lợp ngói.
    const barn = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9a76b, roughness: 0.9 });
    const wallLight = new THREE.MeshStandardMaterial({ color: 0xf0c98e, roughness: 0.9 });
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x8a542d, roughness: 0.86 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x633b25, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x315c91, roughness: 0.8 });
    const roofEdgeMat = new THREE.MeshStandardMaterial({ color: 0x24466f, roughness: 0.84 });
    const add=(geo,mat,x,y,z,cast=true)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;barn.add(m);return m;};

    // Thân nhà và hai đầu hồi tam giác.
    add(new THREE.BoxGeometry(5.2,3.35,4.2),wallMat,0,1.72,0);
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-2.6,0); gableShape.lineTo(2.6,0); gableShape.lineTo(0,1.85); gableShape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(gableShape,{depth:0.16,bevelEnabled:false});
    const frontGable=add(gableGeo,wallLight,0,3.38,2.02); frontGable.rotation.y=Math.PI;
    add(gableGeo,wallLight,0,3.38,-2.02);

    // Các tấm ván ngang và dầm khung nổi ở mặt trước.
    for(let y=0.45;y<=3.0;y+=0.48) add(new THREE.BoxGeometry(5.22,0.055,0.035),wallLight,0,y,2.115,false);
    for(const x of [-2.45,-1.65,1.65,2.45]) add(new THREE.BoxGeometry(0.18,3.35,0.16),beamMat,x,1.72,2.16);
    add(new THREE.BoxGeometry(5.45,0.2,0.2),beamMat,0,3.28,2.16);
    add(new THREE.BoxGeometry(1.55,2.15,0.14),doorMat,0,1.13,2.19);
    add(new THREE.BoxGeometry(1.28,1.88,0.08),beamMat,0,1.12,2.28);
    add(new THREE.BoxGeometry(0.09,1.8,0.06),wallLight,0,1.12,2.34,false);
    add(new THREE.SphereGeometry(0.07,10,8),new THREE.MeshStandardMaterial({color:0xf4cf70,metalness:0.35}),0.48,1.2,2.36,false);

    // Cửa sổ nhỏ hai bên cửa.
    for(const x of [-1.72,1.72]) {
      add(new THREE.BoxGeometry(0.76,0.78,0.12),beamMat,x,2.18,2.17);
      add(new THREE.BoxGeometry(0.58,0.6,0.06),new THREE.MeshStandardMaterial({color:0x83c6df,roughness:0.35}),x,2.18,2.25,false);
      add(new THREE.BoxGeometry(0.09,0.7,0.07),wallLight,x,2.18,2.3,false);
      add(new THREE.BoxGeometry(0.64,0.08,0.07),wallLight,x,2.18,2.3,false);
      add(new THREE.BoxGeometry(0.95,0.12,0.22),beamMat,x,1.73,2.28);
    }

    // Mái hai dốc ghép cân đối, hai mặt gặp nhau tại sống mái để tránh khe hở.
    const roofAngle = Math.atan2(1.75, 2.65);
    const roofLeft = add(new THREE.BoxGeometry(3.25, 0.20, 4.9), roofMat, -1.32, 4.25, 0);
    roofLeft.rotation.z = roofAngle;
    const roofRight = add(new THREE.BoxGeometry(3.25, 0.20, 4.9), roofMat, 1.32, 4.25, 0);
    roofRight.rotation.z = -roofAngle;
    add(new THREE.BoxGeometry(0.22, 0.24, 5.05), roofEdgeMat, 0, 5.08, 0);
    for (const z of [-2.43, 2.43]) add(new THREE.BoxGeometry(3.35, 0.10, 0.12), roofEdgeMat, 0, 3.43, z);
    for (const z of [-2.0,-1.35,-0.7,0,0.7,1.35,2.0]) {
      const leftTile = add(new THREE.BoxGeometry(3.18, 0.035, 0.035), roofEdgeMat, -1.32, 4.25, z, false); leftTile.rotation.z = roofAngle;
      const rightTile = add(new THREE.BoxGeometry(3.18, 0.035, 0.035), roofEdgeMat, 1.32, 4.25, z, false); rightTile.rotation.z = -roofAngle;
    }

    barn.position.set(-12,0,-12); this.scene.add(barn);
    // Vùng va chạm thân nhà, không bao gồm mái nhô ra và hiên trước.
    this.staticCollisionBoxes.push({minX:-14.6,maxX:-9.4,minZ:-14.2,maxZ:-9.8,kind:'barn'});
  }


  _createWindmill() {
    // Cối xay gió trang trí cạnh khu trồng trọt, dựng bằng hình học Three.js thuần.
    const mill = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x9a6032, roughness: 0.88 });
    const woodLight = new THREE.MeshStandardMaterial({ color: 0xc58b4d, roughness: 0.82 });
    const plaster = new THREE.MeshStandardMaterial({ color: 0xf0d9a9, roughness: 0.95 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x9b5737, roughness: 0.86 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x5e5143, roughness: 0.55, metalness: 0.18 });
    const add = (geo, mat, x, y, z, parent=mill) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
    };

    // Tháp hơi thuôn để có dáng cối xay gió làng quê.
    add(new THREE.CylinderGeometry(0.72, 1.0, 3.7, 8), plaster, 0, 1.85, 0);
    add(new THREE.CylinderGeometry(0.84, 0.84, 0.18, 8), wood, 0, 0.22, 0);
    // Các dầm gỗ dọc mặt trước.
    for (const x of [-0.42, 0, 0.42]) {
      const beam = add(new THREE.BoxGeometry(0.09, 3.15, 0.08), wood, x, 1.85, 0.76);
      beam.rotation.z = x * 0.07;
    }
    // Cửa và cửa sổ nhỏ hướng về khu ruộng.
    add(new THREE.BoxGeometry(0.55, 1.15, 0.12), wood, 0, 0.72, 0.79);
    add(new THREE.BoxGeometry(0.42, 0.95, 0.05), woodLight, 0, 0.7, 0.86);
    add(new THREE.BoxGeometry(0.46, 0.48, 0.1), wood, 0, 2.45, 0.73);
    add(new THREE.BoxGeometry(0.32, 0.34, 0.05), new THREE.MeshStandardMaterial({color:0x83c9df, roughness:0.35}), 0, 2.45, 0.8);
    add(new THREE.ConeGeometry(0.94, 0.75, 8), roofMat, 0, 4.05, 0);
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.18, 8), woodLight, 0, 4.43, 0);

    // Trục và bốn cánh được gom thành một group riêng để quay mượt.
    this.windmillRotor = new THREE.Group();
    this.windmillRotor.position.set(0, 3.45, 0.94);
    mill.add(this.windmillRotor);
    add(new THREE.CylinderGeometry(0.14, 0.14, 0.28, 12), metal, 0, 0, 0, this.windmillRotor).rotation.x = Math.PI/2;
    for (let i=0; i<4; i++) {
      const blade = new THREE.Group();
      blade.rotation.z = i * Math.PI/2;
      this.windmillRotor.add(blade);
      const spar = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.72, 0.12), wood,);
      spar.position.y = 0.86; spar.castShadow = true; spar.receiveShadow = true; blade.add(spar);
      const sail = new THREE.Mesh(new THREE.ShapeGeometry((() => {
        const sh = new THREE.Shape();
        sh.moveTo(-0.08,0.18); sh.lineTo(0.38,0.45); sh.lineTo(0.31,1.48); sh.lineTo(-0.08,1.58); sh.closePath();
        return sh;
      })()), new THREE.MeshStandardMaterial({color: i%2 ? 0xf7e6bf : 0xfff3d9, side:THREE.DoubleSide, roughness:0.82}));
      sail.position.set(0,0,0.075); sail.castShadow=true; blade.add(sail);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.07,1.45,0.08), woodLight);
      edge.position.set(0.29,0.95,0.1); edge.castShadow=true; blade.add(edge);
    }
    // Cối đặt sát mép ruộng, tránh lối đi chính và nhà kho.
    mill.position.set(10.8, 0, -9.5);
    mill.rotation.y = -0.16;
    this.scene.add(mill);
    this.windmill = mill;
    // Vùng va chạm quanh thân cối; cánh quay nằm cao nên không cản người chơi.
    this.staticCollisionBoxes.push({minX:9.75,maxX:11.85,minZ:-10.55,maxZ:-8.45,kind:'windmill'});
  }


  _createMapFoundation() {
    // Đường đất lấy từ dữ liệu bản đồ; các làn chính chạy ngoài mép ô trồng trọt.
    // Có thể chỉnh tọa độ/kích thước từng đoạn trong mapData.js.
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xb99a67, roughness: 1 });
    for (const path of WORLD_MAP.paths) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(path.width, path.depth), pathMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(path.x, 0.025, path.z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }

    // Quảng trường làng: lát đá tròn, đặt ở đầu con đường phía bắc.
    const plaza = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 32),
      new THREE.MeshStandardMaterial({ color: 0xd8c7a1, roughness: 0.95 })
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(WORLD_MAP.zones.village.x, 0.04, WORLD_MAP.zones.village.z);
    plaza.receiveShadow = true;
    this.scene.add(plaza);
    const fountain = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0xc8c2b2, roughness: 0.9 });
    const water = new THREE.MeshStandardMaterial({ color: 0x59c6df, roughness: 0.25, metalness: 0.08 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.18, 0.28, 16), stone);
    base.position.y = 0.18; fountain.add(base);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.9, 0.12, 16), water);
    basin.position.y = 0.36; fountain.add(basin);
    const center = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.55, 10), stone);
    center.position.y = 0.57; fountain.add(center);
    fountain.position.set(WORLD_MAP.zones.village.x, 0, WORLD_MAP.zones.village.z);
    fountain.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(fountain);

    // Hồ câu cá phía đông: bờ cỏ, nước xanh và đá viền; vùng nước có va chạm để tránh đi xuyên hồ.
    this._createPond(WORLD_MAP.zones.fishingLake, 0x55c5dd, 0x5b9d49, true);
    this._createPond(WORLD_MAP.zones.lotusPond, 0x5bc5c2, 0x5b9d49, true);

    // Cụm cây rừng được đặt trong vùng riêng, tránh lấn vào đường và hồ.
    this._createForestCluster(WORLD_MAP.zones.forest);

    // Cửa hàng nhỏ ở phía tây, tách biệt với nhà kho hiện hữu.
    this._createSmallBuilding(WORLD_MAP.zones.shop.x, WORLD_MAP.zones.shop.z, 0xd98955, 0x9d4938, 'shop');

    // Chuồng chăn nuôi được dựng thành các đoạn hàng rào thấp, để trống lối vào phía nam.
    this._createLivestockPen(WORLD_MAP.zones.livestock);

    // Cổng dịch chuyển là cột đá và vòng sáng; mặc định khóa để làm mốc cho nội dung tương lai.
    this._createPortal(WORLD_MAP.zones.teleportGate);

    // Biển chỉ dẫn khu vực giúp đọc bố cục ngay trong thế giới 3D.
    const labels = [
      { zone: 'village', text: 'KHU LÀNG', color: '#8a5732' },
      { zone: 'shop', text: 'CỬA HÀNG', color: '#8a5732' },
      { zone: 'fishingLake', text: 'CÂU CÁ', color: '#246a88' },
      { zone: 'livestock', text: 'CHĂN NUÔI', color: '#557b3d' },
      { zone: 'lotusPond', text: 'AO SEN', color: '#246a88' }
    ];
    labels.push(
      { zone: 'storage', text: 'NHÀ KHO', color: '#8a5732' },
      { zone: 'forest', text: 'KHU RỪNG', color: '#557b3d' },
      { zone: 'windmill', text: 'CỐI XAY GIÓ', color: '#8a5732' },
      { zone: 'teleportGate', text: 'CỔNG DỊCH CHUYỂN', color: '#465f91' }
    );
    labels.forEach(item => {
      const zone = WORLD_MAP.zones[item.zone];
      const zOffset = item.zone === 'teleportGate' ? 1.25 : (item.zone === 'storage' ? 1.0 : 0);
      this._createSign(zone.x, zone.z + zOffset, item.text, item.color);
    });
    this._createWorldDecorations();
  }

  _createWorldDecorations() {
    const decor = WORLD_MAP.decorations || {};
    const flowerColors = [0xffd166, 0xf28ca8, 0xf7f4dc, 0xb8a1e3];
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x477b3d, roughness: 1 });
    const petalMats = flowerColors.map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    const centerMat = new THREE.MeshStandardMaterial({ color: 0xffdf70, roughness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4d994b, roughness: 1 });

    // Hoa nhỏ được đặt ở mép các khu vực, không tạo collider để không ảnh hưởng di chuyển.
    for (const bed of (decor.flowerBeds || [])) {
      const group = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        const x = Math.cos(a) * 0.38 * bed.scale;
        const z = Math.sin(a) * 0.3 * bed.scale;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.34 * bed.scale, 5), stemMat);
        stem.position.set(x, 0.17 * bed.scale, z); group.add(stem);
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.10 * bed.scale, 6, 5), leafMat);
        leaf.scale.set(1.35, 0.42, 0.75);
        leaf.position.set(x + 0.08 * bed.scale, 0.12 * bed.scale, z + 0.05 * bed.scale); group.add(leaf);
        const petals = new THREE.Mesh(new THREE.SphereGeometry(0.13 * bed.scale, 7, 5), petalMats[i % petalMats.length]);
        petals.scale.set(1, 0.72, 1); petals.position.set(x, 0.38 * bed.scale, z); group.add(petals);
        const center = new THREE.Mesh(new THREE.SphereGeometry(0.045 * bed.scale, 6, 4), centerMat);
        center.position.set(x, 0.4 * bed.scale, z); group.add(center);
      }
      group.position.set(bed.x, 0, bed.z);
      group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.scene.add(group);
    }

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x929c8d, roughness: 0.98 });
    for (const item of (decor.rocks || [])) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32 * item.scale, 0), rockMat);
      rock.position.set(item.x, 0.16 * item.scale, item.z);
      rock.scale.set(1.25, 0.7, 0.9);
      rock.rotation.y = (item.x + item.z) * 0.17;
      rock.castShadow = true; rock.receiveShadow = true;
      this.scene.add(rock);
    }

    // Bụi cây tròn nhiều lớp, dùng chung vật liệu để giảm số lần tạo tài nguyên GPU.
    const bushMats = [0x3f8b45, 0x55a34f, 0x6caf55].map(color => new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    const bushGeo = new THREE.SphereGeometry(0.42, 8, 6);
    for (const item of (decor.bushes || [])) {
      const bush = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const puff = new THREE.Mesh(bushGeo, bushMats[i]);
        puff.position.set((i - 1) * 0.29 * item.scale, (0.25 + (i % 2) * 0.08) * item.scale, (i % 2 ? 0.12 : -0.08) * item.scale);
        puff.scale.set(1.0, 0.82, 0.88); puff.castShadow = true; puff.receiveShadow = true; bush.add(puff);
      }
      bush.position.set(item.x, 0, item.z);
      this.scene.add(bush);
    }

    // Bụi cỏ thấp ở rìa đất, không có collider và không phủ lên các đường đi.
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x76b957, roughness: 1, side: THREE.DoubleSide });
    const grassGeo = new THREE.ConeGeometry(0.09, 0.34, 4);
    for (const item of (decor.grassTufts || [])) {
      const tuft = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const blade = new THREE.Mesh(grassGeo, grassMat);
        blade.position.set((i - 1) * 0.11, 0.15, (i % 2) * 0.07);
        blade.rotation.z = (i - 1) * 0.22; tuft.add(blade);
      }
      tuft.position.set(item.x, 0, item.z);
      this.scene.add(tuft);
    }

    // Đèn lồng đôi đánh dấu quảng trường làng; đặt lệch tâm để không chắn vòi phun.
    const lanternWood = new THREE.MeshStandardMaterial({ color: 0x79502f, roughness: 0.85 });
    const lanternGlow = new THREE.MeshStandardMaterial({ color: 0xffd878, emissive: 0x9a5b12, emissiveIntensity: 0.45, roughness: 0.4 });
    for (const x of [-2.35, 2.35]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.55, 7), lanternWood);
      post.position.set(x, 0.775, -12.8); post.castShadow = true; this.scene.add(post);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.34), lanternGlow);
      lamp.position.set(x, 1.72, -12.8); lamp.castShadow = true; this.scene.add(lamp);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.18, 4), lanternWood);
      cap.position.set(x, 2.02, -12.8); cap.rotation.y = Math.PI / 4; this.scene.add(cap);
    }
  }

  _createForestCluster(zone) {
    const positions = [[-1.15,-1.1],[0.25,-1.45],[1.05,0.15],[-0.55,1.25],[0.65,1.35]];
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x765037, roughness: 0.95 });
    const leafMats = [0x2f773b, 0x438b42, 0x347b4a].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
    positions.forEach(([ox,oz],i) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.24,1.25,7),trunkMat); trunk.position.y=0.63; tree.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.88,9,7),leafMats[i%leafMats.length]); crown.position.y=1.75; crown.scale.set(1,1.05,0.95); tree.add(crown);
      tree.position.set(zone.x+ox,0,zone.z+oz); tree.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}}); this.scene.add(tree);
      this.staticCollisionBoxes.push({minX:tree.position.x-0.28,maxX:tree.position.x+0.28,minZ:tree.position.z-0.28,maxZ:tree.position.z+0.28,kind:'forest-tree'});
    });
  }

  _createPond(zone, waterColor, bankColor, addCollision) {
    const group = new THREE.Group();
    const bankMat = new THREE.MeshStandardMaterial({ color: bankColor, roughness: 1 });
    const waterMat = new THREE.MeshStandardMaterial({ color: waterColor, roughness: 0.28, metalness: 0.06 });
    const rx = zone.width / 2, rz = zone.depth / 2;
    const bank = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.22, 32), bankMat);
    bank.scale.set(rx, 1, rz); bank.position.y = 0.08; group.add(bank);
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 32), waterMat);
    water.scale.set(rx - 0.35, rz - 0.35, 1); water.rotation.x = -Math.PI / 2; water.position.y = 0.205; group.add(water);
    // Một vài tảng đá nhỏ quanh bờ tạo silhouette, không che mặt nước.
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8b9992, roughness: 0.96 });
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + 0.18;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + (i % 3) * 0.045, 0), rockMat);
      rock.position.set(Math.cos(a) * (rx - 0.12), 0.2, Math.sin(a) * (rz - 0.12));
      rock.scale.y = 0.65; rock.castShadow = true; group.add(rock);
    }
    group.position.set(zone.x, 0, zone.z);
    group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(group);
    if (addCollision) this.staticCollisionBoxes.push({ minX: zone.x - rx + 0.25, maxX: zone.x + rx - 0.25, minZ: zone.z - rz + 0.25, maxZ: zone.z + rz - 0.25, kind: 'pond' });
  }

  _createSmallBuilding(x, z, wallColor, roofColor, kind) {
    const g = new THREE.Group();
    const wall = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 });
    const roof = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.85 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x704528, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.1, 2.5), wall); body.position.y = 1.08; g.add(body);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.25, 1.3, 4), roof); top.position.set(0, 2.75, 0); top.rotation.y = Math.PI / 4; top.scale.set(1, 1, 0.82); g.add(top);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.25, 0.12), wood); door.position.set(0, 0.68, 1.28); g.add(door);
    const awning = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.8), roof); awning.position.set(0, 1.78, 1.7); g.add(awning);
    g.position.set(x, 0, z); g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); this.scene.add(g);
    this.staticCollisionBoxes.push({ minX: x - 1.55, maxX: x + 1.55, minZ: z - 1.3, maxZ: z + 1.3, kind });
  }

  _createLivestockPen(zone) {
    const wood = new THREE.MeshStandardMaterial({ color: 0x9a673b, roughness: 0.9 });
    const x1 = zone.x - zone.width / 2, x2 = zone.x + zone.width / 2;
    const z1 = zone.z - zone.depth / 2, z2 = zone.z + zone.depth / 2;
    const addRail = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), wood); m.position.set(x, 0.48, z); m.castShadow = true; this.scene.add(m); };
    for (const z of [z1, z2]) { addRail(zone.width, 0.12, zone.x, z); }
    addRail(0.12, zone.depth, x1, zone.z);
    // Chừa cửa vào ở giữa cạnh phía tây, hướng về đường đi chính.
    addRail(0.12, 1.25, x1, zone.z - 1.55); addRail(0.12, 1.25, x1, zone.z + 1.55);
    addRail(0.12, zone.depth, x2, zone.z);
    for (let x = x1; x <= x2 + 0.01; x += 1.1) for (const z of [z1, z2]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.85, 0.18), wood); post.position.set(x, 0.42, z); post.castShadow = true; this.scene.add(post); }
    // Va chạm khớp với hàng rào: ba cạnh kín và hai đoạn ngắn ở cạnh tây,
    // để khoảng cửa ở giữa thực sự đi qua được.
    this.staticCollisionBoxes.push(
      { minX: x1, maxX: x2, minZ: z1 - 0.12, maxZ: z1 + 0.12, kind: 'pen-fence' },
      { minX: x1, maxX: x2, minZ: z2 - 0.12, maxZ: z2 + 0.12, kind: 'pen-fence' },
      { minX: x2 - 0.12, maxX: x2 + 0.12, minZ: z1, maxZ: z2, kind: 'pen-fence' },
      { minX: x1 - 0.12, maxX: x1 + 0.12, minZ: z1, maxZ: zone.z - 0.8, kind: 'pen-fence' },
      { minX: x1 - 0.12, maxX: x1 + 0.12, minZ: zone.z + 0.8, maxZ: z2, kind: 'pen-fence' }
    );
  }

  _createPortal(zone) {
    const g = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0x8d9ca7, roughness: 0.75 });
    const glow = new THREE.MeshStandardMaterial({ color: 0x49d7ff, emissive: 0x149dff, emissiveIntensity: 1.4, roughness: 0.25 });
    for (const x of [-0.95, 0.95]) { const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 2.4, 8), stone); pillar.position.set(x, 1.2, 0); g.add(pillar); }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.16, 8, 24, Math.PI), stone); arch.position.y = 2.1; arch.rotation.z = Math.PI; g.add(arch);
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.76, 24), glow); core.position.set(0, 1.22, -0.05); g.add(core);
    g.position.set(zone.x, 0, zone.z); g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); this.scene.add(g);
    this.portalGlow = core;
    this.staticCollisionBoxes.push({ minX: zone.x - 1.3, maxX: zone.x + 1.3, minZ: zone.z - 0.35, maxZ: zone.z + 0.35, kind: 'portal' });
  }

  _createSign(x, z, text, color) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color; ctx.strokeStyle = '#f9e5b2'; ctx.lineWidth = 8;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(8, 8, 496, 112, 22);
    else { ctx.rect(8, 8, 496, 112); }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff8df'; ctx.font = 'bold 42px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 64, 470);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.58), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
    board.position.set(x, 2.0, z); board.rotation.y = Math.PI * 0.08; this.scene.add(board);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.35, 8), new THREE.MeshStandardMaterial({ color: 0x81512f }));
    post.position.set(x, 0.68, z); post.castShadow = true; this.scene.add(post);
  }

  _createFarmPlots() {
    this.plotsGroup = new THREE.Group(); this.scene.add(this.plotsGroup);
    const { gridSize, plotSize } = CONFIG.farm;
    const offset = (gridSize - 1) * plotSize / 2;
    for (let iz = 0; iz < gridSize; iz++) {
      for (let ix = 0; ix < gridSize; ix++) {
        const x = ix * plotSize - offset;
        const z = iz * plotSize - offset;
        const plot = new Plot(x, z, ix, iz, plotSize, this.plotsGroup, this.onMessage);
        state.plots.push(plot);
      }
    }

    const loaded = loadGame();
    if (loaded && loaded.plotsData) {
      loaded.plotsData.forEach(pData => {
        const plot = state.plots.find(p => p.ix === pData.ix && p.iz === pData.iz);
        if (plot) plot.restoreState(pData, loaded.elapsedSeconds);
      });
    }
  }

  getPlayerCollisionData() {
    // Ô đất là bề mặt đi được; cây trồng đang lớn/chín có vùng va chạm nhỏ.
    const circles = [];
    for (const plot of state.plots) {
      if ((plot.state === 'planted' || plot.state === 'grown') && plot.cropType) {
        circles.push({ x: plot.x, z: plot.z, radius: 0.18, kind: 'crop' });
      }
    }
    return { bounds: this.worldCollisionBounds, boxes: this.staticCollisionBoxes, circles };
  }

  updateDayNight(t) {
    const sunAngle = t * Math.PI * 2 - Math.PI / 2;
    this.sun.position.x = Math.cos(sunAngle) * 30;
    this.sun.position.y = Math.sin(sunAngle) * 35 + 5;
    this.sun.position.z = 15;
    const intensity = Math.max(0.15, Math.sin(sunAngle) * 0.9 + 0.3);
    this.sun.intensity = intensity;
    this.ambient.intensity = 0.25 + intensity * 0.3;
    const dayColor = new THREE.Color(0x87CEEB);
    const nightColor = new THREE.Color(0x0a1628);
    const sky = dayColor.clone().lerp(nightColor, 1 - Math.max(0, Math.sin(sunAngle)));
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(dt = 1/60) {
    if (this.windmillRotor) this.windmillRotor.rotation.z += 0.36 * Math.min(dt, 0.05);
    if (this.portalGlow) this.portalGlow.material.emissiveIntensity = 1.0 + 0.35 * Math.sin(performance.now() * 0.002);
    this.controls.update(); this.renderer.render(this.scene, this.camera);
  }
  get domElement() { return this.renderer.domElement; }
}