let stoveMeshes = [];

// Xây dựng tối đa 3 bếp nấu 3D
function build4CookingStoves() {
    stoveMeshes.forEach(mesh => scene.remove(mesh));
    stoveMeshes = [];
    
    const positions = [
        { x: -3.6, z: -20 },
        { x: 0, z: -20 },
        { x: 3.6, z: -20 }
    ];

    positions.forEach((p, idx) => {
        const group = new THREE.Group();
        group.position.set(p.x, 0, p.z);

        const stoveData = gameState.kitchenStoves[idx];
        const isUnlocked = stoveData && stoveData.unlocked;

        const baseMat = new THREE.MeshStandardMaterial({ color: isUnlocked ? 0xef4444 : 0x475569, roughness: 0.6 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.4), baseMat);
        base.position.y = 0.4;
        base.castShadow = true;
        group.add(base);

        const topMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 1.3), topMat);
        top.position.y = 0.82;
        group.add(top);

        if (isUnlocked) {
            const potMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.8 });
            const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.35, 12), potMat);
            pot.position.y = 1.02;
            group.add(pot);
        }

        // Cảnh báo 3D gắn trên mô hình bếp, chỉ bật khi hàng chờ có món thiếu nguyên liệu.
        const warningCanvas = document.createElement('canvas');
        warningCanvas.width = 128;
        warningCanvas.height = 128;
        const warningCtx = warningCanvas.getContext('2d');
        warningCtx.fillStyle = '#ef4444';
        warningCtx.beginPath();
        warningCtx.arc(64, 64, 56, 0, Math.PI * 2);
        warningCtx.fill();
        warningCtx.strokeStyle = '#ffffff';
        warningCtx.lineWidth = 7;
        warningCtx.stroke();
        warningCtx.fillStyle = '#ffffff';
        warningCtx.font = 'bold 88px sans-serif';
        warningCtx.textAlign = 'center';
        warningCtx.textBaseline = 'middle';
        warningCtx.fillText('!', 64, 67);
        const warningTexture = new THREE.CanvasTexture(warningCanvas);
        const warningMaterial = new THREE.SpriteMaterial({ map: warningTexture, transparent: true, depthTest: false });
        const warningSprite = new THREE.Sprite(warningMaterial);
        warningSprite.position.set(0.55, 2.05, 0);
        warningSprite.scale.set(0.62, 0.62, 1);
        warningSprite.visible = false;
        group.add(warningSprite);

        group.userData = { type: 'stove', index: idx, warningSprite };
        scene.add(group);
        stoveMeshes.push(group);
    });
}
