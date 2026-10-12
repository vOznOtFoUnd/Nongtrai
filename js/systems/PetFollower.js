import * as THREE from 'three';
// Pet low-poly dựng bằng hình khối, bám theo nhân vật và không cần asset ngoài.
export class PetFollower {
  constructor(scene, player, getPets) { this.scene=scene; this.player=player; this.getPets=getPets; this.groups={}; this.clock=0; }
  _build(type) {
    const g=new THREE.Group(); g.name='Pet-'+type;
    const dog=type==='dog'; const fur=new THREE.MeshStandardMaterial({color:dog?0xc58b52:0x777783,roughness:.9});
    const cream=new THREE.MeshStandardMaterial({color:dog?0xf0d8b4:0xd6d4dc,roughness:.9});
    const dark=new THREE.MeshStandardMaterial({color:0x302a2a});
    const mesh=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
    mesh(new THREE.SphereGeometry(.28,12,8),fur,0,.32,0).scale.set(1.2,.82,.8);
    mesh(new THREE.SphereGeometry(.2,12,8),cream,0,.45,.22);
    mesh(new THREE.SphereGeometry(.18,12,8),fur,0,.53,.24);
    for(const x of [-.09,.09]) mesh(new THREE.SphereGeometry(.025,6,4),dark,x,.57,.39);
    mesh(new THREE.ConeGeometry(.08,.2,7),dog?fur:cream,dog?-.12:.12,.68,.18).rotation.z=.3;
    mesh(new THREE.ConeGeometry(.08,.2,7),dog?fur:cream,dog?.12:-.12,.68,.18).rotation.z=-.3;
    for(const x of [-.16,.16]) for(const z of [-.12,.12]) mesh(new THREE.CylinderGeometry(.045,.05,.18,7),fur,x,.12,z);
    if(dog) mesh(new THREE.CylinderGeometry(.025,.07,.22,7),fur,0,.45,-.27).rotation.x=-.7;
    return g;
  }
  update(dt) {
    this.clock+=dt; const pets=this.getPets?.()||{}; const type=pets.active;
    if(!type || !(pets[type]>0)) { Object.values(this.groups).forEach(g=>g.visible=false); return; }
    if(!this.groups[type]) { this.groups[type]=this._build(type); this.scene.add(this.groups[type]); }
    Object.entries(this.groups).forEach(([id,g])=>g.visible=id===type);
    const g=this.groups[type], p=this.player.root.position;
    const targetX=p.x-(Math.sin(this.player.root.rotation.y)*1.05), targetZ=p.z-(Math.cos(this.player.root.rotation.y)*1.05);
    g.position.x=THREE.MathUtils.damp(g.position.x,targetX,5,dt); g.position.z=THREE.MathUtils.damp(g.position.z,targetZ,5,dt); g.position.y=.025+Math.abs(Math.sin(this.clock*7))*.035;
    g.rotation.y=THREE.MathUtils.damp(g.rotation.y,this.player.root.rotation.y,4,dt);
  }
}
