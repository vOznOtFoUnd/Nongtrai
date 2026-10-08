// Cập Nhật Badge Chấm Đỏ Nhiệm Vụ Trên Thanh Tool
function updateQuestBadge() {
    const badge = document.getElementById('quest-badge');
    if (!badge) return;

    const quests = Array.isArray(gameState.quests) ? gameState.quests : [];
    const hasUnclaimed = quests.some(q => q.completed && !q.claimed);

    if (hasUnclaimed) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
}

// Render Danh Sách Nhiệm Vụ Hàng Ngày
function renderQuests() {
    const container = document.getElementById('quests-container');
    if (!container) return;

    const quests = Array.isArray(gameState.quests) ? gameState.quests : [];
    let html = '';

    quests.forEach(q => {
        const target = Number(q.target) > 0 ? Number(q.target) : 1;
        const progress = Number(q.progress) || 0;
        const pct = Math.min(100, Math.max(0, (progress / target) * 100));

        html += `
            <div class="bg-purple-50/80 rounded-2xl p-3 border border-purple-200 flex flex-col gap-2">
                <div class="flex justify-between items-center">
                    <span class="font-extrabold text-xs text-slate-800">${q.title || 'Nhiệm vụ'}</span>
                    <span class="text-xs font-black text-purple-600">+${q.rewardGold || 0}🪙 | +${q.rewardExp || 0}EXP</span>
                </div>
                <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300">
                    <div class="bg-purple-500 h-full" style="width: ${Math.floor(pct)}%"></div>
                </div>
                <div class="flex justify-between items-center text-[10px] text-slate-500">
                    <span>Tiến độ: ${progress}/${target}</span>
                    <button onclick="claimQuestReward('${q.id}')" ${!q.completed || q.claimed ? 'disabled' : ''} class="px-3 py-1 ${q.completed && !q.claimed ? 'bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg shadow' : 'bg-slate-300 text-slate-500 rounded-lg cursor-not-allowed'} transition text-[10px]">
                        ${q.claimed ? 'Đã Nhận' : 'Nhận Thưởng'}
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html || `<div class="text-center text-slate-400 py-8 font-bold">Không có nhiệm vụ nào!</div>`;
}

// Nhận Thưởng Nhiệm Vụ
function claimQuestReward(questId) {
    const quests = Array.isArray(gameState.quests) ? gameState.quests : [];
    const q = quests.find(item => item.id === questId);
    if (!q || !q.completed || q.claimed) return;

    q.claimed = true;
    gameState.gold += q.rewardGold || 0;
    addExp(q.rewardExp || 0);

    showToast("Nhận Thưởng Nhiệm Vụ! 📜", `Nhận được +${q.rewardGold || 0} Vàng & +${q.rewardExp || 0} EXP!`, "🎉");
    renderQuests();
    updateQuestBadge();
    updateUI();
    saveGame();
}
