/** Danh mục model: lưu ánh xạ asset tùy chỉnh và đường dẫn mặc định theo loại đối tượng. */
export class AssetRegistry {
  constructor() {
    this.entries = new Map();
  }

  register(id, entry) {
    if (!id || !entry || typeof entry !== 'object') throw new TypeError('AssetRegistry cần id và entry hợp lệ.');
    this.entries.set(id, { ...entry, id, updatedAt: Date.now() });
    return this.entries.get(id);
  }

  get(id) { return this.entries.get(id) || null; }
  remove(id) { return this.entries.delete(id); }
  list() { return [...this.entries.values()]; }
}
