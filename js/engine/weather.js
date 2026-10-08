let weatherParticleSystem = null;

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
        weatherParticleSystem.geometry.dispose();
        weatherParticleSystem.material.dispose();
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

        const count = 250;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 80;
            positions[i + 1] = Math.random() * 40;
            positions[i + 2] = (Math.random() - 0.5) * 80;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.25, transparent: true, opacity: 0.75 });
        weatherParticleSystem = new THREE.Points(geometry, material);
        weatherParticleSystem.userData = { type: 'rainy' };
        scene.add(weatherParticleSystem);
    } else if (type === 'snowy') {
        scene.background.setHex(0xe2e8f0);
        scene.fog.color.setHex(0xe2e8f0);
        if (sunLight) sunLight.intensity = 0.9;
        if (ambientLight) ambientLight.intensity = 0.8;

        const count = 250;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 80;
            positions[i + 1] = Math.random() * 40;
            positions[i + 2] = (Math.random() - 0.5) * 80;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, transparent: true, opacity: 0.9 });
        weatherParticleSystem = new THREE.Points(geometry, material);
        weatherParticleSystem.userData = { type: 'snowy' };
        scene.add(weatherParticleSystem);
    }
}
