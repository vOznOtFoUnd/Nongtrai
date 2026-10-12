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
    this.sun.shadow.camera.left = -90; this.sun.shadow.camera.right = 90;
    this.sun.shadow.camera.top = 115; this.sun.shadow.camera.bottom = -115;
    this.sun.shadow.bias = -0.001; this.scene.add(this.sun);
    this.scene.add(new THREE.HemisphereLight(0x87CEEB, 0x3d7a37, 0.35));
  }

  _createEnvironment() {
    this._createIslandCoast();

    const path = new THREE.Mesh(new THREE.PlaneGeometry(4, 20), new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.9 }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, 20); path.receiveShadow = true; this.scene.add(path);

    this._createFarmFence(); this._createTrees(); this._createBarn(); this._createWindmill();
  }

  _createIslandCoast() {
    this.oceanLife = [];
    // Biển bao quanh toàn bộ đảo; mặt nước nằm thấp hơn bãi cát để tránh z-fighting.
    const oceanMat = new THREE.MeshStandardMaterial({ color: 0x167fa8, roughness: 0.3, metalness: 0.12 });
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(520, 620), oceanMat);
    ocean.rotation.x = -Math.PI / 2; ocean.position.y = -0.62; ocean.receiveShadow = true; this.scene.add(ocean);

    // Bãi cát hình chữ nhật chạy liền quanh đảo. Thảm cỏ nằm trên phần lõi, chừa dải cát rộng 9 đơn vị.
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xe8d19a, roughness: 1.0 });
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(153, 204), sandMat);
    sand.rotation.x = -Math.PI / 2; sand.position.y = -0.045; sand.receiveShadow = true; this.scene.add(sand);

    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(135, 186),
      new THREE.MeshStandardMaterial({ color: 0x3d8b40, roughness: 0.95, metalness: 0.02 })
    );
    grass.rotation.x = -Math.PI / 2; grass.position.y = 0.005; grass.receiveShadow = true; this.scene.add(grass);

    // Dải bọt sóng mảnh ở mép cát, chia thành bốn cạnh để tạo đường bờ biển dễ nhận biết.
    const foamMat = new THREE.MeshStandardMaterial({ color: 0xc9f4f4, transparent: true, opacity: 0.78, roughness: 0.45 });
    const foamParts = [
      { w: 153, d: 0.8, x: 0, z: -101.25 }, { w: 153, d: 0.8, x: 0, z: 101.25 },
      { w: 0.8, d: 204, x: -76.1, z: 0 }, { w: 0.8, d: 204, x: 76.1, z: 0 }
    ];
    for (const part of foamParts) {
      const foam = new THREE.Mesh(new THREE.PlaneGeometry(part.w, part.d), foamMat);
      foam.rotation.x = -Math.PI / 2; foam.position.set(part.x, -0.012, part.z); this.scene.add(foam);
    }

    // Vệt cát nhỏ và vỏ sò rải dọc bãi biển; dùng ít mesh và vật liệu dùng chung.
    const shellMat = new THREE.MeshStandardMaterial({ color: 0xfff0cf, roughness: 0.8 });
    const pebbleMat = new THREE.MeshStandardMaterial({ color: 0xc4b184, roughness: 1 });
    for (let i = 0; i < 68; i++) {
      const t = i / 17;
      const side = i % 4;
      const along = -0.46 + (t % 1) * 0.92;
      const x = side === 0 ? along * 70 : side === 1 ? along * 70 : side === 2 ? -70 + (i % 17) * 8.75 : 70 - (i % 17) * 8.75;
      const z = side === 0 ? -94 + (i % 17) * 11.75 : side === 1 ? 94 - (i % 17) * 11.75 : along * 94;
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), i % 3 === 0 ? shellMat : pebbleMat);
      shell.scale.set(1.25, 0.28, 0.75); shell.position.set(x, 0.015, z); this.scene.add(shell);
    }

    // Không dựng hàng rào quanh đảo: bãi cát mở ra biển, nhưng mép đảo vẫn chặn người chơi.
    this.staticCollisionBoxes.push(
      { minX: -77.3, maxX: -76.7, minZ: -102.5, maxZ: 102.5, kind: 'island-edge' },
      { minX: 76.7, maxX: 77.3, minZ: -102.5, maxZ: 102.5, kind: 'island-edge' },
      { minX: -77.3, maxX: 77.3, minZ: -102.5, maxZ: -101.7, kind: 'island-edge' },
      { minX: -77.3, maxX: 77.3, minZ: 101.7, maxZ: 102.5, kind: 'island-edge' }
    );

    this._createBeachDock();
    this._createBeachFishingSpots();
    this._createBeachCreatures();
    this._createOceanAnimals();
  }

  _createBeachFishingSpots() {
    const wood=new THREE.MeshStandardMaterial({color:0x936238,roughness:.9});
    const rope=new THREE.MeshStandardMaterial({color:0x554638,roughness:1});
    const signMat=new THREE.MeshStandardMaterial({color:0x4e9dca,roughness:.7});
    // Three readable fishing spots along the beach; these are scenery markers for the beach-fishing panel.
    for (const [x,z,rot] of [[70,-17,-.25],[70,17,.2],[45,94,-.4]]) {
      const marker=new THREE.Group();
      const post=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,1.35,7),wood); post.position.y=.66; marker.add(post);
      const board=new THREE.Mesh(new THREE.BoxGeometry(.95,.48,.12),signMat); board.position.set(0,1.25,0); marker.add(board);
      const rod=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,1.65,6),wood); rod.position.set(.35,1.3,.1); rod.rotation.z=-.45; marker.add(rod);
      const line=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.75,4),rope); line.position.set(.68,.83,.1); marker.add(line);
      marker.position.set(x,0,z); marker.rotation.y=rot; marker.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}}); this.scene.add(marker);
    }
  }

  _createBeachDock() {
    const dock = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x936238, roughness: 0.9 });
    const plank = new THREE.MeshStandardMaterial({ color: 0xb9814d, roughness: 0.86 });
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x684326, roughness: 0.95 });
    const addBox = (w, h, d, mat, x, y, z, parent = dock) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    // Bến gỗ nằm ở bờ đông, từ dải cát hướng ra biển; mặt sàn hơi nhô khỏi mặt nước.
    for (let x = 63; x <= 75.2; x += 1.25) {
      addBox(1.18, 0.22, 4.0, plank, x, 0.18, -3.0);
      for (const z of [-4.65, -1.35]) addBox(0.24, 1.0, 0.24, darkWood, x, -0.2, z);
    }
    addBox(13.4, 0.16, 0.2, wood, 69.0, 0.28, -4.8);
    addBox(13.4, 0.16, 0.2, wood, 69.0, 0.28, -1.2);
    // Bollards at the pier head.
    for (const z of [-4.6, -1.4]) {
      addBox(0.38, 0.72, 0.38, darkWood, 74.8, 0.55, z);
      addBox(0.52, 0.12, 0.52, plank, 74.8, 0.94, z);
    }
    this.scene.add(dock);
    this.staticCollisionBoxes.push({ minX: 62.2, maxX: 75.8, minZ: -5.1, maxZ: -0.9, kind: 'beach-dock' });

    // Small stylized moored boat alongside the end of the pier.
    const boat = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xc65b3b, roughness: 0.75 });
    const insideMat = new THREE.MeshStandardMaterial({ color: 0xf0d29a, roughness: 0.9 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.58, 1.55), hullMat);
    hull.position.y = -0.04; hull.scale.set(1, 0.72, 1); boat.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.82, 1.35, 4), hullMat);
    bow.rotation.z = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(2.05, -0.02, 0); boat.add(bow);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.16, 1.1), insideMat); seat.position.set(-0.2, 0.25, 0); boat.add(seat);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 2.1, 6), darkWood); mast.position.set(-0.9, 0.85, 0); boat.add(mast);
    const sail = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0xfff1cf, side: THREE.DoubleSide, roughness: 0.95 }));
    const sailGeom = new THREE.BufferGeometry();
    sailGeom.setAttribute('position', new THREE.Float32BufferAttribute([-0.85,0.15,0, -0.85,1.85,0, 0.48,0.25,0],3));
    sailGeom.setIndex([0,1,2]); sailGeom.computeVertexNormals(); sail.geometry = sailGeom; boat.add(sail);
    boat.position.set(73.1, -0.18, 1.25); boat.rotation.y = -0.28;
    boat.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(boat); this.mooredBoat = boat;
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x594735, roughness: 1 });
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,1.7,5), ropeMat);
    rope.position.set(74.2,0.03,0.1); rope.rotation.z = Math.PI/2; this.scene.add(rope);
  }

  _createBeachCreatures() {
    const crabRed = new THREE.MeshStandardMaterial({ color: 0xd94e37, roughness: 0.8 });
    const crabDark = new THREE.MeshStandardMaterial({ color: 0x8d352b, roughness: 0.9 });
    const starMats = [0xe88b39, 0xe8b64d, 0xd96d8b];
    const shellMats = [0xf1d8ad, 0xe9a7a1, 0xd8c7ee];
    const makeCrab = (x,z,scale=1) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.32,10,7), crabRed); body.scale.set(1.15,0.58,0.85); body.position.y=0.22; g.add(body);
      for (const side of [-1,1]) {
        for (let i=0;i<3;i++) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.055,0.43,5), crabDark);
          leg.position.set(side*(0.25+i*0.08),0.12,-0.24+i*0.24); leg.rotation.z=side*0.85; leg.rotation.x=(i-1)*0.18; g.add(leg);
        }
        const claw = new THREE.Mesh(new THREE.SphereGeometry(0.12,7,5), crabRed); claw.position.set(side*0.43,0.26,-0.43); g.add(claw);
        const eyeStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.03,0.16,5), crabDark); eyeStem.position.set(side*0.13,0.42,0.12); g.add(eyeStem);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055,7,5), new THREE.MeshStandardMaterial({color:0xffffff})); eye.position.set(side*0.13,0.52,0.12); g.add(eye);
      }
      g.position.set(x,0.015,z); g.scale.setScalar(scale); g.rotation.y = (x+z)*0.07; this.scene.add(g);
    };
    const makeStarfish = (x,z,scale=1,matIndex=0) => {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.2,0.09,5), starMats[matIndex%starMats.length]); core.position.y=0.065; g.add(core);
      for(let i=0;i<5;i++) {
        const arm = new THREE.Mesh(new THREE.ConeGeometry(0.105,0.52,5), starMats[matIndex%starMats.length]);
        arm.position.y=0.07; arm.position.x=Math.cos(i*Math.PI*2/5)*0.31; arm.position.z=Math.sin(i*Math.PI*2/5)*0.31;
        arm.rotation.z=-Math.cos(i*Math.PI*2/5)*0.82; arm.rotation.x=Math.sin(i*Math.PI*2/5)*0.82; g.add(arm);
      }
      g.position.set(x,0.02,z); g.scale.setScalar(scale); g.rotation.y=(x-z)*0.12; this.scene.add(g);
    };
    const makeShell = (x,z,scale=1,matIndex=0) => {
      const g = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.22,9,6), shellMats[matIndex%shellMats.length]); shell.scale.set(1,0.55,0.72); shell.position.y=0.12; g.add(shell);
      const spiral = new THREE.Mesh(new THREE.TorusGeometry(0.07,0.025,5,8), new THREE.MeshStandardMaterial({color:0xb88975,roughness:1})); spiral.position.set(0.02,0.23,0.02); g.add(spiral);
      g.position.set(x,0.015,z); g.scale.setScalar(scale); g.rotation.y=(x+z)*0.13; this.scene.add(g);
    };
    const shoreline = [
      [-68,-87],[-52,-96],[-30,-96],[-8,-96],[18,-96],[42,-95],[66,-82],
      [68,-58],[69,-31],[69,20],[68,48],[61,78],[40,95],[12,96],[-18,96],[-45,93],[-67,77],
      [-68,52],[-69,25],[-68,-10],[-68,-42],[-67,-65]
    ];
    shoreline.forEach(([x,z],i)=>{
      if(i%3===0) makeCrab(x,z,0.8+(i%2)*0.15);
      if(i%3===1) makeStarfish(x+(i%2?1.1:-1.1),z+0.9,0.78,i%3);
      if(i%3===2) makeShell(x-0.8,z-0.6,0.75,i%3);
    });
    // Extra clusters near the pier and the southern beach.
    makeCrab(60,-7,0.85); makeCrab(58,5,0.75);
    makeStarfish(55,-8,0.9,1); makeStarfish(-48,96,0.85,2);
    makeShell(64,-8,0.9,0); makeShell(-61,88,0.85,1);
  }

  _createOceanAnimals() {
    const makeFish = (kind, color, scale, x, z, routeX, routeZ, speed, phase) => {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.04 });
      const finMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.78), roughness: 0.6 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1,14,10), bodyMat);
      body.scale.set(kind==='whale'?2.15:kind==='dolphin'?1.25:0.95, kind==='whale'?0.72:kind==='dolphin'?0.58:0.62, kind==='whale'?0.72:kind==='dolphin'?0.5:0.48);
      group.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(kind==='whale'?0.58:0.34, kind==='whale'?1.15:0.7, 5), finMat);
      tail.rotation.x=Math.PI/2; tail.position.set(kind==='whale'?-2.15:-1.18,0,0); group.add(tail);
      const dorsal = new THREE.Mesh(new THREE.ConeGeometry(kind==='shark'?0.45:0.28,kind==='shark'?0.85:0.48,5),finMat);
      dorsal.position.set(0,kind==='whale'?0.68:0.48,0); dorsal.rotation.z=Math.PI; group.add(dorsal);
      for (const side of [-1,1]) {
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.22,kind==='whale'?0.9:0.55,5),finMat);
        fin.position.set(0,-0.25,side*0.55); fin.rotation.x=side*0.7; fin.rotation.z=0.7; group.add(fin);
      }
      if(kind==='dolphin') { body.rotation.z=-0.12; }
      if(kind==='shark') {
        const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.45,9,6),new THREE.MeshStandardMaterial({color:0xe9e7df,roughness:0.9})); jaw.scale.set(1.2,0.22,0.55); jaw.position.set(0,-0.32,0); group.add(jaw);
      }
      group.scale.setScalar(scale); group.position.set(x,-0.08,z); group.rotation.y=0;
      group.traverse(o=>{if(o.isMesh){o.castShadow=true; o.receiveShadow=true;}}); this.scene.add(group);
      this.oceanLife.push({group, baseX:x, baseZ:z, routeX, routeZ, speed, phase, kind});
    };
    // Animals swim in broad paths outside the sandy shoreline. Their silhouettes stay near the water surface.
    makeFish('whale',0x4f8fb4,1.8,-120,-75,26,9,0.22,0.2);
    makeFish('dolphin',0x729fb5,1.05,115,-18,18,34,0.42,1.8);
    makeFish('shark',0x647b8c,1.15,-115,38,22,30,0.3,3.4);
    makeFish('dolphin',0x7bb4c5,0.8,100,75,30,15,0.48,4.6);
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
      {axis:'x', fixed:-102, start:-76.5, end:76.5}, {axis:'x', fixed:102, start:-76.5, end:76.5},
      {axis:'z', fixed:-76.5, start:-102, end:102}, {axis:'z', fixed:76.5, start:-102, end:102}
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
      {minX:-77.3,maxX:-76.7,minZ:-102.5,maxZ:102.5,kind:'fence'},
      {minX:76.7,maxX:77.3,minZ:-102.5,maxZ:102.5,kind:'fence'},
      {minX:-77.3,maxX:77.3,minZ:-102.5,maxZ:-101.7,kind:'fence'},
      {minX:-77.3,maxX:77.3,minZ:101.7,maxZ:102.5,kind:'fence'}
    );
  }

  _createFarmFence() {
    // Hàng rào riêng cho ruộng trung tâm, chừa cổng ở bốn phía để nối đường đi.
    const group = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0x8a572d, roughness: 0.82 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xa86b35, roughness: 0.86 });
    const post = (x,z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.22,1.0,0.22),postMat);
      m.position.set(x,0.5,z); m.castShadow=true; group.add(m);
    };
    const horizontal = (x1,x2,z) => {
      if (x2 <= x1) return;
      const len=x2-x1;
      const rail=new THREE.Mesh(new THREE.BoxGeometry(len,0.13,0.12),railMat);
      rail.position.set((x1+x2)/2,0.48,z); rail.castShadow=true; group.add(rail);
      const rail2=rail.clone(); rail2.position.y=0.78; group.add(rail2);
      for(let x=x1;x<=x2+0.01;x+=2) post(x,z);
      post(x2,z);
    };
    const vertical = (z1,z2,x) => {
      if (z2 <= z1) return;
      const len=z2-z1;
      const rail=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.13,len),railMat);
      rail.position.set(x,0.48,(z1+z2)/2); rail.castShadow=true; group.add(rail);
      const rail2=rail.clone(); rail2.position.y=0.78; group.add(rail2);
      for(let z=z1;z<=z2+0.01;z+=2) post(x,z);
      post(x,z2);
    };
    const edge=9.8, gate=1.15;
    horizontal(-edge,-gate,-edge); horizontal(gate,edge,-edge);
    horizontal(-edge,-gate,edge); horizontal(gate,edge,edge);
    vertical(-edge,-gate,-edge); vertical(gate,edge,-edge);
    vertical(-edge,-gate,edge); vertical(gate,edge,edge);
    this.scene.add(group);
    // Va chạm cùng các đoạn hàng rào; cổng để trống ở giữa mỗi cạnh.
    this.staticCollisionBoxes.push(
      {minX:-edge,maxX:-gate,minZ:-edge-0.14,maxZ:-edge+0.14,kind:'farm-fence'},
      {minX:gate,maxX:edge,minZ:-edge-0.14,maxZ:-edge+0.14,kind:'farm-fence'},
      {minX:-edge,maxX:-gate,minZ:edge-0.14,maxZ:edge+0.14,kind:'farm-fence'},
      {minX:gate,maxX:edge,minZ:edge-0.14,maxZ:edge+0.14,kind:'farm-fence'},
      {minX:-edge-0.14,maxX:-edge+0.14,minZ:-edge,maxZ:-gate,kind:'farm-fence'},
      {minX:-edge-0.14,maxX:-edge+0.14,minZ:gate,maxZ:edge,kind:'farm-fence'},
      {minX:edge-0.14,maxX:edge+0.14,minZ:-edge,maxZ:-gate,kind:'farm-fence'},
      {minX:edge-0.14,maxX:edge+0.14,minZ:gate,maxZ:edge,kind:'farm-fence'}
    );
  }

  _createTrees() {
    [[-73,-98],[-73,98],[73,-98],[73,98],[-73,0],[73,0],[0,-98],[0,98]].forEach(([x,z]) => {
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

    barn.position.set(WORLD_MAP.zones.storage.x,0,WORLD_MAP.zones.storage.z); this.scene.add(barn);
    // Vùng va chạm thân nhà, không bao gồm mái nhô ra và hiên trước.
    this.staticCollisionBoxes.push({minX:WORLD_MAP.zones.storage.x-2.6,maxX:WORLD_MAP.zones.storage.x+2.6,minZ:WORLD_MAP.zones.storage.z-2.2,maxZ:WORLD_MAP.zones.storage.z+2.2,kind:'barn'});
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
    mill.position.set(WORLD_MAP.zones.windmill.x, 0, WORLD_MAP.zones.windmill.z);
    mill.rotation.y = -0.16;
    this.scene.add(mill);
    this.windmill = mill;
    // Vùng va chạm quanh thân cối; cánh quay nằm cao nên không cản người chơi.
    this.staticCollisionBoxes.push({minX:WORLD_MAP.zones.windmill.x-1.05,maxX:WORLD_MAP.zones.windmill.x+1.05,minZ:WORLD_MAP.zones.windmill.z-1.05,maxZ:WORLD_MAP.zones.windmill.z+1.05,kind:'windmill'});
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
    const signOffsets = {
      village: [-3.0, 2.8], shop: [0, 2.5], fishingLake: [-3.0, 0],
      livestock: [-3.0, -1.8], lotusPond: [3.0, -1.0], storage: [0, 2.8],
      forest: [3.0, 0], windmill: [-2.8, 1.0], teleportGate: [2.6, 1.8]
    };
    labels.forEach(item => {
      const zone = WORLD_MAP.zones[item.zone];
      const [dx, dz] = signOffsets[item.zone] || [0, 2.5];
      this._createSign(zone.x + dx, zone.z + dz, item.text, item.color);
    });
    this._createWorldDecorations();
    this._createQuestNpc();
  }

  _createQuestNpc() {
    // NPC trang trí ở quảng trường; tương tác nhiệm vụ qua nút 📜 hiện có.
    const npc = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5f9dce, roughness: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0c29a, roughness: 0.95 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x6b422c, roughness: 1 });
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0xd85a4a, roughness: 0.9 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x60412f, roughness: 0.9 });
    const add = (geo, mat, x, y, z, parent=npc) => { const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x,y,z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    add(new THREE.CylinderGeometry(0.34, 0.42, 0.88, 10), bodyMat, 0, 1.05, 0);
    add(new THREE.SphereGeometry(0.38, 12, 10), skinMat, 0, 1.78, 0);
    add(new THREE.SphereGeometry(0.39, 12, 8), hairMat, 0, 1.98, -0.06).scale.set(1,0.56,0.96);
    add(new THREE.BoxGeometry(0.48,0.12,0.42), scarfMat, 0, 1.42, 0.02);
    for (const x of [-0.13,0.13]) add(new THREE.SphereGeometry(0.035,8,6), new THREE.MeshBasicMaterial({color:0x2a211b}), x,1.82,0.345);
    add(new THREE.SphereGeometry(0.045,8,6), skinMat, 0,1.73,0.365);
    for (const x of [-0.2,0.2]) add(new THREE.BoxGeometry(0.2,0.24,0.3), bootMat, x,0.18,0.03);
    // Mũ nâu giúp nhận diện NPC từ góc camera thứ ba.
    add(new THREE.CylinderGeometry(0.42,0.42,0.08,12), bootMat,0,2.16,0);
    add(new THREE.ConeGeometry(0.27,0.26,10), bootMat,0,2.31,0);
    const marker = new THREE.Group();
    const markerMat = new THREE.MeshBasicMaterial({color:0xffdf70});
    add(new THREE.SphereGeometry(0.14,10,8), markerMat,0,0,0,marker);
    const exclamation = new THREE.Mesh(new THREE.BoxGeometry(0.045,0.12,0.045), new THREE.MeshBasicMaterial({color:0x6b4b20}));
    exclamation.position.set(0,0.01,0.12); marker.add(exclamation);
    marker.position.set(0,2.75,0);
    npc.add(marker); npc.position.set(0,0,-12.1); npc.rotation.y = Math.PI;
    this.scene.add(npc); this.questNpc = npc; this.questNpcMarker = marker;
  }

  _createWorldDecorations() {
    const decor = WORLD_MAP.decorations || {};
    const flowerColors = [0xffd166, 0xf28ca8, 0xf7f4dc, 0xb8a1e3];
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x477b3d, roughness: 1 });
    const petalMats = flowerColors.map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    const centerMat = new THREE.MeshStandardMaterial({ color: 0xffdf70, roughness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4d994b, roughness: 1 });

    // Hoa nhỏ được đặt ở mép các khu vực, không tạo collider để không ảnh hưởng di chuyển.
    for (const bed of [...(decor.flowerBeds || []), ...(decor.extraFlowerBeds || [])]) {
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
    for (const item of [...(decor.bushes || []), ...(decor.extraBushes || [])]) {
      const bush = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const puff = new THREE.Mesh(bushGeo, bushMats[i]);
        puff.position.set((i - 1) * 0.29 * item.scale, (0.25 + (i % 2) * 0.08) * item.scale, (i % 2 ? 0.12 : -0.08) * item.scale);
        puff.scale.set(1.0, 0.82, 0.88); puff.castShadow = true; puff.receiveShadow = true; bush.add(puff);
      }
      bush.position.set(item.x, 0, item.z);
      this.scene.add(bush);
    }

    // Cụm cây đa dạng trên vùng mở rộng; đặt ở rìa bản đồ, tránh mạng đường trung tâm.
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x80502b, roughness: 1 });
    const treeLeafMats = [0x2f8b43, 0x48a94f, 0x397e48, 0x5b9f43].map(color => new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    for (const item of (decor.extraTrees || [])) {
      const tree = new THREE.Group(); const s = item.scale || 1;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.14*s,.22*s,1.25*s,7),treeTrunkMat); trunk.position.y=.625*s; tree.add(trunk);
      if (item.kind === 'pine') {
        for (let i=0;i<3;i++){const crown=new THREE.Mesh(new THREE.ConeGeometry((.9-i*.17)*s,1.25*s,7),treeLeafMats[(i+2)%treeLeafMats.length]);crown.position.y=(1.25+i*.52)*s;tree.add(crown);}
      } else {
        const crown = new THREE.Mesh(new THREE.SphereGeometry(.82*s,9,7),treeLeafMats[Math.abs(Math.round(item.x))%treeLeafMats.length]); crown.position.y=1.65*s; crown.scale.set(1,1.05,.95); tree.add(crown);
        if(item.kind==='fruit') for(const [x,y,z] of [[-.42,1.8,.25],[.4,1.55,.25],[.12,2.0,-.4]]) {const fruit=new THREE.Mesh(new THREE.SphereGeometry(.12*s,7,5),new THREE.MeshStandardMaterial({color:0xe84e45,roughness:.7}));fruit.position.set(x*s,y*s,z*s);tree.add(fruit);}
      }
      tree.position.set(item.x,0,item.z);tree.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});this.scene.add(tree);
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
    if (this.mooredBoat) { this.mooredBoat.position.y = -0.18 + Math.sin(performance.now() * 0.0012) * 0.035; this.mooredBoat.rotation.z = Math.sin(performance.now() * 0.0008) * 0.012; }
    if (this.oceanLife) {
      const now = performance.now() * 0.001;
      for (const animal of this.oceanLife) {
        const a = now * animal.speed + animal.phase;
        animal.group.position.x = animal.baseX + Math.cos(a) * animal.routeX;
        animal.group.position.z = animal.baseZ + Math.sin(a) * animal.routeZ;
        animal.group.position.y = -0.08 + Math.sin(a * 2.0) * (animal.kind === 'whale' ? 0.12 : 0.07);
        animal.group.rotation.y = -Math.atan2(Math.cos(a) * animal.routeZ, -Math.sin(a) * animal.routeX);
      }
    }
    if (this.portalGlow) this.portalGlow.material.emissiveIntensity = 1.0 + 0.35 * Math.sin(performance.now() * 0.002);
    this.controls.update();
    if (this.questNpcMarker) this.questNpcMarker.position.y = 2.75 + Math.sin(performance.now() * 0.003) * 0.08;
    this.renderer.render(this.scene, this.camera);
  }
  get domElement() { return this.renderer.domElement; }
}