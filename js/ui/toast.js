// Hệ thống hiển thị thông báo Toast
function showToast(title, message, icon = '✨', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Xóa ngay lập tức các toast cũ đang tồn tại để không bị cộng dồn che màn hình
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-item glass-panel p-3 rounded-2xl flex items-center gap-3 shadow-2xl border border-amber-300/80 bg-white/95 text-slate-800';
    toast.innerHTML = `
        <div class="text-2xl bg-amber-100 p-2 rounded-xl flex items-center justify-center">${icon}</div>
        <div class="flex-1 pr-1">
            <div class="font-extrabold text-xs text-slate-800">${title}</div>
            <div class="text-[11px] text-slate-600 font-medium">${message}</div>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
