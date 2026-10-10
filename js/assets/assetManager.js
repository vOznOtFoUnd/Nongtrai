/*
 * Nongtrai-main UPGRADE 31 — Asset Manager (Phase 1)
 * Safe infrastructure only: current procedural models remain the active fallback.
 * GLB loading is opt-in per catalog entry and only runs after a local asset is verified.
 */
(function (global) {
    'use strict';

    const cache = new Map();
    const pending = new Map();
    const warned = new Set();

    function catalog() { return global.FarmAssetCatalog || null; }
    function getDefinition(id) { const c = catalog(); return c ? c.get(id) : null; }

    function cloneModel(model) {
        if (!model || typeof model.clone !== 'function') return null;
        return model.clone(true);
    }

    function loaderAvailable() {
        return typeof global.THREE !== 'undefined' && typeof global.THREE.GLTFLoader === 'function';
    }

    function warnOnce(key, message) {
        if (warned.has(key)) return;
        warned.add(key);
        if (global.console && typeof global.console.warn === 'function') global.console.warn('[FarmAssetManager] ' + message);
    }

    function loadModel(id) {
        const def = getDefinition(id);
        if (!def || def.status !== 'ready' || !def.path) return Promise.resolve(null);
        if (cache.has(id)) return Promise.resolve(cloneModel(cache.get(id)));
        if (pending.has(id)) return pending.get(id).then(cloneModel);
        if (!loaderAvailable()) {
            warnOnce('no-gltf-loader', 'GLTFLoader chưa được nạp; tiếp tục dùng model dự phòng hiện tại.');
            return Promise.resolve(null);
        }

        const promise = new Promise(function (resolve) {
            try {
                const loader = new global.THREE.GLTFLoader();
                const url = new URL(def.path, document.baseURI).href;
                loader.load(url, function (gltf) {
                    const model = gltf && gltf.scene;
                    if (!model) { resolve(null); return; }
                    model.traverse(function (node) {
                        if (node && node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });
                    cache.set(id, model);
                    resolve(model);
                }, undefined, function (error) {
                    warnOnce('load-' + id, 'Không tải được asset ' + id + '; dùng model dự phòng.');
                    resolve(null);
                });
            } catch (error) {
                warnOnce('exception-' + id, 'Lỗi tải asset ' + id + '; dùng model dự phòng.');
                resolve(null);
            }
        }).finally(function () { pending.delete(id); });
        pending.set(id, promise);
        return promise.then(cloneModel);
    }

    function applyTransform(model, id) {
        const def = getDefinition(id);
        if (!model || !def) return model;
        const scale = Number(def.scale);
        if (Number.isFinite(scale) && scale > 0) model.scale.setScalar(scale);
        const yOffset = Number(def.yOffset);
        if (Number.isFinite(yOffset)) model.position.y += yOffset;
        return model;
    }

    function createInstance(id, fallbackFactory) {
        // Synchronous by design: existing game builders can keep their current return types.
        // Phase 1 deliberately does not swap live models; later phases can opt into async loading.
        if (typeof fallbackFactory === 'function') return fallbackFactory();
        return null;
    }

    function clearCache() {
        cache.forEach(function (model) {
            if (!model || typeof model.traverse !== 'function') return;
            model.traverse(function (node) {
                if (!node || !node.isMesh) return;
                if (node.geometry && typeof node.geometry.dispose === 'function') node.geometry.dispose();
                const materials = Array.isArray(node.material) ? node.material : [node.material];
                materials.forEach(function (material) {
                    if (material && typeof material.dispose === 'function') material.dispose();
                });
            });
        });
        cache.clear();
        pending.clear();
    }

    function selfTest() {
        const c = catalog();
        const errors = [];
        if (!c) return { ok: false, total: 0, errors: ['FarmAssetCatalog chưa được nạp'] };
        c.list().forEach(function (item) {
            if (!item.id || !item.definition || !item.definition.category || !item.definition.path) errors.push('Entry không hợp lệ: ' + (item.id || '(không ID)'));
            if (item.definition.status !== 'planned' && item.definition.status !== 'ready') errors.push('Status không hợp lệ: ' + item.id);
            if (item.definition.status === 'ready' && !item.definition.path) errors.push('Asset ready thiếu path: ' + item.id);
        });
        return { ok: errors.length === 0, total: c.list().length, errors: errors };
    }

    global.FarmAssetManager = Object.freeze({
        getDefinition: getDefinition,
        list: function (category) { const c = catalog(); return c ? c.list(category) : []; },
        loadModel: loadModel,
        applyTransform: applyTransform,
        createInstance: createInstance,
        clearCache: clearCache,
        selfTest: selfTest,
        getStatus: function () {
            return { catalogEntries: catalog() ? catalog().list().length : 0, cachedModels: cache.size, pendingLoads: pending.size, gltfLoaderAvailable: loaderAvailable() };
        }
    });
})(window);
