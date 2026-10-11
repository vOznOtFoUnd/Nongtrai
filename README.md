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


## World Map v1.2 — hoàn thiện trang trí môi trường
- Bổ sung cụm hoa và đá trang trí ở mép khu vực; tọa độ nằm trong `WORLD_MAP.decorations` tại `js/world/mapData.js`.
- Bổ sung biển chỉ dẫn cho nhà kho, khu rừng, cối xay gió và cổng dịch chuyển.
- Vật trang trí mới không tạo collider và được đặt ngoài các lối đi chính để hạn chế ảnh hưởng điều khiển.
- Không thay đổi hệ thống lưu game, nhân vật, joystick, trồng trọt hoặc Asset Manager.


## World Map v1.3
- Bổ sung bụi cây nhiều lớp và các cụm cỏ thấp ở rìa bản đồ.
- Thêm hai đèn lồng tại quảng trường làng để tăng điểm nhận diện khu trung tâm.
- Tọa độ trang trí được khai báo trong `js/world/mapData.js`; các vật trang trí không thêm collider để không đổi cơ chế di chuyển.
- Tiếp tục dùng hình học Three.js tạo trực tiếp, không thêm thư viện hoặc tài nguyên tải ngoài.


## Farming Polish v1.5
- Sửa trường hợp cây bị héo rồi được tưới cứu: trạng thái cây chuyển lại `planted` và hình ảnh cây được dựng lại thay vì để ô đất trống.
- Giữ nguyên quy trình cuốc đất → trồng → tưới → chờ lớn → thu hoạch, dữ liệu save và các module khác.
- Không thêm thư viện hoặc thay đổi cân bằng giá/thời gian phát triển cây.


## Economy v1.6 — túi đồ, tiền xu và cửa hàng
- Thu hoạch giờ đưa nông sản vào `state.inventory.crops`; người chơi bán từng loại hoặc bán toàn bộ tại cửa hàng để đổi tiền.
- Cửa hàng tiếp tục bán gói 5 hạt giống; thao tác mua/bán cập nhật số dư, túi đồ và dữ liệu lưu game.
- Túi đồ hiển thị số hạt, số nông sản và giá trị bán tham khảo; thanh chọn hạt giống hiển thị lượng hạt hiện có.
- Mở rộng dữ liệu lưu game theo hướng tương thích ngược: save cũ chưa có `inventory.crops` sẽ khởi tạo kho nông sản rỗng, không xóa tiền, cấp độ, hạt giống hoặc ruộng đã lưu.
- Thay đổi gameplay có chủ đích: thu hoạch không cộng tiền ngay; cần bán nông sản tại cửa hàng. Giá bán và EXP từng loại cây giữ nguyên.


## v1.7 — Hồ cá và câu cá
- Thêm màn hình Hồ cá & câu cá: mua cá giống, cho ăn, thu hoạch cá nuôi và câu cá ngẫu nhiên.
- Cá trong túi được lưu cùng game và có thể bán ở Cửa hàng (45 xu/con); nút Bán tất cả bao gồm cả cá.
- Save cũ tự khởi tạo dữ liệu hồ cá và số cá trong túi ở mức 0.
- Chế độ offline tiếp tục được giữ; chưa triển khai multiplayer.


## Bản sửa camera và di chuyển v1.7.1
- Sửa vector phải theo hướng ngang camera để điều khiển trái/phải đúng chiều.
- Camera theo mượt theo vị trí X/Z và điểm nhìn cao hơn mặt đất (Y + 1.12), giúp nhân vật luôn dễ quan sát.
- Tắt pan của OrbitControls để tránh kéo lệch tâm bám; vẫn giữ xoay và zoom.
- Pha tự đi tới ô đất dùng vector thế giới trực tiếp, tránh bị chuyển đổi hướng theo camera lần thứ hai.
- Không triển khai multiplayer và không thay đổi các hệ thống gameplay không liên quan.


## NPC & Nhiệm vụ v1.8
- Thêm bác trưởng làng dạng chibi ở quảng trường với dấu nhiệm vụ nổi; nút 📜 mở bảng nhiệm vụ hiện có.
- Thêm ba nhiệm vụ lưu tiến độ: thu hoạch 5 cây, bán 3 nông sản và câu/thu hoạch 2 cá.
- Thưởng khi nhận: thu hoạch +150 xu/30 EXP; bán hàng +100 xu/20 EXP; cá +120 xu/25 EXP. Mỗi nhiệm vụ chỉ nhận thưởng một lần.
- Save cũ tương thích ngược; các nhiệm vụ mới bắt đầu từ 0 nếu chưa tồn tại trong dữ liệu lưu.
- Chế độ offline giữ nguyên; chưa triển khai multiplayer.


## v1.9 — Đối thoại NPC và giao hàng
- Bổ sung lời thoại của bác trưởng làng trong bảng nhiệm vụ.
- Thêm 3 đơn giao hàng: 3 lúa mì (90 xu + 15 EXP), 2 cà rốt (120 xu + 18 EXP), 2 cà chua (160 xu + 22 EXP).
- Nhận đơn trước khi giao; giao đủ số lượng sẽ trừ nông sản khỏi túi, trả thưởng và đánh dấu đơn hoàn tất.
- Trạng thái nhận/hoàn tất đơn được lưu; save cũ tự nhận danh sách đơn mặc định.
- Chưa triển khai multiplayer; giữ chế độ offline và các hệ thống khác.


## v1.9.1 — Mobile HUD & Fullscreen
- Nén thanh công cụ thành một hàng cuộn ngang để không che khuất thế giới 3D.
- Thu gọn bảng hạt giống và cho phép cuộn ngang danh sách hạt.
- Thêm nút ⛶ bật/tắt toàn màn hình qua Fullscreen API; nếu trình duyệt không hỗ trợ sẽ hiện thông báo.
- Không thay đổi logic gameplay, save game hoặc hệ thống điều khiển.


## v1.9.2 — World layout & farming feedback
- Mở rộng ranh giới bản đồ và dời các khu vực dịch vụ ra khỏi vùng ruộng trung tâm.
- Dời biển chỉ dẫn sang cạnh lối vào khu vực.
- Bổ sung biểu tượng giọt nước cho cây con chưa tưới.
- Cải thiện thông báo khi thao tác và nêu tên loại vật cản gần nhất.
