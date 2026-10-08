let bauCuaBets = { bau: 0, cua: 0, tom: 0, ca: 0, ga: 0, nai: 0 };

// Mở modal Bầu Cua
function openBauCuaModal() {
    openModal('modal-bau-cua');
}

// Đặt cược vào các cửa (mỗi lần click +100🪙)
function addBauCuaBet(type) {
    const betStep = 100;
    if (gameState.gold < betStep) {
        showToast("Thiếu Vàng! 🪙", "Bạn cần ít nhất 100 Vàng để cược!", "❌");
        return;
    }

    gameState.gold -= betStep;
    bauCuaBets[type] += betStep;
    const betEl = document.getElementById('bet-val-' + type);
    if (betEl) betEl.innerText = `${bauCuaBets[type].toLocaleString()}đ`;
    updateUI();
}

// Đặt lại các cược
function clearBauCuaBets() {
    Object.keys(bauCuaBets).forEach(k => {
        gameState.gold += bauCuaBets[k];
        bauCuaBets[k] = 0;
        const betEl = document.getElementById('bet-val-' + k);
        if (betEl) betEl.innerText = '0đ';
    });
    updateUI();
}

// Xóc đĩa Bầu Cua
function rollBauCua() {
    const totalBet = Object.values(bauCuaBets).reduce((a, b) => a + b, 0);
    if (totalBet <= 0) {
        showToast("Chưa Đặt Cược! 🎲", "Hãy chọn ô cửa đặt cược trước!", "❌");
        return;
    }

    const btn = document.getElementById('btn-roll-baucua');
    if (btn) btn.disabled = true;

    const icons = ['🪷', '🦀', '🦐', '🐟', '🐓', '🦌'];
    const keys = ['bau', 'cua', 'tom', 'ca', 'ga', 'nai'];

    let rolls = 0;
    const diceContainer = document.getElementById('dice-container');

    const anim = setInterval(() => {
        const r1 = Math.floor(Math.random() * 6);
        const r2 = Math.floor(Math.random() * 6);
        const r3 = Math.floor(Math.random() * 6);

        if (diceContainer && diceContainer.children.length >= 3) {
            diceContainer.children[0].innerText = icons[r1];
            diceContainer.children[1].innerText = icons[r2];
            diceContainer.children[2].innerText = icons[r3];
        }

        rolls++;
        if (rolls > 15) {
            clearInterval(anim);

            const final1 = Math.floor(Math.random() * 6);
            const final2 = Math.floor(Math.random() * 6);
            const final3 = Math.floor(Math.random() * 6);

            if (diceContainer && diceContainer.children.length >= 3) {
                diceContainer.children[0].innerText = icons[final1];
                diceContainer.children[1].innerText = icons[final2];
                diceContainer.children[2].innerText = icons[final3];
            }

            const results = [keys[final1], keys[final2], keys[final3]];
            let totalWin = 0;

            Object.keys(bauCuaBets).forEach(k => {
                const count = results.filter(r => r === k).length;
                if (count > 0) {
                    totalWin += bauCuaBets[k] * (count + 1);
                }
                bauCuaBets[k] = 0;
                const betEl = document.getElementById('bet-val-' + k);
                if (betEl) betEl.innerText = '0đ';
            });

            gameState.gold += totalWin;
            const resBanner = document.getElementById('baucua-result');
            if (resBanner) {
                resBanner.classList.remove('hidden');
                if (totalWin > 0) {
                    resBanner.className = 'mb-3 p-3 rounded-2xl text-center font-black border shadow-lg text-sm sm:text-base bg-emerald-900 border-emerald-500 text-emerald-200';
                    resBanner.innerHTML = `🎉 Trúng Lớn! Nhận về +${totalWin.toLocaleString()} 🪙!`;
                } else {
                    resBanner.className = 'mb-3 p-3 rounded-2xl text-center font-black border shadow-lg text-sm sm:text-base bg-rose-900 border-rose-500 text-rose-200';
                    resBanner.innerHTML = `💸 Rất tiếc, không trúng cửa nào! Chúc bạn may mắn lần sau.`;
                }
            }

            if (btn) btn.disabled = false;
            updateUI();
            saveGame();
        }
    }, 80);
}
