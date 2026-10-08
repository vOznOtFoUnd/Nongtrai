let stoveMeshes = [];

// Xây dựng 4 Bếp Nấu Ăn 3D
function build4CookingStoves() {
    stoveMeshes.forEach(mesh => scene.remove(mesh));
    stoveMeshes = [];
    
    const positions = [
        { x: -5, z: -20 },
        { x: -1.8, z: -20 },
        { x: 1.8, z: -20 },
        { x: 5, z: -20 }
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

        group.userData = { type: 'stove', index: idx };
        scene.add(group);
        stoveMeshes.push(group);
    });
}
