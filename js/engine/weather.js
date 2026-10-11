let weatherParticleSystem = null;
let weatherParticleBuffers = null;
const WEATHER_PARTICLE_COUNT = 250;
function ensureWeatherParticleSystem(type) {
    if (!weatherParticleBuffers) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(WEATHER_PARTICLE_COUNT * 3);
        for (let i = 0; i < WEATHER_PARTICLE_COUNT; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 80;
            positions[i * 3 + 1] = Math.random() * 40;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.25, transparent: true, opacity: 0.75 });
        const points = new THREE.Points(geometry, material);
        points.frustumCulled = false;
        weatherParticleBuffers = { geometry, material, points };
    }
    const { material, points, geometry } = weatherParticleBuffers;
    material.color.setHex(type === 'rainy' ? 0x38bdf8 : 0xffffff);
    material.size = type === 'rainy' ? 0.25 : 0.4;
    material.opacity = type === 'rainy' ? 0.75 : 0.9;
    points.userData.type = type;
    weatherParticleSystem = points;
    if (!points.parent) scene.add(points);
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i] = (Math.random() - 0.5) * 80;
        positions[i + 1] = Math.random() * 40;
        positions[i + 2] = (Math.random() - 0.5) * 80;
    }
    geometry.attributes.position.needsUpdate = true;
}

// Thay đổi thời tiết trong game
function setGameWeather(weatherType) {
    gameState.currentWeather = weatherType;
    applyWeatherEffects(weatherType);
    updateUI();
}

// Áp dụng hiệu ứng đồ họa thời tiết
function applyWeatherEffects(type) {
    if (weatherParticleSystem) {
        scene.remove(weatherParticleSystem);
        weatherParticleSystem = null;
    }

    if (type === 'sunny') {
        scene.background.setHex(0x87ceeb);
        scene.fog.color.setHex(0x87ceeb);
        if (sunLight) sunLight.intensity = 1.3;
        if (ambientLight) ambientLight.intensity = 0.75;
    } else if (type === 'cloudy') {
        scene.background.setHex(0x94a3b8);
        scene.fog.color.setHex(0x94a3b8);
        if (sunLight) sunLight.intensity = 0.8;
        if (ambientLight) ambientLight.intensity = 0.6;
    } else if (type === 'rainy') {
        scene.background.setHex(0x475569);
        scene.fog.color.setHex(0x475569);
        if (sunLight) sunLight.intensity = 0.5;
        if (ambientLight) ambientLight.intensity = 0.5;

        ensureWeatherParticleSystem('rainy');
    } else if (type === 'snowy') {
        scene.background.setHex(0xe2e8f0);
        scene.fog.color.setHex(0xe2e8f0);
        if (sunLight) sunLight.intensity = 0.9;
        if (ambientLight) ambientLight.intensity = 0.8;

        ensureWeatherParticleSystem('snowy');
    }
}
