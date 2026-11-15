# Hủy đơn và thanh toán COD/VNPay sandbox

## Cài đặt

Chạy trong thư mục dự án:

```powershell
npm run db:deploy
npm run db:generate
npm run build
npm start
```

Migration `20261115000000_order_payments` bổ sung enum VNPAY, bảng Payment_Attempts và Order_Payment_Refunds; không reset hay xóa dữ liệu cũ.

Đăng ký merchant thử nghiệm tại https://sandbox.vnpayment.vn/devreg/ rồi điền vào `.env`:

```dotenv
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=/api/v1
APP_URL=https://your-public-https-host
VNPAY_TMN_CODE=YOURCODE
VNPAY_HASH_SECRET=your_merchant_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

`YOURCODE` là placeholder, thay bằng TmnCode 8 ký tự thực tế. Không dùng tiền/tài khoản production. Bản triển khai này chỉ chấp nhận URL sandbox. Không thêm tiền tố NEXT_PUBLIC cho khóa merchant. Khởi động lại server sau khi đổi cấu hình.

- Đăng ký IPN với VNPay: `https://your-public-https-host/api/v1/payments/vnpay/ipn`.
- Return URL tự tạo: `APP_URL/api/v1/payments/vnpay/return`.
- Với máy local, dùng địa chỉ HTTPS công khai/tunnel trỏ về cổng 5173 và đặt APP_URL tương ứng. Localhost không nhận được IPN từ VNPay.
- Sau reverse proxy tin cậy, đặt TRUST_PROXY=true chỉ khi proxy thay thế X-Forwarded-For bằng địa chỉ khách thật.
- Khi thiếu/sai cấu hình, giao diện chỉ cho COD; API từ chối checkout VNPay trước khi trừ kho. Không cần cấu hình VNPay để dùng COD.

Đặc tả chính thức: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html

## Luồng khách hàng

1. Nhập thông tin giao hàng và chọn COD hoặc VNPay tại giỏ.
2. COD: tạo đơn UNPAID, theo dõi giao hàng; cửa hàng xác nhận thu đủ tiền khi hoàn tất.
3. VNPay: tạo đơn và giữ tồn kho; lấy link thanh toán rồi chuyển hướng đến sandbox. Số tiền lấy từ snapshot đơn trên server, nhân 100 theo đặc tả cổng.
4. Link có hiệu lực 15 phút. Hết hạn/thất bại không xóa đơn, không trả kho tự động; khách thanh toán lại trên cùng đơn hoặc hủy. Yêu cầu tạo link lặp khi link còn hiệu lực trả cùng URL.
5. Browser Return chỉ là thông báo. IPN hợp lệ mới xác nhận PAID. Trang chi tiết kiểm tra lại mỗi 2 giây tối đa 30 giây, sau đó cho làm mới thủ công.
6. Khách hủy khi Processing, nhập lý do qua hộp xác nhận. Đơn đã thanh toán được đánh dấu chờ hoàn; cửa hàng xử lý hoàn thủ công.

Không có thanh toán hay nhận hàng tại quầy. Trong mock, chỉ COD/hủy được hỗ trợ, không giả lập giao dịch VNPay thành công. Đơn mock có tồn kho đầy đủ sẽ trừ/hoàn tồn; đơn seed cũ không tự cộng tồn chưa từng trừ.

## Quản trị và đối soát

- Admin hủy được Processing/Preparing; không hủy Shipping/Done. Backend khóa dòng đơn và ghi bút toán hoàn kho duy nhất.
- Đơn VNPay chưa PAID không được chuyển Preparing. Đơn COD chuyển Done cần checkbox xác nhận thu tiền; VNPay không yêu cầu thu COD.
- Mỗi khoản thu từ VNPay có mã tham chiếu riêng. Kiểm tra chữ ký SHA512, TmnCode, số tiền, trạng thái và mã giao dịch trước khi ghi nhận.
- IPN lặp trả mã 02, không tạo lần thu/hoàn mới. Phản hồi IPN dùng RspCode/Message: 00 xử lý thành công, 01 không có giao dịch, 04 sai số tiền, 97 sai xác thực, 99 cần thử lại.
- Thanh toán thành công đến sau khi hủy vẫn được ghi nhận; giữ đơn Cancelled, tạo khoản chờ hoàn. Nếu nhiều link cũ cùng báo thành công, áp dụng một khoản cho đơn, các khoản dư được hoàn riêng.
- Admin chuyển tiền cho khách bên ngoài hệ thống trước, sau đó mở chi tiết đơn, chọn khoản hoàn, nhập mã giao dịch/ghi chú và xác nhận đã hoàn đủ. API chỉ lưu bằng chứng đối soát, không thực hiện lệnh chuyển tiền. Gửi lại cùng nội dung không hoàn lần hai; nội dung khác trả 409.
- Khi hủy đơn có nhiều khoản đã thu, paymentStatus chỉ chuyển REFUNDED sau khi tất cả khoản cần hoàn đã được xác nhận.
- Báo cáo doanh thu vẫn ghi nhận khi Done. `refunded`/`netRevenue` tính hoàn tiền đổi trả sách đã giao; hoàn do hủy đơn và thu dư nằm riêng trong paymentRefunds, không trừ doanh thu chưa từng ghi nhận. Đơn online đã giao cũng dùng được luồng đổi trả/hoàn tiền hiện tại.

## Kiểm thử

```powershell
npm test
npm run test:payments
npm run test:backend
```

Backend integration dùng database ngẫu nhiên riêng, merchant/khóa test và IPN ký bằng khóa test; không gọi VNPay hay chuyển tiền thật. Bao phủ thiếu cấu hình, phân quyền, checkout/link lặp, callback giả mạo, Return không ghi nhận tiền, IPN đồng thời, thanh toán hết hạn/thất bại, thu trùng, hủy đồng thời với IPN, hoàn thủ công và báo cáo/đổi trả. Test backend cần PostgreSQL chạy và tài khoản có quyền CREATE DATABASE.

Kiểm thử kết nối sandbox thực tế sau khi có merchant và IPN HTTPS: thanh toán thành công, hủy tại cổng, trở về trang shop, IPN đến trước/sau Return và đối chiếu trạng thái trong màn quản trị. Chưa cấu hình merchant thì không thể xác nhận bước kết nối bên ngoài này.
