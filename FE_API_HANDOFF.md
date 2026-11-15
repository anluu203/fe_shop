# Hợp đồng frontend và backend hiện tại

Backend triển khai trong Next.js, cổng 5173, prefix `/api/v1`. Hợp đồng đầy đủ: [BACKEND_API.md](BACKEND_API.md).

Checkout gửi thông tin giao hàng, `paymentMethod: COD | VNPAY` và `Idempotency-Key`. COD cần xác nhận thu đủ tiền khi hoàn tất giao. VNPay tạo link qua `POST /orders/:id/payments/vnpay`; IPN đã xác thực mới ghi nhận thanh toán. Return chỉ đưa khách về chi tiết đơn. Link hết hạn sau 15 phút, đơn giữ lại để thanh toán tiếp hoặc hủy.

Khách hủy Processing; admin hủy Processing/Preparing kèm lý do. Hủy hoàn kho đúng một lần. Đơn đã thu tiền chuyển chờ hoàn; admin chuyển tiền bên ngoài rồi xác nhận từng khoản trong chi tiết đơn. Thông tin DTO: `events`, `payments`, `paymentRefunds`. Hướng dẫn cấu hình merchant, IPN HTTPS và kiểm thử: [PAYMENTS.md](PAYMENTS.md).

Ảnh sản phẩm hỗ trợ upload hoặc nhập URL internet, đều trả đường dẫn nội bộ trong `/images/uploads/products/`. Các màn hình tư vấn/đổi trả dùng API thật khi `NEXT_PUBLIC_USE_MOCK=false`. Đổi trả chấp nhận đơn COD/VNPay đã thanh toán và đã giao.

Mock hỗ trợ COD và hủy đơn, không thực hiện VNPay. Các module stores/borrowing cũ còn dữ liệu trong Seed_Documents, không có endpoint đang phục vụ và các màn hình tương ứng đã gỡ. Không có thanh toán tại quầy.
