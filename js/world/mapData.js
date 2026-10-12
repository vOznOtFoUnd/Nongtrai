/**
 * Bố cục bản đồ có thể chỉnh sửa. Hệ tọa độ Three.js: X trái/phải, Z trước/sau.
 * Mỗi path là hình chữ nhật đi được; các đoạn giao nhau tạo thành mạng đường.
 */
export const WORLD_MAP = {
  version: 1.4,
  // Bản đồ mới: chiều dài trục Z = 204 (4x), chiều rộng trục X = 153 (3x).
  bounds: { minX: -76.5, maxX: 76.5, minZ: -102, maxZ: 102 },
  zones: {
    mainFarm: { name: 'Nông trại chính', x: 0, z: 0, width: 18, depth: 18, type: 'farm', unlocked: true },
    village: { name: 'Khu làng', x: 0, z: -20.0, width: 8, depth: 4, type: 'village', unlocked: true },
    storage: { name: 'Nhà kho', x: -19, z: -18, width: 5.2, depth: 4.2, type: 'storage', unlocked: true },
    shop: { name: 'Cửa hàng', x: -20, z: 0.4, width: 3.4, depth: 3.0, type: 'shop', unlocked: true },
    forest: { name: 'Khu rừng', x: -20, z: -8.0, width: 4.2, depth: 5.0, type: 'forest', unlocked: true },
    fishingLake: { name: 'Khu câu cá', x: 20, z: 0.3, width: 5.2, depth: 4.6, type: 'water', unlocked: true },
    livestock: { name: 'Khu chăn nuôi', x: 19, z: 17, width: 5.5, depth: 4.4, type: 'livestock', unlocked: true },
    lotusPond: { name: 'Ao sen', x: -19, z: 17, width: 4.4, depth: 4.0, type: 'water', unlocked: true },
    windmill: { name: 'Cối xay gió', x: 19, z: -16, width: 2.1, depth: 2.1, type: 'decoration', unlocked: true },
    teleportGate: { name: 'Cổng dịch chuyển', x: 8, z: -20, width: 2.5, depth: 1.6, type: 'portal', unlocked: false },
    expansionIsland: { name: 'Đảo mở rộng', x: 0, z: 0, width: 0, depth: 0, type: 'expansion', unlocked: false }
  },
  // Đường bao quanh ruộng để không đè lên các ô trồng trọt; nhánh ngắn dẫn đến từng khu.
  paths: [
    { id: 'north-connector', x: 0, z: -14.2, width: 2.0, depth: 11.0 },
    { id: 'west-lane', x: -10.5, z: 0.0, width: 1.7, depth: 22.0 },
    { id: 'east-lane-north', x: 10.5, z: -6.25, width: 1.7, depth: 5.5 },
    { id: 'east-lane-south', x: 10.5, z: 6.25, width: 1.7, depth: 8.0 },
    { id: 'south-lane', x: 0.0, z: 10.5, width: 22.0, depth: 2.0 },
    { id: 'shop-approach', x: -15.0, z: 2.25, width: 10.0, depth: 1.45 },
    { id: 'forest-approach', x: -15.0, z: -7.0, width: 10.0, depth: 1.4 },
    { id: 'storage-approach', x: -15.0, z: -15.0, width: 10.0, depth: 1.5 },
    { id: 'portal-approach', x: 4.0, z: -15.0, width: 8.0, depth: 1.35 },
    { id: 'fishing-approach', x: 15.0, z: -0.2, width: 10.0, depth: 3.8 },
    { id: 'lotus-approach', x: -15.0, z: 12.5, width: 10.0, depth: 1.45 },
    { id: 'livestock-approach', x: 15.0, z: 12.5, width: 10.0, depth: 1.45 },
    { id: 'windmill-approach', x: 15.0, z: -13.0, width: 10.0, depth: 1.35 }
  ],
  // Trang trí môi trường khai báo riêng để có thể chỉnh tọa độ mà không sửa logic dựng cảnh.
  decorations: {
    flowerBeds: [
      { x: -14.0, z: 2.8, scale: 1.0 },
      { x: -13.7, z: 7.2, scale: 0.85 },
      { x: 13.5, z: 4.1, scale: 0.9 },
      { x: 13.5, z: 7.6, scale: 0.8 },
      { x: -4.8, z: 13.1, scale: 0.9 },
      { x: 4.8, z: 13.1, scale: 0.9 },
      { x: -4.6, z: -7.9, scale: 0.75 },
      { x: 4.6, z: -7.9, scale: 0.75 }
    ],
    rocks: [
      { x: -6.4, z: 12.7, scale: 0.85 },
      { x: 6.4, z: 12.7, scale: 0.85 },
      { x: -13.9, z: -8.5, scale: 0.8 },
      { x: 13.6, z: -5.0, scale: 0.8 }
    ],
    // Bụi cây và cỏ chỉ nằm sát mép bản đồ/khu trang trí, không đặt trên lối đi chính.
    bushes: [
      { x: -14.0, z: -1.8, scale: 0.9 }, { x: -13.8, z: 5.0, scale: 0.8 },
      { x: 13.8, z: 1.8, scale: 0.9 }, { x: 13.7, z: 9.0, scale: 0.75 },
      { x: -5.9, z: 13.8, scale: 0.8 }, { x: 5.9, z: 13.8, scale: 0.8 },
      { x: -14.0, z: -10.0, scale: 0.75 }, { x: 14.0, z: -12.4, scale: 0.7 }
    ],
    extraTrees: [
      { x: -61, z: -78, kind: 'pine', scale: 1.15 }, { x: -55, z: -84, kind: 'round', scale: 1.2 },
      { x: -47, z: -79, kind: 'fruit', scale: 1.05 }, { x: 48, z: -82, kind: 'pine', scale: 1.2 },
      { x: 58, z: -72, kind: 'round', scale: 1.0 }, { x: 64, z: -54, kind: 'fruit', scale: 1.1 },
      { x: -65, z: -42, kind: 'round', scale: 1.15 }, { x: -59, z: -31, kind: 'pine', scale: 1.1 },
      { x: 63, z: -24, kind: 'round', scale: 1.0 }, { x: 66, z: -8, kind: 'fruit', scale: 1.0 },
      { x: -64, z: 22, kind: 'pine', scale: 1.2 }, { x: -59, z: 36, kind: 'round', scale: 1.05 },
      { x: 61, z: 31, kind: 'fruit', scale: 1.1 }, { x: 65, z: 48, kind: 'pine', scale: 1.15 },
      { x: -63, z: 57, kind: 'round', scale: 1.2 }, { x: -54, z: 68, kind: 'fruit', scale: 1.05 },
      { x: 53, z: 70, kind: 'round', scale: 1.1 }, { x: 62, z: 82, kind: 'pine', scale: 1.2 },
      { x: -42, z: 84, kind: 'pine', scale: 1.0 }, { x: 37, z: 87, kind: 'fruit', scale: 1.0 }
    ],
    extraBushes: [
      { x: -54, z: -68, scale: 1.1 }, { x: -45, z: -65, scale: 0.9 }, { x: 48, z: -67, scale: 1.0 },
      { x: 57, z: -58, scale: 0.85 }, { x: -57, z: -18, scale: 1.0 }, { x: 57, z: 8, scale: 0.95 },
      { x: -55, z: 46, scale: 1.0 }, { x: 51, z: 54, scale: 0.9 }, { x: -42, z: 73, scale: 1.1 }, { x: 43, z: 75, scale: 1.0 }
    ],
    extraFlowerBeds: [
      { x: -43, z: -72, scale: 1.2 }, { x: 43, z: -73, scale: 1.0 }, { x: -49, z: -5, scale: 1.1 },
      { x: 49, z: 17, scale: 1.0 }, { x: -45, z: 58, scale: 1.15 }, { x: 42, z: 62, scale: 1.0 }
    ],
    grassTufts: [
      { x: -14.2, z: 0.0 }, { x: -14.1, z: 4.0 }, { x: -13.8, z: 9.0 },
      { x: 13.9, z: -2.7 }, { x: 13.8, z: 6.0 }, { x: 12.8, z: 13.8 },
      { x: -12.8, z: 13.8 }, { x: -7.0, z: -14.2 }, { x: 7.0, z: -14.2 }
    ]
  },
  spawn: { x: 0, z: 8 }
};
