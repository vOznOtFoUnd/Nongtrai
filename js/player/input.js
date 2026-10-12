import * as THREE from 'three';
import { state } from '../data/state.js';

export class Input {
  constructor(camera, plotsGroup, domElement, player = null) {
    this.camera = camera; 
    this.plotsGroup = plotsGroup;
    this.raycaster = new THREE.Raycaster(); 
    this.mouse = new THREE.Vector2();
    this.player = player;
    this.domElement = domElement;
    this._pointerStart = null;
    // Chỉ tương tác ô đất khi đây là cú chạm/click ngắn; vuốt để xoay camera không kích hoạt ruộng.
    domElement.addEventListener('pointerdown', e => {
      if (window.farmWorldEditorActive || e.target.closest('#ui') || e.target.closest('#mobile-joystick')) return;
      this._pointerStart = { id: e.pointerId, x: e.clientX, y: e.clientY, target: e.target };
    });
    domElement.addEventListener('pointerup', e => {
      const start = this._pointerStart; this._pointerStart = null;
      if (window.farmWorldEditorActive) return;
      if (!start || start.id !== e.pointerId || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) return;
      this._onDown(e);
    });
    domElement.addEventListener('pointercancel', () => { this._pointerStart = null; });
  }

  _onDown(e) {
    if (window.farmWorldEditorActive || e.target.closest('#ui')) return;
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
          else if (action === 'water') {
            plot.water();
            const canLevel = Math.max(0, Number(state.forge?.upgrades?.wateringCan) || 0);
            if (canLevel >= 2) {
              // Bình tưới cấp 2+ tưới các ô lân cận trong phạm vi 3x3.
              state.plots.filter(other => other !== plot && other.unlocked &&
                Math.abs(other.ix - plot.ix) <= 1 && Math.abs(other.iz - plot.iz) <= 1 &&
                (other.state === 'planted' || other.state === 'withered'))
                .forEach(other => other.water());
            }
          }
          else if (action === 'harvest') plot.harvest();
          else if (action === 'pest') plot.catchPest();
        };
        if (this.player) this.player.performAction(plot, action, execute);
        else execute();
        break;
      }
    }
  }
}