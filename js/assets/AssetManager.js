import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { AssetRegistry } from './AssetRegistry.js';
import { AssetFallback } from './AssetFallback.js';
import { AssetNormalizer } from './AssetNormalizer.js';

const ACCEPTED_EXTENSIONS = new Set(['glb', 'gltf', 'fbx', 'obj']);
const PREVIEW_EXTENSIONS = new Set(['glb', 'gltf']);

/**
 * Bước 1 của Asset Manager: đăng ký, tải và chuẩn hóa model 3D.
 * Chưa tự thay model gameplay; hệ thống hiện tại tiếp tục dùng model mặc định.
 */
export class AssetManager {
  constructor({ registry = new AssetRegistry(), onError = null, onProgress = null } = {}) {
    this.registry = registry;
    this.onProgress = onProgress;
    this.fallback = new AssetFallback({ onWarning: ({ id, error }) => onError?.({ id, error }) });
    this.loaders = { glb: new GLTFLoader(), gltf: new GLTFLoader(), fbx: new FBXLoader(), obj: new OBJLoader() };
    this.objectUrls = new Set();
    this.disposed = false;
  }

  getSupportedExtensions() { return [...ACCEPTED_EXTENSIONS]; }
  getPreviewExtensions() { return [...PREVIEW_EXTENSIONS]; }

  async loadFromFile(file, options = {}) {
    if (this.disposed) throw new Error('AssetManager đã được dispose.');
    if (!(file instanceof Blob)) throw new TypeError('Tệp model không hợp lệ.');
    const extension = (file.name || '').split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.has(extension)) throw new Error(`Định dạng .${extension || '?'} chưa được hỗ trợ.`);
    const url = URL.createObjectURL(file);
    this.objectUrls.add(url);
    try {
      const result = await this._loadUrl(url, extension, options);
      const id = options.id || file.name;
      this.registry.register(id, { source: 'upload', fileName: file.name, extension, object: result.object, animations: result.animations || [] });
      return { ...result, id, fileName: file.name, extension, objectUrl: url };
    } catch (error) {
      URL.revokeObjectURL(url); this.objectUrls.delete(url);
      throw error;
    }
  }

  async loadFromUrl(url, options = {}) {
    const extension = (options.extension || url.split(/[?#]/)[0].split('.').pop() || '').toLowerCase();
    if (!ACCEPTED_EXTENSIONS.has(extension)) throw new Error(`Định dạng .${extension} chưa được hỗ trợ.`);
    const result = await this._loadUrl(url, extension, options);
    const id = options.id || url;
    this.registry.register(id, { source: 'url', url, extension, object: result.object, animations: result.animations || [] });
    return { ...result, id, extension };
  }

  async _loadUrl(url, extension, options) {
    const loader = this.loaders[extension];
    const onProgress = event => {
      if (event.lengthComputable) this.onProgress?.({ loaded: event.loaded, total: event.total, ratio: event.loaded / event.total, url });
    };
    let object, animations = [];
    if (extension === 'glb' || extension === 'gltf') {
      const gltf = await loader.loadAsync(url, onProgress);
      object = gltf.scene || gltf.scenes?.[0]; animations = gltf.animations || [];
      if (!object) throw new Error('Tệp glTF không có scene để hiển thị.');
    } else {
      object = await loader.loadAsync(url, onProgress);
      if (extension === 'fbx') animations = object.animations || [];
    }
    AssetNormalizer.normalize(object, {
      targetHeight: Number.isFinite(options.targetHeight) ? options.targetHeight : 2,
      centerXZ: options.centerXZ !== false,
      groundToZero: options.groundToZero !== false
    });
    return { object, animations };
  }

  /** Thử tải asset tùy chỉnh; nếu lỗi, trả về model do game cung cấp. */
  async loadWithFallback({ id, fallbackFactory, context, ...loadOptions }) {
    try {
      const result = loadOptions.file
        ? await this.loadFromFile(loadOptions.file, { ...loadOptions, id })
        : await this.loadFromUrl(loadOptions.url, { ...loadOptions, id });
      return { ...result, usedFallback: false };
    } catch (error) {
      const fallback = this.fallback.resolve({ id, error, fallbackFactory, context });
      return { object: fallback, animations: [], id, usedFallback: true, error };
    }
  }

  dispose() {
    this.disposed = true;
    for (const url of this.objectUrls) URL.revokeObjectURL(url);
    this.objectUrls.clear();
  }
}
