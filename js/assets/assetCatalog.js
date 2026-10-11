/*
 * Nongtrai-main UPGRADE 31 — Asset Catalog (Phase 1)
 * Asset entries are planned until a verified local GLB is added and status is set to "ready".
 * Keep these IDs stable; save-game data must never depend on filenames or model objects.
 */
(function (global) {
    'use strict';

    const entries = {
        'animal.chicken': { category: 'animals', path: 'assets/models/animals/chicken.glb', status: 'planned', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'animal.cow': { category: 'animals', path: 'assets/models/animals/cow.glb', status: 'planned', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'animal.pig': { category: 'animals', path: 'assets/models/animals/pig.glb', status: 'planned', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'animal.duck': { category: 'animals', path: 'assets/models/animals/duck.glb', status: 'planned', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'animal.fish': { category: 'animals', path: 'assets/models/animals/fish.glb', status: 'planned', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'animal.horse': { category: 'animals', path: 'assets/models/animals/horse.glb', status: 'planned', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'crop.generic': { category: 'crops', path: 'assets/models/crops/crop-generic.glb', status: 'planned', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'crop.rice': { category: 'crops', path: 'assets/models/crops/rice.glb', status: 'ready', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'crop.corn': { category: 'crops', path: 'assets/models/crops/corn.glb', status: 'ready', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'crop.tomato': { category: 'crops', path: 'assets/models/crops/tomato.glb', status: 'ready', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'crop.pumpkin': { category: 'crops', path: 'assets/models/crops/pumpkin.glb', status: 'ready', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'crop.watermelon': { category: 'crops', path: 'assets/models/crops/watermelon.glb', status: 'ready', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'crop.strawberry': { category: 'crops', path: 'assets/models/crops/strawberry.glb', status: 'ready', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'crop.potato': { category: 'crops', path: 'assets/models/crops/potato.glb', status: 'ready', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'crop.carrot': { category: 'crops', path: 'assets/models/crops/carrot.glb', status: 'ready', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'crop.eggplant': { category: 'crops', path: 'assets/models/crops/eggplant.glb', status: 'ready', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'crop.chili': { category: 'crops', path: 'assets/models/crops/chili.glb', status: 'ready', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'crop.pineapple': { category: 'crops', path: 'assets/models/crops/pineapple.glb', status: 'ready', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'tree.apple': { category: 'trees', path: 'assets/models/trees/apple-tree.glb', status: 'planned', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'tree.orange': { category: 'trees', path: 'assets/models/trees/orange-tree.glb', status: 'planned', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'tree.peach': { category: 'trees', path: 'assets/models/trees/peach-tree.glb', status: 'planned', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'building.barn': { category: 'buildings', path: 'assets/models/buildings/barn.glb', status: 'planned', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'building.shop': { category: 'buildings', path: 'assets/models/buildings/shop.glb', status: 'planned', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'character.player': { category: 'characters', path: 'assets/models/characters/farmer.glb', status: 'planned', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] },
        'environment.tree': { category: 'environment', path: 'assets/models/environment/decorative-tree.glb', status: 'planned', fallback: 'procedural', scale: 1, yOffset: 0, animations: [] }
    };

    global.FarmAssetCatalog = Object.freeze({
        version: 1,
        entries: Object.freeze(entries),
        get: function (id) { return entries[id] || null; },
        list: function (category) {
            return Object.keys(entries).filter(function (id) { return !category || entries[id].category === category; })
                .map(function (id) { return { id: id, definition: entries[id] }; });
        }
    });
})(window);
