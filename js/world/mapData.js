/**
 * Bố cục bản đồ có thể chỉnh sửa. Hệ tọa độ Three.js: X trái/phải, Z trước/sau.
 * Mỗi path là hình chữ nhật đi được; các đoạn giao nhau tạo thành mạng đường.
 */
export const WORLD_MAP = {
  version: 1.3,
  bounds: { minX: -15.45, maxX: 15.45, minZ: -15.45, maxZ: 15.45 },
  zones: {
    mainFarm: { name: 'Nông trại chính', x: 0, z: 0, width: 18, depth: 18, type: 'farm', unlocked: true },
    village: { name: 'Khu làng', x: 0, z: -12.8, width: 8, depth: 4, type: 'village', unlocked: true },
    storage: { name: 'Nhà kho', x: -12, z: -12, width: 5.2, depth: 4.2, type: 'storage', unlocked: true },
    shop: { name: 'Cửa hàng', x: -11.2, z: 0.4, width: 3.4, depth: 3.0, type: 'shop', unlocked: true },
    forest: { name: 'Khu rừng', x: -12.2, z: -5.7, width: 4.2, depth: 5.0, type: 'forest', unlocked: true },
    fishingLake: { name: 'Khu câu cá', x: 10.5, z: 0.3, width: 5.2, depth: 4.6, type: 'water', unlocked: true },
    livestock: { name: 'Khu chăn nuôi', x: 10.6, z: 10.2, width: 5.5, depth: 4.4, type: 'livestock', unlocked: true },
    lotusPond: { name: 'Ao sen', x: -10.7, z: 10.2, width: 4.4, depth: 4.0, type: 'water', unlocked: true },
    windmill: { name: 'Cối xay gió', x: 10.8, z: -9.5, width: 2.1, depth: 2.1, type: 'decoration', unlocked: true },
    teleportGate: { name: 'Cổng dịch chuyển', x: 5.4, z: -13.1, width: 2.5, depth: 1.6, type: 'portal', unlocked: false },
    expansionIsland: { name: 'Đảo mở rộng', x: 0, z: 0, width: 0, depth: 0, type: 'expansion', unlocked: false }
  },
  // Đường bao quanh ruộng để không đè lên các ô trồng trọt; nhánh ngắn dẫn đến từng khu.
  paths: [
    { id: 'north-connector', x: 0, z: -11.1, width: 2.0, depth: 7.0 },
    { id: 'west-lane', x: -9.75, z: 0.0, width: 1.7, depth: 18.2 },
    { id: 'east-lane-north', x: 9.65, z: -6.25, width: 1.7, depth: 5.5 },
    { id: 'east-lane-south', x: 9.65, z: 6.25, width: 1.7, depth: 6.0 },
    { id: 'south-lane', x: 0.0, z: 10.0, width: 19.6, depth: 2.0 },
    { id: 'shop-approach', x: -7.25, z: 2.25, width: 5.2, depth: 1.45 },
    { id: 'forest-approach', x: -8.65, z: -5.8, width: 2.7, depth: 1.4 },
    { id: 'storage-approach', x: -10.5, z: -9.0, width: 5.5, depth: 1.5 },
    { id: 'portal-approach', x: 3.15, z: -13.0, width: 4.5, depth: 1.35 },
    { id: 'fishing-approach', x: 7.65, z: -0.2, width: 1.55, depth: 3.8 },
    { id: 'lotus-approach', x: -7.4, z: 8.9, width: 2.0, depth: 1.45 },
    { id: 'livestock-approach', x: 8.25, z: 9.9, width: 3.1, depth: 1.45 },
    { id: 'windmill-approach', x: 7.65, z: -9.1, width: 4.1, depth: 1.35 }
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
    grassTufts: [
      { x: -14.2, z: 0.0 }, { x: -14.1, z: 4.0 }, { x: -13.8, z: 9.0 },
      { x: 13.9, z: -2.7 }, { x: 13.8, z: 6.0 }, { x: 12.8, z: 13.8 },
      { x: -12.8, z: 13.8 }, { x: -7.0, z: -14.2 }, { x: 7.0, z: -14.2 }
    ]
  },
  spawn: { x: 0, z: 8 }
};
