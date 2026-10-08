let playerGroup, playerLeftArm, playerRightArm, playerLeftLeg, playerRightLeg;

// Tạo Nhân vật Chibi Farmer 3D
function create3DAvatar() {
    playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 5);

    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6 });
    const headGeo = new THREE.SphereGeometry(0.42, 16, 16);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.45;
    head.castShadow = true;
    playerGroup.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e1b4b });
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
    leftEye.position.set(-0.14, 1.48, 0.36);
    leftEye.scale.set(1, 1.3, 0.4);
    playerGroup.add(leftEye);

    const leftShine = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), shineMat);
    leftShine.position.set(-0.12, 1.51, 0.39);
    playerGroup.add(leftShine);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
    rightEye.position.set(0.14, 1.48, 0.36);
    rightEye.scale.set(1, 1.3, 0.4);
    playerGroup.add(rightEye);

    const rightShine = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), shineMat);
    rightShine.position.set(0.16, 1.51, 0.39);
    playerGroup.add(rightShine);

    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.6 });
    const leftBlush = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), blushMat);
    leftBlush.position.set(-0.21, 1.41, 0.35);
    leftBlush.scale.set(1.2, 0.6, 0.3);
    playerGroup.add(leftBlush);

    const rightBlush = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), blushMat);
    rightBlush.position.set(0.21, 1.41, 0.35);
    rightBlush.scale.set(1.2, 0.6, 0.3);
    playerGroup.add(rightBlush);

    const smileMat = new THREE.MeshBasicMaterial({ color: 0x9f1239 });
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 8, 8, Math.PI), smileMat);
    smile.position.set(0, 1.40, 0.39);
    smile.rotation.x = Math.PI / 2;
    smile.rotation.z = Math.PI;
    playerGroup.add(smile);

    const hatMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 16), hatMat);
    brim.position.y = 1.72;
    brim.rotation.x = 0.1;
    playerGroup.add(brim);

    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.35, 16), hatMat);
    crown.position.y = 1.9;
    crown.rotation.x = 0.1;
    playerGroup.add(crown);

    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.40, 0.08, 16), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
    ribbon.position.y = 1.78;
    ribbon.rotation.x = 0.1;
    playerGroup.add(ribbon);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.7 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.7 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.35), bodyMat);
    body.position.y = 0.85;
    body.castShadow = true;
    playerGroup.add(body);

    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.25, 0.33), shirtMat);
    shirt.position.y = 1.05;
    playerGroup.add(shirt);

    const armMat = shirtMat;
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });

    playerLeftArm = new THREE.Group();
    playerLeftArm.position.set(-0.32, 1.1, 0);
    const lArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45), armMat);
    lArmMesh.position.y = -0.2;
    playerLeftArm.add(lArmMesh);
    playerGroup.add(playerLeftArm);

    playerRightArm = new THREE.Group();
    playerRightArm.position.set(0.32, 1.1, 0);
    const rArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45), armMat);
    rArmMesh.position.y = -0.2;
    playerRightArm.add(rArmMesh);
    playerGroup.add(playerRightArm);

    playerLeftLeg = new THREE.Group();
    playerLeftLeg.position.set(-0.15, 0.55, 0);
    const lLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5), legMat);
    lLegMesh.position.y = -0.25;
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.25), shoeMat);
    lShoe.position.set(0, -0.48, 0.04);
    playerLeftLeg.add(lLegMesh);
    playerLeftLeg.add(lShoe);
    playerGroup.add(playerLeftLeg);

    playerRightLeg = new THREE.Group();
    playerRightLeg.position.set(0.15, 0.55, 0);
    const rLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5), legMat);
    rLegMesh.position.y = -0.25;
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.25), shoeMat);
    rShoe.position.set(0, -0.48, 0.04);
    playerRightLeg.add(rLegMesh);
    playerRightLeg.add(rShoe);
    playerGroup.add(playerRightLeg);

    scene.add(playerGroup);
}

// Reset trạng thái các chi thể khi dừng bước
function resetPlayerLimbs() {
    if (playerLeftLeg) playerLeftLeg.rotation.x = 0;
    if (playerRightLeg) playerRightLeg.rotation.x = 0;
    if (playerLeftArm) playerLeftArm.rotation.x = 0;
    if (playerRightArm) playerRightArm.rotation.x = 0;
}
