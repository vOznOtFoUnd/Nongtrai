# Farmnhamnhi — Modular Step 1

## Mục tiêu bản này
- Chuyển các module hiện có vào thư mục theo trách nhiệm mà không chủ động viết lại gameplay.
- Thêm nền tảng Asset Manager: `AssetManager`, `AssetRegistry`, `AssetNormalizer`, `AssetFallback`.
- Hỗ trợ API tải GLB/GLTF, FBX và OBJ; bước này chưa có màn hình upload/preview và chưa thay model Player đang dùng trong gameplay.
- Model dựng sẵn của game vẫn được sử dụng như trước, nên chưa có asset tùy chỉnh cũng không ảnh hưởng việc khởi tạo game.

## Cấu trúc
- `js/core/`: cấu hình và nền tảng game.
- `js/data/`: trạng thái/save hiện tại.
- `js/world/`: scene, công trình và môi trường.
- `js/player/`: Player và input.
- `js/farming/`: ô đất/cây trồng.
- `js/systems/`: thời gian và thời tiết.
- `js/ui/`: giao diện.
- `js/assets/`: quản lý tài nguyên 3D.
- `assets/models/`: vị trí tổ chức model mặc định và model được đóng gói trong dự án.

## Asset Manager API (nền tảng)
```js
const result = await window.farmAssetManager.loadFromFile(file, {
  id: 'player.custom',
  targetHeight: 2
});
scene.add(result.object);
```

Dùng `loadWithFallback({ id, file, fallbackFactory })` để có model dự phòng khi tải lỗi. Không nên thêm model tùy chỉnh vào gameplay trực tiếp trước khi kiểm tra tỷ lệ, hướng nhìn, vật liệu và collider.

## Lộ trình tiếp theo
1. Bước 2: giao diện upload + preview GLB/GLTF, áp dụng cho Player và nút khôi phục mặc định.
2. Bước 3: nhập FBX/OBJ kèm texture/MTL và kiểm tra hoạt ảnh.
3. Bước 4: mở rộng cho NPC, cây, cây trồng, công trình và vật thể.
4. Bước 5: lưu model tùy chỉnh bằng IndexedDB và quản lý danh mục asset.

## Chạy và triển khai
Mở qua HTTPS/GitHub Pages hoặc máy chủ HTTP. Mở `index.html` trực tiếp bằng `file://` có thể bị trình duyệt chặn ES Modules/CDN.

## Bản đồ thế giới dạng mô-đun

Bố cục bản đồ nền được khai báo tại `js/world/mapData.js`. Tọa độ khu vực, kích thước, điểm xuất hiện và các đoạn đường có thể chỉnh tại file này mà không cần sửa trực tiếp logic trồng trọt, túi đồ hay nhiệm vụ. `js/world/scene.js` đọc dữ liệu đó để dựng đường, quảng trường làng, hồ, cửa hàng, khu chăn nuôi, cụm rừng và cổng dịch chuyển.

Bản đồ hiện tại là **bước nền tảng**: một số khu như cổng dịch chuyển mới là mô hình trực quan, chưa có logic mở khóa/dịch chuyển; khu chăn nuôi chưa có hệ thống vật nuôi; ao cá chưa có gameplay câu cá. Những hệ thống đó sẽ được tích hợp riêng ở các bước sau để không làm lẫn dữ liệu bản đồ với dữ liệu người chơi.


## World Map Foundation v1.1 — đường đi và lối vào
- Các làn chính chạy quanh mép khu ruộng thay vì đè lên phần lớn ô trồng trọt.
- Thêm nhánh đường tới cửa hàng, rừng, nhà kho, cổng dịch chuyển, hồ câu cá, ao sen, khu chăn nuôi và cối xay gió.
- Cửa chuồng chăn nuôi chuyển sang cạnh phía tây, hướng về lối tiếp cận; vùng va chạm được chia theo các đoạn hàng rào để chừa cửa thật sự đi qua được.
- Bố cục được khai báo tại `js/world/mapData.js`; chỉnh `paths` để đổi đường mà không phải sửa logic gameplay.
