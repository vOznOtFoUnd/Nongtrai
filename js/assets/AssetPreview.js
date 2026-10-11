import * as THREE from 'three';
import { AssetNormalizer } from './AssetNormalizer.js';

export class AssetPreview {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf2f5e9);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    this.camera.position.set(3.2, 2.2, 4.2);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.setSize(Math.max(1, container.clientWidth), 260);
    container.replaceChildren(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x7a886b, 2.0));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 6, 4); key.castShadow = true; this.scene.add(key);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.MeshStandardMaterial({ color: 0xd8e5c4, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.015; floor.receiveShadow = true; this.scene.add(floor);
    this.grid = new THREE.GridHelper(4.4, 22, 0x91a47e, 0xc2cdb6); this.grid.position.y = 0.002; this.scene.add(this.grid);
    this.model = null; this.running = true; this._animate();
    this._resize = () => this.resize(); window.addEventListener('resize', this._resize);
  }
  setModel(model) {
    if (this.model) { this.scene.remove(this.model); }
    this.model = model; this.scene.add(model);
    const bounds = new THREE.Box3().setFromObject(model), size = new THREE.Vector3(); bounds.getSize(size);
    const max = Math.max(size.x, size.y, size.z, 1);
    this.camera.position.set(max * 1.6, max * 1.1, max * 2.0); this.camera.lookAt(0, size.y * .48, 0);
    this.resize();
  }
  resize() { if (!this.container || !this.renderer) return; const w=Math.max(1,this.container.clientWidth), h=260; this.camera.aspect=w/h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w,h,false); }
  _animate = () => { if (!this.running) return; requestAnimationFrame(this._animate); if (this.model) this.model.rotation.y += 0.003; this.renderer.render(this.scene,this.camera); };
  dispose() { this.running=false; window.removeEventListener('resize',this._resize); this.renderer.dispose(); this.container.replaceChildren(); }
}
