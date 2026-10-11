import * as THREE from 'three';
import { saveGame } from '../data/state.js';

// Nhân vật chibi dựng bằng hình khối Three.js, không phụ thuộc file model ngoài.
export class PlayerCharacter {
  constructor(scene, cameraControls, onMessage, collisionProvider = () => ({})) {
    this.scene = scene; this.controls = cameraControls; this.onMessage = onMessage;
    this.collisionProvider = collisionProvider;
    this.root = new THREE.Group(); this.root.name = 'FarmPlayer';
    this.defaultVisual = new THREE.Group(); this.defaultVisual.name = 'DefaultChibiVisual'; this.root.add(this.defaultVisual);
    this.customVisual = null;
    this.root.position.set(0, 0, 8); this.speed = 5.2; this.radius = 0.34;
    this.acceleration = 18; this.deceleration = 22; this.velocity = new THREE.Vector3();
    this._lastCollisionMessage = 0; this.keys = new Set(); this.moveVector = new THREE.Vector3(); this.joystick = { x: 0, y: 0 }; this._joystickPointerId = null;
    this._buildModel(); scene.add(this.root);
    this._bindInput();
  }
  _mat(color, roughness = 0.85) { return new THREE.MeshStandardMaterial({ color, roughness }); }
  _mesh(geo, mat, x, y, z, cast = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); m.castShadow = cast; m.receiveShadow = true; this.defaultVisual.add(m); return m; }
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
    this.toolPivot = new THREE.Group(); this.toolPivot.position.set(.48,1.0,.18); this.root.add(this.toolPivot);
    const wood=this._mat(0x81502e), metal=this._mat(0xb8c5cb), blue=this._mat(0x4f9dcc), green=this._mat(0x62b96b);
    const toolMesh=(parent,geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
    this.tools={};
    const hoe=new THREE.Group(); toolMesh(hoe,new THREE.CylinderGeometry(.035,.045,.7,7),wood,0,.18,0); const blade=toolMesh(hoe,new THREE.BoxGeometry(.32,.12,.06),metal,0,.52,0); blade.rotation.z=-.25; this.tools.hoe=hoe;
    const can=new THREE.Group(); toolMesh(can,new THREE.CylinderGeometry(.16,.2,.3,10),blue,0,.15,0); toolMesh(can,new THREE.CylinderGeometry(.035,.035,.3,8),metal,.2,.25,0); this.tools.water=can;
    const seed=new THREE.Group(); toolMesh(seed,new THREE.BoxGeometry(.26,.32,.08),green,0,.16,0); this.tools.plant=seed;
    const basket=new THREE.Group(); toolMesh(basket,new THREE.CylinderGeometry(.18,.14,.18,8),wood,0,.1,0); this.tools.harvest=basket;
    Object.values(this.tools).forEach(t=>{t.visible=false;this.toolPivot.add(t);});
  }
  applyCustomModel(modelObject) {
    if (!modelObject?.isObject3D) throw new TypeError('Model Player không hợp lệ.');
    if (this.customVisual) { this.root.remove(this.customVisual); this._disposeModel(this.customVisual); }
    this.customVisual = modelObject;
    this.customVisual.name = 'CustomPlayerVisual';
    this.customVisual.position.set(0, 0, 0);
    this.root.add(this.customVisual);
    this.defaultVisual.visible = false;
    return true;
  }

  resetDefaultModel() {
    if (this.customVisual) { this.root.remove(this.customVisual); this._disposeModel(this.customVisual); this.customVisual = null; }
    this.defaultVisual.visible = true;
  }

  _disposeModel(object) {
    object.traverse(node => {
      if (!node.isMesh) return;
      node.geometry?.dispose?.();
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.filter(Boolean).forEach(mat => mat.dispose?.());
    });
  }

  _bindInput() {
    this._onKeyDown=e=>{ const k=e.key.toLowerCase(); if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){this.keys.add(k); e.preventDefault();} };
    this._onKeyUp=e=>this.keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown',this._onKeyDown);
    window.addEventListener('keyup',this._onKeyUp);
    window.addEventListener('blur',()=>this.keys.clear());
    const pad = document.getElementById('mobile-joystick');
    const knob = document.getElementById('joystick-knob');
    const ring = pad?.querySelector('.joystick-ring');
    if (pad && knob && ring) {
      const reset = () => {
        this.joystick.x = 0; this.joystick.y = 0; this._joystickPointerId = null;
        knob.style.transform = 'translate(-50%, -50%)';
        pad.classList.remove('active');
      };
      const update = e => {
        const rect = ring.getBoundingClientRect();
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        const max = Math.max(1, rect.width * 0.32);
        let dx = e.clientX - cx, dy = e.clientY - cy;
        const len = Math.hypot(dx, dy);
        if (len > max) { dx = dx / len * max; dy = dy / len * max; }
        // Deadzone nhỏ tránh nhân vật rung khi ngón tay gần tâm joystick.
        const rawX = dx / max, rawY = dy / max;
        const deadzone = 0.08;
        this.joystick.x = Math.abs(rawX) < deadzone ? 0 : THREE.MathUtils.clamp(rawX, -1, 1);
        this.joystick.y = Math.abs(rawY) < deadzone ? 0 : THREE.MathUtils.clamp(rawY, -1, 1);
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      };
      pad.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault(); this._joystickPointerId = e.pointerId; pad.setPointerCapture?.(e.pointerId);
        pad.classList.add('active'); update(e);
      });
      pad.addEventListener('pointermove', e => {
        if (e.pointerId !== this._joystickPointerId) return;
        e.preventDefault(); update(e);
      });
      ['pointerup','pointercancel','lostpointercapture'].forEach(type => pad.addEventListener(type, e => {
        if (this._joystickPointerId !== null && e.pointerId !== undefined && e.pointerId !== this._joystickPointerId) return;
        reset();
      }));
      window.addEventListener('blur', reset);
      document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
    }
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
      if (this.onMessage) {
        const boxes = data.boxes || [];
        const px = this.root.position.x, pz = this.root.position.z;
        const nearest = boxes.filter(b => px >= b.minX - 1.2 && px <= b.maxX + 1.2 && pz >= b.minZ - 1.2 && pz <= b.maxZ + 1.2)
          .sort((a,b) => Math.hypot((a.minX+a.maxX)/2-px,(a.minZ+a.maxZ)/2-pz)-Math.hypot((b.minX+b.maxX)/2-px,(b.minZ+b.maxZ)/2-pz))[0];
        const names = { fence: 'hàng rào', tree: 'cây cối', 'forest-tree': 'cây trong rừng', barn: 'nhà kho', windmill: 'cối xay gió', pond: 'hồ nước', shop: 'cửa hàng', livestock: 'chuồng chăn nuôi', portal: 'cổng dịch chuyển', 'pen-fence': 'hàng rào chuồng' };
        this.onMessage(`Đang bị chắn bởi ${names[nearest?.kind] || 'vật cản'}; hãy đi vòng qua nhé.`);
      }
    }
  }

  performAction(plot, action, execute) {
    if (this.actionTask) { this.onMessage?.('Đang thực hiện thao tác, chờ chút nhé!'); return; }
    const dx=this.root.position.x-plot.x, dz=this.root.position.z-plot.z, len=Math.hypot(dx,dz);
    const dist=.82, candidates=[[plot.x+(len>.01?dx/len:0)*dist,plot.z+(len>.01?dz/len:1)*dist],[plot.x+dist,plot.z],[plot.x-dist,plot.z],[plot.x,plot.z+dist],[plot.x,plot.z-dist]];
    const data=this.collisionProvider?.()||{}; const target=candidates.find(([x,z])=>!this._isBlocked(x,z,data));
    if(!target){this.onMessage?.('Không thể tiếp cận ô đất này, thử từ phía khác nhé!');return;}
    this.actionTask={plot,action,execute,target:new THREE.Vector3(target[0],0,target[1]),phase:'approach'};this.actionClock=0;
    this.onMessage?.(({hoe:'Đang di chuyển tới ô đất để cuốc…',water:'Đang di chuyển tới cây để tưới…',plant:'Đang di chuyển tới ô đất để gieo hạt…',harvest:'Đang di chuyển tới cây để thu hoạch…',unlock:'Đang tới ô đất để mở khóa…'})[action]||'Đang tới vị trí thao tác…');
  }
  _showTool(name){Object.values(this.tools).forEach(t=>t.visible=false);if(this.tools[name])this.tools[name].visible=true;}

  update(dt) {
    dt = THREE.MathUtils.clamp(Number(dt) || 0, 0, 0.05);
    const task=this.actionTask;
    let x=(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0) + this.joystick.x;
    let z=(this.keys.has('s')||this.keys.has('arrowdown')?1:0)-(this.keys.has('w')||this.keys.has('arrowup')?1:0) + this.joystick.y;
    x = THREE.MathUtils.clamp(x, -1, 1); z = THREE.MathUtils.clamp(z, -1, 1);
    let moveInWorldSpace = false;
    if(task?.phase==='approach') {
      const dx=task.target.x-this.root.position.x,dz=task.target.z-this.root.position.z,dist=Math.hypot(dx,dz);
      if(dist>.12){x=dx/dist;z=dz/dist;moveInWorldSpace=true;}
      else {x=0;z=0;task.phase='act';this.actionClock=0;this.root.rotation.y=Math.atan2(task.plot.x-this.root.position.x,task.plot.z-this.root.position.z);this._showTool(task.action);}
    }
    const moving=x!==0||z!==0;
    if (moving) {
      // Hướng điều khiển của người chơi lấy theo góc ngang camera; tiến lên đi về phía camera nhìn.
      // Pha tự đi tới ô đất dùng vector thế giới trực tiếp, không chuyển đổi lần thứ hai theo camera.
      if (!moveInWorldSpace && this.controls?.target && this.controls?.object) {
        const forward = new THREE.Vector3().subVectors(this.controls.target, this.controls.object.position);
        forward.y = 0;
        if (forward.lengthSq() > 0.0001) forward.normalize(); else forward.set(0, 0, -1);
        const right = new THREE.Vector3(-forward.z, 0, forward.x);
        this.moveVector.copy(right).multiplyScalar(x).addScaledVector(forward, -z);
      } else this.moveVector.set(x, 0, z);
      if (this.moveVector.lengthSq() > 1) this.moveVector.normalize();
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
    if (actualMoving && this.actionTask?.phase !== 'act') this.root.rotation.y=Math.atan2(this.velocity.x,this.velocity.z);
    const t=performance.now()/1000;
    this.legs.forEach((leg,i)=>{leg.rotation.x=actualMoving?Math.sin(t*10+i*Math.PI)*0.55:THREE.MathUtils.damp(leg.rotation.x,0,12,dt);});
    this.arms.forEach((arm,i)=>{arm.rotation.x=actualMoving?Math.sin(t*10+i*Math.PI+Math.PI)*0.45:THREE.MathUtils.damp(arm.rotation.x,0,12,dt);});
    if(task?.phase==='act') { this.actionClock+=dt; const wave=Math.sin(this.actionClock*13); if(task.action==='hoe'){this.arms[1].rotation.x=-.85+Math.max(0,wave)*.5;this.arms[1].rotation.z=-.55;} else if(task.action==='water'){this.arms[1].rotation.x=-.65;this.arms[1].rotation.z=-.25;} else if(task.action==='plant'){this.arms[1].rotation.x=-.9+Math.max(0,wave)*.2;} else if(task.action==='harvest'){this.arms[1].rotation.x=-.7+wave*.22;} if(this.actionClock>=this.actionDuration){this.actionTask=null;this._showTool(null);this.arms.forEach(a=>{a.rotation.x=0;a.rotation.z=0;});this.onMessage?.(({hoe:'Hoàn tất động tác cuốc đất ⛏️',water:'Hoàn tất động tác tưới nước 💧',plant:'Hoàn tất động tác gieo hạt 🌱',harvest:'Đang hoàn tất thu hoạch 🧺'})[task.action] || 'Đã hoàn tất thao tác.');task.execute?.();} }
    else if(!task) this._showTool(null);
    this.root.position.y=actualMoving?Math.abs(Math.sin(t*10))*0.035:0;
    if(this.controls){
      const follow = Math.min(1, dt * 4.5);
      this.controls.target.x += (this.root.position.x - this.controls.target.x) * follow;
      this.controls.target.y += ((this.root.position.y + 1.12) - this.controls.target.y) * follow;
      this.controls.target.z += (this.root.position.z - this.controls.target.z) * follow;
    }
  }}
