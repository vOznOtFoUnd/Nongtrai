// Hệ thống hiển thị thông báo Toast
function showToast(title, message, icon = '✨', duration = 3000) {
    if (typeof playUiSound === 'function') playUiSound('tap');
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Xóa ngay lập tức các toast cũ đang tồn tại để không bị cộng dồn che màn hình
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-item p-2 rounded-[14px] flex items-center gap-2 shadow-lg border border-pink-200 bg-[#fffaf2]/95 text-slate-700';
    toast.innerHTML = `
        <div class="text-lg bg-[#e4f8ec] p-1.5 rounded-xl border border-[#c5edd7] flex items-center justify-center">${icon}</div>
        <div class="flex-1 pr-1">
            <div class="font-extrabold text-[11px] leading-tight text-slate-800">${title}</div>
            <div class="text-[10px] leading-tight text-slate-600 font-medium">${message}</div>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
