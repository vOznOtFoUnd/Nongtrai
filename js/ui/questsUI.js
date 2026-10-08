// Cập Nhật Badge Chấm Đỏ Nhiệm Vụ Trên Thanh Tool
function updateQuestBadge() {
    const badge = document.getElementById('quest-badge');
    if (!badge) return;
    const hasUnclaimed = gameState.quests && gameState.quests.some(q => q.completed && !q.claimed);
    if (hasUnclaimed) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
}

// Render Danh Sách Nhiệm Vụ Hàng Ngày
function renderQuests() {
    const container = document.getElementById('quests-container');
    if (!container) return;

    let html = '';
    gameState.quests.forEach(q => {
        html += `
            <div class="bg-purple-50/80 rounded-2xl p-3 border border-purple-200 flex flex-col gap-2">
                <div class="flex justify-between items-center">
                    <span class="font-extrabold text-xs text-slate-800">${q.title}</span>
                    <span class="text-xs font-black text-purple-600">+${q.rewardGold}🪙 | +${q.rewardExp}EXP</span>
                </div>
                <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300">
                    <div class="bg-purple-500 h-full" style="width: ${Math.floor((q.progress / q.target) * 100)}%"></div>
                </div>
                <div class="flex justify-between items-center text-[10px] text-slate-500">
                    <span>Tiến độ: ${q.progress}/${q.target}</span>
                    <button onclick="claimQuestReward('${q.id}')" ${!q.completed || q.claimed ? 'disabled' : ''} class="px-3 py-1 ${q.completed && !q.claimed ? 'bg-purple-500 hover:bg-purple-600 text-white animate-pulse' : 'bg-slate-200 text-slate-400'} font-bold rounded-xl shadow">
                        ${q.claimed ? 'Đã Nhận' : 'Nhận Thưởng'}
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Nhận Thưởng Nhiệm Vụ
function claimQuestReward(questId) {
    const q = gameState.quests.find(item => item.id === questId);
    if (!q || !q.completed || q.claimed) return;

    q.claimed = true;
    gameState.gold += q.rewardGold;
    addExp(q.rewardExp);

    showToast("Nhận Thưởng Nhiệm Vụ! 📜", `Nhận được +${q.rewardGold} Vàng & +${q.rewardExp} EXP!`, "🎉");
    renderQuests();
    updateQuestBadge();
    updateUI();
    saveGame();
}