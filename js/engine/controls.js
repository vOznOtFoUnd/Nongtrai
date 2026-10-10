// PLAYER MOVEMENT LOGIC VARIABLES
let playerTargetPos = null;
let isPlayerMoving = false;
let moveSpeed = 0.22;
let walkAnimTime = 0;
let pendingWorldInteraction = null;
let triggerZones = [];

// UPGRADE 48: controller layer chạy song song với click-to-move cũ.
let directMoveKeys = { up: false, down: false, left: false, right: false };
let joystickInput = { x: 0, y: 0, active: false, pointerId: null };
let cameraAngleLevel = 3;
let thirdPersonCamera = { yaw: 0, pitch: 40, distance: 30 };
let topdownCamera = { yaw: 0, heightLevel: 3, distance: 30, tilt: 80 };
let cameraYaw = 0; // compatibility mirror
let cameraPitch = 40; // compatibility mirror
let cameraDrag = { active: false, pointerId: null, lastX: 0, lastY: 0 };
let lastCameraFollowTime = 0;
let cameraLastSignature = '';
let cameraNeedsUpdate = true;
const CAMERA_FOLLOW_SPEED = 9.5;
const CAMERA_TRANSITION_MS = 300;
let cameraTransition = null;
let nearbyInteraction = null;
let cameraMode = 'thirdPerson';
let interactionTargetCache = [];
let interactionCacheNextRefresh = 0;
let interactionNextCheck = 0;
let lastNearbyInteractionKey = '';
const INTERACTION_CHECK_MS = 90;
const INTERACTION_CACHE_REFRESH_MS = 1200;
const CAMERA_ANGLE_LEVELS = [28, 34, 40, 46, 52];
const TOPDOWN_PITCH_LEVELS = [70, 75, 80, 83, 86];


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

// UPGRADE 48: chuyển giữa click-to-move và điều khiển trực tiếp.
function updateControlModeUI() {
    const direct = getControlMode() === 'direct';
    const hud = document.getElementById('direct-control-hud');
    if (hud) hud.classList.toggle('hidden', !direct);
    const cameraToggle = document.getElementById('camera-mode-toggle');
    if (cameraToggle) cameraToggle.classList.toggle('hidden', !direct);
    const select = document.getElementById('setting-control-mode');
    if (select) select.value = direct ? 'direct' : 'click';
}
function getControlMode() {
    return gameState && gameState.settings && gameState.settings.controlMode === 'direct' ? 'direct' : 'click';
}
function setPlayerControlMode(mode) {
    const direct = mode === 'direct';
    if (!gameState.settings) gameState.settings = {};
    gameState.settings.controlMode = direct ? 'direct' : 'click';
    playerTargetPos = null;
    pendingWorldInteraction = null;
    isPlayerMoving = false;
    directMoveKeys = { up: false, down: false, left: false, right: false };
    joystickInput.x = 0; joystickInput.y = 0; joystickInput.active = false;
    resetPlayerLimbs();
    if (controls) controls.enabled = !direct;
    const hud = document.getElementById('direct-control-hud');
    if (hud) hud.classList.toggle('hidden', !direct);
    if (direct && playerGroup && camera) {
        if (typeof setCameraAngleLevel === 'function') setCameraAngleLevel(cameraAngleLevel);
        else applyCameraFollow();
    }
    if (typeof updateControlModeUI === 'function') updateControlModeUI();
}
function getActiveCameraState() {
    return cameraMode === 'topdown' ? topdownCamera : thirdPersonCamera;
}

function syncCameraCompatibilityState() {
    const active = getActiveCameraState();
    cameraYaw = active.yaw;
    cameraPitch = cameraMode === 'topdown' ? active.tilt : active.pitch;
}

function getCameraMode() { return cameraMode === 'topdown' ? 'topdown' : 'thirdPerson'; }

function setCameraAngleLevel(level, immediate = false) {
    cameraAngleLevel = Math.max(1, Math.min(5, Math.floor(Number(level) || 3)));
    if (cameraMode === 'topdown') {
        topdownCamera.heightLevel = cameraAngleLevel;
        // Height is represented by camera distance; tilt stays stable so
        // topdown never steals the 3D pitch state.
        topdownCamera.distance = [22, 26, 30, 36, 43][cameraAngleLevel - 1];
        topdownCamera.tilt = [76, 78, 80, 82, 84][cameraAngleLevel - 1];
    } else {
        thirdPersonCamera.pitch = CAMERA_ANGLE_LEVELS[cameraAngleLevel - 1];
    }
    syncCameraCompatibilityState();
    if (gameState && gameState.settings) {
        gameState.settings.cameraAngle = cameraAngleLevel;
        gameState.settings.thirdPersonPitch = thirdPersonCamera.pitch;
        gameState.settings.topdownHeight = topdownCamera.heightLevel;
    }
    cameraNeedsUpdate = true;
    if (getControlMode() === 'direct') applyCameraFollow(immediate, performance.now());
    if (typeof updateCameraAngleUI === 'function') updateCameraAngleUI();
}

function setCameraMode(mode, save = false) {
    const nextMode = mode === 'topdown' ? 'topdown' : 'thirdPerson';
    if (nextMode === cameraMode) {
        cameraNeedsUpdate = true;
        if (getControlMode() === 'direct') applyCameraFollow(false, performance.now());
        return;
    }

    cameraDrag.active = false; cameraDrag.pointerId = null;
    syncCameraCompatibilityState();
    const from = getActiveCameraState();
    const oldPosition = camera.position.clone();

    cameraMode = nextMode;
    syncCameraCompatibilityState();
    cameraNeedsUpdate = true;

    if (gameState && gameState.settings) gameState.settings.cameraMode = cameraMode;
    updateCameraModeUI();

    if (playerGroup && camera && getControlMode() === 'direct') {
        // Short, delta-time-independent transition between the two camera rigs.
        cameraTransition = {
            startedAt: performance.now(),
            duration: CAMERA_TRANSITION_MS,
            fromPosition: oldPosition,
            fromTarget: new THREE.Vector3(playerGroup.position.x, playerGroup.position.y + 0.6, playerGroup.position.z)
        };
        applyCameraFollow(true, performance.now());
    }
    if (save && typeof saveGame === 'function') saveGame();
}

function updateCameraAngleUI() {
    const label = document.getElementById('camera-angle-label');
    if (label) label.textContent = `${cameraAngleLevel}/5`;
    const settingsLabel = document.getElementById('settings-camera-angle-label');
    if (settingsLabel) settingsLabel.textContent = `${cameraAngleLevel}/5`;
}
function updateCameraModeUI() {
    const label = document.getElementById('camera-mode-label');
    if (label) label.textContent = cameraMode === 'topdown' ? 'Topdown' : 'Theo nhân vật';
    const btn = document.getElementById('camera-mode-toggle');
    if (btn) {
        btn.textContent = cameraMode === 'topdown' ? '🎥 3D' : '🗺️ Topdown';
        btn.title = cameraMode === 'topdown' ? 'Chuyển về góc nhìn theo nhân vật' : 'Chuyển sang góc nhìn Topdown';
    }
    const select = document.getElementById('setting-camera-mode');
    if (select) select.value = cameraMode;
    const angle = document.querySelector('.direct-camera-controls');
    if (angle) angle.classList.remove('topdown-hidden');
}
function applyCameraFollow(snap = false, now = performance.now()) {
    if (!playerGroup || !camera || getControlMode() !== 'direct') return;
    const active = getActiveCameraState();
    syncCameraCompatibilityState();

    const dt = lastCameraFollowTime > 0
        ? Math.min(0.05, Math.max(0, (now - lastCameraFollowTime) / 1000))
        : 1 / 60;
    lastCameraFollowTime = now;

    const yaw = active.yaw;
    const pitchDeg = cameraMode === 'topdown' ? active.tilt : active.pitch;
    const distance = cameraMode === 'topdown' ? active.distance : thirdPersonCamera.distance;
    const pitch = THREE.MathUtils.degToRad(Math.max(20, Math.min(89, pitchDeg)));
    const horizontal = Math.cos(pitch) * distance;
    const vertical = Math.sin(pitch) * distance;
    const desiredX = playerGroup.position.x + Math.sin(yaw) * horizontal;
    const desiredY = playerGroup.position.y + vertical;
    const desiredZ = playerGroup.position.z + Math.cos(yaw) * horizontal;
    const targetY = playerGroup.position.y + (cameraMode === 'topdown' ? 0.15 : 0.8);

    // If absolutely nothing changed, avoid recomputing the camera transform.
    const signature = [
        cameraMode, playerGroup.position.x.toFixed(3), playerGroup.position.y.toFixed(3),
        playerGroup.position.z.toFixed(3), yaw.toFixed(4), pitchDeg.toFixed(3),
        distance.toFixed(3)
    ].join('|');

    const shouldMove = snap || cameraNeedsUpdate || cameraTransition || signature !== cameraLastSignature;
    if (!shouldMove) return;

    if (snap) {
        camera.position.set(desiredX, desiredY, desiredZ);
    } else {
        const factor = 1 - Math.exp(-CAMERA_FOLLOW_SPEED * Math.max(dt, 0.001));
        camera.position.x += (desiredX - camera.position.x) * factor;
        camera.position.y += (desiredY - camera.position.y) * factor;
        camera.position.z += (desiredZ - camera.position.z) * factor;
    }

    if (cameraTransition) {
        const t = Math.min(1, Math.max(0, (now - cameraTransition.startedAt) / cameraTransition.duration));
        const eased = t * t * (3 - 2 * t);
        camera.position.lerpVectors(cameraTransition.fromPosition, camera.position, eased);
        if (t >= 1) cameraTransition = null;
    }

    camera.lookAt(playerGroup.position.x, targetY, playerGroup.position.z);
    cameraLastSignature = signature;
    cameraNeedsUpdate = false;
}

function getDirectInput() {
    let x = (directMoveKeys.right ? 1 : 0) - (directMoveKeys.left ? 1 : 0);
    let y = (directMoveKeys.down ? 1 : 0) - (directMoveKeys.up ? 1 : 0);
    if (joystickInput.active) { x = joystickInput.x; y = joystickInput.y; }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y, active: Math.hypot(x, y) > 0.08 };
}
function updateJoystickVisual(x, y) {
    const stick = document.getElementById('joystick-stick');
    if (!stick) return;
    const max = 42;
    stick.style.transform = `translate(calc(-50% + ${x * max}px), calc(-50% + ${y * max}px))`;
}
function setNearbyInteraction(info) {
    nearbyInteraction = info || null;
    const bar = document.getElementById('interaction-bar');
    const name = document.getElementById('interaction-bar-name');
    const icon = document.getElementById('interaction-bar-icon');
    if (bar) {
        bar.classList.toggle('hidden', !nearbyInteraction);
        bar.setAttribute('aria-label', nearbyInteraction ? `Tương tác: ${nearbyInteraction.name}` : 'Tương tác');
    }
    if (name) name.textContent = nearbyInteraction?.name || '';
    if (icon) icon.textContent = nearbyInteraction?.icon || '✋';
}
function refreshInteractionTargetCache(now = performance.now()) {
    if (now < interactionCacheNextRefresh || !scene) return;
    interactionCacheNextRefresh = now + INTERACTION_CACHE_REFRESH_MS;
    const allowed = new Set(['plot','orchard','plot_upgrade_npc','pond','minigame_horse','minigame_baucua','market_sign','stove']);
    const next = [];
    scene.traverse(obj => {
        if (!obj || obj === playerGroup || !obj.userData || !obj.userData.type) return;
        const type = obj.userData.type;
        if (allowed.has(type) || type.endsWith('_trigger')) next.push(obj);
    });
    interactionTargetCache = next;
}
function findNearbyInteraction(force = false) {
    if (!playerGroup || getControlMode() !== 'direct') { setNearbyInteraction(null); return; }
    const now = performance.now();
    if (!force && now < interactionNextCheck) return;
    interactionNextCheck = now + INTERACTION_CHECK_MS;
    refreshInteractionTargetCache(now);
    const px = playerGroup.position.x, pz = playerGroup.position.z;
    const forwardX = Math.sin(playerGroup.rotation.y), forwardZ = Math.cos(playerGroup.rotation.y);
    let best = null;
    const wp = new THREE.Vector3();
    for (const obj of interactionTargetCache) {
        if (!obj.parent) continue;
        obj.getWorldPosition(wp);
        const vx = wp.x - px, vz = wp.z - pz;
        const d = Math.hypot(vx, vz);
        if (d > 3.0 || d < 0.001) continue;
        const invD = 1 / d;
        const facing = Math.max(-1, Math.min(1, forwardX * vx * invD + forwardZ * vz * invD));
        const score = d - Math.max(0, facing) * 0.7;
        if (!best || score < best.score) best = { obj, type: obj.userData.type, score };
    }
    if (!best) {
        if (nearbyInteraction) setNearbyInteraction(null);
        lastNearbyInteractionKey = '';
        return;
    }
    const o = best.obj, t = best.type;
    let name='Khu vực', action='Tương tác', icon='✋', fn=null;
    if (t === 'plot') { const idx=o.userData.index; name=`Ô đất #${Number(idx)+1}`; action='Chăm sóc'; icon='🌱'; fn=()=>handlePlotClick(idx); }
    else if (t === 'orchard') { const idx=o.userData.index; name=`Cây ăn quả #${Number(idx)+1}`; action='Chăm sóc'; icon='🍎'; fn=()=>handleOrchardClick(idx); }
    else if (t.endsWith('_trigger')) { const map={chicken:['🐔','Chuồng Gà'],cow:['🐄','Chuồng Bò'],pig:['🐷','Chuồng Heo']}; const v=map[o.userData.penType]||['🐾','Chuồng vật nuôi']; icon=v[0]; name=v[1]; action='Mở chuồng'; fn=()=>openAnimalPenModal(o.userData.penType); }
    else if (t === 'plot_upgrade_npc') { name='Khu nâng cấp đất'; action='Nâng cấp'; icon='🌟'; fn=()=>openPlotUpgradeModal(); }
    else if (t === 'pond') { name='Ao Cá'; action='Câu cá'; icon='🐟'; fn=()=>openFishPondModal(); }
    else if (t === 'minigame_horse') { name='Khu Đua Ngựa'; action='Đua ngựa'; icon='🐎'; fn=()=>openHorseRaceModal(); }
    else if (t === 'minigame_baucua') { name='Khu Bầu Cua'; action='Chơi bầu cua'; icon='🎲'; fn=()=>openBauCuaModal(); }
    else if (t === 'market_sign') { name='Chợ Nông Trại'; action='Mở chợ'; icon='🛒'; fn=()=>openModal('modal-market'); }
    else if (t === 'stove') { name='Nhà Bếp'; action='Nấu ăn'; icon='🍳'; fn=()=>openModal('modal-kitchen'); }
    const key = `${t}:${o.userData.index ?? o.uuid}`;
    if (!force && key === lastNearbyInteractionKey && nearbyInteraction) return;
    lastNearbyInteractionKey = key;
    setNearbyInteraction({obj:o, name, action, icon, fn});
}

function triggerNearbyInteraction() {
    if (nearbyInteraction && typeof nearbyInteraction.fn === 'function') {
        const action = nearbyInteraction.fn; setNearbyInteraction(null); action();
    }
}

function setupCameraDrag() {
    const container = document.getElementById('canvas-container');
    const canvas = (typeof renderer !== 'undefined' && renderer && renderer.domElement) || container?.querySelector('canvas');
    if (!canvas || canvas.dataset.cameraDragReady === '1') return;
    canvas.dataset.cameraDragReady = '1';
    canvas.style.touchAction = 'none';

    const isUI = (target) => target && target.closest && (
        target.closest('.interactive-ui') ||
        target.closest('.ui-layer') ||
        target.closest('#modal-dialog')
    );

    const begin = (e) => {
        if (getControlMode() !== 'direct' || isUI(e.target)) return;
        if (cameraDrag.active) return;
        cameraDrag.active = true;
        cameraDrag.pointerId = e.pointerId;
        cameraDrag.lastX = e.clientX;
        cameraDrag.lastY = e.clientY;
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
    };

    const move = (e) => {
        if (!cameraDrag.active || e.pointerId !== cameraDrag.pointerId) return;
        e.preventDefault();
        const dx = e.clientX - cameraDrag.lastX;
        const dy = e.clientY - cameraDrag.lastY;
        cameraDrag.lastX = e.clientX;
        cameraDrag.lastY = e.clientY;

        // Keep UPGRADE 58 camera behavior, but use the UPGRADE 59 touch-safe
        // pointer capture path. Topdown uses its own yaw; third-person keeps
        // the existing yaw + pitch sensitivities.
        if (cameraMode === 'topdown') {
            topdownCamera.yaw -= dx * 0.008;
        } else {
            thirdPersonCamera.yaw -= dx * 0.008;
            thirdPersonCamera.pitch = Math.max(20, Math.min(65, thirdPersonCamera.pitch + dy * 0.18));
        }
        syncCameraCompatibilityState();
        if (gameState && gameState.settings) {
            gameState.settings.thirdPersonYaw = thirdPersonCamera.yaw;
            gameState.settings.topdownYaw = topdownCamera.yaw;
            gameState.settings.thirdPersonPitch = thirdPersonCamera.pitch;
            gameState.settings.topdownHeight = topdownCamera.heightLevel;
        }
        cameraNeedsUpdate = true;
        applyCameraFollow(true);
    };

    const end = (e) => {
        if (e.pointerId !== cameraDrag.pointerId) return;
        cameraDrag.active = false;
        cameraDrag.pointerId = null;
    };

    canvas.addEventListener('pointerdown', begin, { passive: false });
    canvas.addEventListener('pointermove', move, { passive: false });
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('lostpointercapture', end);

    window.addEventListener('blur', () => { cameraDrag.active = false; cameraDrag.pointerId = null; });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { cameraDrag.active = false; cameraDrag.pointerId = null; }
    });
}

function setupDirectControlUI() {
    const touchZone = document.getElementById('joystick-touch-zone');
    const base = document.getElementById('joystick-base');
    if (!touchZone || !base || touchZone.dataset.ready === '1') return;
    touchZone.dataset.ready = '1';
    const update = (e) => {
        const r = touchZone.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const max = Math.max(1, r.width / 2 - 18);
        let x = (e.clientX - cx) / max, y = (e.clientY - cy) / max;
        const len = Math.hypot(x, y);
        if (len > 1) { x /= len; y /= len; }
        joystickInput.x = x; joystickInput.y = y; joystickInput.active = true;
        updateJoystickVisual(x, y);
    };
    touchZone.addEventListener('pointerdown', (e) => {
        if (getControlMode() !== 'direct') return;
        e.preventDefault(); e.stopPropagation();
        joystickInput.pointerId = e.pointerId; joystickInput.active = true;
        try { touchZone.setPointerCapture(e.pointerId); } catch (_) {}
        update(e);
    });
    touchZone.addEventListener('pointermove', (e) => {
        if (joystickInput.pointerId === e.pointerId) { e.preventDefault(); update(e); }
    });
    const end = (e) => {
        if (joystickInput.pointerId === null || e.pointerId === joystickInput.pointerId) {
            joystickInput.x = 0; joystickInput.y = 0; joystickInput.active = false; joystickInput.pointerId = null;
            updateJoystickVisual(0, 0);
        }
    };
    touchZone.addEventListener('pointerup', end); touchZone.addEventListener('pointercancel', end); touchZone.addEventListener('lostpointercapture', end);

    document.getElementById('interaction-bar')?.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); triggerNearbyInteraction(); });
    window.addEventListener('blur', () => { if (joystickInput.active) { joystickInput.x = 0; joystickInput.y = 0; joystickInput.active = false; joystickInput.pointerId = null; updateJoystickVisual(0, 0); } });
    document.addEventListener('visibilitychange', () => { if (document.hidden && joystickInput.active) { joystickInput.x = 0; joystickInput.y = 0; joystickInput.active = false; joystickInput.pointerId = null; updateJoystickVisual(0, 0); } });
    setupCameraDrag();
}

function updateDirectPlayerMovement(delta = 1 / 60) {
    if (!playerGroup || getControlMode() !== 'direct') return false;
    const input = getDirectInput();
    if (!input.active) { isPlayerMoving = false; resetPlayerLimbs(); return true; }

    const dt = Math.min(0.05, Math.max(0, Number(delta) || 1 / 60));
    const speed = 9.6; // world units / second; independent of render FPS

    const yaw = cameraMode === 'topdown' ? topdownCamera.yaw : thirdPersonCamera.yaw;
    const sinYaw = Math.sin(yaw), cosYaw = Math.cos(yaw);
    const rightX = cosYaw, rightZ = -sinYaw;
    const forwardX = -sinYaw, forwardZ = -cosYaw;

    const moveX = rightX * input.x + forwardX * (-input.y);
    const moveZ = rightZ * input.x + forwardZ * (-input.y);
    const moveLen = Math.hypot(moveX, moveZ);
    const dx = moveLen > 0 ? (moveX / moveLen) * speed * dt : 0;
    const dz = moveLen > 0 ? (moveZ / moveLen) * speed * dt : 0;

    playerGroup.position.x += dx;
    playerGroup.position.z += dz;

    const angle = Math.atan2(dx, dz);
    playerGroup.rotation.y = angle;
    isPlayerMoving = true;

    walkAnimTime += dt * 10;
    if (playerLeftLeg && playerRightLeg && playerLeftArm && playerRightArm) {
        const swing = Math.sin(walkAnimTime) * 0.6;
        playerLeftLeg.rotation.x = swing;
        playerRightLeg.rotation.x = -swing;
        playerLeftArm.rotation.x = -swing;
        playerRightArm.rotation.x = swing;
    }

    cameraNeedsUpdate = true;
    findNearbyInteraction();
    return true;
}

// Bắt Sự Kiện Touch & Click Trên Màn Hình
function setupTouchAndClickEvents() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('pointerdown', (e) => {
        if (getControlMode() === 'direct') return;

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

        // Bỏ qua vật trang trí không tương tác (cỏ, đá, cây thông, chim...) và
        // tìm mặt đường/mặt đất bên dưới thay vì dừng ở mesh không có type.
        let resolved = null;
        for (const hit of intersects) {
            let obj = hit.object;
            let typed = obj;
            while (typed && typed !== scene && !(typed.userData && typed.userData.type)) typed = typed.parent;
            const type = typed && typed.userData ? typed.userData.type : null;
            if (type) {
                resolved = { object: typed, point: hit.point, type };
                break;
            }
        }
        if (!resolved) return;

        const hitObj = resolved.object;
        const type = resolved.type;
        const point = resolved.point;
        pendingWorldInteraction = null;

        if (type === 'ground' || type === 'path') {
            // Mặt đường có thể nằm cao hơn ground; luôn đưa nhân vật về cao độ 0.
            playerTargetPos = new THREE.Vector3(point.x, 0, point.z);
        } else if (type === 'plot') {
            const idx = hitObj.userData.index;
            playerTargetPos = new THREE.Vector3(hitObj.position.x, 0, hitObj.position.z + 1.2);
            pendingWorldInteraction = () => handlePlotClick(idx);
        } else if (type === 'orchard') {
            const idx = hitObj.userData.index;
            playerTargetPos = new THREE.Vector3(hitObj.position.x, 0, hitObj.position.z + 1.5);
            pendingWorldInteraction = () => handleOrchardClick(idx);
        } else if (type.endsWith('_trigger')) {
            playerTargetPos = new THREE.Vector3(hitObj.position.x, 0, hitObj.position.z);
        } else if (type === 'plot_upgrade_npc') {
            const worldPos = hitObj.getWorldPosition(new THREE.Vector3());
            playerTargetPos = new THREE.Vector3(worldPos.x, 0, worldPos.z + 1.5);
            pendingWorldInteraction = () => openPlotUpgradeModal();
        } else if (type === 'pond') {
            playerTargetPos = new THREE.Vector3(0, 0, 16);
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
            const worldPos = hitObj.getWorldPosition(new THREE.Vector3());
            playerTargetPos = new THREE.Vector3(worldPos.x, 0, worldPos.z + 1.2);
            pendingWorldInteraction = () => openModal('modal-kitchen');
        }

    });

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    setupDirectControlUI();
    if (gameState && gameState.settings) {
        cameraAngleLevel = Math.max(1, Math.min(5, Math.floor(Number(gameState.settings.cameraAngle) || 3)));
        cameraMode = gameState.settings.cameraMode === 'topdown' ? 'topdown' : 'thirdPerson';
        thirdPersonCamera.pitch = Number(gameState.settings.thirdPersonPitch) || CAMERA_ANGLE_LEVELS[cameraAngleLevel - 1];
        thirdPersonCamera.yaw = Number(gameState.settings.thirdPersonYaw) || 0;
        topdownCamera.heightLevel = Math.max(1, Math.min(5, Number(gameState.settings.topdownHeight) || cameraAngleLevel));
        topdownCamera.yaw = Number(gameState.settings.topdownYaw) || 0;
        topdownCamera.distance = [22, 26, 30, 36, 43][topdownCamera.heightLevel - 1];
        topdownCamera.tilt = [76, 78, 80, 82, 84][topdownCamera.heightLevel - 1];
        syncCameraCompatibilityState();
        updateCameraModeUI();
        setPlayerControlMode(gameState.settings.controlMode === 'direct' ? 'direct' : 'click');
    }
}

// Cập Nhật Di Chuyển & Animation Tay Chân Của Player
function updatePlayerMovement(delta = 1 / 60) {
    if (!playerGroup) return;
    if (getControlMode() === 'direct') {
        updateDirectPlayerMovement(delta);
    } else if (playerTargetPos) {
        const currentPos = playerGroup.position;
        const dx = playerTargetPos.x - currentPos.x;
        const dz = playerTargetPos.z - currentPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.3) {
            isPlayerMoving = true;
            const angle = Math.atan2(dx, dz);
            playerGroup.rotation.y = angle;

            const step = moveSpeed * 60 * Math.min(0.05, Math.max(0, Number(delta) || 1 / 60));
            currentPos.x += (dx / dist) * step;
            currentPos.z += (dz / dist) * step;

            walkAnimTime += 10 * Math.min(0.05, Math.max(0, Number(delta) || 1 / 60));
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
                if (getControlMode() !== 'direct') openAnimalPenModal(zone.penType);
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
    if (getControlMode() !== 'direct') return;
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    const key = e.key.toLowerCase();
    const map = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };
    const dir = map[key];
    if (!dir) return;
    e.preventDefault();
    directMoveKeys[dir] = true;
}
function handleKeyUp(e) {
    if (getControlMode() !== 'direct') return;
    const key = e.key.toLowerCase();
    const map = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };
    const dir = map[key];
    if (dir) directMoveKeys[dir] = false;
}

