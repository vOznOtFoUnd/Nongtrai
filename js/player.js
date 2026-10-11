import * as THREE from 'three';
import { saveGame } from './state.js';

// Nhân vật chibi dựng bằng hình khối Three.js, không phụ thuộc file model ngoài.
export class PlayerCharacter {
  constructor(scene, cameraControls, onMessage, collisionProvider = () => ({})) {
    this.scene = scene; this.controls = cameraControls; this.onMessage = onMessage;
    this.collisionProvider = collisionProvider;
    this.root = new THREE.Group(); this.root.name = 'FarmPlayer';
    this.root.position.set(0, 0, 8); this.speed = 5.2; this.radius = 0.34;
    this.acceleration = 18; this.deceleration = 22; this.velocity = new THREE.Vector3();
    this._lastCollisionMessage = 0; this.keys = new Set(); this.moveVector = new THREE.Vector3();
    this._buildModel(); scene.add(this.root);
    this._bindInput();
  }
  _mat(color, roughness = 0.85) { return new THREE.MeshStandardMaterial({ color, roughness }); }
  _mesh(geo, mat, x, y, z, cast = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); m.castShadow = cast; m.receiveShadow = true; this.root.add(m); return m; }
  _buildModel() {
    const skin=this._mat(0xffd2a1), shirt=this._mat(0x62b96b), pants=this._mat(0x4775b8), shoe=this._mat(0x5b4636), hair=this._mat(0x5a3828), white=this._mat(0xffffff), dark=this._mat(0x30251f), blush=this._mat(0xf28e91);
    this.body=this._mesh(new THREE.SphereGeometry(0.43,16,12),shirt,0,0.95,0); this.body.scale.set(0.9,1.05,0.65);
    this._mesh(new THREE.SphereGeometry(0.48,18,14),skin,0,1.72,0).scale.set(1,1.02,0.9);
    this._mesh(new THREE.SphereGeometry(0.49,16,10),hair,0,1.94,-0.04).scale.set(1,0.55,0.95);
    // tóc mái
    this._mesh(new THREE.SphereGeometry(0.22,12,8),hair,-0.22,1.98,0.32).scale.set(1,0.55,0.55);
    for (const x of [-0.16,0.16]) { this._mesh(new THREE.SphereGeometry(0.065,10,8),white,x,1.76,0.405); this._mesh(new THREE.SphereGeometry(0.032,8,6),dark,x+0.01,1.76,0.46); }
    for (const x of [-0.28,0.28]) this._mesh(new THREE.SphereGeometry(0.075,8,6),blush,x,1.62,0.38,false);
    // miệng cười nhỏ
    const smile=this._mesh(new THREE.TorusGeometry(0.09,0.018,6,12,Math.PI),dark,0,1.59,0.43,false); smile.rotation.z=Math.PI;
    this.legs=[];
    for (const x of [-0.19,0.19]) { const leg=this._mesh(new THREE.CapsuleGeometry(0.12,0.3,4,8),pants,x,0.42,0); this.legs.push(leg); this._mesh(new THREE.BoxGeometry(0.24,0.13,0.34),shoe,x,0.16,0.08); }
    this.arms=[];
    for (const x of [-0.48,0.48]) { const arm=this._mesh(new THREE.CapsuleGeometry(0.105,0.34,4,8),shirt,x,1.02,0); arm.rotation.z=x<0?0.25:-0.25; this.arms.push(arm); this._mesh(new THREE.SphereGeometry(0.12,10,8),skin,x*1.13,0.77,0.02); }
    // nón nông dân
    this._mesh(new THREE.CylinderGeometry(0.38,0.43,0.08,16),this._mat(0xf0c65a),0,2.16,0);
    this._mesh(new THREE.ConeGeometry(0.28,0.2,16),this._mat(0xeab94d),0,2.28,0);
    this.root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  }
  _bindInput() {
    this._onKeyDown=e=>{ const k=e.key.toLowerCase(); if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){this.keys.add(k); e.preventDefault();} };
    this._onKeyUp=e=>this.keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown',this._onKeyDown);
    window.addEventListener('keyup',this._onKeyUp);
    window.addEventListener('blur',()=>this.keys.clear());
    document.querySelectorAll('[data-move]').forEach(btn=>{
      const key=btn.dataset.move;
      const down=e=>{e.preventDefault();this.keys.add(key);btn.classList.add('pressed');};
      const up=e=>{e.preventDefault();this.keys.delete(key);btn.classList.remove('pressed');};
      btn.addEventListener('pointerdown',down); ['pointerup','pointercancel','pointerleave'].forEach(ev=>btn.addEventListener(ev,up));
    });
  }
  _circleHitsBox(x, z, box) {
    const nx = THREE.MathUtils.clamp(x, box.minX, box.maxX);
    const nz = THREE.MathUtils.clamp(z, box.minZ, box.maxZ);
    const dx = x - nx, dz = z - nz;
    return dx * dx + dz * dz < this.radius * this.radius;
  }

  _isBlocked(x, z, data) {
    const b = data.bounds || { minX: -15.25, maxX: 15.25, minZ: -15.25, maxZ: 15.25 };
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return true;
    for (const box of data.boxes || []) if (this._circleHitsBox(x, z, box)) return true;
    for (const c of data.circles || []) {
      const dx=x-c.x, dz=z-c.z, r=this.radius+(c.radius || 0.18);
      if (dx*dx+dz*dz < r*r) return true;
    }
    return false;
  }

  _moveWithCollision(dx, dz, data) {
    // Bước tối đa 8 cm chống xuyên vật cản; tách trục để trượt dọc mép tường.
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.08));
    const sx=dx/steps, sz=dz/steps;
    let hitX=false, hitZ=false;
    for (let i=0;i<steps;i++) {
      const nx=this.root.position.x+sx;
      if (!this._isBlocked(nx,this.root.position.z,data)) this.root.position.x=nx;
      else if (Math.abs(sx)>0.0001) hitX=true;
      const nz=this.root.position.z+sz;
      if (!this._isBlocked(this.root.position.x,nz,data)) this.root.position.z=nz;
      else if (Math.abs(sz)>0.0001) hitZ=true;
    }
    if (hitX) this.velocity.x *= 0.12;
    if (hitZ) this.velocity.z *= 0.12;
    if ((hitX || hitZ) && performance.now()-this._lastCollisionMessage>2200) {
      this._lastCollisionMessage=performance.now();
      if (this.onMessage) this.onMessage('Có vật cản phía trước — đi vòng qua nhé! 🌿');
    }
  }

  update(dt) {
    dt = THREE.MathUtils.clamp(Number(dt) || 0, 0, 0.05);
    const x=(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0);
    const z=(this.keys.has('s')||this.keys.has('arrowdown')?1:0)-(this.keys.has('w')||this.keys.has('arrowup')?1:0);
    const moving=x!==0||z!==0;
    if (moving) {
      this.moveVector.set(x,0,z).normalize();
      this.velocity.x=THREE.MathUtils.damp(this.velocity.x,this.moveVector.x*this.speed,this.acceleration,dt);
      this.velocity.z=THREE.MathUtils.damp(this.velocity.z,this.moveVector.z*this.speed,this.acceleration,dt);
      const v=Math.hypot(this.velocity.x,this.velocity.z);
      if (v>this.speed) { this.velocity.x*=this.speed/v; this.velocity.z*=this.speed/v; }
    } else {
      this.velocity.x=THREE.MathUtils.damp(this.velocity.x,0,this.deceleration,dt);
      this.velocity.z=THREE.MathUtils.damp(this.velocity.z,0,this.deceleration,dt);
      if (Math.hypot(this.velocity.x,this.velocity.z)<0.035) this.velocity.set(0,0,0);
    }
    const data=this.collisionProvider?.() || {};
    this._moveWithCollision(this.velocity.x*dt,this.velocity.z*dt,data);
    const actualMoving=Math.hypot(this.velocity.x,this.velocity.z)>0.18;
    if (actualMoving) this.root.rotation.y=Math.atan2(this.velocity.x,this.velocity.z);
    const t=performance.now()/1000;
    this.legs.forEach((leg,i)=>{leg.rotation.x=actualMoving?Math.sin(t*10+i*Math.PI)*0.55:THREE.MathUtils.damp(leg.rotation.x,0,12,dt);});
    this.arms.forEach((arm,i)=>{arm.rotation.x=actualMoving?Math.sin(t*10+i*Math.PI+Math.PI)*0.45:THREE.MathUtils.damp(arm.rotation.x,0,12,dt);});
    this.root.position.y=actualMoving?Math.abs(Math.sin(t*10))*0.035:0;
    if(this.controls){this.controls.target.x+=(this.root.position.x-this.controls.target.x)*Math.min(1,dt*2.5);this.controls.target.z+=(this.root.position.z-this.controls.target.z)*Math.min(1,dt*2.5);}
  }}
