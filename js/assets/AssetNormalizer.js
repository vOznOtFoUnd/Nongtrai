import * as THREE from 'three';

/** Chuẩn hóa tâm và kích thước hiển thị, không sửa trực tiếp geometry nguồn. */
export class AssetNormalizer {
  static normalize(object, { targetHeight = 2, centerXZ = true, groundToZero = true } = {}) {
    if (!object?.isObject3D) throw new TypeError('Model cần là THREE.Object3D.');
    object.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bounds.getSize(size); bounds.getCenter(center);
    if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('Model không có chiều cao hợp lệ.');
    const factor = targetHeight > 0 ? targetHeight / size.y : 1;
    object.scale.multiplyScalar(factor);
    object.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(object);
    const scaledCenter = new THREE.Vector3(); scaledBounds.getCenter(scaledCenter);
    if (centerXZ) { object.position.x -= scaledCenter.x; object.position.z -= scaledCenter.z; }
    if (groundToZero) object.position.y -= scaledBounds.min.y;
    object.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = true; node.receiveShadow = true;
      if (node.material) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) { material.needsUpdate = true; }
      }
    });
    return { object, scaleFactor: factor, originalSize: size };
  }
}
