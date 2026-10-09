// PLAYER MOVEMENT LOGIC VARIABLES
let playerTargetPos = null;
let isPlayerMoving = false;
let moveSpeed = 0.22;
let walkAnimTime = 0;
let pendingWorldInteraction = null;
let triggerZones = [];

// Tạo Vùng Tương Tác Vòng Tròn (Trigger Zone) Trước Chuồng
function createTriggerZone(x, z, penType) {
    const group = new THREE.Group();
    group.position.set(x, 0.02, z);

    const ringGeo = new THREE.RingGeometry(0.8, 1.1, 32);
    const ringMat = new THREE.MeshBasicMaterial({ 
        color: 0xfcb316, 
        side: THREE.DoubleSide, 
        transparent: true, 
        opacity: 0.8 
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const innerGeo = new THREE.CircleGeometry(0.8, 32);
    const innerMat = new THREE.MeshBasicMaterial({ 
        color: 0xfde047, 
        side: THREE.DoubleSide, 
        transparent: true, 
        opacity: 0.25 
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = Math.PI / 2;
    group.add(inner);

    group.userData = { type: penType + '_trigger', penType: penType };

    scene.add(group);
    
    triggerZones.push({
        x: x,
        z: z,
        radius: 1.2,
        penType: penType,
        mesh: group,
        isInside: false
    });
}

// Bắt Sự Kiện Touch & Click Trên Màn Hình
function setupTouchAndClickEvents() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('pointerdown', (e) => {
        // Bỏ qua nếu click lên các thành phần UI/Modal 2D
        if (e.target.closest('.interactive-ui') || 
            e.target.closest('#modal-dialog') || 
            e.target.closest('#modal-shop') || 
            e.target.closest('#modal-inventory') || 
            e.target.closest('#modal-quests') || 
            e.target.closest('#modal-market') || 
            e.target.closest('#modal-kitchen') || 
            e.target.closest('#modal-horse-race') || 
            e.target.closest('#modal-bau-cua') || 
            e.target.closest('#modal-animal-pen') || 
            e.target.closest('#modal-fish-select') || 
            e.target.closest('#modal-seeds') || 
            e.target.closest('#modal-tree-saplings') || e.target.closest('#modal-plot-upgrade') || e.target.closest('#modal-quick-menu') || e.target.closest('#modal-player-profile') || e.target.closest('#modal-settings')) {
            return;
        }

        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            let hitObj = intersects[0].object;
            while (hitObj.parent && hitObj.parent !== scene && !hitObj.userData.type) {
                hitObj = hitObj.parent;
            }

            const type = hitObj.userData.type;
            const point = intersects[0].point;

            if (type === 'ground') {
                playerTargetPos = new THREE.Vector3(point.x, 0, point.z);
            } else if (type === 'plot') {
                const idx = hitObj.userData.index;
                playerTargetPos = new THREE.Vector3(hitObj.position.x, 0, hitObj.position.z + 1.2);
                pendingWorldInteraction = () => handlePlotClick(idx);
            } else if (type === 'orchard') {
                const idx = hitObj.userData.index;
                playerTargetPos = new THREE.Vector3(hitObj.position.x, 0, hitObj.position.z + 1.5);
                pendingWorldInteraction = () => handleOrchardClick(idx);
            } else if (type && type.endsWith('_trigger')) {
                playerTargetPos = new THREE.Vector3(hitObj.position.x, 0, hitObj.position.z);
            } else if (type === 'plot_upgrade_npc') {
                const worldPos = hitObj.getWorldPosition(new THREE.Vector3());
                playerTargetPos = new THREE.Vector3(worldPos.x, 0, worldPos.z + 1.5);
                pendingWorldInteraction = () => openPlotUpgradeModal();
            } else if (type === 'pond') {
                playerTargetPos = new THREE.Vector3(0, 0, 20 - 4);
                pendingWorldInteraction = () => openFishPondModal();
            } else if (type === 'minigame_horse') {
                const worldPos = hitObj.getWorldPosition(new THREE.Vector3());
                playerTargetPos = new THREE.Vector3(worldPos.x, 0, worldPos.z + 1.5);
                pendingWorldInteraction = () => openHorseRaceModal();
            } else if (type === 'minigame_baucua') {
                const worldPos = hitObj.getWorldPosition(new THREE.Vector3());
                playerTargetPos = new THREE.Vector3(worldPos.x, 0, worldPos.z + 2.5);
                pendingWorldInteraction = () => openBauCuaModal();
            } else if (type === 'market_sign') {
                const worldPos = hitObj.getWorldPosition(new THREE.Vector3());
                playerTargetPos = new THREE.Vector3(worldPos.x, 0, worldPos.z + 2.0);
                pendingWorldInteraction = () => openModal('modal-market');
            } else if (type === 'stove') {
                playerTargetPos = new THREE.Vector3(hitObj.position.x, 0, hitObj.position.z + 1.2);
                pendingWorldInteraction = () => openModal('modal-kitchen');
            }
        }
    });

    window.addEventListener('keydown', handleKeyDown);
}

// Cập Nhật Di Chuyển & Animation Tay Chân Của Player
function updatePlayerMovement() {
    if (!playerGroup) return;

    if (playerTargetPos) {
        const currentPos = playerGroup.position;
        const dx = playerTargetPos.x - currentPos.x;
        const dz = playerTargetPos.z - currentPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.3) {
            isPlayerMoving = true;
            const angle = Math.atan2(dx, dz);
            playerGroup.rotation.y = angle;

            currentPos.x += (dx / dist) * moveSpeed;
            currentPos.z += (dz / dist) * moveSpeed;

            walkAnimTime += 0.25;
            if (playerLeftLeg && playerRightLeg && playerLeftArm && playerRightArm) {
                playerLeftLeg.rotation.x = Math.sin(walkAnimTime) * 0.6;
                playerRightLeg.rotation.x = -Math.sin(walkAnimTime) * 0.6;
                playerLeftArm.rotation.x = -Math.sin(walkAnimTime) * 0.6;
                playerRightArm.rotation.x = Math.sin(walkAnimTime) * 0.6;
            }
        } else {
            isPlayerMoving = false;
            playerTargetPos = null;
            resetPlayerLimbs();

            if (pendingWorldInteraction) {
                const act = pendingWorldInteraction;
                pendingWorldInteraction = null;
                act();
            }
        }
    }

    // KIỂM TRA BƯỚC VÀO VÒNG TRÒN TƯƠNG TÁC CHUỒNG VẬT NUÔI
    const px = playerGroup.position.x;
    const pz = playerGroup.position.z;

    triggerZones.forEach(zone => {
        const dist = Math.hypot(px - zone.x, pz - zone.z);
        
        if (dist <= zone.radius) {
            if (!zone.isInside) {
                zone.isInside = true;
                zone.mesh.children[0].material.color.setHex(0x22c55e); // Đổi sang màu xanh lá khi bước vào
                
                playerTargetPos = null;
                isPlayerMoving = false;
                resetPlayerLimbs();
                openAnimalPenModal(zone.penType);
            }
        } else {
            if (zone.isInside) {
                zone.isInside = false;
                zone.mesh.children[0].material.color.setHex(0xfcb316); // Đổi lại màu vàng khi bước ra
            }
        }
    });
}

// Xử Lý Điều Khiển Phím WASD / Mũi Tên
function handleKeyDown(e) {
    if (!playerGroup) return;
    const key = e.key.toLowerCase();
    const step = 0.8;
    let moved = false;
    let targetX = playerGroup.position.x;
    let targetZ = playerGroup.position.z;

    if (key === 'w' || key === 'arrowup') { targetZ -= step; moved = true; }
    if (key === 's' || key === 'arrowdown') { targetZ += step; moved = true; }
    if (key === 'a' || key === 'arrowleft') { targetX -= step; moved = true; }
    if (key === 'd' || key === 'arrowright') { targetX += step; moved = true; }

    if (moved) {
        playerTargetPos = new THREE.Vector3(targetX, 0, targetZ);
    }
}
