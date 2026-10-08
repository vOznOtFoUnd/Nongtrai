// Floating HUD UI Manager
let tempV = new THREE.Vector3();

// Chuyển đổi tọa độ 3D World sang 2D Screen
function getScreenCoords(position) {
    if (!camera || !renderer) return null;
    const pos = position.clone();
    pos.project(camera);

    // Kiểm tra nếu vật thể nằm phía sau camera
    if (pos.z > 1) return null;

    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    return {
        x: (pos.x * widthHalf) + widthHalf,
        y: -(pos.y * heightHalf) + heightHalf
    };
}

// Định dạng giây thành mm:ss
function formatTime(seconds) {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Cập nhật thẻ HUD bay đếm giờ trên đầu vật thể 3D
function updateFloatingHUD() {
    const container = document.getElementById('floating-hud-container');
    if (!container) return;

    let htmlContent = '';
    const now = Date.now();

    // 1. HUD Ô ĐẤT TRỒNG LÚA / NÔNG SẢN
    if (typeof plotMeshes !== 'undefined') {
        plotMeshes.forEach((mesh, i) => {
            const plot = gameState.plots[i];
            if (!gameState.unlockedPlots[i] || !plot || !plot.cropId) return;

            mesh.getWorldPosition(tempV);
            tempV.y += 1.2;
            const pos = getScreenCoords(tempV);
            if (!pos) return;

            const crop = CROPS_DB[plot.cropId];
            if (!crop) return;

            let badgeText = '';
            let badgeStyle = 'bg-white/95 border-amber-400 text-slate-800';

            if (plot.isDead) {
                badgeStyle = 'bg-rose-500 text-white border-rose-600';
                badgeText = '🥀 Cây Chết';
            } else if (plot.hasPest) {
                badgeStyle = 'bg-purple-600 text-white border-purple-700 animate-pulse';
                badgeText = '🐛 Có Sâu!';
            } else {
                const effTime = crop.growTime - (plot.reducedSecs || 0);
                const elapsed = (now - plot.plantedAt) / 1000;
                const remSecs = Math.max(0, Math.ceil(effTime - elapsed));

                if (remSecs === 0) {
                    badgeStyle = 'bg-emerald-500 text-white border-emerald-600 animate-bounce';
                    badgeText = `${crop.icon} Thu Hoạch!`;
                } else {
                    badgeText = `${crop.icon} ${formatTime(remSecs)}`;
                }
            }

            htmlContent += `
                <div class="hud-badge ${badgeStyle} border px-2 py-1 rounded-xl shadow-md text-[11px] font-black flex items-center gap-1.5 absolute" style="left: ${pos.x}px; top: ${pos.y}px; transform: translate(-50%, -100%); pointer-events: none;">
                    ${badgeText}
                </div>
            `;
        });
    }

    // 2. HUD CÂY ĂN QUẢ (Lớn / Chờ ra trái / Sẵn sàng)
    if (typeof orchardPlotMeshes !== 'undefined') {
        gameState.orchardPlots.forEach((tree, i) => {
            if (!tree.unlocked || !tree.treeType) return;
            const mesh = orchardPlotMeshes[i];
            if (!mesh) return;

            mesh.getWorldPosition(tempV);
            tempV.y += 3.2;
            const pos = getScreenCoords(tempV);
            if (!pos) return;

            const treeInfo = TREES_DB[tree.treeType];
            if (!treeInfo) return;

            const ageSecs = (now - tree.plantedAt) / 1000;
            const growTime = 900;  // 15 phút lớn
            const cycleTime = 480; // 8 phút cho trái 1 lần

            let badgeText = '';
            let badgeStyle = 'bg-white/95 border-emerald-500 text-slate-800';

            if (ageSecs < growTime) {
                const remSecs = Math.ceil(growTime - ageSecs);
                badgeText = `🌱 ${formatTime(remSecs)}`;
            } else {
                const lastH = tree.lastHarvestAt || (tree.plantedAt + growTime * 1000);
                const elapsed = (now - lastH) / 1000;
                if (elapsed >= cycleTime) {
                    badgeStyle = 'bg-emerald-500 text-white border-emerald-600 animate-bounce';
                    badgeText = `${treeInfo.icon} Thu Hoạch!`;
                } else {
                    const remSecs = Math.ceil(cycleTime - elapsed);
                    badgeText = `${treeInfo.icon} ${formatTime(remSecs)}`;
                }
            }

            htmlContent += `
                <div class="hud-badge ${badgeStyle} border px-2 py-1 rounded-xl shadow-md text-[11px] font-black flex items-center gap-1.5 absolute" style="left: ${pos.x}px; top: ${pos.y}px; transform: translate(-50%, -100%); pointer-events: none;">
                    ${badgeText}
                </div>
            `;
        });
    }

    // 3. HUD BẾP NẤU ĂN 3D
    if (typeof stoveMeshes !== 'undefined') {
        stoveMeshes.forEach((group, i) => {
            const stove = gameState.kitchenStoves[i];
            if (!stove || !stove.unlocked || !stove.cooking) return;

            group.getWorldPosition(tempV);
            tempV.y += 1.6;
            const pos = getScreenCoords(tempV);
            if (!pos) return;

            const recipe = RECIPES_DB[stove.recipeId];
            if (!recipe) return;

            const elapsed = (now - stove.startTime) / 1000;
            const remSecs = Math.max(0, Math.ceil(stove.duration - elapsed));

            let badgeStyle = 'bg-white/95 border-amber-500 text-slate-800';
            let badgeText = `${recipe.icon} ${formatTime(remSecs)}`;

            if (remSecs === 0) {
                badgeStyle = 'bg-amber-500 text-white border-amber-600 animate-bounce';
                badgeText = `${recipe.icon} Xong Rồi!`;
            }

            htmlContent += `
                <div class="hud-badge ${badgeStyle} border px-2 py-1 rounded-xl shadow-md text-[11px] font-black flex items-center gap-1.5 absolute" style="left: ${pos.x}px; top: ${pos.y}px; transform: translate(-50%, -100%); pointer-events: none;">
                    ${badgeText}
                </div>
            `;
        });
    }

    // 4. HUD AO CÁ
    if (gameState.fishPond && gameState.fishPond.fishes.length > 0) {
        tempV.set(0, 1.2, 20);
        const pos = getScreenCoords(tempV);
        if (pos) {
            let adultCount = 0;
            let growingCount = 0;

            gameState.fishPond.fishes.forEach(f => {
                const fInfo = FISH_DB[f.type];
                if (fInfo) {
                    const elapsed = (now - f.plantedAt) / 1000;
                    if (elapsed >= fInfo.growTime) adultCount++;
                    else growingCount++;
                }
            });

            let badgeText = '';
            let badgeStyle = 'bg-white/95 border-sky-400 text-slate-800';

            if (adultCount > 0) {
                badgeStyle = 'bg-sky-500 text-white border-sky-600 animate-bounce';
                badgeText = `🐟 ${adultCount} Cá Lớn!`;
            } else {
                badgeText = `🐟 ${growingCount} Cá Con`;
            }

            htmlContent += `
                <div class="hud-badge ${badgeStyle} border px-2 py-1 rounded-xl shadow-md text-[11px] font-black flex items-center gap-1.5 absolute" style="left: ${pos.x}px; top: ${pos.y}px; transform: translate(-50%, -100%); pointer-events: none;">
                    ${badgeText}
                </div>
            `;
        }
    }

    // 5. HUD GÀ (Lớn / Chờ đẻ / Sẵn sàng)
    if (typeof chickenMeshes !== 'undefined') {
        chickenMeshes.forEach(item => {
            const c = item.data;
            const ageSecs = (now - c.bornAt) / 1000;
            const growTime = 300;  // 5 phút lớn
            const cycleTime = 180; // 3 phút đẻ 1 lần

            tempV.set(c.x, 0.9, c.z);
            const pos = getScreenCoords(tempV);
            if (pos) {
                let badgeStyle = 'bg-white/95 border-amber-400 text-slate-800';
                let textHtml = '';

                if (c.sick) {
                    badgeStyle = 'bg-rose-500 text-white border-rose-600';
                    textHtml = '<span class="text-base">🐥 💊</span> Bệnh!';
                } else if (c.hungry) {
                    badgeStyle = 'bg-amber-500 text-white border-amber-600';
                    textHtml = '<span class="text-base">🐥 🌾</span> Đói!';
                } else if (ageSecs < growTime) {
                    const remSecs = Math.ceil(growTime - ageSecs);
                    textHtml = `<span class="text-base">🐥</span> <span class="font-mono text-amber-600">${formatTime(remSecs)}</span>`;
                } else {
                    const lastTime = c.producedAt || (c.bornAt + growTime * 1000);
                    const elapsed = (now - lastTime) / 1000;
                    if (elapsed >= cycleTime && (c.yieldCount || 0) < 10) {
                        badgeStyle = 'bg-emerald-500 text-white border-emerald-600 animate-bounce';
                        textHtml = '<span class="text-base">🥚</span> Sẵn sàng!';
                    } else {
                        const remSecs = Math.ceil(cycleTime - elapsed);
                        textHtml = `<span class="text-base">🥚</span> <span class="font-mono">${formatTime(remSecs)}</span>`;
                    }
                }

                htmlContent += `
                    <div class="hud-badge ${badgeStyle} border px-2 py-1 rounded-xl shadow-md text-[11px] font-black flex items-center gap-1.5 absolute" style="left: ${pos.x}px; top: ${pos.y}px; transform: translate(-50%, -100%); pointer-events: none;">
                        ${textHtml}
                    </div>
                `;
            }
        });
    }

    // 6. HUD BÒ (Lớn / Chờ vắt sữa / Sẵn sàng)
    if (typeof cowMeshes !== 'undefined') {
        cowMeshes.forEach(item => {
            const c = item.data;
            const ageSecs = (now - c.bornAt) / 1000;
            const growTime = 600;  // 10 phút lớn
            const cycleTime = 360; // 6 phút cho sữa 1 lần

            tempV.set(c.x, 1.8, c.z);
            const pos = getScreenCoords(tempV);
            if (pos) {
                let badgeStyle = 'bg-white/95 border-sky-400 text-slate-800';
                let textHtml = '';

                if (c.sick) {
                    badgeStyle = 'bg-rose-500 text-white border-rose-600';
                    textHtml = '<span class="text-base">🐮 💊</span> Bệnh!';
                } else if (c.hungry) {
                    badgeStyle = 'bg-amber-500 text-white border-amber-600';
                    textHtml = '<span class="text-base">🐮 🌿</span> Đói!';
                } else if (ageSecs < growTime) {
                    const remSecs = Math.ceil(growTime - ageSecs);
                    textHtml = `<span class="text-base">🐮</span> <span class="font-mono text-sky-600">${formatTime(remSecs)}</span>`;
                } else {
                    const lastTime = c.producedAt || (c.bornAt + growTime * 1000);
                    const elapsed = (now - lastTime) / 1000;
                    if (elapsed >= cycleTime && (c.yieldCount || 0) < 10) {
                        badgeStyle = 'bg-emerald-500 text-white border-emerald-600 animate-bounce';
                        textHtml = '<span class="text-base">🥛</span> Sẵn sàng!';
                    } else {
                        const remSecs = Math.ceil(cycleTime - elapsed);
                        textHtml = `<span class="text-base">🥛</span> <span class="font-mono">${formatTime(remSecs)}</span>`;
                    }
                }

                htmlContent += `
                    <div class="hud-badge ${badgeStyle} border px-2 py-1 rounded-xl shadow-md text-[11px] font-black flex items-center gap-1.5 absolute" style="left: ${pos.x}px; top: ${pos.y}px; transform: translate(-50%, -100%); pointer-events: none;">
                        ${textHtml}
                    </div>
                `;
            }
        });
    }

        // 7. HUD HEO (Hiển thị đếm giờ 15 phút lớn -> Sẵn sàng xuất chuồng)
    if (typeof pigMeshes !== 'undefined') {
        pigMeshes.forEach(item => {
            const p = item.data;
            const ageSecs = (now - p.bornAt) / 1000;
            const growTime = 900;  // 15 phút lớn để xuất chuồng

            tempV.set(p.x, 1.2, p.z);
            const pos = getScreenCoords(tempV);
            if (pos) {
                let badgeStyle = 'bg-white/95 border-pink-400 text-slate-800';
                let textHtml = '';

                if (p.sick) {
                    badgeStyle = 'bg-rose-500 text-white border-rose-600';
                    textHtml = '<span class="text-base">🐷 💊</span> Bệnh!';
                } else if (p.hungry || (p.hunger !== undefined && p.hunger <= 40)) {
                    badgeStyle = 'bg-amber-500 text-white border-amber-600';
                    textHtml = '<span class="text-base">🐷 🥔</span> Đói!';
                } else if (ageSecs < growTime) {
                    const remSecs = Math.ceil(growTime - ageSecs);
                    textHtml = `<span class="text-base">🐷</span> <span class="font-mono text-pink-600">${formatTime(remSecs)}</span>`;
                } else {
                    badgeStyle = 'bg-emerald-500 text-white border-emerald-600 animate-bounce';
                    textHtml = '<span class="text-base">🥩</span> Xuất Chuồng!';
                }

                htmlContent += `
                    <div class="hud-badge ${badgeStyle} border px-2 py-1 rounded-xl shadow-md text-[11px] font-black flex items-center gap-1.5 absolute" style="left: ${pos.x}px; top: ${pos.y}px; transform: translate(-50%, -100%); pointer-events: none;">
                        ${textHtml}
                    </div>
                `;
            }
        });
    }

    container.innerHTML = htmlContent;
}
