// GAME LOGIC LOOP (Chạy mỗi 1 giây)
function gameLogicLoop() {
    const now = Date.now();

    gameState.dayTimeSeconds += 1;

    // Cập nhật thời tiết theo giờ trong game
    if (gameState.dayTimeSeconds % REAL_SECS_PER_GAME_HOUR === 0) {
        if (gameState.currentWeather !== 'sunny') {
            if (Math.random() < 0.7) {
                setGameWeather('sunny');
                showToast('Trời Tạnh Rồi! ☀️', 'Trời đã hửng nắng đẹp trở lại!', '☀️');
            }
        } else {
            if (Math.random() < 0.15) {
                const randomBadWeather = ['rainy', 'cloudy', 'snowy'][Math.floor(Math.random() * 3)];
                setGameWeather(randomBadWeather);
                showToast('Thay Đổi Thời Tiết 🌦️', `Trời bắt đầu có ${WEATHER_NAMES[randomBadWeather]}!`, WEATHER_ICONS[randomBadWeather]);
            }
        }
    }

    // Sang ngày mới
    if (gameState.dayTimeSeconds >= REAL_SECS_PER_GAME_DAY) {
        gameState.dayTimeSeconds = 0;
        gameState.gameDay += 1;

        gameState.gold += 500;

        setGameWeather('sunny');
        generateDailyQuests();
        
        showToast(`Ngày Mới Bắt Đầu! 🌅`, `Chào mừng tới Ngày ${gameState.gameDay}. Bạn nhận được +500 🪙 trợ cấp ngày mới!`, '🪙');
    }

    // Tự động hồi thể lực chậm
    if (gameState.staminaFloat < gameState.maxStamina) {
        gameState.staminaFloat = Math.min(gameState.maxStamina, gameState.staminaFloat + 0.05);
        gameState.stamina = Math.floor(gameState.staminaFloat);
    }

    // Xử lý Gia súc đói / bệnh ngẫu nhiên
    ['chickens', 'cows', 'pigs'].forEach(type => {
        if (gameState[type] && Array.isArray(gameState[type])) {
            gameState[type].forEach(a => {
                if (gameState.dayTimeSeconds % 15 === 0) {
                    if (!a.sick && a.lastSickDay !== gameState.gameDay) {
                        if (a.hungry) {
                            if (Math.random() < 0.5) { 
                                a.sick = true;
                                a.lastSickDay = gameState.gameDay;
                                showToast("Cảnh Báo Gia Súc 💊", "Có vật nuôi bị bệnh! Hãy dùng Thuốc Thú Y chữa ngay.", "⚠️");
                            }
                        } else {
                            if (Math.random() < 0.2) {
                                a.hungry = true;
                            }
                        }
                    }
                }
            });
        }
    });

    // Xử lý Cây trồng xuất hiện sâu bệnh / héo chết
    gameState.plots.forEach((p, idx) => {
        if (p.cropId && !p.isDead) {
            const crop = CROPS_DB[p.cropId];
            const effTime = crop.growTime - (p.reducedSecs || 0);
            const elapsed = (now - p.plantedAt) / 1000;

            if (elapsed < effTime && !p.hasPest && !p.pestImmune && Math.random() < 0.02) {
                p.hasPest = true;
                p.pestAppearedAt = now;
                updatePlotVisual(idx, true);
            }

            if (p.hasPest && (now - p.pestAppearedAt) >= 60000) {
                p.isDead = true;
                p.hasPest = false;
                updatePlotVisual(idx, true);
            }
        }
    });

    updateUI();
}

// RENDER LOOP 3D (60 FPS)
function animate3D() {
    requestAnimationFrame(animate3D);
    if (controls) controls.update();

    if (camera && camera.position.y < 0.5) {
        camera.position.y = 0.5;
    }

    updatePlayerMovement();
    updateAnimalMovement();
    updatePondFishMovement();

    // Hiệu ứng hạt thời tiết rơi (Mưa / Tuyết)
    if (weatherParticleSystem) {
        const positions = weatherParticleSystem.geometry.attributes.position.array;
        const type = weatherParticleSystem.userData.type;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= type === 'rainy' ? 0.8 : 0.2;
            if (positions[i] < 0) positions[i] = 40;
        }
        weatherParticleSystem.geometry.attributes.position.needsUpdate = true;
    }

    updateFloatingHUD();

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// KHỞI CHẠY GAME
function init3D() {
    loadGame();
    if (!gameState.quests || gameState.quests.length === 0) generateDailyQuests();
    if (!gameState.marketOrders || gameState.marketOrders.length === 0) generateMarketOrders();

    init3DScene();
    buildFarmIslandBase();
    buildEnvironmentDecorations();
    
    buildPlotsGrid();
    buildOrchardArea();
    buildFishPond();
    buildChickenPen();
    buildCowBarn();
    buildPigPen();
    build4CookingStoves();

    createTriggerZone(-20, -14.5, 'chicken');
    createTriggerZone(-20, 14, 'cow');
    createTriggerZone(20, 17.5, 'pig');

    create3DAvatar();
    applyWeatherEffects(gameState.currentWeather || 'sunny');

    setupTouchAndClickEvents();

    setInterval(gameLogicLoop, 1000);
    setInterval(saveGame, 10000);

    updatePlotColorsByLevel();
    updateUI();
    animate3D();
}

// Tự động kích hoạt khi trang tải xong
window.addEventListener('DOMContentLoaded', () => {
    init3D();
});
