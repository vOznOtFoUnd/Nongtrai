import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';

const gltfLoader = new GLTFLoader();

export class CharacterManager {
  constructor(scene, onMessage) {
    this.scene = scene;
    this.onMessage = onMessage;
    this.characters = new Map();
  }

  loadCharacter(id, name, modelFileName, type = 'npc', position = { x: 0, y: 0, z: 0 }, scale = 1) {
    const folder = type === 'player' ? CONFIG.assetsPath.player : CONFIG.assetsPath.npc;
    const fileUrl = folder + modelFileName;

    gltfLoader.load(
      fileUrl,
      (gltf) => {
        const charModel = gltf.scene;
        charModel.position.set(position.x, position.y, position.z);
        charModel.scale.set(scale, scale, scale);
        charModel.traverse(node => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        this.scene.add(charModel);
        this.characters.set(id, {
          name: name,
          type: type,
          model: charModel,
          mixer: gltf.animations.length > 0 ? new THREE.AnimationMixer(charModel) : null,
          animations: gltf.animations
        });

        if (this.onMessage) this.onMessage(`Đã tải ${type === 'player' ? 'Player' : 'NPC'}: ${name}! 👤`);
      },
      undefined,
      (error) => {
        this._createFallbackCharacter(id, name, type, position);
      }
    );
  }

  _createFallbackCharacter(id, name, type, position) {
    const group = new THREE.Group();
    const color = type === 'player' ? 0x2980b9 : 0xe67e22;
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8), bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    const headMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.5 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), headMat);
    head.position.y = 1.4;
    head.castShadow = true;
    group.add(head);

    group.position.set(position.x, position.y, position.z);
    this.scene.add(group);

    this.characters.set(id, {
      name: name,
      type: type,
      model: group,
      mixer: null,
      animations: []
    });
  }

  update(dt) {
    this.characters.forEach((char) => {
      if (char.mixer) char.mixer.update(dt);
    });
  }
}