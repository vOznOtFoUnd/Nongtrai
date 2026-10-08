let bauCuaBets = { bau: 0, cua: 0, tom: 0, ca: 0, ga: 0, nai: 0 };

// Mở modal Bầu Cua
function openBauCuaModal() {
    openModal('modal-bau-cua');
}

// Đặt cược vào các cửa (mỗi lần click +100🪙)
function addBauCuaBet(type) {
    if (!bauCuaBets[type] && bauCuaBets[type] !== 0) return;

    const betStep = 100;
    if ((gameState.gold || 0) < betStep) {
        showToast("Thiếu Vàng! 🪙", "Bạn cần ít nhất 100 Vàng để cược!", "❌");
        return;
    }

    gameState.gold -= betStep;
    bauCuaBets[type] += betStep;
    const betEl = document.getElementById('bet-val-' + type);
    if (betEl) betEl.innerText = `${bauCuaBets[type].toLocaleString()}đ`;
    updateUI();
}

// Đặt lại các cược (Hoàn trả tiền về ví)
function clearBauCuaBets() {
    let totalRefund = 0;
    Object.keys(bauCuaBets).forEach(k => {
        totalRefund += bauCuaBets[k];
        bauCuaBets[k] = 0;
        const betEl = document.getElementById('bet-val-' + k);
        if (betEl) betEl.innerText = '0đ';
    });

    if (totalRefund > 0) {
        gameState.gold += totalRefund;
    }

    updateUI();
}

// Xóc đĩa Bầu Cua chuẩn xác suất ngẫu nhiên
function rollBauCua() {
    const totalBet = Object.values(bauCuaBets).reduce((a, b) => a + b, 0);
    if (totalBet <= 0) {
        showToast("Chưa Đặt Cược! 🎲", "Hãy chọn ô cửa đặt cược trước!", "❌");
        return;
    }

    const btn = document.getElementById('btn-roll-baucua');
    if (btn) btn.disabled = true;

    const resBanner = document.getElementById('baucua-result');
    if (resBanner) {
        resBanner.classList.add('hidden');
        resBanner.innerHTML = '';
    }

    const icons = ['🪷', '🦀', '🦐', '🐟', '🐓', '🦌'];
    const keys = ['bau', 'cua', 'tom', 'ca', 'ga', 'nai'];

    let rolls = 0;
    const diceContainer = document.getElementById('dice-container');

    const finalIndices = [
        Math.floor(Math.random() * 6),
        Math.floor(Math.random() * 6),
        Math.floor(Math.random() * 6)
    ];

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

            if (diceContainer && diceContainer.children.length >= 3) {
                diceContainer.children[0].innerText = icons[finalIndices[0]];
                diceContainer.children[1].innerText = icons[finalIndices[1]];
                diceContainer.children[2].innerText = icons[finalIndices[2]];
            }

            const results = [keys[finalIndices[0]], keys[finalIndices[1]], keys[finalIndices[2]]];
            let totalReturn = 0;

            Object.keys(bauCuaBets).forEach(k => {
                const betAmount = bauCuaBets[k];
                if (betAmount > 0) {
                    const matchCount = results.filter(r => r === k).length;
                    if (matchCount > 0) {
                        totalReturn += betAmount + (betAmount * matchCount);
                    }
                    bauCuaBets[k] = 0;
                    const betEl = document.getElementById('bet-val-' + k);
                    if (betEl) betEl.innerText = '0đ';
                }
            });

            gameState.gold += totalReturn;

            if (resBanner) {
                resBanner.classList.remove('hidden');
                const netProfit = totalReturn - totalBet;

                if (netProfit > 0) {
                    resBanner.className = 'mb-3 p-3 rounded-2xl text-center font-black border shadow-lg text-sm sm:text-base bg-emerald-900 border-emerald-500 text-emerald-200';
                    resBanner.innerHTML = `🎉 Trúng Lớn! Nhận lại ${totalReturn.toLocaleString()} 🪙 (Lời +${netProfit.toLocaleString()} 🪙)!`;
                } else if (netProfit === 0) {
                    resBanner.className = 'mb-3 p-3 rounded-2xl text-center font-black border shadow-lg text-sm sm:text-base bg-amber-900 border-amber-500 text-amber-200';
                    resBanner.innerHTML = `⚖️ Hòa Tiền! Nhận lại ${totalReturn.toLocaleString()} 🪙 vốn cược.`;
                } else {
                    resBanner.className = 'mb-3 p-3 rounded-2xl text-center font-black border shadow-lg text-sm sm:text-base bg-rose-900 border-rose-500 text-rose-200';
                    resBanner.innerHTML = `💸 Rất tiếc! Bạn thua ${Math.abs(netProfit).toLocaleString()} 🪙. Chúc may mắn lần sau!`;
                }
            }

            if (btn) btn.disabled = false;
            updateUI();
            saveGame();
        }
    }, 80);
}
