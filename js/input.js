import * as THREE from 'three';
import { state } from './state.js';

export class Input {
  constructor(camera, plotsGroup, domElement) {
    this.camera = camera; 
    this.plotsGroup = plotsGroup;
    this.raycaster = new THREE.Raycaster(); 
    this.mouse = new THREE.Vector2();
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
        
        if (!plot.unlocked) {
          plot.unlockPlot();
          break;
        }

        if (state.tool === 'hoe') plot.hoe();
        else if (state.tool === 'plant') plot.plant(state.selectedCrop);
        else if (state.tool === 'water') plot.water();
        else if (state.tool === 'harvest') plot.harvest();
        break;
      }
    }
  }
}