
// Chăm sóc nâng cao: đói theo chu kỳ sản xuất thực tế của từng loài.
// No khỏe: 100% tốc độ; đói (<=40): sản xuất chậm 50%; đói kiệt/bệnh: tạm dừng.
function getCreatureHungerDecay(creature, species) {
    let cycleSeconds = 180;
    if (species === 'cow') cycleSeconds = 360;
    else if (species === 'pig') cycleSeconds = 480;
    else if (species === 'fish') cycleSeconds = Math.max(180, Number(FISH_DB[creature && creature.type] && FISH_DB[creature.type].growTime) || 240);
    else if (species === 'duck' || species === 'chicken') cycleSeconds = 180;
    return 100 / (cycleSeconds * 3);
}
function delayCreatureProduction(creature, milliseconds) {
    if (!creature || milliseconds <= 0) return;
    ['bornAt', 'producedAt', 'plantedAt'].forEach(key => {
        if (Number.isFinite(Number(creature[key])) && Number(creature[key]) > 0) creature[key] = Number(creature[key]) + milliseconds;
    });
}
function applyOfflineProductionPenalty(creature, decay, offlineSeconds, offlineStartAt) {
    const initialHunger = Number.isFinite(creature.hunger) ? Math.max(0, Math.min(100, creature.hunger)) : 100;
    const timeToHungry = Math.max(0, (initialHunger - 40) / decay);
    const hungrySeconds = Math.max(0, offlineSeconds - timeToHungry);
    const timeToZero = initialHunger / decay;
    const alreadyStarving = Number.isFinite(creature.starvingStartAt) && creature.starvingStartAt > 0;
    const starvationAgeAtStart = alreadyStarving ? Math.max(0, (offlineStartAt - creature.starvingStartAt) / 1000) : 0;
    const secondsUntilSick = alreadyStarving ? Math.max(0, 300 - starvationAgeAtStart) : timeToZero + 300;
    const sickSeconds = creature.sick ? offlineSeconds : Math.max(0, offlineSeconds - secondsUntilSick);
    const penaltyMs = Math.min(offlineSeconds, sickSeconds) * 1000 + Math.max(0, hungrySeconds - sickSeconds) * 500;
    delayCreatureProduction(creature, penaltyMs);
}

// GAME LOGIC LOOP (Chạy mỗi 1 giây)
function gameLogicLoop() {
    const now = Date.now();
    if (typeof updateKitchenQueueScheduler === 'function') updateKitchenQueueScheduler();
    if (!gameState.statistics || typeof gameState.statistics !== 'object') gameState.statistics = { animalsSold: 0, mealsCooked: 0, playTimeSeconds: 0, animalSicknessEvents: 0, cropsPlanted: 0 };
    gameState.statistics.playTimeSeconds = Math.max(0, Number(gameState.statistics.playTimeSeconds) || 0) + 1;
    if (typeof updateMarketReadyIndicator === 'function') updateMarketReadyIndicator();
    if (!Number.isFinite(Number(gameState.questResetAt)) || Number(gameState.questResetAt) <= 0) {
        gameState.questResetAt = now + 24 * 60 * 60 * 1000;
    } else if (now >= Number(gameState.questResetAt)) {
        generateDailyQuests();
        gameState.questResetAt = now + 24 * 60 * 60 * 1000;
        saveGame();
    }

    gameState.dayTimeSeconds += 1;

    // Cập nhật thời tiết theo giờ game đã đổi, không dùng phép chia dư với 37.5 giây.
    const currentGameHour = Math.floor(gameState.dayTimeSeconds / REAL_SECS_PER_GAME_HOUR);
    if (!Number.isFinite(gameState.lastWeatherHour)) gameState.lastWeatherHour = currentGameHour;
    const shouldUpdateWeather = currentGameHour !== gameState.lastWeatherHour;
    if (shouldUpdateWeather) {
        gameState.lastWeatherHour = currentGameHour;
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
        gameState.lastWeatherHour = 0;
        gameState.gameDay += 1;
        gameState.gold += 500;

        setGameWeather('sunny');
        // Nhiệm vụ ngày dùng chu kỳ 24 giờ thực, không reset theo ngày game 30 phút.
        // Đơn chợ giữ nguyên qua ngày; mỗi slot chỉ đổi sau khi giao xong hoặc trả vàng đổi đơn.
        
        showToast(`Ngày Mới Bắt Đầu! 🌅`, `Chào mừng tới Ngày ${gameState.gameDay}. Bạn nhận +500 🪙 trợ cấp!`, '🪙');
    }

    // 3. Tự động hồi thể lực
    if (gameState.staminaFloat < gameState.maxStamina) {
        gameState.staminaFloat = Math.min(gameState.maxStamina, gameState.staminaFloat + 0.1);
        gameState.stamina = Math.floor(gameState.staminaFloat);
    }

    // 4. Cơ chế đói/bệnh đồng bộ cho gà, bò, heo, vịt và cá.
    const creatureGroups = [
        { list: gameState.chickens, name: 'Gà', species: 'chicken' },
        { list: gameState.cows, name: 'Bò', species: 'cow' },
        { list: gameState.pigs, name: 'Heo', species: 'pig' },
        { list: gameState.fishPond && gameState.fishPond.ducks, name: 'Vịt', species: 'duck' },
        { list: gameState.fishPond && gameState.fishPond.fishes, name: 'Cá', species: 'fish' }
    ];
    creatureGroups.forEach(group => {
        if (!Array.isArray(group.list)) return;
        group.list.forEach(creature => {
            const decay = getCreatureHungerDecay(creature, group.species);
            if (!Number.isFinite(creature.hunger)) creature.hunger = 100;
            creature.hunger = Math.max(0, Math.min(100, creature.hunger - decay));
            creature.hungry = creature.hunger <= 40;
            if (creature.hunger <= 0) {
                if (!creature.starvingStartAt) creature.starvingStartAt = now;
                if (!creature.sick && now - creature.starvingStartAt >= 5 * 60 * 1000) {
                    creature.sick = true;
                    gameState.statistics.animalSicknessEvents = (Number(gameState.statistics.animalSicknessEvents) || 0) + 1;
                    if (typeof showToast === 'function') showToast(`${group.name} bị bệnh 💊`, `${group.name} bị bỏ đói quá lâu. Hãy cho ăn và dùng thuốc để chữa.`, '⚠️');
                }
            } else if (creature.hunger > 40) {
                creature.starvingStartAt = null;
            }
            const productionPenaltyMs = (creature.sick || creature.hunger <= 0) ? 1000 : (creature.hunger <= 40 ? 500 : 0);
            delayCreatureProduction(creature, productionPenaltyMs);
        });
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
    if (typeof renderDailyQuestHud === 'function') renderDailyQuestHud();

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
    if (typeof updatePondDuckMovement === 'function') updatePondDuckMovement();
    if (typeof updateWorldRaceIdle === 'function') updateWorldRaceIdle();

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

// Bù thời gian offline tối đa 1 giờ thực (2 ngày game); sản phẩm vật nuôi bị giới hạn một chu kỳ.
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

    // Giới hạn bù thời gian offline ở 2 ngày game để tránh nhận trợ cấp quá lớn sau nhiều ngày vắng mặt.
    const MAX_OFFLINE_SECS = REAL_SECS_PER_GAME_DAY * 2;
    const cappedOfflineSecs = Math.min(offlineSecs, MAX_OFFLINE_SECS);

    // 1. Tính toán số ngày game trôi qua
    gameState.dayTimeSeconds += cappedOfflineSecs;
    const daysPassed = Math.floor(gameState.dayTimeSeconds / REAL_SECS_PER_GAME_DAY);

    if (daysPassed > 0) {
        gameState.gameDay += daysPassed;
        gameState.dayTimeSeconds = gameState.dayTimeSeconds % REAL_SECS_PER_GAME_DAY;

        // Trợ cấp theo số ngày game đã trôi qua trong giới hạn offline (tối đa 2 ngày game)
        const bonusGold = daysPassed * 500;
        gameState.gold += bonusGold;

        showToast(
            `Chào Mừng Trở Lại! 🌅`, 
            `Nông trại đã trôi qua ${daysPassed} ngày. Bạn nhận +${bonusGold} 🪙 trợ cấp!`, 
            '🪙', 
            5000
        );
    }

    // Giới hạn timestamp theo đúng chu kỳ thu hoạch thực tế trong animals.js.
    // Gà: trưởng thành 300s + chu kỳ 180s; bò: 600s + 360s; heo: xuất chuồng 900s.
    const animalOfflineCaps = {
        chickens: { maturity: 300, cycle: 180 },
        cows: { maturity: 600, cycle: 360 },
        pigs: { maturity: 900, cycle: 480 }
    };
    Object.entries(animalOfflineCaps).forEach(([type, cfg]) => {
        (gameState[type] || []).forEach(animal => {
            const bornAt = Number(animal.bornAt) || now;
            const last = Number(animal.producedAt);
            const earliestReadyAt = bornAt + cfg.maturity * 1000;
            const capStamp = now - cfg.cycle * 1000;
            if (!Number.isFinite(last) || last < earliestReadyAt) animal.producedAt = Math.min(now, earliestReadyAt);
            else if (last < capStamp) animal.producedAt = capStamp;
        });
    });
    (gameState.fishPond?.ducks || []).forEach(duck => {
        const stamp = Number(duck.producedAt);
        const cycleMs = 3 * 60 * 1000;
        if (!Number.isFinite(stamp) || now - stamp > cycleMs) duck.producedAt = now - cycleMs;
    });

    // 2. Đồng bộ đói/bệnh cho mọi loài theo cùng quy tắc với vòng lặp online.
    const offlineStartAt = now - cappedOfflineSecs * 1000;
    const offlineCreatureGroups = [
        { list: gameState.chickens, species: 'chicken' },
        { list: gameState.cows, species: 'cow' },
        { list: gameState.pigs, species: 'pig' },
        { list: gameState.fishPond && gameState.fishPond.ducks, species: 'duck' },
        { list: gameState.fishPond && gameState.fishPond.fishes, species: 'fish' }
    ];
    offlineCreatureGroups.forEach(group => {
        if (!Array.isArray(group.list)) return;
        group.list.forEach(creature => {
            const decay = getCreatureHungerDecay(creature, group.species);
            const previousHunger = Number.isFinite(creature.hunger) ? Math.max(0, Math.min(100, creature.hunger)) : 100;
            const secondsUntilStarving = previousHunger / decay;
            applyOfflineProductionPenalty(creature, decay, cappedOfflineSecs, offlineStartAt);
            creature.hunger = Math.max(0, previousHunger - decay * cappedOfflineSecs);
            creature.hungry = creature.hunger <= 40;
            if (creature.hunger <= 0) {
                if (!Number.isFinite(creature.starvingStartAt)) creature.starvingStartAt = previousHunger <= 0 ? offlineStartAt : offlineStartAt + secondsUntilStarving * 1000;
                if (!creature.sick && now - creature.starvingStartAt >= 5 * 60 * 1000) {
                    creature.sick = true;
                    gameState.statistics.animalSicknessEvents = (Number(gameState.statistics.animalSicknessEvents) || 0) + 1;
                }
            } else {
                creature.starvingStartAt = null;
            }
        });
    });

    // Cập nhật mốc lưu mới
    gameState.lastSavedAt = now;
    if (typeof saveGame === 'function') saveGame();
}

// KHỞI CHẠY GAME
function init3D() {
    if (typeof THREE === 'undefined' || typeof THREE.WebGLRenderer !== 'function' || typeof THREE.OrbitControls !== 'function') {
        const notice = document.createElement('div');
        notice.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font:16px/1.6 system-ui,sans-serif;text-align:center';
        notice.innerHTML = '<div style="max-width:560px"><h1 style="font-size:24px;font-weight:800;margin-bottom:12px">Không tải được bộ máy 3D</h1><p>Game cần tải Three.js và OrbitControls từ CDN. Hãy kết nối Internet rồi tải lại trang. Bản này vẫn chưa đóng gói thư viện 3D để chạy hoàn toàn ngoại tuyến.</p><button onclick="location.reload()" style="margin-top:18px;background:#f59e0b;color:#111827;padding:10px 18px;border-radius:12px;font-weight:800">Tải lại</button></div>';
        document.body.appendChild(notice);
        return;
    }
    loadGame();
    const playerNameDisplay = document.getElementById('player-name-display');
    if (playerNameDisplay) playerNameDisplay.textContent = gameState.playerName || 'Chibi Farmer';
    if (typeof ensureMarketOrderTimers === 'function') ensureMarketOrderTimers();

    // 🟢 GỌI HÀM BÙ THỜI GIAN OFFLINE TẠI ĐÂY:
    syncOfflineTimeWithCap();

    if (!gameState.quests || gameState.quests.length === 0) generateDailyQuests();
    if (!gameState.marketOrders || gameState.marketOrders.length === 0) generateMarketOrders();

    init3DScene();
    buildFarmIslandBase();
    buildEnvironmentDecorations();
    buildMinigameMats();
    
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
    if (typeof updateMarketOrderTimers === 'function') setInterval(updateMarketOrderTimers, 1000);
    setInterval(saveGame, 10000);

    updatePlotColorsByLevel();
    updateUI();
    if (typeof renderDailyQuestHud === 'function') renderDailyQuestHud();
    animate3D();
}

// Tự động kích hoạt khi trang tải xong
window.addEventListener('DOMContentLoaded', () => {
    init3D();
});
