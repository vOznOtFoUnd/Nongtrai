/* FIX72: general in-game GLB replacement tester for non-crop models. */
(function(g){'use strict';
 const defs={chicken:'🐔 Gà',cow:'🐮 Bò',pig:'🐷 Heo',duck:'🦆 Vịt ao',fish:'🐟 Cá ao',apple:'🍎 Cây táo',orange:'🍊 Cây cam',peach:'🍑 Cây đào',mango:'🥭 Cây xoài',player:'🧑‍🌾 Nhân vật',soil:'🟫 Ô đất',pine:'🌲 Cây thông',orchardSoil:'🌳 Ô đất cây ăn quả',stove:'🍳 Bếp nấu',bird:'🐦 Chim bay',market:'🏪 Quầy chợ',scarecrow:'🪆 Bù nhìn',fishBridge:'🎣 Cầu cá',duckNest:'🥚 Ổ trứng vịt'};
 const state=g.FarmGameAssetTest=g.FarmGameAssetTest||{config:{},urls:{},cache:{},selected:'chicken',instances:{}};
 Object.keys(defs).forEach(k=>{if(!state.config[k])state.config[k]={scale:1,x:0,y:0,z:0,url:''};if(!state.instances[k])state.instances[k]=new Set()});
 function clone(m){if(!m)return null;return THREE.SkeletonUtils&&THREE.SkeletonUtils.clone?THREE.SkeletonUtils.clone(m):m.clone(true)}
 function load(id){const c=state.config[id];if(!c||!c.url||!g.THREE||!THREE.GLTFLoader)return Promise.resolve(null);if(state.cache[id]&&state.cache[id].url===c.url)return Promise.resolve(clone(state.cache[id].model));return new Promise(resolve=>new THREE.GLTFLoader().load(c.url,gltf=>{if(!gltf||!gltf.scene){resolve(null);return}gltf.scene.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});state.cache[id]={url:c.url,model:gltf.scene,animations:gltf.animations||[]};if(g.FarmAssetStudio)g.FarmAssetStudio.onLoaded(id);resolve(clone(gltf.scene))},undefined,e=>{console.warn('[GameAssetTest] GLB load failed',e);resolve(null)}))}
 // FIX79: static soil GLB batching. Animated/skinned/morph models retain the
 // original clone path (animation support and procedural fallback are preserved).
 let soilBatchTimer=0;
 const soilGLBBatches=[];
 function clearSoilGLBBatches(){
  soilGLBBatches.forEach(mesh=>{mesh.parent?.remove(mesh);mesh.dispose?.();});
  soilGLBBatches.length=0;
  (state.instances.soil||[]).forEach(root=>{
   const w=root.userData.assetLabModel;if(w)w.visible=true;
  });
 }
 function scheduleSoilGLBBatch(){
  clearTimeout(soilBatchTimer);
  soilBatchTimer=setTimeout(rebuildSoilGLBBatch,120);
 }
 function rebuildSoilGLBBatch(){
  clearSoilGLBBatches();
  const roots=[...state.instances.soil].filter(root=>root.parent&&root.userData.assetLabModel);
  if(roots.length<2)return;
  const first=roots[0].userData.assetLabModel;
  const getMeshes=root=>{
   const result=[];
   root.traverse(node=>{if(node.isMesh)result.push(node)});
   return result;
  };
  const templates=getMeshes(first);
  const clips=state.cache.soil?.animations||[];
  // Do not batch GLB with animation, bones, morph targets, or incompatible topology.
  if(clips.length||!templates.length||templates.length>24||templates.some(m=>m.isSkinnedMesh||m.morphTargetInfluences?.length||!m.geometry||!m.material||Array.isArray(m.material)))return;
  const all=roots.map(root=>getMeshes(root.userData.assetLabModel));
  if(all.some(list=>list.length!==templates.length||list.some((m,i)=>m.geometry!==templates[i].geometry||m.material.type!==templates[i].material.type||m.material.map!==templates[i].material.map||m.material.transparent!==templates[i].material.transparent||m.material.side!==templates[i].material.side)))return;
  // For each submesh use its own instance batch: N submeshes => N draw calls.
  const created=[];
  try{
   templates.forEach((template,j)=>{
    const batch=new THREE.InstancedMesh(template.geometry,template.material,roots.length);
    batch.name='soilGLBInstanced-'+j;
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.castShadow=template.castShadow;
    batch.receiveShadow=template.receiveShadow;
    batch.raycast=()=>{};
    const dummy=new THREE.Object3D();
    roots.forEach((root,i)=>{
     const node=all[i][j];node.updateMatrixWorld(true);
     node.matrixWorld.decompose(dummy.position,dummy.quaternion,dummy.scale);
     dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);
    });
    batch.instanceMatrix.needsUpdate=true;
    scene.add(batch);created.push(batch);
   });
   roots.forEach(root=>{root.userData.assetLabModel.visible=false;});
   soilGLBBatches.push(...created);
  }catch(e){created.forEach(batch=>{scene.remove(batch);batch.dispose?.()});console.warn('[FIX79] Soil instancing fallback',e)}
 }
 function apply(root,id){
  if(!root||!state.config[id])return;
  state.instances[id].add(root);
  const url=state.config[id].url;
  if(!url)return;
  load(id).then(model=>{
   if(!model||state.config[id].url!==url||!root.parent&&!root.userData.assetLabAllowDetached)return;
   if(g.FarmAssetStudio)g.FarmAssetStudio.detach(root);
   if(root.userData.assetLabModel)root.remove(root.userData.assetLabModel);
   if(!root.userData.assetLabHidden){root.userData.assetLabHidden=[];root.children.slice().forEach(ch=>{
    if(ch.userData&&ch.userData.assetLabModel)return;
    // Preserve hitbox, interactive sprites, and warning indicators.
    if(ch.isSprite||ch.userData&&ch.userData.assetKeepVisible)return;
    ch.visible=false;root.userData.assetLabHidden.push(ch);
   })}
   if(g.FarmAssetStudio)g.FarmAssetStudio.normalize(model,id);
   const wrap=new THREE.Group();wrap.userData.assetLabWrapper=true;wrap.add(model);root.add(wrap);
   root.userData.assetLabModel=wrap;root.userData.assetLabKey=id;
   if(id==='orchardSoil'&&root.userData.orchardHitbox){const hit=root.userData.orchardHitbox;hit.material.transparent=true;hit.material.opacity=0;hit.material.depthWrite=false;}
   // Root is the live game transform. Never reparent to scene or change its world position.
   updateOne(root,id);
   if(g.FarmAssetStudio)g.FarmAssetStudio.attach(root,id);
   if(id==='soil'){if(typeof g.setCustomSoilDetailsVisible==='function')g.setCustomSoilDetailsVisible(false);scheduleSoilGLBBatch();}
  });
 }
 function updateOne(root,id){const c=state.config[id],w=root&&root.userData.assetLabModel;if(!c||!w||root.userData.assetLabKey!==id)return;w.scale.setScalar(c.scale);w.position.set(c.x,c.y,c.z)}
 function build(){const list=document.getElementById('game-asset-upload-list');if(list&&!list.dataset.ready){list.dataset.ready='1';list.innerHTML=Object.keys(defs).map(id=>`<div class="rounded-xl border border-sky-100 bg-white p-2 min-w-0"><div class="text-xs font-black mb-1">${defs[id]}</div><input class="block w-full text-[10px]" type="file" accept=".glb,model/gltf-binary" aria-label="Tải model ${defs[id]}" onchange="uploadGameAssetTest('${id}',this)"><div id="game-asset-status-${id}" class="text-[10px] text-slate-500 mt-1">Chưa tải model</div></div>`).join('')}
 const sel=document.getElementById('game-asset-select');if(sel&&!sel.dataset.ready){sel.dataset.ready='1';sel.innerHTML=Object.keys(defs).map(id=>`<option value="${id}">${defs[id]}</option>`).join('');sel.value=state.selected;sync()}}
 function status(id,t){const e=document.getElementById('game-asset-status-'+id);if(e)e.textContent=t;const s=document.getElementById('game-asset-status');if(s&&state.selected===id)s.textContent=t}
 g.uploadGameAssetTest=function(id,input){
  const f=input&&input.files&&input.files[0];if(!f)return;
  if(!/\.glb$/i.test(f.name)){status(id,'Chỉ hỗ trợ .glb');input.value='';return}
  if(id==='soil')clearSoilGLBBatches();
  const old=state.urls[id],url=URL.createObjectURL(f);state.urls[id]=url;state.config[id].url=url;delete state.cache[id];
  state.selected=id;const sel=document.getElementById('game-asset-select');if(sel)sel.value=id;
  status(id,'Đang tải '+f.name+'…');
  load(id).then(model=>{
   if(state.config[id].url!==url)return;
   if(!model){status(id,'Không đọc được GLB');return}
   state.instances[id].forEach(root=>apply(root,id));
   status(id,'✓ '+f.name+' · '+(state.cache[id].animations||[]).length+' animation');
   if(g.FarmAssetStudio)g.FarmAssetStudio.onLoaded(id);sync();
   // Revoke only after pending old loaders have finished; do not revoke new URL.
   if(old)setTimeout(()=>URL.revokeObjectURL(old),1000);
  });
 };
 g.registerGameAssetTarget=function(root,id){if(root&&state.config[id]){state.instances[id].add(root);if(state.config[id].url)apply(root,id)}};
 g.toggleGameAssetTool=function(show){const p=document.getElementById('game-asset-tool');if(!p)return;const v=typeof show==='boolean'?show:p.classList.contains('hidden');p.classList.toggle('hidden',!v);const b=document.getElementById('game-asset-tool-toggle');if(b)b.textContent=v?'🧰 Đóng tool':'🧰 Mô hình 3D';if(v){build();sync()}};
 g.selectGameAssetTool=function(id){if(!state.config[id])return;state.selected=id;sync();if(g.FarmAssetStudio)g.FarmAssetStudio.select(id)};
 function sync(){const id=state.selected,c=state.config[id];if(!c)return;const sel=document.getElementById('game-asset-select');if(sel&&sel.value!==id)sel.value=id;[['scale','game-asset-scale','game-asset-scale-label',v=>Number(v).toFixed(2)+'×'],['x','game-asset-x','game-asset-x-label',v=>Number(v).toFixed(2)],['y','game-asset-y','game-asset-y-label',v=>Number(v).toFixed(2)],['z','game-asset-z','game-asset-z-label',v=>Number(v).toFixed(2)]].forEach(([k,i,l,fmt])=>{const a=document.getElementById(i),b=document.getElementById(l);if(a)a.value=c[k];if(b)b.textContent=fmt(c[k])});const s=document.getElementById('game-asset-status');if(s)s.textContent=c.url?'✓ Đã chọn model; kéo thanh để căn chỉnh.':'Chưa tải model này trong Cài đặt.'}
 g.updateGameAssetTransform=function(k,v){const c=state.config[state.selected];if(!c||!['scale','x','y','z'].includes(k))return;c[k]=Number(v);state.instances[state.selected].forEach(root=>updateOne(root,state.selected));if(state.selected==='soil')scheduleSoilGLBBatch();sync()};
 g.resetGameAssetTransform=function(){const c=state.config[state.selected];if(!c)return;c.scale=1;c.x=c.y=c.z=0;state.instances[state.selected].forEach(root=>updateOne(root,state.selected));if(state.selected==='soil')scheduleSoilGLBBatch();sync()};
 document.addEventListener('DOMContentLoaded',build);if(document.readyState!=='loading')build();
})(window);
