NONGTRAI-MAIN — UPGRADE 16

Nội dung cập nhật
- Hồ sơ nhân vật được rút gọn theo dạng danh sách: biểu tượng/ảnh đại diện hiện tại, tên nhân vật, 5 thống kê và duy nhất nút Cài đặt (ngoài nút đóng cửa sổ).
- Thống kê: động vật đã xuất chuồng/bán, món ăn đã nấu, tổng thời gian chơi, số lần động vật bị bệnh, số cây trồng đã gieo.
- Dữ liệu lịch sử chỉ được dùng nếu save đã có các trường statistics tương ứng. Với save cũ không có dữ liệu lịch sử, bộ đếm bắt đầu từ 0 tại bản này; không suy đoán hoặc dựng số liệu quá khứ.
- Thời gian chơi cộng dồn theo các lượt gameLogicLoop thực sự chạy và được lưu cùng save.
- Chọn Cuốc rồi chạm ô trồng trọt có cây sẽ yêu cầu xác nhận trước khi loại bỏ; không hoàn hạt giống. Có hiệu ứng thu nhỏ/nghiêng ngắn, tiêu hao 2 thể lực. Cây chết khi chọn Cuốc cũng cần xác nhận.
- Chức năng tưới nước, chăm sóc, thu hoạch, trồng cây, bếp và các hệ thống cũ được giữ lại.
- Bộ đếm cây tăng khi gieo hạt cây trồng hoặc trồng cây ăn quả thành công; bộ đếm món ăn tăng khi nhận món đã nấu (không tính chế tạo thức ăn/thuốc); bộ đếm bệnh tăng khi vật nuôi/cá/vịt chuyển sang trạng thái bệnh; bộ đếm xuất chuồng tăng khi vật nuôi được xuất chuồng theo cơ chế hiện có.

Tương thích save
- Không đổi khóa save hiện tại. Trường statistics được bổ sung an toàn; save cũ không có trường này sẽ nhận các bộ đếm khởi đầu bằng 0.
- Các bộ đếm mới được lưu trong gameState nên tiếp tục tồn tại qua lần tải sau và qua xuất/nhập save.

Kiểm tra
- Kiểm tra cú pháp JavaScript bằng Node.js.
- Kiểm tra logic cơ bản của chuẩn hóa statistics, chặt cây trồng trọt, bộ đếm gieo cây và cấu trúc ZIP.
- Chưa thực hiện kiểm thử trình duyệt/điện thoại tương tác thực tế.
- Các thư viện Three.js, OrbitControls, Tailwind và Font Awesome vẫn được tải từ CDN; lần tải đầu cần Internet hoặc cache trình duyệt.
