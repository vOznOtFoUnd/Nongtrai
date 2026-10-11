import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from './config.js';
import { Plot } from './plot.js';
import { state, loadGame } from './state.js';

export class GameScene {
  constructor(container, onMessage) {
    this.container = container; this.onMessage = onMessage;
    this.scene = new THREE.Scene();
    this.staticCollisionBoxes = [];
    this.worldCollisionBounds = { minX: -15.25, maxX: 15.25, minZ: -15.25, maxZ: 15.25 };
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, CONFIG.world.fogNear, CONFIG.world.fogFar);
    
    this._createCamera(); 
    this._createRenderer(); 
    this._createControls();
    this._createLights(); 
    this._createEnvironment(); 
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
    this.controls.enablePan = true;
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
      {axis:'z', fixed:-16, start:-14, end:14}, {axis:'z', fixed:16, start:-14, end:14}
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
        if (side.axis==='x') addBox(length+0.08,0.17,0.13,railMat,(side.start+side.end)/2,y,side.fixed);
        else addBox(0.13,0.17,length+0.08,railMat,side.fixed,y,(side.start+side.end)/2);
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
    // Va chạm theo chu vi hàng rào, chừa lối vào ở cạnh z dương.
    const t=0.24, inner=15.45, outer=16.3;
    this.staticCollisionBoxes.push(
      {minX:-16.3,maxX:-15.7,minZ:-16.3,maxZ:16.3,kind:'fence'},
      {minX:15.7,maxX:16.3,minZ:-16.3,maxZ:16.3,kind:'fence'},
      {minX:-16.3,maxX:16.3,minZ:-16.3,maxZ:-15.7,kind:'fence'},
      {minX:-16.3,maxX:-3.0,minZ:15.7,maxZ:16.3,kind:'fence'},
      {minX:3.0,maxX:16.3,minZ:15.7,maxZ:16.3,kind:'fence'}
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

    // Mái hai dốc ghép từ hai tấm dày, phủ ngói xanh dạng hàng để tạo texture.
    const roofLeft=add(new THREE.BoxGeometry(3.35,0.22,5.0),roofMat,-1.45,4.18,0);
    roofLeft.rotation.z=-Math.atan2(1.9,2.7);
    const roofRight=add(new THREE.BoxGeometry(3.35,0.22,5.0),roofMat,1.45,4.18,0);
    roofRight.rotation.z=Math.atan2(1.9,2.7);
    for(const z of [-2.25,-1.5,-0.75,0,0.75,1.5,2.25]) {
      for(const side of [-1,1]) {
        const tile=add(new THREE.BoxGeometry(1.05,0.07,0.66),roofEdgeMat,side*1.45,4.25,z,false);
        tile.rotation.z=side<0?-Math.atan2(1.9,2.7):Math.atan2(1.9,2.7);
      }
    }
    // Viền mái và thanh đỉnh mái.
    add(new THREE.BoxGeometry(0.2,0.22,5.25),roofEdgeMat,0,5.08,0);
    for(const side of [-1,1]) {
      const fascia=add(new THREE.BoxGeometry(0.18,0.22,5.25),beamMat,side*2.8,3.45,0);
      fascia.rotation.z=side<0?-Math.atan2(1.9,2.7):Math.atan2(1.9,2.7);
    }
    // Hiên nhỏ phía trước, đỡ bằng hai cột gỗ.
    add(new THREE.BoxGeometry(2.7,0.2,1.0),beamMat,0,0.42,2.75);
    for(const x of [-1.12,1.12]) add(new THREE.BoxGeometry(0.16,1.65,0.16),beamMat,x,1.2,3.05);
    const awning=add(new THREE.BoxGeometry(3.0,0.18,1.25),roofMat,0,2.0,2.8); awning.rotation.x=-0.08;

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

  render() {
    if (this.windmillRotor) this.windmillRotor.rotation.z += 0.006;
    this.controls.update(); this.renderer.render(this.scene, this.camera);
  }
  get domElement() { return this.renderer.domElement; }
}