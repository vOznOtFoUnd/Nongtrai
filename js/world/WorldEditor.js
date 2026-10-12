import * as THREE from 'three';

const STORAGE_KEY = 'farmnhamnhi.worldLayout.v1';
let editorObjectSerial = 0;

/** Chế độ chỉnh bố cục tách biệt với input gameplay. */
export class WorldEditor {
  constructor({ scene, camera, renderer, controls, plotsGroup, collisionBoxes = [], onMessage }) {
    Object.assign(this, { scene, camera, renderer, controls, plotsGroup, collisionBoxes, onMessage });
    this.enabled = false;
    this.selected = null;
    this.dragging = false;
    this.grid = true;
    this.undoStack = [];
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.dragOffset = new THREE.Vector3();
    this.dragStartPosition = new THREE.Vector3();
    this.dragCollisionBindings = [];
    this.dragGroupStart = [];
    this._identifyObjects();
    this._makePanel();
    this._loadLocal();
    this.renderer.domElement.addEventListener('pointerdown', this._down = e => this._pointerDown(e));
    window.addEventListener('pointermove', this._move = e => this._pointerMove(e));
    window.addEventListener('pointerup', this._up = () => this._pointerUp());
  }

  _identifyObjects() {
    let n = 0;
    for (const obj of this.scene.children) {
      if (obj.isLight || obj.isCamera) continue;
      if (!obj.userData.editorId) obj.userData.editorId = `scene-${n++}`;
      obj.userData.editorLabel ||= this._label(obj, obj.userData.editorId);
      obj.userData.editorBasePosition ||= obj.position.clone();
      obj.userData.editorMovable = !(obj.geometry?.type === 'PlaneGeometry' && obj.position.y < 0.1);
    }
    if (this.plotsGroup) {
      this.plotsGroup.userData.editorMovable = false;
      this.plotsGroup.children.forEach((obj, i) => {
        obj.userData.editorId = `plot-${i}`;
        obj.userData.editorLabel = `Ô đất ${i + 1}`;
        obj.userData.editorBasePosition ||= obj.position.clone();
        obj.userData.editorMovable = true;
      });
    }
  }

  _label(obj, id) {
    const p = obj.position;
    if (obj === this.plotsGroup) return 'Khu trồng trọt';
    if (obj.name) return obj.name;
    if (obj.isGroup) return `Nhóm vật thể ${id}`;
    if (obj.isMesh) {
      const t = obj.geometry?.type || '';
      if (t.includes('Plane')) return 'Đường / mặt đất';
      if (t.includes('Sphere') || t.includes('Dodecahedron')) return 'Cây / đá / trang trí';
      if (t.includes('Box')) return 'Hàng rào / công trình';
    }
    return `Vật thể (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`;
  }

  _makePanel() {
    const style = document.createElement('style');
    style.textContent = `
      #world-editor-panel{position:absolute;z-index:1200;top:12%;left:50%;transform:translateX(-50%);width:min(430px,94vw);max-height:74vh;overflow:auto;background:rgba(255,253,241,.97);border:2px solid #b5cba7;border-radius:16px;padding:12px;color:#263b28;box-shadow:0 8px 28px #0004;font:14px system-ui;pointer-events:auto}
      #world-editor-panel[hidden]{display:none} #world-editor-panel h3{margin:0 0 8px;font-size:17px} .we-row{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0}.we-row button,#world-editor-toggle{border:1px solid #b9c9b1;border-radius:10px;padding:8px 10px;background:#fff;font-weight:650;color:#263b28}.we-row button:active{background:#d9efcf} #world-editor-status{font-size:12px;opacity:.8;margin-top:6px}
      #world-editor-panel .we-note{font-size:12px;line-height:1.35;opacity:.8} #we-object-list{min-height:76px} #world-editor-toggle.active{background:#e4b85e;color:#382a0a}
    `;
    document.head.appendChild(style);
    const toggle = document.createElement('button');
    toggle.id = 'world-editor-toggle'; toggle.type = 'button'; toggle.textContent = '🛠️ Xây dựng';
    toggle.title = 'Bật/tắt chế độ xây dựng';
    const tools = document.getElementById('tools');
    (tools || document.getElementById('ui')).appendChild(toggle);
    const panel = document.createElement('section'); panel.id = 'world-editor-panel'; panel.hidden = true;
    panel.innerHTML = `<h3>🛠️ World Builder</h3><div id="we-selected">Chưa chọn vật thể</div>
      <div class="we-row"><select id="we-object-list" aria-label="Danh sách vật thể (giữ Ctrl hoặc chạm chọn nhiều mục)" multiple size="4" style="max-width:100%;flex:1;min-width:150px;padding:8px;border-radius:9px"></select><button data-act="refresh-list">↻ Làm mới</button></div><div class="we-row"><button data-act="group">🔗 Gom các mục đã chọn</button><button data-act="ungroup">↗ Bỏ nhóm</button><button data-act="group-select">☷ Chọn cả nhóm</button></div>
      <div class="we-row"><button data-act="left">← Trái</button><button data-act="up">↑ Trước</button><button data-act="down">↓ Sau</button><button data-act="right">→ Phải</button></div>
      <div class="we-row"><button data-act="rotate-left">↶ Xoay −15°</button><button data-act="rotate-right">↷ Xoay +15°</button><button data-act="scale-down">− Kích thước</button><button data-act="scale-up">+ Kích thước</button></div>
      <div class="we-row"><button data-act="duplicate">▣ Nhân bản</button><button data-act="delete">🗑 Xóa vật thể</button></div>
      <div class="we-row"><select id="we-add-type" aria-label="Loại vật thể mới" style="flex:1;min-width:150px;padding:8px;border-radius:9px"><option value="tree">🌳 Cây</option><option value="rock">🪨 Đá</option><option value="fence">🪵 Hàng rào</option><option value="sign">🪧 Biển báo</option><option value="flower">🌼 Bụi hoa</option><option value="house">🏡 Nhà ở</option><option value="warehouse">🏬 Nhà kho lớn</option><option value="shed">🏠 Nhà kho nhỏ</option><option value="pond">🐟 Ao trang trí</option><option value="field">🟫 Ô đất trang trí</option><option value="forge">⚒️ Lò rèn</option><option value="kitchen">🍲 Bếp nấu ăn</option><option value="beach">🏖️ Bãi biển mini</option><option value="shrub">🌿 Bụi cây</option><option value="palm">🌴 Cây dừa</option><option value="pine">🌲 Cây thông</option><option value="fruit-tree">🍎 Cây ăn quả</option><option value="flowerbed">🌷 Thảm hoa</option><option value="grass">🌱 Bụi cỏ</option><option value="cow-farm">🐄 Trang trại bò</option><option value="chicken-farm">🐔 Chuồng gà</option><option value="pig-farm">🐖 Trang trại lợn</option></select><label style="display:flex;align-items:center;gap:5px">Số lượng <input id="we-add-count" type="number" min="1" max="40" value="1" style="width:58px;padding:8px;border:1px solid #b9c9b1;border-radius:8px"></label><button data-act="add">＋ Xây công trình</button></div>
      <div class="we-row"><button data-act="grid">🧲 Bật/tắt lưới</button><button data-act="undo">↩ Hoàn tác</button><button data-act="save">💾 Lưu</button><button data-act="reset">↺ Mặc định</button></div>
      <div class="we-row"><button data-act="export">⬇ Xuất JSON</button><button data-act="import">⬆ Nhập JSON</button><button data-act="close">Đóng</button></div>
      <div class="we-note">Bật chế độ này rồi chạm vật thể để chọn, kéo trên mặt đất để di chuyển. Khi tắt, điều khiển gameplay trở lại.</div><div id="world-editor-status" aria-live="polite"></div>
      <input id="we-json-file" type="file" accept="application/json,.json" hidden>`;
    document.getElementById('ui').appendChild(panel);
    toggle.addEventListener('click', () => this.setEnabled(!this.enabled));
    panel.querySelector('#we-object-list').addEventListener('change', e => { const chosen=[...e.target.selectedOptions].map(opt=>this._candidateRoots().find(o=>o.userData.editorId===opt.value)).filter(Boolean); if(chosen.length===1)this._select(chosen[0]); else if(chosen.length>1){this._select(chosen[chosen.length-1]);this._status(`Đã chọn ${chosen.length} vật thể. Bấm “Gom các mục đã chọn” để tạo nhóm.`);} });
    panel.addEventListener('click', e => { const b=e.target.closest('button[data-act]'); if(b) this._action(b.dataset.act); });
    panel.querySelector('#we-json-file').addEventListener('change', async e => { const file=e.target.files?.[0]; if(!file)return; try { this._applyLayout(JSON.parse(await file.text())); } catch(err) { this._status('Không nhập được JSON: '+err.message); } finally { e.target.value=''; } });
    this.toggleButton = toggle; this.panel = panel; this._refreshObjectList();
  }

  setEnabled(value) {
    this.enabled = !!value;
    window.farmWorldEditorActive = this.enabled;
    this.panel.hidden = !this.enabled;
    this.toggleButton.classList.toggle('active', this.enabled);
    this.toggleButton.textContent = this.enabled ? '✋ Thoát xây dựng' : '🛠️ Xây dựng';
    this.controls.enabled = !this.enabled;
    this.dragging = false;
    if (!this.enabled) this._clearHighlight();
    this._refreshObjectList();
    this._status(this.enabled ? 'Đã bật chế độ xây dựng. Chạm vật thể hoặc chọn trong danh sách.' : 'Đã trở lại chế độ chơi.');
  }

  _candidateRoots() {
    const roots = [];
    for (const child of this.scene.children) if (child.userData.editorMovable) roots.push(child);
    if (this.plotsGroup) for (const child of this.plotsGroup.children) roots.push(child);
    return roots;
  }

  _rootFor(object) {
    let current = object;
    while (current && current.parent && current.parent !== this.scene && current.parent !== this.plotsGroup) current = current.parent;
    if (current?.parent === this.plotsGroup) return current;
    if (current?.parent === this.scene && current.userData.editorMovable) return current;
    return null;
  }

  _ray(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  _pointerDown(e) {
    if (!this.enabled || e.target !== this.renderer.domElement) return;
    this._ray(e);
    const roots = this._candidateRoots();
    const hits = this.raycaster.intersectObjects(roots, true);
    if (!hits.length) { this._select(null); return; }
    const root = this._rootFor(hits[0].object);
    if (!root) return;
    this._select(root);
    const point = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.ground, point)) {
      this.dragOffset.set(root.position.x-point.x, 0, root.position.z-point.z);
      this.dragStartPosition.copy(root.position);
      this.dragCollisionBindings = this._findCollisionBindings(root.position);
      this.dragGroupStart = this._groupMembers(root).map(obj=>({obj,position:obj.position.clone()}));
      this.dragging = true; this._snapshot(root);
      try { this.renderer.domElement.setPointerCapture(e.pointerId); } catch (_) {}
    }
    e.preventDefault();
  }

  _pointerMove(e) {
    if (!this.enabled || !this.dragging || !this.selected) return;
    this._ray(e); const point = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.ground, point)) return;
    let x = point.x + this.dragOffset.x, z = point.z + this.dragOffset.z;
    if (this.grid) { x = Math.round(x); z = Math.round(z); }
    this.selected.position.x = THREE.MathUtils.clamp(x, -75, 75);
    this.selected.position.z = THREE.MathUtils.clamp(z, -100, 100);
    const dx=this.selected.position.x-this.dragStartPosition.x, dz=this.selected.position.z-this.dragStartPosition.z;
    for(const member of this.dragGroupStart){if(member.obj===this.selected)continue;member.obj.position.x=THREE.MathUtils.clamp(member.position.x+dx,-75,75);member.obj.position.z=THREE.MathUtils.clamp(member.position.z+dz,-100,100);}
    this._moveBoundCollisions(dx,dz);
    this._updateSelectedLabel(); this._saveLocal(false);
  }

  _pointerUp() { if (this.dragging) { this.dragging=false; this.dragCollisionBindings=[]; this.dragGroupStart=[]; this._saveLocal(false); this._warnOverlap(this.selected); } }

  _select(obj) {
    this._clearHighlight(); this.selected = obj;
    if (obj) {
      obj.traverse(o => { if (o.isMesh && o.material) { o.userData._oldEmissive = o.material.emissive?.getHex?.(); if (o.material.emissive) o.material.emissive.setHex(0x294c18); } });
    }
    this._updateSelectedLabel();
    this._refreshObjectList();
  }

  _clearHighlight() {
    if (!this.selected) return;
    this.selected.traverse(o => { if (o.isMesh && o.material?.emissive && o.userData._oldEmissive !== undefined) o.material.emissive.setHex(o.userData._oldEmissive); });
  }

  _updateSelectedLabel() {
    const el = document.getElementById('we-selected');
    if (!el) return;
    if (!this.selected) { el.textContent='Chưa chọn vật thể'; return; }
    const p=this.selected.position;
    const r=this.selected.rotation.y*180/Math.PI; const sc=this.selected.scale.x;
    el.textContent=`${this.selected.userData.editorLabel || 'Vật thể'} · X ${p.x.toFixed(1)} · Z ${p.z.toFixed(1)} · Xoay ${Math.round(r)}° · Cỡ ${sc.toFixed(2)}`;
  }

  _action(action) {
    if (action==='close') return this.setEnabled(false);
    if (action==='refresh-list') return this._refreshObjectList();
    if (action==='add') return this._addObject(document.getElementById('we-add-type')?.value || 'tree');
    if (action==='duplicate') return this._duplicateSelected();
    if (action==='delete') return this._deleteSelected();
    if (action==='grid') { this.grid=!this.grid; return this._status(`Lưới ${this.grid?'đã bật':'đã tắt'}.`); }
    if (action==='save') { this._saveLocal(true); return; }
    if (action==='export') return this._export();
    if (action==='import') { document.getElementById('we-json-file').click(); return; }
    if (action==='reset') { if(confirm('Khôi phục bố cục ban đầu? Bản lưu World Builder trên thiết bị sẽ bị thay thế.')) { localStorage.removeItem(STORAGE_KEY); location.reload(); } return; }
    if (action==='undo') { const item=this.undoStack.pop(); if(item){if(item.kind==='delete'){this.scene.add(item.obj);this._select(item.obj);}else if(item.members){for(const m of item.members){m.obj.position.copy(m.position);m.obj.rotation.copy(m.rotation);m.obj.scale.copy(m.scale);}this._updateSelectedLabel();}else{item.obj.position.copy(item.position);item.obj.rotation.y=item.rotation;item.obj.scale.copy(item.scale);}this._refreshObjectList();this._saveLocal(false);this._status('Đã hoàn tác thao tác gần nhất.');} return; }
    if (!this.selected) return this._status('Hãy chạm chọn một vật thể trước.');
    this._snapshot(this.selected);
    const step=this.grid?1:0.25;
    let dx=0,dz=0;
    if(action==='left') dx=-step;
    if(action==='right') dx=step;
    if(action==='up') dz=-step;
    if(action==='down') dz=step;
    if(dx||dz){for(const member of this._groupMembers(this.selected)){member.position.x=THREE.MathUtils.clamp(member.position.x+dx,-75,75);member.position.z=THREE.MathUtils.clamp(member.position.z+dz,-100,100);}}
    if(action==='rotate-left') this.selected.rotation.y-=Math.PI/12;
    if(action==='rotate-right') this.selected.rotation.y+=Math.PI/12;
    if(action==='scale-up') this.selected.scale.multiplyScalar(1.1);
    if(action==='scale-down') this.selected.scale.multiplyScalar(0.9);
    this._updateSelectedLabel(); this._saveLocal(false); this._warnOverlap(this.selected);
  }

  _refreshObjectList() {
    const select=document.getElementById('we-object-list'); if(!select)return;
    const previous=new Set([...select.selectedOptions].map(o=>o.value));
    if(this.selected)previous.add(this.selected.userData.editorId);
    select.replaceChildren();
    for(const obj of this._candidateRoots()) {
      const label=(obj.userData.editorLabel || obj.userData.editorId)+(obj.userData.editorGroup?` · Nhóm ${obj.userData.editorGroup}`:'');
      const option=new Option(label, obj.userData.editorId);option.selected=previous.has(obj.userData.editorId);select.add(option);
    }
  }

  _groupMembers(obj) { const id=obj?.userData?.editorGroup;return id?this._candidateRoots().filter(o=>o.userData.editorGroup===id):obj?[obj]:[]; }
  _groupSelectedFromList() {
    const select=document.getElementById('we-object-list');const objects=[...select.selectedOptions].map(opt=>this._candidateRoots().find(o=>o.userData.editorId===opt.value)).filter(Boolean);
    if(objects.length<2)return this._status('Chọn ít nhất 2 vật thể trong danh sách (Ctrl/chạm chọn nhiều mục).');
    const id=`G${Date.now().toString(36)}${++editorObjectSerial}`;for(const obj of objects)obj.userData.editorGroup=id;
    this._refreshObjectList();this._saveLocal(false);this._status(`Đã gom ${objects.length} vật thể thành nhóm ${id}. Kéo hoặc di chuyển một vật thể trong nhóm để dời cả nhóm.`);
  }
  _ungroupSelected() { if(!this.selected)return this._status('Hãy chọn vật thể trong nhóm.');const members=this._groupMembers(this.selected);for(const obj of members)delete obj.userData.editorGroup;this._refreshObjectList();this._saveLocal(false);this._status(`Đã bỏ nhóm cho ${members.length} vật thể.`); }
  _selectGroupInList() { if(!this.selected)return this._status('Hãy chọn vật thể trong nhóm.');const ids=new Set(this._groupMembers(this.selected).map(o=>o.userData.editorId));const select=document.getElementById('we-object-list');for(const opt of select.options)opt.selected=ids.has(opt.value);this._status(`Đã chọn ${ids.size} vật thể trong nhóm.`); }
  _warnOverlap(obj) {
    if(!obj)return;const type=obj.userData.editorType;const radius=({tree:0.9,rock:0.65,fence:1.15,sign:0.65,flower:0.55,house:2.2,warehouse:3.2,shed:1.25,pond:1.35,field:0.95,forge:1.8,kitchen:1.8,beach:4.5,shrub:0.85,palm:1.1,pine:1.0,'fruit-tree':1.0,flowerbed:1.2,grass:0.4})[type]||0.45;
    const hit=this._candidateRoots().find(other=>other!==obj&&Math.hypot(other.position.x-obj.position.x,other.position.z-obj.position.z)<radius+(({tree:0.9,rock:0.65,fence:1.15,sign:0.65,flower:0.55,house:2.2,warehouse:3.2,shed:1.25,pond:1.35,field:0.95})[other.userData.editorType]||0.45)*0.8);
    if(hit)this._status(`⚠ Có thể chồng lấn với “${hit.userData.editorLabel||'vật thể khác'}”. Kiểm tra lối đi và vùng tương tác; cảnh báo không tự chặn vị trí.`);
  }

  _makePrimitive(type) {
    const g=new THREE.Group(); const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:0.85,...extra});
    const add=(geometry,material,x,y,z)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
    if(type==='tree') {
      add(new THREE.CylinderGeometry(.16,.23,1.2,7),mat(0x80502b),0,.6,0);
      add(new THREE.ConeGeometry(.9,1.55,8),mat(0x2f8b43),0,1.75,0);
      add(new THREE.SphereGeometry(.58,8,6),mat(0x48a94f),.25,2.25,.08);
    } else if(type==='rock') add(new THREE.DodecahedronGeometry(.55,0),mat(0x89949a),0,.35,0);
    else if(type==='fence') {
      const wood=mat(0x895329); add(new THREE.BoxGeometry(2.2,.13,.13),wood,0,.65,0); add(new THREE.BoxGeometry(2.2,.13,.13),wood,0,1.05,0);
      for(const x of [-.95,.95])add(new THREE.BoxGeometry(.14,1.25,.16),wood,x,.62,0);
    } else if(type==='sign') {
      add(new THREE.CylinderGeometry(.055,.07,1.35,7),mat(0x80502b),0,.67,0);
      add(new THREE.BoxGeometry(1.15,.42,.12),mat(0x438b4c),0,1.25,0);
    } else if(type==='flower') {
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5,x=Math.cos(a)*.35,z=Math.sin(a)*.35;add(new THREE.CylinderGeometry(.025,.03,.25,5),mat(0x42813b),x,.12,z);add(new THREE.SphereGeometry(.13,7,5),mat([0xffd85c,0xf58ac1,0xffffff][i%3]),x,.3,z);}
    } else if(type==='shed') {
      add(new THREE.BoxGeometry(1.8,1.5,1.5),mat(0xc58b52),0,.75,0);add(new THREE.ConeGeometry(1.35,.65,4),mat(0x9b4d32),0,1.8,0);add(new THREE.BoxGeometry(.42,.8,.06),mat(0x6a3d25),0,.4,.78);
    } else if(type==='house') {
      add(new THREE.BoxGeometry(3.4,2.5,3.0),mat(0xf0d6a2),0,1.25,0);
      add(new THREE.ConeGeometry(2.55,1.45,4),mat(0xb84e3e),0,3.1,0).rotation.y=Math.PI/4;
      add(new THREE.BoxGeometry(.68,1.35,.12),mat(0x70452e),0,.68,1.56);
      for(const x of [-1.0,1.0]){add(new THREE.BoxGeometry(.62,.62,.1),mat(0x74c7e5),x,1.62,1.56);add(new THREE.BoxGeometry(.72,.09,.13),mat(0xffffff),x,1.62,1.62);add(new THREE.BoxGeometry(.09,.7,.13),mat(0xffffff),x,1.62,1.62);}
    } else if(type==='warehouse') {
      add(new THREE.BoxGeometry(5.0,3.0,4.2),mat(0xd2a06a),0,1.5,0);
      add(new THREE.ConeGeometry(3.6,1.8,4),mat(0x386a9b),0,3.75,0).rotation.y=Math.PI/4;
      add(new THREE.BoxGeometry(1.8,2.25,.14),mat(0x65402a),0,1.12,2.16);
      for(const x of [-2.25,2.25])add(new THREE.BoxGeometry(.16,3.0,.16),mat(0x89572f),x,1.5,2.14);
    } else if(type==='pond') {
      const water=mat(0x26b9d0,{metalness:.05,roughness:.25});const m=add(new THREE.CylinderGeometry(1.25,1.25,.12,24),water,0,.06,0);m.scale.z=.78;
      const rim=mat(0x858d7b);for(let i=0;i<10;i++){const a=i*Math.PI*2/10;add(new THREE.DodecahedronGeometry(.17,0),rim,Math.cos(a)*1.25,.12,Math.sin(a)*.95);}
    } else if(type==='field') add(new THREE.BoxGeometry(1.7,.12,1.7),mat(0x3e281c),0,.06,0);
    else if(type==='forge') {
      add(new THREE.BoxGeometry(2.8,2.0,2.3),mat(0x756f68),0,1,0);
      add(new THREE.ConeGeometry(1.9,1.1,4),mat(0x554d49),0,2.55,0).rotation.y=Math.PI/4;
      add(new THREE.BoxGeometry(.8,.9,.18),mat(0x403b38),0,.55,1.18);
      add(new THREE.BoxGeometry(.55,.75,.55),mat(0x343638),-.85,.38,1.35);
      add(new THREE.SphereGeometry(.22,8,6),mat(0xff7b28,{emissive:0xe34b0c,emissiveIntensity:.7}),.45,.35,1.2);
      add(new THREE.CylinderGeometry(.14,.2,.6,8),mat(0x9ba0a3),.8,.35,1.1);
    } else if(type==='kitchen') {
      add(new THREE.BoxGeometry(2.8,1.9,2.4),mat(0xf0d6a2),0,.95,0);
      add(new THREE.ConeGeometry(2.05,1.1,4),mat(0x668b9b),0,2.45,0).rotation.y=Math.PI/4;
      add(new THREE.BoxGeometry(1.15,.72,.65),mat(0x766050),0,.38,1.25);
      for(const x of [-.3,.3])add(new THREE.CylinderGeometry(.12,.12,.08,10),mat(0x303235),x,.79,1.3);
      add(new THREE.CylinderGeometry(.16,.2,1.3,8),mat(0x8a8a82),.85,2.05,-.65);
      add(new THREE.ConeGeometry(.25,.25,8),mat(0x5b5c59),.85,2.8,-.65);
    } else if(type==='beach') {
      const sand=mat(0xe7d18a);const patch=add(new THREE.CylinderGeometry(4.5,4.5,.12,32),sand,0,.04,0);patch.scale.z=.72;
      add(new THREE.CylinderGeometry(.12,.2,1.7,7),mat(0x8a6338),-1,.85,-.8);
      add(new THREE.ConeGeometry(1.25,.55,8),mat(0x2f9a52),-1,1.85,-.8);
      add(new THREE.ConeGeometry(1.0,.45,8),mat(0x45b65c),-.55,1.75,-.65);
      add(new THREE.CylinderGeometry(.04,.04,1.6,7),mat(0xf1eee0),1.5,.8,.5);
      const canopy=add(new THREE.ConeGeometry(1.0,.35,8),mat(0xf08b7c),1.5,1.65,.5);canopy.scale.set(1,1,.8);
      add(new THREE.BoxGeometry(.75,.12,.3),mat(0x9b6538),1.5,.35,.5);
    } else if(type==='shrub') {
      for(let i=0;i<4;i++){const a=i*Math.PI/2;add(new THREE.SphereGeometry(.42,8,6),mat([0x3d873e,0x54a34b,0x6bb85c][i%3]),Math.cos(a)*.28,.35+(i%2)*.12,Math.sin(a)*.24);}
    } else if(type==='palm') {
      add(new THREE.CylinderGeometry(.13,.2,2.4,7),mat(0x987047),0,1.2,0);
      for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const leaf=add(new THREE.ConeGeometry(.24,1.5,5),mat(0x2f984f),Math.cos(a)*.58,2.35,Math.sin(a)*.58);leaf.rotation.z=Math.cos(a)*.7;leaf.rotation.x=Math.sin(a)*.7;}
      for(let i=0;i<3;i++)add(new THREE.SphereGeometry(.13,7,5),mat(0x7dbb42),Math.cos(i*2.1)*.18,2.0,Math.sin(i*2.1)*.18);
    } else if(type==='pine') {
      add(new THREE.CylinderGeometry(.13,.2,1.1,7),mat(0x80502b),0,.55,0);
      for(let i=0;i<3;i++)add(new THREE.ConeGeometry(1.0-i*.2,1.25,7),mat([0x276c3b,0x32864a,0x3d9951][i]),0,1.15+i*.55,0);
    } else if(type==='fruit-tree') {
      add(new THREE.CylinderGeometry(.15,.23,1.3,7),mat(0x80502b),0,.65,0);
      add(new THREE.SphereGeometry(.85,9,7),mat(0x398b42),0,1.8,0);
      for(const [x,y,z] of [[-.45,2.0,.2],[.4,1.65,.25],[.1,2.25,-.4]])add(new THREE.SphereGeometry(.14,7,5),mat(0xe84e45),x,y,z);
    } else if(type==='flowerbed') {
      add(new THREE.BoxGeometry(2.2,.12,1.3),mat(0x76503a),0,.06,0);
      for(let i=0;i<9;i++){const x=(i%3-.95)*.55,z=(Math.floor(i/3)-1)*.35;add(new THREE.CylinderGeometry(.025,.03,.28,5),mat(0x42813b),x,.2,z);add(new THREE.SphereGeometry(.14,7,5),mat([0xffd85c,0xf58ac1,0xffffff,0xb8a1e3][i%4]),x,.38,z);}
    } else if(['cow-farm','chicken-farm','pig-farm'].includes(type)) {
      const isCow=type==='cow-farm', isChicken=type==='chicken-farm';
      const wood=mat(0x9a6a3b), wall=mat(isCow?0xf0e4c7:isChicken?0xe7c78c:0xd6a08b), roof=mat(isCow?0x9a5142:isChicken?0xb65a42:0x715b50);
      add(new THREE.BoxGeometry(4.8,.12,4.2),mat(0x8a754a),0,.06,0);
      add(new THREE.BoxGeometry(2.6,1.8,2.1),wall,0,.9,-.8);
      add(new THREE.ConeGeometry(1.9,.9,4),roof,0,2.25,-.8).rotation.y=Math.PI/4;
      add(new THREE.BoxGeometry(.95,1.0,.1),mat(0x64402a),0,.5,.3);
      for(const x of [-2.1,2.1]) {add(new THREE.BoxGeometry(.12,.65,.12),wood,x,.33,1.65);add(new THREE.BoxGeometry(.12,.65,.12),wood,x,.33,-1.65);}
      for(const z of [-1.65,1.65]) {add(new THREE.BoxGeometry(4.2,.12,.12),wood,0,.48,z);add(new THREE.BoxGeometry(4.2,.12,.12),wood,0,.2,z);}
      const fur=mat(isCow?0xf2eee4:isChicken?0xf7e6b2:0xd78e91), dark=mat(isCow?0x343434:isChicken?0xd99b36:0x75454a), legs=mat(0x5b4638);
      const animalCount=isChicken?4:2;
      for(let i=0;i<animalCount;i++) {const x=(i%2?0.85:-.85),z=(i<2?.65:-.25);const size=isChicken?.28:isCow?.5:.43;
        add(new THREE.SphereGeometry(size,8,6),fur,x,.42,z);
        add(new THREE.SphereGeometry(size*.58,8,6),fur,x+size*.72,.55,z+.04);
        add(new THREE.SphereGeometry(.07,6,5),dark,x+size*1.05,.61,z+.17);
        if(!isChicken)for(const lx of [-.22,.22])for(const lz of [-.18,.18])add(new THREE.CylinderGeometry(.045,.05,.32,5),legs,x+lx,.16,z+lz);
        if(isCow){add(new THREE.SphereGeometry(.12,6,5),dark,x-.08,.45,z+.42);add(new THREE.SphereGeometry(.08,6,5),dark,x+.13,.4,z+.42);}
        if(isChicken)add(new THREE.ConeGeometry(.08,.18,5),dark,x+size*1.15,.72,z+.05).rotation.z=-Math.PI/2;
        if(!isCow&&!isChicken)add(new THREE.SphereGeometry(.12,6,5),dark,x-.05,.6,z-.35);
      }
    } else if(type==='grass') {
      for(let i=0;i<5;i++){const blade=add(new THREE.ConeGeometry(.1,.42,4),mat([0x5fa747,0x79bf55,0x438f3d][i%3]),Math.cos(i*1.25)*.2,.2,Math.sin(i*1.25)*.2);blade.rotation.z=(i-2)*.12;}
    }
    g.userData.editorMovable=true;g.userData.editorCreated=true;g.userData.editorType=type;g.userData.editorLabel=({tree:'Cây mới',rock:'Đá mới',fence:'Đoạn hàng rào mới',sign:'Biển báo mới',flower:'Bụi hoa mới',house:'Nhà ở mới',warehouse:'Nhà kho lớn mới',shed:'Nhà kho nhỏ mới',pond:'Ao trang trí mới',field:'Ô đất trang trí mới',forge:'Lò rèn mới',kitchen:'Bếp nấu ăn mới',beach:'Bãi biển mini mới',shrub:'Bụi cây mới',palm:'Cây dừa mới',pine:'Cây thông mới','fruit-tree':'Cây ăn quả mới',flowerbed:'Thảm hoa mới',grass:'Bụi cỏ mới','cow-farm':'Trang trại bò','chicken-farm':'Chuồng gà','pig-farm':'Trang trại lợn'})[type]||'Vật thể mới';
    g.userData.editorId=`custom-${type}-${Date.now()}-${++editorObjectSerial}`;
    g.traverse(o=>{if(o.isMesh)o.userData.editorPart=true;});
    return g;
  }

  _addObject(type) {
    const count = document.getElementById('we-add-count')?.value || 1;
    return this._addObjects(type, count);
  }

  _addObjects(type, requestedCount=1) {
    const allowed=['tree','rock','fence','sign','flower','house','warehouse','shed','pond','field','forge','kitchen','beach','shrub','palm','pine','fruit-tree','flowerbed','grass','cow-farm','chicken-farm','pig-farm'];
    if(!allowed.includes(type))return this._status('Loại công trình không hợp lệ.');
    const count=THREE.MathUtils.clamp(Math.floor(Number(requestedCount)||1),1,40);
    const origin=this.selected?.position || new THREE.Vector3(0,0,0);
    const spacing=type==='beach'?10:['cow-farm','chicken-farm','pig-farm'].includes(type)?7:type==='warehouse'?7:type==='house'?5:['forge','kitchen'].includes(type)?4:3.5; const cols=Math.min(count,Math.max(1,Math.ceil(Math.sqrt(count))));
    let last=null;
    for(let i=0;i<count;i++){const obj=this._makePrimitive(type);const col=i%cols,row=Math.floor(i/cols);obj.position.set(THREE.MathUtils.clamp(origin.x+2+col*spacing,-74,74),0,THREE.MathUtils.clamp(origin.z+2+row*spacing,-99,99));obj.userData.editorBasePosition=obj.position.clone();this.scene.add(obj);last=obj;}
    if(last)this._select(last);this._refreshObjectList();this._saveLocal(false);
    this._status(`Đã xây ${count} ${({house:'nhà ở',warehouse:'nhà kho lớn',shed:'nhà kho nhỏ',tree:'cây',rock:'đá',fence:'đoạn hàng rào',sign:'biển báo',flower:'bụi hoa',pond:'ao trang trí',field:'ô đất trang trí',forge:'lò rèn',kitchen:'bếp nấu ăn',beach:'bãi biển mini',shrub:'bụi cây',palm:'cây dừa',pine:'cây thông','fruit-tree':'cây ăn quả',flowerbed:'thảm hoa',grass:'bụi cỏ','cow-farm':'trang trại bò','chicken-farm':'chuồng gà','pig-farm':'trang trại lợn'})[type]||'vật thể'} cùng lúc. Công trình là mô hình dựng sẵn; chưa có nội thất hoặc chức năng lưu trữ riêng.`);
  }

  _duplicateSelected() {
    if(!this.selected)return this._status('Hãy chọn vật thể cần nhân bản.');
    if(this.selected.parent===this.plotsGroup)return this._status('Không nhân bản ô đất gameplay ở bản này để tránh lệch trạng thái cây trồng.');
    if(!this.selected.userData.editorCreated || !this.selected.userData.editorType) return this._status('Để bảo đảm lưu/tải đúng, chỉ nhân bản vật thể được tạo trong World Builder.');
    const clone=this.selected.clone(true);clone.position.x+=1.5;clone.position.z+=1.5;
    clone.userData.editorId=`copy-${Date.now()}-${++editorObjectSerial}`;clone.userData.editorLabel=`Bản sao: ${this.selected.userData.editorLabel||'Vật thể'}`;clone.userData.editorMovable=true;clone.userData.editorCreated=true;clone.userData.editorType=this.selected.userData.editorType;clone.userData.editorBasePosition=clone.position.clone();
    this.scene.add(clone);this._select(clone);this._saveLocal(false);this._status('Đã nhân bản vật thể.');
  }

  _deleteSelected() {
    if(!this.selected)return this._status('Hãy chọn vật thể cần xóa.');
    if(this.selected.parent===this.plotsGroup)return this._status('Không xóa ô đất gameplay ở bản này để bảo vệ cây trồng và dữ liệu save.');
    if(!this.selected.userData.editorCreated)return this._status('Để bảo vệ bản đồ gốc, chỉ có thể xóa vật thể được thêm hoặc nhân bản trong World Builder.');
    const obj=this.selected;this.undoStack.push({kind:'delete',obj});if(this.undoStack.length>40)this.undoStack.shift();obj.parent?.remove(obj);this.selected=null;this._refreshObjectList();this._updateSelectedLabel();this._saveLocal(false);this._status('Đã xóa vật thể mới.');
  }

  _findCollisionBindings(position) {
    return this.collisionBoxes.filter(b => {
      const w=b.maxX-b.minX, d=b.maxZ-b.minZ;
      if (w>10 || d>10) return false;
      const cx=(b.minX+b.maxX)/2, cz=(b.minZ+b.maxZ)/2;
      return Math.hypot(cx-position.x,cz-position.z)<3.2;
    }).map(box=>({box,original:{minX:box.minX,maxX:box.maxX,minZ:box.minZ,maxZ:box.maxZ}}));
  }
  _moveBoundCollisions(dx,dz) { for(const item of this.dragCollisionBindings){const b=item.box,o=item.original;b.minX=o.minX+dx;b.maxX=o.maxX+dx;b.minZ=o.minZ+dz;b.maxZ=o.maxZ+dz;} }
  _snapshot(obj) { const members=this._groupMembers(obj).map(member=>({obj:member,position:member.position.clone(),rotation:member.rotation.clone(),scale:member.scale.clone()}));this.undoStack.push(members.length>1?{members}:{obj,position:obj.position.clone(),rotation:obj.rotation.y,scale:obj.scale.clone()});if(this.undoStack.length>40)this.undoStack.shift(); }
  _layout() { return { format:'farmnhamnhi-world-layout', version:2, savedAt:new Date().toISOString(), objects:this._candidateRoots().map(o=>({id:o.userData.editorId,label:o.userData.editorLabel,created:!!o.userData.editorCreated,type:o.userData.editorType||null,position:{x:o.position.x,y:o.position.y,z:o.position.z},rotation:{x:o.rotation.x,y:o.rotation.y,z:o.rotation.z},scale:{x:o.scale.x,y:o.scale.y,z:o.scale.z},group:o.userData.editorGroup||null})) }; }
  _saveLocal(show) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._layout())); if(show)this._status('Đã lưu bố cục trên thiết bị.'); } catch(e) { this._status('Không lưu được trên thiết bị: '+e.message); } }
  _loadLocal() { try { const raw=localStorage.getItem(STORAGE_KEY); if(raw)this._applyLayout(JSON.parse(raw),false); } catch(e) { console.warn('World Builder: không tải được bố cục',e); } }
  _applyLayout(data,show=true) {
    if (!data || data.format!=='farmnhamnhi-world-layout' || !Array.isArray(data.objects)) throw new Error('File JSON không đúng định dạng World Builder.');
    // Recreate builder-added props before applying positions from a saved/exported layout.
    for(const item of data.objects){if(item.created && !this._candidateRoots().some(o=>o.userData.editorId===item.id)){const match=String(item.type||'').match(/^(tree|rock|fence|sign|flower|house|warehouse|shed|pond|field|forge|kitchen|beach|shrub|palm|pine|fruit-tree|flowerbed|grass|cow-farm|chicken-farm|pig-farm)$/);if(match){const obj=this._makePrimitive(match[1]);obj.userData.editorId=item.id;obj.userData.editorLabel=item.label||obj.userData.editorLabel;this.scene.add(obj);}}}
    const map=new Map(this._candidateRoots().map(o=>[o.userData.editorId,o])); let count=0;
    for(const item of data.objects){const o=map.get(item.id);if(!o||!item.position)continue;const base=o.userData.editorBasePosition||o.position.clone();const dx=(item.position.x||0)-base.x,dz=(item.position.z||0)-base.z;const bindings=this._findCollisionBindings(base);for(const binding of bindings){const b=binding.box,orig=binding.original;b.minX=orig.minX+dx;b.maxX=orig.maxX+dx;b.minZ=orig.minZ+dz;b.maxZ=orig.maxZ+dz;}o.position.set(item.position.x||0,item.position.y||0,item.position.z||0);if(item.rotation)o.rotation.set(item.rotation.x||0,item.rotation.y||0,item.rotation.z||0);if(item.scale)o.scale.set(item.scale.x||1,item.scale.y||1,item.scale.z||1);if(item.group)o.userData.editorGroup=String(item.group);else delete o.userData.editorGroup;if(item.created){o.userData.editorCreated=true;o.userData.editorMovable=true;o.userData.editorType=item.type||o.userData.editorType;o.userData.editorLabel=item.label||o.userData.editorLabel;}count++;}
    this._refreshObjectList();
    this._saveLocal(false); if(show)this._status(`Đã nhập vị trí ${count} vật thể. Nhóm và vị trí được khôi phục; kiểm tra cảnh báo chồng lấn nếu có.`);
  }
  _export() { const blob=new Blob([JSON.stringify(this._layout(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='farmnhamnhi-world-layout.json';a.click();URL.revokeObjectURL(url);this._status('Đã xuất file JSON.'); }
  _status(text) { const el=document.getElementById('world-editor-status');if(el)el.textContent=text; if(this.onMessage)this.onMessage(text); }
  dispose() { this.renderer.domElement.removeEventListener('pointerdown',this._down);window.removeEventListener('pointermove',this._move);window.removeEventListener('pointerup',this._up);this.toggleButton?.remove();this.panel?.remove(); }
}
