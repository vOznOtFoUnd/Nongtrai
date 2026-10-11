import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { CONFIG, CROPS, getPlotUnlockRequirement } from '../core/config.js';
import { state, spendMoney, addExp, incrementHarvested, saveGame } from '../data/state.js';

const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();
const fbxLoader = new FBXLoader();

const matLocked = new THREE.MeshStandardMaterial({ color: 0x2b2520, roughness: 0.95, metalness: 0.1 });
const matNormal = new THREE.MeshStandardMaterial({ color: 0x6b4e31, roughness: 0.85 });
const matHoed = new THREE.MeshStandardMaterial({ color: 0x543820, roughness: 0.7 });
const matWatered = new THREE.MeshStandardMaterial({ color: 0x312214, roughness: 0.6 });
const matWithered = new THREE.MeshStandardMaterial({ color: 0x42352b, roughness: 0.9 });

export class Plot {
  constructor(x, z, ix, iz, plotSize, parentGroup, onMessage) {
    this.ix = ix; this.iz = iz; this.x = x; this.z = z;
    this.plotSize = plotSize; this.onMessage = onMessage;
    
    const req = getPlotUnlockRequirement(iz, ix);
    this.unlocked = req.unlocked;
    this.unlockLevel = req.level;
    this.unlockCost = req.cost;

    this.state = this.unlocked ? 'normal' : 'locked'; 
    this.cropType = null;
    this.growProgress = 0; 
    this.stage = 0; 
    this.watered = false;
    this.dryTimer = 0;

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(plotSize - 0.15, 0.25, plotSize - 0.15),
      this.unlocked ? matNormal.clone() : matLocked.clone()
    );
    this.mesh.position.set(x, 0.12, z);
    this.mesh.receiveShadow = true; this.mesh.castShadow = true;
    this.mesh.userData = { type: 'plot', plot: this };
    parentGroup.add(this.mesh);

    this.cropGroup = new THREE.Group();
    this.cropGroup.position.set(x, 0.25, z);
    parentGroup.add(this.cropGroup);
    this.waterMarker = null;
  }

  unlockPlot() {
    if (this.unlocked) return false;
    if (state.level < this.unlockLevel) {
      this.onMessage(`Cần đạt Level ${this.unlockLevel} để mở ô này! 🔒`);
      return false;
    }
    if (!spendMoney(this.unlockCost)) {
      this.onMessage(`Không đủ tiền! Cần ${this.unlockCost}$ 💸`);
      return false;
    }
    this.unlocked = true;
    this.state = 'normal';
    this.mesh.material = matNormal.clone();
    this.onMessage(`Đã mở khóa ô đất thành công! 🎉`);
    saveGame();
    return true;
  }

  hoe() {
    if (!this.unlocked) { this.unlockPlot(); return false; }
    if (this.state === 'normal' || this.state === 'withered') {
      this.state = 'hoed';
      this.mesh.material = matHoed.clone();
      this.onMessage('Đã cuốc đất xốp! ⛏️');
      saveGame();
      return true;
    }
    if (this.state === 'hoed') this.onMessage('Đất đã được cuốc rồi!');
    else if (this.state === 'planted') this.onMessage('Đất đã có cây trồng!');
    return false;
  }

  plant(cropType) {
    if (!this.unlocked) { this.unlockPlot(); return false; }
    if (this.state === 'normal') { this.onMessage('Hãy dùng cuốc (⛏️) làm xốp đất trước!'); return false; }
    if (this.state !== 'hoed') { this.onMessage('Ô đất không sẵn sàng để trồng!'); return false; }
    
    const crop = CROPS[cropType];
    if (!crop) return false;
    const seedCount = state.inventory?.seeds?.[cropType] || 0;
    if (seedCount > 0) state.inventory.seeds[cropType] -= 1;
    else if (!spendMoney(crop.cost)) { this.onMessage('Hết hạt giống và không đủ tiền mua thêm! Ghé Cửa hàng nhé 🛒'); return false; }
    
    this.state = 'planted'; 
    this.cropType = cropType;
    this.growProgress = 0; 
    this.stage = 0; 
    this.watered = false;
    this.dryTimer = 0;
    
    this.updateCropVisual();
    this._setWaterMarker(true);
    this.onMessage(`Đã gieo hạt ${crop.name} thành công! Cây con cần được tưới nước 💧`);
    saveGame();
    return true;
  }

  water() {
    if (!this.unlocked) return;
    if (this.state === 'planted' || this.state === 'withered') {
      this.watered = true;
      this.dryTimer = 0;
      this._setWaterMarker(false);
      const recovering = this.state === 'withered';
      if (recovering) {
        this.state = 'planted';
        // Cây héo đã bị ẩn khỏi scene; dựng lại hình ảnh khi được cứu bằng nước.
        this.updateCropVisual();
      }
      this.mesh.material = matWatered.clone();
      this.onMessage(recovering ? 'Cây đã hồi sức sau khi tưới nước! 💧🌱' : 'Đã tưới nước! Cây đang lớn 💧');
      saveGame();
      return true;
    }
    this.onMessage('Không có cây cần tưới ở ô này!');
    return false;
  }

  harvest() {
    if (this.state !== 'grown') {
      if (this.state === 'planted') this.onMessage('Cây chưa chín!');
      else this.onMessage('Không có gì để thu hoạch!');
      return false;
    }
    const crop = CROPS[this.cropType];
    state.inventory.crops ??= { wheat: 0, carrot: 0, tomato: 0, pumpkin: 0 };
    state.inventory.crops[this.cropType] = (state.inventory.crops[this.cropType] || 0) + 1;
    incrementHarvested();
    if (state.quests?.harvest) state.quests.harvest.progress += 1;
    const leveledUp = addExp(crop.exp);
    
    this.onMessage(`Đã thu hoạch ${crop.name}! +1 vào túi đồ. Bán tại cửa hàng để nhận ${crop.sell}$ 🧺`);
    if (leveledUp) this.onMessage(`🌟 CHÚC MỪNG BẠN LÊN LEVEL ${state.level}! 🌟`);

    this.resetToNormal();
    this.onMessage(`Thu hoạch ${crop.name} thành công! +1 nông sản vào túi 🎉`);
    saveGame();
    return true;
  }

  resetToNormal() {
    this.state = 'normal'; 
    this.cropType = null;
    this.growProgress = 0; 
    this.stage = 0; 
    this.watered = false;
    this.dryTimer = 0;
    this.mesh.material = matNormal.clone();
    this.clearCropVisual();
    this._setWaterMarker(false);
  }

  update(dt) {
    if (!this.unlocked || this.state !== 'planted') return;
    const crop = CROPS[this.cropType];
    
    if (this.watered) {
      this.growProgress += dt;
      const progress = Math.min(1, this.growProgress / crop.growTime);
      const newStage = Math.floor(progress * crop.stages);
      if (newStage !== this.stage) { 
        this.stage = newStage; 
        this.updateCropVisual(); 
      }
      if (progress >= 1) { 
        this.state = 'grown'; 
        this.updateCropVisual(); 
      }
    } else {
      this.dryTimer += dt;
      if (this.dryTimer > 15 && this.state !== 'withered') {
        this.state = 'withered';
        this.mesh.material = matWithered.clone();
        this.onMessage(`Đất khô cằn! Cây ${crop.name} đang héo! 🌵`);
      }
    }
  }

  restoreState(data, elapsedSeconds) {
    this.unlocked = data.unlocked;
    this.state = data.state;
    this.cropType = data.cropType;
    this.growProgress = data.growProgress;
    this.stage = data.stage;
    this.watered = data.watered;
    this.dryTimer = data.dryTimer || 0;

    if (!this.unlocked) {
      this.mesh.material = matLocked.clone();
      return;
    }

    if (this.state === 'planted' && !this.watered && this.cropType) this._setWaterMarker(true);
    else this._setWaterMarker(false);
    if (this.state === 'planted' && this.watered && this.cropType) {
      const crop = CROPS[this.cropType];
      if (crop) {
        this.growProgress += elapsedSeconds;
        const progress = Math.min(1, this.growProgress / crop.growTime);
        this.stage = Math.floor(progress * crop.stages);
        if (progress >= 1) this.state = 'grown';
      }
    }

    if (this.state === 'hoed') this.mesh.material = matHoed.clone();
    else if (this.state === 'withered') this.mesh.material = matWithered.clone();
    else if (this.watered) this.mesh.material = matWatered.clone();
    else this.mesh.material = matNormal.clone();

    this.updateCropVisual();
  }

  clearCropVisual() {
    while (this.cropGroup.children.length) {
      const c = this.cropGroup.children[0];
      this.cropGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material.dispose();
      }
    }
  }

  _setWaterMarker(show) {
    if (!show) {
      if (this.waterMarker) { this.cropGroup.remove(this.waterMarker); this.waterMarker.material?.map?.dispose?.(); this.waterMarker.material?.dispose?.(); this.waterMarker = null; }
      return;
    }
    if (this.waterMarker) return;
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.beginPath(); ctx.arc(64,64,49,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#27bde8'; ctx.beginPath(); ctx.moveTo(64,20); ctx.bezierCurveTo(56,38,35,57,35,72); ctx.arc(64,72,29,Math.PI,0,true); ctx.bezierCurveTo(93,57,72,38,64,20); ctx.fill();
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    sprite.scale.set(0.48,0.48,1); sprite.position.set(0,1.25,0); sprite.renderOrder = 10;
    this.cropGroup.add(sprite); this.waterMarker = sprite;
  }

  updateCropVisual() {
    this.clearCropVisual();
    if (!this.cropType || this.state === 'withered') return;
    const crop = CROPS[this.cropType];

    const format = crop.format || 'glb';
    const folder = CONFIG.assetsPath[format] || CONFIG.assetsPath.glb;
    const fileUrl = folder + crop.modelName + '.' + format;
    const scaleFactor = 0.4 + (this.stage / crop.stages) * 0.6;

    if (format === 'glb') {
      gltfLoader.load(fileUrl, (gltf) => {
        const model = gltf.scene;
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        model.traverse(node => { if (node.isMesh) node.castShadow = true; });
        this.cropGroup.add(model);
      }, undefined, () => { this._createFallbackVisual(crop, this.stage, crop.stages); });
    } else if (format === 'obj') {
      objLoader.load(fileUrl, (obj) => {
        obj.scale.set(scaleFactor, scaleFactor, scaleFactor);
        obj.traverse(node => { if (node.isMesh) node.castShadow = true; });
        this.cropGroup.add(obj);
      }, undefined, () => { this._createFallbackVisual(crop, this.stage, crop.stages); });
    } else if (format === 'fbx') {
      fbxLoader.load(fileUrl, (fbx) => {
        fbx.scale.set(scaleFactor * 0.01, scaleFactor * 0.01, scaleFactor * 0.01);
        fbx.traverse(node => { if (node.isMesh) node.castShadow = true; });
        this.cropGroup.add(fbx);
      }, undefined, () => { this._createFallbackVisual(crop, this.stage, crop.stages); });
    } else {
      this._createFallbackVisual(crop, this.stage, crop.stages);
    }
  }

  _createFallbackVisual(crop, stage, maxStage) {
    const color = new THREE.Color(crop.color);
    if (stage === 0) {
      const sprout = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 5), new THREE.MeshStandardMaterial({ color: 0x4a7c3f }));
      sprout.position.y = 0.12; sprout.castShadow = true;
      this.cropGroup.add(sprout);
    } else if (stage < maxStage - 1) {
      const height = 0.3 + stage * 0.35;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, height, 6), new THREE.MeshStandardMaterial({ color: 0x3d7a37 }));
      stem.position.y = height / 2; stem.castShadow = true;
      this.cropGroup.add(stem);
      for (let i = 0; i < stage; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18 + i * 0.05, 6, 4), new THREE.MeshStandardMaterial({ color: 0x4a9c4a }));
        leaf.position.set(Math.sin(i * 2.1) * 0.25, height * 0.4 + i * 0.15, Math.cos(i * 2.1) * 0.25);
        leaf.scale.y = 0.5; leaf.castShadow = true;
        this.cropGroup.add(leaf);
      }
    } else {
      const height = 0.9 + (maxStage > 4 ? 0.3 : 0);
      if (crop.id === 'wheat') {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, height, 6), new THREE.MeshStandardMaterial({ color: 0x3d7a37 }));
        stem.position.y = height / 2; stem.castShadow = true; this.cropGroup.add(stem);
        for (let i = 0; i < 5; i++) {
          const head = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 5), new THREE.MeshStandardMaterial({ color }));
          head.position.set(Math.sin(i * 1.2) * 0.15, height + 0.1, Math.cos(i * 1.2) * 0.15);
          head.castShadow = true; this.cropGroup.add(head);
        }
      } else if (crop.id === 'carrot') {
        const root = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 6), new THREE.MeshStandardMaterial({ color }));
        root.position.y = 0.15; root.rotation.x = Math.PI; root.castShadow = true; this.cropGroup.add(root);
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), new THREE.MeshStandardMaterial({ color: 0x4a9c4a }));
        top.position.y = 0.45; top.scale.y = 0.6; this.cropGroup.add(top);
      } else if (crop.id === 'tomato') {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, height, 6), new THREE.MeshStandardMaterial({ color: 0x3d7a37 }));
        stem.position.y = height / 2; stem.castShadow = true; this.cropGroup.add(stem);
        for (let i = 0; i < 4; i++) {
          const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshStandardMaterial({ color }));
          fruit.position.set(Math.sin(i * 1.6) * 0.22, height * 0.6 + (i % 2) * 0.2, Math.cos(i * 1.6) * 0.22);
          fruit.castShadow = true; this.cropGroup.add(fruit);
        }
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4), new THREE.MeshStandardMaterial({ color: 0x3d8b3d }));
        leaf.position.y = height + 0.1; leaf.scale.y = 0.4; this.cropGroup.add(leaf);
      } else if (crop.id === 'pumpkin') {
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), new THREE.MeshStandardMaterial({ color }));
        fruit.position.y = 0.4; fruit.scale.y = 0.8; fruit.castShadow = true; this.cropGroup.add(fruit);
        const stemTop = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.2, 5), new THREE.MeshStandardMaterial({ color: 0x3d2b1f }));
        stemTop.position.y = 0.75; this.cropGroup.add(stemTop);
      }
    }
  }
}