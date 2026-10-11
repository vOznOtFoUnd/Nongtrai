/** Chạy fallback do hệ thống gameplay cung cấp; asset lỗi không được làm dừng game. */
export class AssetFallback {
  constructor({ onWarning = null } = {}) { this.onWarning = onWarning; }

  resolve({ id, error, fallbackFactory, context } = {}) {
    if (error) console.warn(`[AssetFallback] Không tải được "${id || 'unknown'}"; dùng model mặc định.`, error);
    this.onWarning?.({ id, error, context });
    if (typeof fallbackFactory === 'function') return fallbackFactory(context);
    return null;
  }
}
