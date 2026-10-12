## v1.10.10 — Câu cá biển, lò rèn, hoa, chăm sóc vật nuôi và thú cưng

- Thêm hoa hướng dương, hoa hồng, hoa tulip với mô hình procedural.
- Sâu bệnh có xác suất xuất hiện ở ô cây đang sinh trưởng; dùng công cụ 🐛 Bắt sâu để thu sâu, làm mồi câu; sâu bệnh làm chậm sinh trưởng.
- Thêm các biển báo vị trí câu cá trên bãi biển, cần câu chế tạo/sửa chữa/nâng cấp tại lò rèn, mồi sâu và độ bền cần câu.
- Thức ăn và thuốc thú y mua tại cửa hàng; đàn vật nuôi có thể mắc bệnh, được chữa bằng thuốc; sản phẩm cần thu hoạch 10 lần mỗi loài mới mở khóa bán vật nuôi.
- Thêm chó/mèo low-poly đi theo nhân vật, có thể chọn thú cưng đồng hành.
- Save cũ được khởi tạo dữ liệu mới mà không xóa tiền, cấp độ, cây trồng hay vật nuôi đã lưu.
- Kiểm tra mã nguồn: cú pháp module, script inline, migration/save state và ZIP. Chưa kiểm tra trực quan trên Chrome Android.

## v1.10.9 — Bến tàu và sinh vật biển
- Thêm bến gỗ trên bãi biển phía đông, có cọc neo và thuyền buồm nhỏ neo cạnh bến.
- Thuyền nhấp nhô nhẹ theo mặt nước.
- Thêm cua, sao biển và ốc biển rải dọc bãi cát.
- Thêm cá voi, cá heo và cá mập dạng mô hình low-poly tự dựng, bơi theo quỹ đạo ngoài khơi.
- Thêm vùng va chạm cho mặt bến để hạn chế nhân vật xuyên qua sàn bến.
- Sinh vật biển hiện là sinh vật môi trường trang trí; chưa có tương tác bắt/cho ăn hoặc AI né người chơi.

## v1.10.8 — Đảo biệt lập và bãi biển vòng quanh
- Biển xanh bao quanh toàn bộ bản đồ.
- Dải cát rộng khoảng 9 đơn vị chạy liên tục quanh đảo.
- Thêm bọt sóng, vỏ sò/sỏi; bỏ hàng rào ngoài đảo và giữ ranh giới va chạm.

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

## World Builder (v1.10.1)

- Bấm **🛠️ Xây dựng** để bật/tắt chế độ chỉnh bố cục; khi bật, thao tác chạm không kích hoạt gameplay trồng trọt.
- Chạm một vật thể để chọn, kéo để di chuyển; bảng công cụ hỗ trợ di chuyển theo bước, xoay 15°, đổi tỷ lệ, lưới, hoàn tác và khôi phục bố cục mặc định.
- Bố cục tự lưu vào `localStorage` của trình duyệt và có thể xuất/nhập file JSON.
- Bản đồ lưu vị trí, góc xoay và tỷ lệ theo ID vật thể được sinh theo thứ tự dựng cảnh của phiên bản này. Khi cấu trúc dựng cảnh thay đổi lớn giữa các phiên bản, hãy xuất JSON dự phòng trước khi nâng cấp.
- Đây là nền tảng World Builder đầu tiên. Va chạm tĩnh được dịch chuyển theo các hộp va chạm gần vật thể được kéo; những nhóm trang trí không có dữ liệu va chạm riêng có thể cần tinh chỉnh thủ công. Chưa kiểm thử trực quan trên Chrome Android.


## v1.10.2 — World Builder object catalog

- Added an in-editor object list with labels and coordinates/rotation/scale readout.
- Added builder props: tree, rock, fence segment, sign, flower cluster, small shed, decorative pond, and decorative field tile.
- Builder-created props can be duplicated and deleted; delete can be undone.
- Original scene objects and gameplay plot objects are protected from deletion/duplication to avoid breaking quest, crop, fish, or save state.
- Builder-created props are stored in the existing local layout and JSON export/import format. These decorative props do not automatically gain gameplay logic or collision definitions.

## v1.10.3 — Nhóm khu vực và cảnh báo va chạm

- Có thể chọn nhiều mục trong danh sách World Builder rồi gom thành nhóm logic; kéo hoặc dùng các nút di chuyển trên một thành viên sẽ dời cả nhóm theo cùng độ lệch.
- Hỗ trợ chọn nhanh toàn bộ nhóm, bỏ nhóm và lưu/khôi phục mã nhóm qua localStorage hoặc JSON.
- Hoàn tác lưu trạng thái vị trí của cả nhóm như một thao tác; đồng thời sửa hoàn tác xóa để đưa vật thể đã xóa trở lại cảnh.
- Thêm cảnh báo khi vật thể được đặt gần/chồng lên vật thể khác. Đây là cảnh báo hỗ trợ chỉnh tay, không tự chặn vị trí hoặc tự tạo collider mới; các collider tĩnh chỉ được dịch chuyển theo cơ chế hiện có.
- Không thay đổi hệ thống ruộng/cây trồng, hồ cá, nhiệm vụ, túi đồ, tiền xu hoặc multiplayer.


## v1.10.4 — Bản đồ mở rộng và xây nhiều công trình
- Bản đồ hình chữ nhật: rộng trục X 153 đơn vị (3 lần bản 51), dài trục Z 204 đơn vị (4 lần bản 51). Mặt đất, hàng rào biên, giới hạn di chuyển, tầm camera và sương mù được cập nhật tương ứng.
- World Builder có loại công trình Nhà ở và Nhà kho lớn; có thể chọn số lượng 1–40 để đặt nhiều công trình cùng lúc. Nhà kho nhỏ vẫn có sẵn.
- Các công trình được lưu/nhập/xuất qua bố cục JSON và có thể di chuyển, nhóm, nhân bản hoặc xóa như vật thể World Builder khác. Đây là mô hình trang trí, chưa tạo kho đồ/inventory riêng hoặc hệ thống nội thất.


## v1.10.5 — Công trình nghề nghiệp & hệ sinh thái mở rộng

- World Builder bổ sung mô hình lò rèn, bếp nấu ăn và bãi biển mini.
- Bổ sung vật thể cây dừa, cây thông, cây ăn quả, bụi cây, thảm hoa và bụi cỏ; có thể tạo nhiều vật thể cùng lúc, di chuyển, nhóm, nhân bản, lưu và xuất/nhập JSON.
- Bản đồ có thêm các cụm cây, bụi cây và thảm hoa ở các vùng rìa của bản đồ chữ nhật mở rộng; các cụm trang trí này không tạo collider gameplay và được bố trí tránh mạng đường trung tâm.
- Lò rèn/bếp/bãi biển hiện là mô hình xây dựng trang trí; chưa có hệ thống chế tạo vật phẩm, nấu công thức hoặc tương tác bãi biển.


## v1.10.6 — Gameplay bếp nấu ăn
- Thêm nút 🍳 Bếp nấu ăn vào giao diện quản lý.
- Công thức: bánh mì (2 lúa mì), súp rau củ (1 cà rốt + 1 cà chua), bánh bí ngô (1 bí ngô + 1 lúa mì), cá nướng (1 cá + 1 cà rốt).
- Nấu món ăn tiêu hao nguyên liệu, thêm món vào túi và nhận EXP; có thể bán món ăn ngay tại bếp để nhận tiền.
- Túi món ăn được lưu cùng dữ liệu save hiện có; save cũ tự khởi tạo số lượng món ăn bằng 0.
- Đây là gameplay quản lý qua nút bếp 🍳; chưa yêu cầu nhân vật phải đứng gần mô hình bếp.


## v1.10.7 — Trang trại chăn nuôi
- Thêm quản lý đàn bò sữa, gà và lợn; mua vật nuôi, cho ăn bằng lúa mì, tăng độ lớn, thu hoạch và bán sản phẩm.
- Sản phẩm: sữa, trứng và thịt lợn; số lượng vật nuôi và sản phẩm được lưu trong save game.
- World Builder có mô hình trang trại bò, chuồng gà và trang trại lợn để dựng nhiều khu chăn nuôi.
- Chăn nuôi là hệ thống gameplay mô phỏng đơn giản; chưa có AI đi lại/hoạt ảnh vật nuôi.


## v1.10.10 — Beach fishing, forge, flowers, animal care and pets

- Added sunflower, rose and tulip crops with procedural flower visuals.
- Crop plots can randomly develop pests; the `🐛 Bắt sâu` tool catches them. Pest pressure slows crop growth; pests can be converted to bait.
- Added a beach-fishing management panel, beach fishing spot markers, crafted fishing rod, durability, repair and upgrade progression.
- Added purchasable livestock feed and veterinary medicine, disease chance while feeding, treatment, repeatable product harvest cycles, and animal-sale unlock after 10 products per species.
- Added low-poly dog/cat followers and a pet selection panel.
- Added migration defaults so older saves initialize the new systems without wiping existing progress.

Fishing, animal illness, crafting, and pet behavior are implemented as lightweight gameplay systems; visual browser/device verification is not included in source-level checks.


## v1.10.11 — Công cụ nông nghiệp tại lò rèn
- Thêm chế tạo/nâng cấp cuốc tối đa cấp 3; mỗi cấp tăng tốc độ sinh trưởng cây trồng 12%.
- Thêm chế tạo/nâng cấp bình tưới tối đa cấp 3; từ cấp 2, tưới một ô sẽ tưới các cây trong vùng 3×3 quanh ô đó.
- Giữ nguyên hệ thống cần câu, chăn nuôi, câu cá biển, bếp nấu, thú cưng và World Builder.
- Chi phí nâng cấp dùng tiền và lúa mì đã thu hoạch; cấp công cụ được lưu cùng `forge.upgrades`.


## v1.10.12 — Ba lô và kho chứa
- Ba lô mặc định 80 chỗ; nâng cấp tối đa cấp 5, mỗi cấp thêm 40 chỗ.
- Kho chứa mặc định 250 chỗ; nâng cấp tối đa cấp 5, mỗi cấp thêm 150 chỗ.
- Có thể cất/lấy hạt giống, nông sản, cá hồ, cá biển, sâu, mồi câu và món ăn giữa túi và kho.
- Thu hoạch cây, bắt sâu, mua hạt và nhận cá kiểm tra sức chứa ba lô.
- Cấp ba lô, cấp kho và vật phẩm trong kho được lưu; save cũ tự khởi tạo kho trống mà không xóa dữ liệu cũ.
- Nâng cấp ba lô: 180 xu cấp đầu, mỗi cấp sau tăng 140 xu. Nâng cấp kho: 300 xu cấp đầu, mỗi cấp sau tăng 220 xu.


## v1.10.13 — Giai đoạn C & D: Khai mỏ, luyện kim và thám hiểm đảo
- Thêm cuốc chim tại lò rèn, khai thác đá/quặng đồng/quặng sắt/tinh thể và nung quặng thành thỏi.
- Cuốc chim tối đa cấp 3; cấp cao tăng lượng/cơ hội nhận quặng. Công thức chế tạo và nung hiển thị ngay trong lò rèn.
- Thêm ba điểm thám hiểm qua menu: Đảo Gỗ Trôi, Đảo Rạn San Hô và Đảo Sương Mù; mỗi chuyến tiêu hao xu, trả về gỗ, dây thừng, vỏ sò, quặng, tinh thể và cổ vật.
- Thêm nâng cấp thuyền tối đa cấp 3. Cấp 1 mở Rạn San Hô; cấp 2 mở Đảo Sương Mù. Nâng cấp dùng gỗ, dây thừng, thỏi kim loại và xu.
- Thêm tài nguyên mới vào túi đồ/kho; cấp cuốc, cấp thuyền, danh sách đảo đã khám phá và tài nguyên được lưu cùng bản lưu.
- Lưu ý: chuyến thám hiểm đảo hiện mô phỏng qua giao diện và phần thưởng; chưa có cảnh 3D riêng cho từng đảo.
