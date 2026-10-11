import * as THREE from 'three';
import { state } from '../data/state.js';

export class Input {
  constructor(camera, plotsGroup, domElement, player = null) {
    this.camera = camera; 
    this.plotsGroup = plotsGroup;
    this.raycaster = new THREE.Raycaster(); 
    this.mouse = new THREE.Vector2();
    this.player = player;
    domElement.addEventListener('pointerdown', e => this._onDown(e));
  }

  _onDown(e) {
    if (e.target.closest('#ui')) return;
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.plotsGroup.children, true);
    for (const hit of hits) {
      let obj = hit.object;
      while (obj && !obj.userData.plot) obj = obj.parent;
      if (obj && obj.userData.plot) {
        const plot = obj.userData.plot;
        
        const action = !plot.unlocked ? 'unlock' : state.tool;
        const execute = () => {
          if (action === 'unlock') plot.unlockPlot();
          else if (action === 'hoe') plot.hoe();
          else if (action === 'plant') plot.plant(state.selectedCrop);
          else if (action === 'water') plot.water();
          else if (action === 'harvest') plot.harvest();
        };
        if (this.player) this.player.performAction(plot, action, execute);
        else execute();
        break;
      }
    }
  }
}