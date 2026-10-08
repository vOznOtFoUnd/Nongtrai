let lastTextUpdate = 0;
let cachedHtmlContent = ""; // Lưu cache nội dung text để tối ưu performance

// Cập nhật các thẻ đếm giờ Floating HUD bay trên các đối tượng 3D
function updateFloatingHUD() {
    const container = document.getElementById('floating-hud-container');
    if (!container || !camera) return;

    const now = Date.now();
    const shouldUpdateText = (now - lastTextUpdate >= 1000); // Tối ưu: Chỉ tính toán lại thời gian sau mỗi 1s
    if (shouldUpdateText) {
        lastTextUpdate = now;
    }

    let htmlContent = "";
    const tempV = new THREE.Vector3();

    // Hàm chuyển đổi tọa độ World 3D sang Screen 2D
    const getScreenCoords = (vec) => {
        tempV.copy(vec);
        tempV.project(camera);
        if (tempV.z >= 1.0) return null;
        return {
            x: (tempV.x * 0.5 + 0.5) * window.innerWidth,
            y: (-(tempV.y * 0.5) + 0.5) * window.innerHeight
        };
    };

    // 1. HUD Ô ĐẤT TRỒNG CÂY
    if (typeof plotMeshes !== 'undefined') {
        gameState.plots.forEach((plot, i) => {
            if (!gameState.unlockedPlots[i] || !plot.cropId || plot.isDead) return;
            const mesh = plotMeshes[i];
            if (!mesh) return;

            mesh.getWorldPosition(tempV);
            tempV.y += 1.2;
            const pos = getScreenCoords(tempV);
            if (!pos) return;

            const crop = CROPS_DB[plot.cropId];
            const effTime = crop.growTime - (plot.reducedSecs || 0);
            const elapsed = (now - plot.plantedAt) / 1000;
            const isReady = elapsed >= effTime;
            const remSecs = Math.max(0, Math.ceil(effTime - elapsed));

            htmlContent += `
                <div class="hud-badge bg-white/95 backdrop-blur border border-amber-400 px-2 py-1 rounded-xl shadow-md text-[11px] font-black flex items-center gap-1.5 absolute" style="left: ${pos.x}px; top: ${pos.y}px; transform: translate(-50%, -100%); pointer-events: none;">
                    <span class="text-base">${crop.icon}</span>
                    ${isReady ? '' : `<span class="text-slate-700 font-mono">${formatTime(remSecs)}</span>`}
                    ${plot.hasPest ? `<span>🐛</span>` : ''}
                    ${plot.watered ? `<span>💧</span>` : ''}
                </div>
            `;
        });
    }

    // 2. HUD CÂY ĂN QUẢ
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
            const elapsed = (now - tree.plantedAt) / 1000;
            const isReady = elapsed >= treeInfo.harvestTime;
            const remSecs = Math.max(0, Math.ceil(treeInfo.harvestTime - elapsed));

            htmlContent += `
                <div class="hud-badge bg-white/95 backdrop-blur border border-emerald-500 px-2 py-1 rounded-xl shadow-md text-[11px] font-black flex items-center gap-1.5 absolute" style="left: ${pos.x}px; top: ${pos.y}px; transform: translate(-50%, -100%); pointer-events: none;">
                    <span class="text-base">${treeInfo.icon}</span>
                    ${isReady ? '' : `<span class="text-slate-700 font-mono">${formatTime(remSecs)}</span>`}
                </div>
            `;
        });
    }

    // 3. HUD BẾP NẤU ĂN
    if (typeof stoveMeshes !== 'undefined') {
        gameState.kitchenStoves.forEach((stove, i) => {
            if (!stove.unlocked || !stove.cooking) return;
            const mesh = stoveMeshes[i];
            if (!mesh) return;

            mesh.getWorldPosition(tempV);
            tempV.y += 2.2;
            const pos = getScreenCoords(tempV);
            if (!pos) return;

            const recipe = RECIPES_DB[stove.recipeId];
            const elapsed = (now - stove.startTime) / 1000;
            const isReady = elapsed >= stove.duration;
            const remSecs = Math.max(0, Math.ceil(stove.duration - elapsed));

            htmlContent += `
                <div class="hud-badge bg-amber-500 text-white px-2 py-1 rounded-xl shadow-md text-[11px] font-black flex items-center gap-1.5 absolute" style="left: ${pos.x}px; top: ${pos.y}px; transform: translate(-50%, -100%); pointer-events: none;">
                    <span class="text-base">🍳 ${recipe ? recipe.icon : ''}</span>
                    ${isReady ? '' : `<span class="font-mono">${formatTime(remSecs)}</span>`}
                </div>
            `;
        });
    }

    // 4. HUD GÀ
    if (typeof chickenMeshes !== 'undefined') {
        chickenMeshes.forEach(item => {
            const c = item.data;
            const elapsed = (now - c.producedAt) / 1000;
            const total = ANIMAL_PROD_INTERVALS.chicken;
            const isReady = elapsed >= total;
            const remSecs = Math.max(0, Math.ceil(total - elapsed));

            tempV.set(c.x, 0.9, c.z);
            const pos = getScreenCoords(tempV);
            if (pos) {
                let badgeStyle = "bg-white/95 border border-amber-400 text-slate-800";
                let textHtml = `<span class="text-base">🥚</span> ${isReady ? '' : `<span class="font-mono">${formatTime(remSecs)}</span>`}`;
                
                if (c.sick) {
                    badgeStyle = "bg-rose-500 text-white";
                    textHtml = '<span class="text-base">🐥 💊</span>';
                } else if (c.hungry) {
                    badgeStyle = "bg-amber-500 text-white";
                    textHtml = '<span class="text-base">🐥 🌾</span>';
                }

                htmlContent += `
                    <div class="hud-badge ${badgeStyle} px-2 py-1 rounded-xl shadow-md text-[11px] font-black flex items-center gap-1.5 absolute" style="left: ${pos.x}px; top: ${pos.y}px; transform: translate(-50%, -100%); pointer-events: none;">
                        ${textHtml}
                    </div>
                `;
            }
        });
    }

    // 5. HUD BÒ
    if (typeof cowMeshes !== 'undefined') {
        cowMeshes.forEach(item => {
            const c = item.data;
            const elapsed = (now - c.producedAt) / 1000;
            const total = ANIMAL_PROD_INTERVALS.cow;
            const isReady = elapsed >= total;
            const remSecs = Math.max(0, Math.ceil(total - elapsed));

            tempV.set(c.x, 1.8, c.z);
            const pos = getScreenCoords(tempV);
            if (pos) {
                let badgeStyle = "bg-white/95 border border-sky-400 text-slate-800";
                let textHtml = `<span class="text-base">🥛</span> ${isReady ? '' : `<span class="font-mono">${formatTime(remSecs)}</span>`}`;
                
                if (c.sick) {
                    badgeStyle = "bg-rose-500 text-white";
                    textHtml = '<span class="text-base">🐮 💊</span>';
                } else if (c.hungry) {
                    badgeStyle = "bg-amber-500 text-white";
                    textHtml = '<span class="text-base">🐮 🌿</span>';
                }

                htmlContent += `
                    <div class="hud-badge ${badgeStyle} px-2 py-1 rounded-xl shadow-md text-[11px] font-black flex items-center gap-1.5 absolute" style="left: ${pos.x}px; top: ${pos.y}px; transform: translate(-50%, -100%); pointer-events: none;">
                        ${textHtml}
                    </div>
                `;
            }
        });
    }

    // 6. HUD HEO
    if (typeof pigMeshes !== 'undefined') {
        pigMeshes.forEach(item => {
            const p = item.data;
            const elapsed = (now - p.producedAt) / 1000;
            const total = ANIMAL_PROD_INTERVALS.pig;
            const isReady = elapsed >= total;
            const remSecs = Math.max(0, Math.ceil(total - elapsed));

            tempV.set(p.x, 1.4, p.z);
            const pos = getScreenCoords(tempV);
            if (pos) {
                let badgeStyle = "bg-white/95 border border-rose-400 text-slate-800";
                let textHtml = `<span class="text-base">🥩</span> ${isReady ? '' : `<span class="font-mono">${formatTime(remSecs)}</span>`}`;
                
                if (p.sick) {
                    badgeStyle = "bg-rose-500 text-white";
                    textHtml = '<span class="text-base">🐷 💊</span>';
                } else if (p.hungry) {
                    badgeStyle = "bg-amber-500 text-white";
                    textHtml = '<span class="text-base">🐷 🥔</span>';
                }

                htmlContent += `
                    <div class="hud-badge ${badgeStyle} px-2 py-1 rounded-xl shadow-md text-[11px] font-black flex items-center gap-1.5 absolute" style="left: ${pos.x}px; top: ${pos.y}px; transform: translate(-50%, -100%); pointer-events: none;">
                        ${textHtml}
                    </div>
                `;
            }
        });
    }

    // 7. HUD AO CÁ
    if (typeof pondFishMeshes !== 'undefined') {
        gameState.fishPond.fishes.forEach((fish, i) => {
            const fInfo = FISH_DB[fish.type];
            if (!fInfo) return;
            const elapsed = (now - fish.plantedAt) / 1000;
            const isReady = elapsed >= fInfo.growTime;
            const remSecs = Math.max(0, Math.ceil(fInfo.growTime - elapsed));

            const meshObj = pondFishMeshes[i];
            if (meshObj) {
                meshObj.mesh.getWorldPosition(tempV);
                tempV.y += 0.8;
                const pos = getScreenCoords(tempV);
                if (pos) {
                    htmlContent += `
                        <div class="hud-badge bg-white/95 border border-sky-500 px-2 py-1 rounded-xl shadow-md text-[11px] font-black flex items-center gap-1.5 absolute" style="left: ${pos.x}px; top: ${pos.y}px; transform: translate(-50%, -100%); pointer-events: none;">
                            <span class="text-base">${fInfo.icon}</span>
                            ${isReady ? '' : `<span class="text-slate-700 font-mono">${formatTime(remSecs)}</span>`}
                        </div>
                    `;
                }
            }
        });
    }

    cachedHtmlContent = htmlContent;
    container.innerHTML = cachedHtmlContent;
}
