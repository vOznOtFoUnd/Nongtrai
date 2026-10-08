// Mở Modal Quản lý Chuồng Vật Nuôi
function openAnimalPenModal(penType) {
    currentPenType = penType;
    const titleMap = { chicken: '🐥 Chuồng Gà', cow: '🐮 Chuồng Bò', pig: '🐷 Chuồng Heo' };
    const titleEl = document.getElementById('animal-pen-title');
    if (titleEl) titleEl.innerText = titleMap[penType] || '🏡 Quản Lý Chuồng';

    let arrayName = penType === 'chicken' ? 'chickens' : (penType === 'cow' ? 'cows' : 'pigs');
    const items = Array.isArray(gameState[arrayName]) ? gameState[arrayName] : [];

    let text = `Số lượng vật nuôi: <b>${items.length}</b><br>`;
    if (items.length === 0) {
        text += 'Chuồng hiện đang trống. Hãy mua con giống mới!';
    } else {
        let hungryCount = items.filter(a => a.hungry).length;
        let sickCount = items.filter(a => a.sick).length;

        text += `Tình trạng: <span class="${hungryCount > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600'}">${hungryCount} con đói</span> | <span class="${sickCount > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}">${sickCount} con bệnh</span>`;
    }

    const statusEl = document.getElementById('animal-pen-status');
    if (statusEl) statusEl.innerHTML = text;

    openModal('modal-animal-pen');
}

// Thực thi Hành động trong Chuồng Gia Súc
function executePenAction(action) {
    if (!currentPenType) {
        showToast("Chưa Chọn Chuồng! 🏡", "Bạn cần mở chuồng vật nuôi trước khi thực hiện hành động.", "ℹ️");
        return;
    }

    let arrayName = currentPenType === 'chicken' ? 'chickens' : (currentPenType === 'cow' ? 'cows' : 'pigs');
    const items = Array.isArray(gameState[arrayName]) ? gameState[arrayName] : [];

    if (items.length === 0) {
        showToast("Chuồng Trống! 🏡", "Hiện chưa có vật nuôi trong chuồng này.", "ℹ️");
        return;
    }

    if (action === 'feed') {
        const feedKey = 'feed_' + currentPenType;
        const hungryList = items.filter(a => (a.hunger === undefined ? 100 : a.hunger) < 80 || a.hungry);

        if (hungryList.length === 0) {
            showToast("Vật Nuôi Đã No 🌾", "Tất cả vật nuôi trong chuồng đều đang no căng bụng!", "ℹ️");
            return;
        }

        const currentFeedQty = gameState.inventory[feedKey] || 0;
        if (currentFeedQty < hungryList.length) {
            const feedInfo = getItemInfo(feedKey);
            showToast("Thiếu Thức Ăn! 🌾", `Bạn cần ${hungryList.length} ${feedInfo.name} (Đang có: ${currentFeedQty})!`, "❌");
            return;
        }

        if (!checkAndDeductStamina(1)) return;

        gameState.inventory[feedKey] = Math.max(0, currentFeedQty - hungryList.length);
        hungryList.forEach(a => {
            a.hunger = 100;
            a.hungry = false;
            a.starvingStartAt = null;
            a.sick = false;
        });

        showToast("Cho Ăn Thành Công! 🌾", `Đã dùng ${hungryList.length} ${getItemInfo(feedKey).name}. Tất cả đã no 100%!`, "✨");
        openAnimalPenModal(currentPenType);
        updateUI();
        saveGame();
    } else if (action === 'heal') {
        const sickList = items.filter(a => a.sick);
        if (sickList.length === 0) {
            showToast("Không Có Bệnh 💊", "Tất cả vật nuôi hoàn toàn khỏe mạnh!", "ℹ️");
            return;
        }

        const currentMedQty = gameState.inventory.medicine || 0;
        if (currentMedQty < sickList.length) {
            showToast("Thiếu Thuốc! 💊", `Bạn cần ${sickList.length} Thuốc Thú Y (Đang có: ${currentMedQty})!`, "❌");
            return;
        }

        if (!checkAndDeductStamina(1)) return;

        gameState.inventory.medicine = Math.max(0, currentMedQty - sickList.length);
        sickList.forEach(a => {
            a.sick = false;
            a.starvingStartAt = null;
            a.hunger = Math.max(30, a.hunger || 30);
        });

        showToast("Chữa Bệnh Thành Công! 💊", `Đã chữa khỏi bệnh cho ${sickList.length} con vật nuôi!`, "✨");
        openAnimalPenModal(currentPenType);
        updateUI();
        saveGame();
    } else if (action === 'add') {
        const buyKey = 'buy_' + currentPenType;
        if ((gameState.inventory[buyKey] || 0) <= 0) {
            showToast("Hết Con Giống! 🐥", "Hãy ghé Cửa Hàng mua con giống mới!", "❌");
            return;
        }

        if (!checkAndDeductStamina(1)) return;

        gameState.inventory[buyKey] = Math.max(0, (gameState.inventory[buyKey] || 0) - 1);
        const posX = currentPenType === 'chicken' ? -20 : (currentPenType === 'cow' ? -20 : 20);
        const posZ = currentPenType === 'chicken' ? -18 : (currentPenType === 'cow' ? 10 : 14);

        items.push({
            id: Date.now(),
            bornAt: Date.now(),
            yieldCount: 0,
            hunger: 100,
            hungry: false,
            sick: false,
            starvingStartAt: null,
            lastSickDay: 0,
            producedAt: Date.now(),
            x: posX,
            z: posZ
        });

        updateAnimalPen3DMeshes(currentPenType);
        showToast("Thả Con Giống! 🐣", "Đã thả con giống mới vào chuồng!", "🎉");
        openAnimalPenModal(currentPenType);
        updateUI();
        saveGame();
    } else if (action === 'harvest') {
        const now = Date.now();

        const configMap = {
            chicken: { growTime: 300, cycleTime: 180, prodKey: 'egg', meatKey: 'chicken_meat', name: 'Trứng Gà', meatName: 'Thịt Gà' },
            cow: { growTime: 600, cycleTime: 360, prodKey: 'milk', meatKey: 'beef_meat', name: 'Sữa Bò', meatName: 'Thịt Bò' },
            pig: { growTime: 900, cycleTime: 480, prodKey: 'pork', meatKey: 'pork', name: 'Thịt Heo Tươi', meatName: 'Thịt Heo Tươi' }
        };

        const cfg = configMap[currentPenType];

        if (currentPenType === 'pig') {
            const readyPigs = items.filter(p => !p.sick && (p.hunger === undefined || p.hunger > 0) && ((now - p.bornAt) / 1000) >= cfg.growTime);

            if (readyPigs.length > 0) {
                if (!checkAndDeductStamina(2)) return;

                const remainingPigs = items.filter(p => p.sick || (p.hunger !== undefined && p.hunger <= 0) || ((now - p.bornAt) / 1000) < cfg.growTime);
                const pigYieldCount = readyPigs.length;

                gameState.inventory['pork'] = (gameState.inventory['pork'] || 0) + pigYieldCount;
                addExp(pigYieldCount * 30);

                gameState.pigs = remainingPigs;
                updateAnimalPen3DMeshes('pig');

                showToast("Xuất Chuồng Heo! 🥩", `Đã thu hoạch ${pigYieldCount} Thịt Heo Tươi và xuất chuồng thành công!`, "🎉", 4000);
                openAnimalPenModal('pig');
                updateUI();
                saveGame();
            } else {
                showToast("Chưa Thể Xuất Chuồng ⏳", "Heo chưa đủ lớn (15 phút) hoặc đang bị đói/bệnh!", "ℹ️");
            }
        } else {
            let harvestedProdCount = 0;
            let retiredCount = 0;

            items.forEach(a => {
                if (a.sick || (a.hunger !== undefined && a.hunger <= 0)) return;

                const ageSecs = (now - a.bornAt) / 1000;
                if (ageSecs < cfg.growTime) return;

                const lastTime = a.producedAt || (a.bornAt + cfg.growTime * 1000);
                const elapsed = (now - lastTime) / 1000;

                if (elapsed >= cfg.cycleTime && (a.yieldCount || 0) < 10) {
                    a.yieldCount = (a.yieldCount || 0) + 1;
                    a.producedAt = now;
                    harvestedProdCount++;
                }
            });

            if (harvestedProdCount > 0) {
                if (!checkAndDeductStamina(2)) return;

                gameState.inventory[cfg.prodKey] = (gameState.inventory[cfg.prodKey] || 0) + harvestedProdCount;
                addExp(harvestedProdCount * 20);

                const remaining = [];
                items.forEach(a => {
                    if ((a.yieldCount || 0) >= 10) {
                        retiredCount++;
                        gameState.inventory[cfg.meatKey] = (gameState.inventory[cfg.meatKey] || 0) + 1;
                    } else {
                        remaining.push(a);
                    }
                });

                if (currentPenType === 'chicken') gameState.chickens = remaining;
                else if (currentPenType === 'cow') gameState.cows = remaining;

                updateAnimalPen3DMeshes(currentPenType);

                if (retiredCount > 0) {
                    showToast("Thu Hoạch & Xuất Chuồng! 🧺", `Thu được ${harvestedProdCount} ${cfg.name}. Có ${retiredCount} con đã cho đủ 10 lần sản phẩm và xuất chuồng!`, "🎉", 4000);
                } else {
                    showToast("Thu Hoạch Sản Phẩm! 🧺", `Thu được ${harvestedProdCount} ${cfg.name}!`, "✨");
                }

                openAnimalPenModal(currentPenType);
                updateUI();
                saveGame();
            } else {
                showToast("Chưa Có Sản Phẩm ⏳", "Vật nuôi đang lớn, chưa tới giờ cho sản phẩm hoặc đang quá đói!", "ℹ️");
            }
        }
    }
}
