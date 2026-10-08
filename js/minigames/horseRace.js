let horseBetNumber = 1;

function renderHorseRaceState() {
    for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById('bet-horse-' + i);
        if (btn) {
            if (i === horseBetNumber) btn.classList.add('ring-2', 'ring-amber-400');
            else btn.classList.remove('ring-2', 'ring-amber-400');
        }
    }

    const input = document.getElementById('horse-bet-amount');
    if (input) {
        if (!input.value || Number(input.value) <= 0) input.value = 100;
    }

    const resBanner = document.getElementById('horse-race-result');
    if (resBanner) {
        resBanner.classList.add('hidden');
        resBanner.innerHTML = '';
    }

    const btn = document.getElementById('btn-start-race');
    if (btn) btn.disabled = false;
}

function resetHorseRaceState() {
    horseBetNumber = 1;

    const input = document.getElementById('horse-bet-amount');
    if (input) input.value = 100;

    const resBanner = document.getElementById('horse-race-result');
    if (resBanner) {
        resBanner.classList.add('hidden');
        resBanner.innerHTML = '';
    }

    for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById('bet-horse-' + i);
        if (btn) btn.classList.remove('ring-2', 'ring-amber-400');

        const el = document.getElementById('horse-' + i);
        if (el) el.style.left = '0%';
    }

    const startBtn = document.getElementById('btn-start-race');
    if (startBtn) startBtn.disabled = false;
}

// Mở modal đua ngựa
function openHorseRaceModal() {
    resetHorseRaceState();
    openModal('modal-horse-race');
}

function getHorseBetAmount() {
    const input = document.getElementById('horse-bet-amount');
    if (!input) return 500;

    const value = parseInt(input.value, 10);
    if (!Number.isFinite(value)) return 500;
    return Math.max(100, Math.min(value, gameState.gold || 100));
}

// Chọn con ngựa đặt cược (1 - 4)
function selectHorseBet(num) {
    horseBetNumber = num;
    for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById('bet-horse-' + i);
        if (btn) {
            if (i === num) btn.classList.add('ring-2', 'ring-amber-400');
            else btn.classList.remove('ring-2', 'ring-amber-400');
        }
    }
}

// Tăng/Giảm mức tiền cược
function adjustHorseBet(amt) {
    const input = document.getElementById('horse-bet-amount');
    if (input) {
        let cur = parseInt(input.value, 10) || 100;
        const next = Math.max(100, cur + amt);
        input.value = Math.min(next, gameState.gold || 100);
    }
}

// Bắt đầu cuộc đua
function startHorseRace() {
    const amount = getHorseBetAmount();
    const input = document.getElementById('horse-bet-amount');
    if (input) input.value = amount;

    if (gameState.gold < amount) {
        showToast("Thiếu Vàng! 🪙", "Bạn không có đủ vàng đặt cược!", "❌");
        return;
    }

    gameState.gold -= amount;
    updateUI();

    const resBanner = document.getElementById('horse-race-result');
    if (resBanner) {
        resBanner.classList.add('hidden');
        resBanner.innerHTML = '';
    }

    const btn = document.getElementById('btn-start-race');
    if (btn) btn.disabled = true;

    const pos = [0, 0, 0, 0];
    const interval = setInterval(() => {
        for (let i = 0; i < 4; i++) {
            pos[i] += Math.random() * 8 + 2;
            const el = document.getElementById(`horse-${i + 1}`);
            if (el) el.style.left = Math.min(85, pos[i]) + '%';
        }

        if (pos.some(p => p >= 85)) {
            clearInterval(interval);
            const winner = pos.indexOf(Math.max(...pos)) + 1;
            const isWin = winner === horseBetNumber;

            if (resBanner) {
                resBanner.classList.remove('hidden');
                if (isWin) {
                    const winGold = amount * 4;
                    gameState.gold += winGold;
                    resBanner.className = 'mb-3 p-3 rounded-2xl text-center font-black border shadow-lg text-sm sm:text-base bg-emerald-900 border-emerald-500 text-emerald-200';
                    resBanner.innerHTML = `🎉 THẮNG LỚN! Ngựa #${winner} thắng cuộc. Nhận +${winGold.toLocaleString()} 🪙!`;
                } else {
                    resBanner.className = 'mb-3 p-3 rounded-2xl text-center font-black border shadow-lg text-sm sm:text-base bg-rose-900 border-rose-500 text-rose-200';
                    resBanner.innerHTML = `💸 RẤT TIẾC! Ngựa #${winner} về nhất. Bạn mất ${amount.toLocaleString()} 🪙.`;
                }
            }

            if (btn) btn.disabled = false;
            updateUI();
            saveGame();
        }
    }, 100);
}
