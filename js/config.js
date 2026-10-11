export const CONFIG = {
  camera: { fov: 50, near: 0.1, far: 200, position: [18, 18, 18], minDistance: 8, maxDistance: 50, maxPolarAngle: Math.PI / 2.2 },
  renderer: { antialias: true, shadowMapSize: 1024, toneMappingExposure: 1.1 },
  world: { groundSize: 80, fogNear: 50, fogFar: 110, dayLength: 3600 }, // 1 ngày = 3600 giây (1 giờ)
  farm: { gridSize: 9, plotSize: 2.0 },
  start: { money: 500, harvested: 0, day: 1, level: 1, exp: 0 },
  assetsPath: {
    glb: 'assets/models/glb/',
    obj: 'assets/models/obj/',
    fbx: 'assets/models/fbx/',
    player: 'assets/models/player/',
    npc: 'assets/models/npc/'
  }
};

export const CROPS = {
  wheat:   { id: 'wheat',   name: 'Lúa mì',  emoji: '🌾', cost: 15, sell: 35,  growTime: 25, color: 0xf4d03f, stages: 4, exp: 10, modelName: 'wheat', format: 'glb' },
  carrot:  { id: 'carrot',  name: 'Cà rốt',  emoji: '🥕', cost: 20, sell: 50,  growTime: 35, color: 0xe67e22, stages: 4, exp: 15, modelName: 'carrot', format: 'glb' },
  tomato:  { id: 'tomato',  name: 'Cà chua', emoji: '🍅', cost: 30, sell: 80,  growTime: 45, color: 0xe74c3c, stages: 5, exp: 25, modelName: 'tomato', format: 'glb' },
  pumpkin: { id: 'pumpkin', name: 'Bí ngô',  emoji: '🎃', cost: 50, sell: 140, growTime: 60, color: 0xf39c12, stages: 5, exp: 40, modelName: 'pumpkin', format: 'glb' },
};

export function getPlotUnlockRequirement(row, col) {
  if (row === 0) return { unlocked: true, level: 1, cost: 0 };
  const requiredLevel = row * 10 + 1;
  const basePrice = (row + 1) * 1000 + 100;
  const cost = basePrice + col * 100;
  return { unlocked: false, level: requiredLevel, cost };
}