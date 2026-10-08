// GAME LOGIC LOOP (Chạy mỗi 1 giây)
function gameLogicLoop() {
    const now = Date.now();

    gameState.dayTimeSeconds += 1;

    // 1. Cập nhật thời tiết
    if (gameState.dayTimeSeconds % REAL_SECS_PER_GAME_HOUR === 0) {
        if (gameState.currentWeather !== 'sunny') {
            if (Math.random() < 0.6) {
                setGameWeather('sunny');
                showToast('Trời Tạnh Rồi! ☀️', 'Trời đã hửng nắng đẹp trở lại!', '☀️');
            }
        } else {
            if (Math.random() < 0.08) {
                const randomBadWeather = ['rainy', 'cloudy', 'snowy'][Math.floor(Math.random() * 3)];
                setGameWeather(randomBadWeather);
                showToast('Thay Đổi Thời Tiết 🌦️', `Trời bắt đầu có ${WEATHER_NAMES[randomBadWeather]}!`, WEATHER_ICONS[randomBadWeather]);
            }
        }
    }

    // 2. Sang ngày mới
    if (gameState.dayTimeSeconds >= REAL_SECS_PER_GAME_DAY) {
        gameState.dayTimeSeconds = 0;
        gameState.gameDay += 1;
        gameState.gold += 500;

        setGameWeather('sunny');
        generateDailyQuests();
        
        showToast(`Ngày Mới Bắt Đầu! 🌅`, `Chào mừng tới Ngày ${gameState.gameDay}. Bạn nhận +500 🪙 trợ cấp!`, '🪙');
    }

    // 3. Tự động hồi thể lực
    if (gameState.staminaFloat < gameState.maxStamina) {
        gameState.staminaFloat = Math.min(gameState.maxStamina, gameState.staminaFloat + 0.1);
        gameState.stamina = Math.floor(gameState.staminaFloat);
    }

    // 4. LOGIC MỚI: GIA SÚC DÙNG THANH NĂNG LƯỢNG (HUNGER METER)
    ['chickens', 'cows', 'pigs'].forEach(type => {
        if (gameState[type] && Array.isArray(gameState[type])) {
            gameState[type].forEach(a => {
                // Mặc định khởi tạo năng lượng nếu chưa có
                if (a.hunger === undefined) a.hunger = 100;

                // Giảm năng lượng mỗi giây (Mỗi loại giảm độ nhanh khác nhau)
                const decayRate = type === 'chickens' ? 0.3 : 0.2;
                a.hunger = Math.max(0, a.hunger - decayRate);

                // Cập nhật trạng thái Đói / Bệnh dựa trên điểm hunger
                if (a.hunger <= 0) {
                    a.hungry = true;
                    // Bắt đầu đếm thời gian nhịn đói (mốc kiệt sức)
                    if (!a.starvingStartAt) a.starvingStartAt = now;

                    // Nhịn đói liên tục quá 60 giây (60,000 ms) -> Bắt đầu phát BỆNH!
                    if (!a.sick && (now - a.starvingStartAt) >= 60000) {
                        a.sick = true;
                        showToast("Cảnh Báo Gia Súc 💊", "Vật nuôi bị bỏ đói quá lâu nên đã bị bệnh!", "⚠️");
                    }
                } else if (a.hunger <= 40) {
                    a.hungry = true; // Hiện icon đòi ăn
                } else {
                    a.hungry = false;
                    a.starvingStartAt = null; // Reset đếm giờ nhịn đói khi được ăn no
                }
            });
        }
    });

    // 5. LOGIC MỚI: SÂU BỆNH THEO THỜI TIẾT & CÂY CHÍN NGÂM QUÁ LÂU
    if (gameState.plots && Array.isArray(gameState.plots)) {
        gameState.plots.forEach((p, idx) => {
            if (p.cropId && !p.isDead) {
                const crop = CROPS_DB[p.cropId];
                if (!crop) return;

                const effTime = crop.growTime - (p.reducedSecs || 0);
                const elapsed = (now - p.plantedAt) / 1000;

                // ĐIỀU KIỆN 1: Cây đã chín nhưng để quá 3 phút (180s) không thu hoạch -> Dễ bị sâu
                const isOverripe = elapsed >= (effTime + 180);

                // ĐIỀU KIỆN 2: Thời tiết mưa/mây làm tăng nguy cơ sâu bệnh
                const isBadWeather = ['rainy', 'cloudy'].includes(gameState.currentWeather);

                if (!p.hasPest && !p.pestImmune) {
                    // Chỉ kích hoạt tỷ lệ dính sâu khi thời tiết xấu HOẶC cây bị ngâm quá lâu
                    if ((isBadWeather && Math.random() < 0.002) || (isOverripe && Math.random() < 0.01)) {
                        p.hasPest = true;
                        p.pestAppearedAt = now;
                        if (typeof updatePlotVisual === 'function') updatePlotVisual(idx, true);
                        showToast("Sâu Bệnh! 🐛", "Độ ẩm cao hoặc cây quá lứa thu hoạch đã xuất hiện sâu!", "🐛");
                    }
                }

                // Cây bị sâu quá 2 phút không bắt -> Cây chết
                if (p.hasPest && (now - p.pestAppearedAt) >= 120000) {
                    p.isDead = true;
                    p.hasPest = false;
                    if (typeof updatePlotVisual === 'function') updatePlotVisual(idx, true);
                }
            }
        });
    }

    updateUI();

    // Cập nhật giao diện Bếp nấu theo thời gian thực nếu đang mở Modal Bếp
    const kitchenModal = document.getElementById('modal-kitchen');
    if (kitchenModal && !kitchenModal.classList.contains('hidden') && typeof renderKitchenStoves === 'function') {
        renderKitchenStoves();
    }
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

// 🟢 HÀM TÍNH TÓAN & BÙ THỜI GIAN OFFLINE (CAP TỐI ĐA 2 NGÀY GAME = 48 PHÚT NGOÀI ĐỜI)
function syncOfflineTimeWithCap() {
    if (!gameState.lastSavedAt) return;

    const now = Date.now();
    const rawOfflineMs = now - gameState.lastSavedAt;
    let offlineSecs = Math.floor(rawOfflineMs / 1000);

    // Bỏ qua nếu offline quá ngắn (dưới 10 giây)
    if (offlineSecs < 10) {
        gameState.lastSavedAt = now;
        return;
    }

    // 🔒 CAP TỐI ĐA: 2 Ngày Game = 2 * 24 phút = 48 phút (2,880 giây)
    const MAX_GAME_DAYS_CAP = 2;
    const MAX_OFFLINE_SECS = MAX_GAME_DAYS_CAP * REAL_SECS_PER_GAME_DAY; // 2880s
    
    // Siết thời gian tính toán không vượt quá 48 phút ngoài đời
    const cappedOfflineSecs = Math.min(offlineSecs, MAX_OFFLINE_SECS);

    // 1. Tính toán số ngày game trôi qua
    gameState.dayTimeSeconds += cappedOfflineSecs;
    const daysPassed = Math.floor(gameState.dayTimeSeconds / REAL_SECS_PER_GAME_DAY);

    if (daysPassed > 0) {
        gameState.gameDay += daysPassed;
        gameState.dayTimeSeconds = gameState.dayTimeSeconds % REAL_SECS_PER_GAME_DAY;

        // Trợ cấp đúng số ngày trôi qua (Tối đa 2 ngày = +1000 Vàng)
        const bonusGold = daysPassed * 500;
        gameState.gold += bonusGold;

        showToast(
            `Chào Mừng Trở Lại! 🌅`, 
            `Nông trại đã trôi qua ${daysPassed} ngày. Bạn nhận +${bonusGold} 🪙 trợ cấp!`, 
            '🪙', 
            5000
        );
    }

    // 2. Trừ năng lượng gia súc theo thời gian đã Cap (tối đa 48 phút)
    ['chickens', 'cows', 'pigs'].forEach(type => {
        if (gameState[type] && Array.isArray(gameState[type])) {
            const decayRate = type === 'chickens' ? 0.3 : 0.2;
            gameState[type].forEach(a => {
                if (a.hunger === undefined) a.hunger = 100;

                // Trừ điểm hunger theo thời gian tối đa 48 phút
                a.hunger = Math.max(0, a.hunger - (decayRate * cappedOfflineSecs));

                if (a.hunger <= 0) {
                    a.hungry = true;
                    if (!a.starvingStartAt) a.starvingStartAt = now;
                    if (cappedOfflineSecs >= 60) a.sick = true; 
                } else if (a.hunger <= 40) {
                    a.hungry = true;
                }
            });
        }
    });

    // Cập nhật mốc lưu mới
    gameState.lastSavedAt = now;
}

// KHỞI CHẠY GAME
function init3D() {
    loadGame();

    // 🟢 GỌI HÀM BÙ THỜI GIAN OFFLINE TẠI ĐÂY:
    syncOfflineTimeWithCap();

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
