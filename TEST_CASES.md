# KIỂM THỬ HỆ THỐNG (TEST CASES)

**Dự án:** BookStore – Hệ thống bán sách trực tuyến  
**Ngày lập:** 21/10/2026  
**Cập nhật bổ sung:** 15/11/2026 – Phân quyền, tồn kho, xử lý đơn hàng và chịu tải phục vụ báo cáo.<br>
**Cơ sở lập:** Giao diện, API `/api/v1`, Prisma/PostgreSQL, dịch vụ phân quyền/tồn kho/đơn hàng/thanh toán và các bộ kiểm thử hiện có trong dự án.<br>
**Trạng thái tài liệu:** Thiết kế ca kiểm thử; chưa thực thi và chưa kết luận Đạt/Không đạt.

## 1. Phạm vi và quy ước kiểm thử

- Các mục 3.1–3.12 giữ các ca nền của giao diện/mock; các mục 3.13–3.16 bổ sung kiểm thử trên **backend thật**, gồm phân quyền API, tính toàn vẹn giao dịch và tải đồng thời. Không dùng kết quả mock để kết luận về khóa dữ liệu hoặc sức chịu tải PostgreSQL.
- API trong bảng được viết tương đối với `/api/v1`. `User` tương ứng `USER` trên DTO và `role=0` trong DB; `Admin` tương ứng `ADMIN` và `role=1`. P1: nghiệp vụ trọng yếu/toàn vẹn/bảo vệ dữ liệu; P2: chức năng hỗ trợ/hiệu năng mục tiêu; P3: tiện ích/giao diện.
- Trạng thái đơn trên DTO: `Processing → Preparing → Shipping → Done`, hoặc `Cancelled` trước giao. Trong DB lần lượt là `PENDING → PREPARING → SHIPPING → DELIVERED`, `CANCELLED`. Trạng thái thanh toán được theo dõi riêng: `UNPAID`, `PAID`, `REFUND_PENDING`, `REFUNDED`.
- Phân biệt lỗi xác thực `401`, thiếu quyền quản trị `403`, đối tượng không thuộc chủ sở hữu `404`, dữ liệu sai `400`, xung đột nghiệp vụ `409`, giới hạn tần suất `429`, dịch vụ chưa sẵn sàng `503`. Với ca trái quyền, gửi ID và body hợp lệ để lỗi validation không che kết quả kiểm tra quyền.
- Ca đồng thời phải gửi request thực sự chồng lấn bằng công cụ/API runner và đối chiếu dữ liệu sau khi mọi request kết thúc; nhấn nút nhanh trên giao diện không thay thế được kiểm thử đồng thời.

## 2. Môi trường và dữ liệu kiểm thử

### 2.1. Tài khoản và bộ dữ liệu

| Ký hiệu | Dữ liệu/chuẩn bị |
| --- | --- |
| A-GUEST | Không gửi Authorization; dùng hồ sơ trình duyệt chưa đăng nhập. |
| A-USER, A-USER2 | Hai tài khoản User khác nhau; có thể dùng `user@bookstore.vn`, `minh@bookstore.vn` nếu database kiểm thử đã import seed. Lấy ID thực qua `/auth/me`, không dùng ID mock thay ID PostgreSQL. |
| A-ADMIN | Tài khoản Admin trong database kiểm thử; có thể dùng `admin@bookstore.vn` nếu đã import seed. Mật khẩu lấy từ fixture kiểm thử; không ghi token hoặc thông tin đăng nhập thật vào báo cáo. |
| A-NEW | Email mới duy nhất cho mỗi lần đăng ký; không dùng lại trừ ca kiểm tra trùng. |
| B-01, B-02, CART-01 | Bộ dữ liệu giỏ cơ bản: B-01 giá `100000`, mua 2 cuốn; B-02 giá `120000`, mua 1 cuốn; tổng `320000` VND. Dùng fixture riêng nếu dữ liệu catalog thực tế đã thay đổi. |
| C-NEW, B-NEW | Danh mục và sách mới riêng cho từng ca; ghi lại ID thực sau khi tạo. Không tái sử dụng sách của ca khác khi sửa giá/ẩn/điều chỉnh tồn. |
| BK-KHO, BK-THIEU | Hai sách đang bán thuộc danh mục hợp lệ; giá lần lượt `100000`, `120000` VND; tồn đầu lần lượt 10 và 1. Mỗi ca khôi phục đúng tồn đầu, ghi số lượng InventoryMovement trước khi chạy. |
| DH-COD, DH-ONLINE | Đơn thật do A-USER checkout COD/VNPAY, có bút toán `sale:<orderId>:<bookId>`; mặc định 2 cuốn BK-KHO, tổng `200000` VND, trạng thái Processing/UNPAID. Chuẩn bị riêng từng trạng thái khi ca yêu cầu. |
| DH-MAU | Đơn seed chưa có bút toán sale. Dùng riêng để kiểm tra hủy không tự cộng tồn; không dùng thay DH-COD/DH-ONLINE trong ca kiểm tra hoàn kho. |
| K-01, K-02 | Hai Idempotency-Key khác nhau, ví dụ UUID; dùng lại có chủ đích trong ca kiểm tra gửi lặp. Mỗi tài khoản/sách/đợt chạy có namespace riêng. |
| TT-OK, TT-FAIL | Callback VNPay ký bằng khóa merchant **thử nghiệm** của môi trường. TT-OK có cả hai mã kết quả `00`; TT-FAIL có mã thất bại. Mã tham chiếu, số tiền và mã giao dịch được tạo theo từng lượt thanh toán. |

### 2.2. Cấu hình, thời gian và cô lập dữ liệu

- Backend: `NEXT_PUBLIC_USE_MOCK=false`, `NEXT_PUBLIC_API_URL=/api/v1`; PostgreSQL đã áp dụng migration, có AUTH_SECRET hợp lệ. Với ca cần online, cấu hình merchant sandbox và APP_URL; đối soát với cổng thật cần IPN HTTPS công khai. Ca callback nội bộ dùng khóa test và không phát sinh chuyển tiền thật.
- Các ca mock liên quan ngày đổi trả cũ dùng mốc `19/10/2026 10:00`, múi giờ Việt Nam, như bộ kiểm thử mock; kiểm tra ngày biên theo từng dòng TC. Backend thật tạo fixture có completedAt phù hợp ngày chạy, không phụ thuộc đơn mẫu tháng 10 còn hạn.
- Ghi trước/sau các bảng liên quan: Orders, Order_Items, Cart_Items, Inventory_Movements, Checkout_Requests, Order_Events, Payment_Attempts, Order_Payment_Refunds; ca đổi trả đối chiếu thêm Return_Requests/Refund_Records. Dùng tên bảng vật lý tương ứng trong Prisma khi truy vấn.
- Tạo dữ liệu trong database kiểm thử riêng; khôi phục fixture giữa các ca. Chỉ dọn dữ liệu có mã đợt chạy của mình; không chạy kịch bản tải, thay vai trò hoặc giả lập lỗi trên database đang dùng cho hoạt động thực tế.
- Trường “Kết quả thực tế”, ảnh/log và trạng thái thực thi để trống hoặc **Chưa chạy** cho đến khi đo/đối chiếu thật. Việc có test tự động tương ứng không tự chứng minh mọi bộ dữ liệu trong bảng đã đạt.

## 3. Các ca kiểm thử theo use case

### 3.1. UC-01 – Đăng nhập (User/Admin)

**Tiền điều kiện:** Chưa đăng nhập, trừ các ca kiểm tra phiên. Tài khoản mẫu còn nguyên. Mở `/client/auth/login`.

| Mã TC | Nội dung kiểm thử | Dữ liệu và các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| TC-DN-01 | User đăng nhập thành công | 1. Nhập A-USER. 2. Chọn Đăng nhập. | Tạo phiên User; chuyển đến `/client`; hiển thị tài khoản đã đăng nhập. | P1 |
| TC-DN-02 | Admin đăng nhập thành công | 1. Nhập A-ADMIN. 2. Chọn Đăng nhập. | Tạo phiên Admin; chuyển đến `/admin`; hiển thị khu vực quản trị. | P1 |
| TC-DN-03 | Bỏ trống email | 1. Để email rỗng. 2. Nhập mật khẩu hợp lệ. 3. Gửi. | Báo yêu cầu nhập email; không tạo phiên. | P2 |
| TC-DN-04 | Bỏ trống mật khẩu | 1. Nhập email hợp lệ. 2. Để mật khẩu rỗng. 3. Gửi. | Báo yêu cầu nhập mật khẩu; không tạo phiên. | P2 |
| TC-DN-05 | Email sai định dạng | Lần lượt nhập `abc`, `abc@`, `abc@example`; nhập mật khẩu rồi gửi. | Trình duyệt hoặc form báo email không hợp lệ; không đăng nhập. | P2 |
| TC-DN-06 | Sai thông tin xác thực | Chạy riêng: email A-USER + mật khẩu `SaiMatKhau`; email chưa đăng ký + mật khẩu bất kỳ. | Báo `Email hoặc mật khẩu không đúng.`; không tạo phiên cho cả hai trường hợp. | P1 |
| TC-DN-07 | Email không phân biệt hoa thường | Nhập `USER@BOOKSTORE.VN` và mật khẩu A-USER; gửi. | Nhận đúng tài khoản A-USER và đăng nhập thành công. | P2 |
| TC-DN-08 | Ẩn/hiện mật khẩu | 1. Nhập mật khẩu. 2. Nhấn biểu tượng mắt hai lần. | Chuyển qua lại giữa ký tự rõ và che; giá trị nhập giữ nguyên. | P3 |
| TC-DN-09 | Khôi phục phiên | 1. Đăng nhập A-USER. 2. Tải lại trang. 3. Mở trang giỏ. | Khôi phục đúng tài khoản; không yêu cầu đăng nhập lại khi token còn hợp lệ. | P1 |
| TC-DN-10 | Token không hợp lệ | Trong hồ sơ kiểm thử, thay token tại `bookstore:access-token:v1` bằng chuỗi không hợp lệ; tải lại và mở `/admin`. | Không khôi phục tài khoản; token lỗi được loại bỏ; chuyển về trang đăng nhập khi truy cập quản trị. | P1 |
| TC-DN-11 | Chặn truy cập quản trị trái quyền | Chạy riêng với khách chưa đăng nhập và A-USER: mở `/admin`, `/admin/products`, `/admin/orders`, `/admin/warranty`. | Không hiển thị nội dung quản trị; chuyển về `/client/auth/login`. | P1 |
| TC-DN-12 | Đăng xuất và đồng bộ phiên | 1. Đăng nhập A-USER ở hai tab. 2. Đăng xuất tại một tab. 3. Kiểm tra tab còn lại; tải lại và mở giỏ. | Phiên bị xóa; tab còn lại cập nhật trạng thái đăng xuất; mở giỏ yêu cầu đăng nhập. | P1 |

### 3.2. UC-02 – Tiếp nhận và xử lý đổi trả sách online (Admin)

**Tiền điều kiện:** Đăng nhập A-ADMIN tại `/admin/warranty`. Với phiếu R-NEW, chuẩn bị bằng A-USER trước khi đăng nhập Admin, cố định ngày như mục 2.2. Đổi trả sử dụng bộ dữ liệu riêng, không dùng ID sản phẩm catalog thay cho `return-book-*`.

| Mã TC | Nội dung kiểm thử | Dữ liệu và các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| TC-DT-01 | Tiếp nhận phiếu User | 1. User tạo R-NEW tại `/client/warranty`. 2. Admin mở danh sách hoặc chọn Làm mới. | Có phiếu mới, đúng liên hệ và chủ tài khoản, trạng thái `received`; timeline có sự kiện tiếp nhận. | P1 |
| TC-DT-02 | Xem chi tiết phiếu | Chọn R-NEW và đối chiếu dữ liệu đã nhập. | Hiển thị đúng sách, mã bản sách, mã đơn mẫu, hạn đổi trả, tên, điện thoại, mô tả và lịch sử. | P1 |
| TC-DT-03 | Tìm kiếm phiếu | Tìm lần lượt theo mã phiếu, tên khách, điện thoại, mã bản sách và mã đơn mẫu đang có. | Danh sách chỉ giữ các phiếu khớp trường được tìm; không phân biệt chữ hoa/thường. | P2 |
| TC-DT-04 | Lọc và thống kê trạng thái | 1. Chọn từng trạng thái từ bộ lọc. 2. Chọn thẻ thống kê cùng trạng thái hai lần. | Lọc đúng trạng thái; thẻ cho phép bật/tắt lọc; số trên thẻ bằng tổng phiếu ở trạng thái đó trong snapshot, độc lập với từ khóa tìm. | P2 |
| TC-DT-05 | Kết hợp tìm và lọc, không có kết quả | 1. Nhập từ khóa của R-NEW. 2. Chọn trạng thái không khớp. 3. Xóa điều kiện. | Hiện thông báo không tìm thấy; xóa điều kiện trả lại danh sách phù hợp. | P2 |
| TC-DT-06 | Xử lý đủ luồng đổi trả | Với R-NEW, lần lượt lưu `checking`, `repairing`, `completed`; mỗi bước nhập ghi chú khác nhau. | Chuyển đúng từng bước; mỗi lần thêm một sự kiện có ngày, trạng thái, ghi chú; phiếu kết thúc ở `completed`. | P1 |
| TC-DT-07 | Bổ sung ghi chú cùng trạng thái | Phiếu đang `checking`: giữ nguyên trạng thái, nhập `  Bổ sung kết quả kiểm tra.  ` rồi lưu. | Vẫn `checking`; thêm một sự kiện, ghi chú được bỏ khoảng trắng đầu/cuối; lịch sử cũ giữ nguyên. | P2 |
| TC-DT-08 | Ghi chú bắt buộc | Khi chuyển trạng thái, lần lượt để ghi chú rỗng và chỉ chứa khoảng trắng rồi lưu. | Báo yêu cầu ghi chú; không đổi trạng thái hoặc thêm lịch sử. | P2 |
| TC-DT-09 | Giới hạn ghi chú trên giao diện | Nhập/dán chuỗi 2000 ký tự rồi thử thêm ký tự thứ 2001 vào ô ghi chú. | Ô nhập cho phép tối đa 2000 ký tự theo `maxLength`; không đưa ký tự vượt giới hạn vào nội dung gửi từ giao diện. | P2 |
| TC-DT-10 | Không cho lùi hoặc bỏ bước [Tích hợp] | Chạy độc lập: `received` → `repairing`; `checking` → `received`; gửi ghi chú hợp lệ. | Service báo chỉ được giữ nguyên hoặc chuyển bước kế tiếp; trạng thái và timeline không đổi. | P1 |
| TC-DT-11 | Khóa phiếu hoàn tất | 1. Mở `DT-MAU-002`. 2. Kiểm tra form. 3. [Tích hợp] Gọi cập nhật phiếu đã hoàn tất. | Giao diện thông báo đã hoàn tất và không có form cập nhật; service từ chối cập nhật tiếp. | P1 |
| TC-DT-12 | Tách phiếu theo chủ tài khoản | 1. A-USER và A-USER2 lần lượt tạo phiếu riêng. 2. Admin cập nhật phiếu A-USER. 3. Mỗi User đăng nhập kiểm tra. | Admin thấy cả hai; chỉ phiếu được chọn thay đổi; mỗi User chỉ thấy phiếu tự tạo của mình cùng phiếu mẫu dùng chung. | P1 |
| TC-DT-13 | Lưu và nạp lại tiến độ | 1. Admin cập nhật R-NEW. 2. Tải lại. 3. Đăng nhập User sở hữu để kiểm tra. | Trạng thái và timeline mới được giữ; User thấy đúng cập nhật sau khi chuyển tài khoản. | P1 |
| TC-DT-14 | Cập nhật phiếu mẫu dùng chung | 1. Chuyển `DT-MAU-001` từ `repairing` sang `completed`. 2. Lần lượt xem bằng hai User. | Cả hai thấy mẫu đã hoàn tất; mỗi timeline thêm đúng một sự kiện; không biến phiếu mẫu thành phiếu riêng. | P2 |
| TC-DT-15 | Không lưu được tiến độ [Tích hợp] | Giả lập `setItem` ném lỗi; cập nhật phiếu chưa hoàn tất với ghi chú hợp lệ. | Cập nhật được giữ trong phiên service hiện tại; hiện cảnh báo có thể mất khi tải lại; không báo đã lưu bền vững thành công. | P1 |
| TC-DT-16 | Điều kiện tiếp nhận đầu vào [Tích hợp] | Chạy độc lập: thiếu tên; điện thoại `123`; mô tả chỉ khoảng trắng; gửi trùng `return-book-1` khi có phiếu đang xử lý; gửi `return-book-4` hết hạn. Kiểm tra riêng ngày 24 và 25/10/2026 với `return-book-1` chưa có phiếu. | Dữ liệu sai, trùng đang xử lý hoặc hết hạn bị từ chối, không tạo phiếu. Ngày 24/10 còn nhận; ngày 25/10 không nhận. | P1 |

### 3.3. UC-03 – Quản lý danh mục thể loại sách (Admin)

**Tiền điều kiện:** Đăng nhập A-ADMIN tại `/admin/categories`. Tạo dữ liệu C-NEW độc lập với danh mục dùng trong các ca khác. Hệ thống có hai cấp: nhóm/danh mục cha và danh mục con.

| Mã TC | Nội dung kiểm thử | Dữ liệu và các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| TC-DM-01 | Xem và lọc danh mục | 1. Mở trang. 2. Chọn nhóm Văn học. 3. Chọn xem tất cả. | Hiện nhóm và danh mục con; khi chọn nhóm chỉ hiện con thuộc nhóm đó; xem tất cả bỏ lọc. | P2 |
| TC-DM-02 | Tạo danh mục cha | Mở thêm nhóm, nhập tên C-NEW, mô tả và lưu. | Đóng hộp thoại sau thành công; có nhóm mới đúng dữ liệu; tải lại vẫn còn. | P1 |
| TC-DM-03 | Tên cha bắt buộc | Chạy riêng với tên rỗng và tên chỉ có khoảng trắng; lưu. | Báo tên không được để trống; không tạo nhóm. | P2 |
| TC-DM-04 | Sửa danh mục cha | Đổi tên và mô tả nhóm C-NEW; lưu và tải lại. | Cập nhật đúng nhóm; giữ ID; danh mục con vẫn thuộc nhóm này. | P1 |
| TC-DM-05 | Tạo danh mục con | Chọn nhóm C-NEW, thêm danh mục con có tên và mô tả hợp lệ rồi lưu. | Tạo con đúng `parentId`; hiện dưới nhóm được chọn và còn sau tải lại. | P1 |
| TC-DM-06 | Tên con bắt buộc | Trong form thêm/sửa con, nhập tên rỗng hoặc chỉ khoảng trắng rồi lưu. | Báo lỗi; không lưu dữ liệu không hợp lệ. | P2 |
| TC-DM-07 | Thiếu hoặc sai danh mục cha [Tích hợp] | Gửi tạo con với `parentId` rỗng hoặc ID không tồn tại. | Từ chối vì danh mục cha không tồn tại; không tạo quan hệ mồ côi. | P1 |
| TC-DM-08 | Chuyển con sang nhóm khác | 1. Tạo hai nhóm kiểm thử. 2. Sửa con của nhóm đầu, chọn nhóm thứ hai, lưu. 3. Kiểm tra cả hai nhóm. | Con giữ ID và chuyển đúng nhóm; bộ lọc mỗi nhóm phản ánh quan hệ mới. | P1 |
| TC-DM-09 | Ảnh danh mục | Upload IMG-OK cho nhóm hoặc con, lưu và tải lại. Chạy riêng IMG-BAD. | Ảnh hợp lệ có preview và được giữ sau lưu; file sai bị từ chối, không thay ảnh đã lưu trước đó. | P2 |
| TC-DM-10 | Đóng form/hủy xóa | 1. Sửa dữ liệu rồi đóng form mà không lưu. 2. Chọn xóa và hủy tại hộp xác nhận. 3. Tải lại. | Dữ liệu đã lưu trước đó giữ nguyên; không thực hiện xóa. | P2 |
| TC-DM-11 | Xóa danh mục con rỗng | Chọn con C-NEW chưa có sách; xác nhận xóa. | Con bị xóa; nhóm cha và các con khác giữ nguyên; tải lại không còn con vừa xóa. | P1 |
| TC-DM-12 | Chặn xóa danh mục đang được dùng | Chạy riêng: xóa nhóm Văn học còn con; xóa `literature-2` còn sách. Kiểm tra thêm danh mục có sách đã ẩn. | Từ chối và báo quan hệ còn tồn tại; không mất nhóm, con hoặc sách. Sách đã ẩn vẫn chặn xóa danh mục chứa nó trong mock. | P1 |
| TC-DM-13 | Xóa danh mục cha rỗng | Tạo nhóm mới không có con; xóa và xác nhận. | Nhóm được xóa; các nhóm khác giữ nguyên. | P1 |
| TC-DM-14 | Đồng bộ và kiểm soát quyền | 1. Đổi tên danh mục đang có sách. 2. Mở client kiểm tra bộ lọc và chi tiết sách. 3. [Tích hợp] Dùng token User hoặc không token để thêm/sửa/xóa danh mục. | Client hiển thị tên mới và quan hệ đúng; thao tác ghi trái quyền bị từ chối, dữ liệu không đổi. | P1 |

### 3.4. UC-04 – Quản lý đơn hàng (Admin)

**Tiền điều kiện:** Đăng nhập A-ADMIN. Có các đơn ở `Processing`, `Preparing`, `Shipping`, `Done`; có ít nhất một giỏ `AddingItem`. Có thể dùng đơn mẫu hoặc tạo mới từ CART-01.

| Mã TC | Nội dung kiểm thử | Dữ liệu và các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| TC-DH-01 | Xem danh sách đơn | Mở `/admin/orders`, đối chiếu một đơn mẫu. | Hiển thị mã, khách hàng, ngày đặt, tổng tiền và trạng thái đúng; sắp theo ngày tạo mới nhất trước. | P1 |
| TC-DH-02 | Không liệt kê giỏ đang mở | Chuẩn bị giỏ `AddingItem` có sách và đơn đã checkout; mở danh sách admin. | Chỉ có đơn đã checkout; giỏ đang mở không xuất hiện trong danh sách đơn quản trị. | P1 |
| TC-DH-03 | Lọc trạng thái | Chọn lần lượt Đang xử lý, Đang đóng gói, Đang giao, Hoàn thành và Tất cả đơn. | Chỉ hiện trạng thái tương ứng; chọn Tất cả bỏ lọc; đổi trạng thái lọc đưa về trang đầu. | P2 |
| TC-DH-04 | Phân trang danh sách | Chuẩn bị trên 20 đơn; mở trang 1 rồi trang 2, quay lại; thử kết hợp bộ lọc. | Mỗi trang tối đa 20 đơn; không trùng/bỏ sót trong tập dữ liệu ổn định; tổng trang tính sau lọc và giữ bộ lọc khi chuyển trang. | P2 |
| TC-DH-05 | Xem chi tiết và số tiền | Mở đơn checkout từ CART-01. | Đúng chủ đơn, ba cuốn trên hai dòng; B-01: `200000`, B-02: `120000`, tổng `320000`; có ngày đặt và thanh tiến độ. | P1 |
| TC-DH-06 | Xử lý trọn vòng đời | Với đơn COD `Processing`, chọn lần lượt chuyển sang `Preparing`, `Shipping`, `Done`; xác nhận đã thu đủ tiền ở bước cuối. | Mỗi lần chỉ tiến một bước; nhãn và thanh tiến độ cập nhật đúng; khi Done có PAID/completedAt; tải lại vẫn giữ trạng thái. | P1 |
| TC-DH-07 | Khóa nút ở đơn hoàn thành | Mở đơn `Done`. | Hiện thông báo hoàn thành; không còn nút chuyển sang trạng thái khác. | P1 |
| TC-DH-08 | Chặn lùi/bỏ bước [Tích hợp] | Chạy riêng: `Processing` → `Shipping`; `Shipping` → `Preparing`; `Done` → `Processing`. | Mock từ chối; trạng thái và dữ liệu đơn không thay đổi. | P1 |
| TC-DH-09 | Gửi lại trạng thái hiện tại [Tích hợp] | Gửi `Preparing` cho đơn đang `Preparing`. | Giữ nguyên trạng thái; không tạo đơn mới hoặc sửa các dòng tiền. Với backend thật, không thêm sự kiện trạng thái cho yêu cầu lặp; xem thêm mục 3.15. | P2 |
| TC-DH-10 | Từ chối cập nhật trái quyền [Tích hợp] | Dùng token A-USER hoặc không token để xem danh sách admin và chuyển trạng thái một đơn. | Báo cần đăng nhập/không có quyền; không trả dữ liệu quản trị và không sửa đơn. | P1 |
| TC-DH-11 | Đồng bộ trạng thái đến khách | 1. Admin cập nhật đơn của A-USER. 2. A-USER đăng nhập mở lịch sử và chi tiết đơn. | User thấy trạng thái mới của đúng đơn; đơn tài khoản khác không bị cập nhật. | P1 |
| TC-DH-12 | Lỗi cập nhật không làm mất đơn [Tích hợp] | Giả lập không ghi được storage khi chuyển trạng thái; tải lại từ storage ban đầu. | Thao tác báo lỗi; trạng thái đã lưu và số tiền giữ nguyên; không hiển thị cập nhật thành công. | P1 |

### 3.5. UC-05 – Quản lý sản phẩm sách (Admin)

**Tiền điều kiện:** Đăng nhập A-ADMIN, có nhóm và danh mục C-NEW. Các ca biên thêm/sửa chạy độc lập trên B-NEW; không ẩn B-01 trước các ca mua hàng nếu chưa khôi phục dữ liệu.

| Mã TC | Nội dung kiểm thử | Dữ liệu và các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| TC-SP-01 | Xem danh sách, tìm và phân trang | Mở `/admin/products`; tìm tên hoặc tác giả; chuyển trang với trên 16 kết quả. | Danh sách tối đa 16 sách/trang; tìm/lọc trước phân trang; admin thấy cả sách đang bán và đã ẩn. | P2 |
| TC-SP-02 | Thêm sách đầy đủ thông tin | Mở thêm mới, nhập B-NEW với mô tả và ảnh hợp lệ; lưu. | Tạo sách đang bán với ID mới; chuyển về danh sách; dữ liệu xuất bản, giá, danh mục và ảnh được giữ. | P1 |
| TC-SP-03 | Thêm sách chỉ có trường bắt buộc | Chỉ nhập tên, giá dương, danh mục; để ảnh, mô tả và thông tin xuất bản tùy chọn trống; lưu. | Tạo thành công; phần thông tin xuất bản bị thiếu hiển thị `Đang cập nhật` trên client. | P2 |
| TC-SP-04 | Tên bắt buộc và giới hạn độ dài | Chạy riêng khi thêm/sửa với tên rỗng, chỉ khoảng trắng, 1, 200, 201 ký tự; giữ trường khác hợp lệ. | Tên rỗng/khoảng trắng/201 ký tự bị chặn; 1 và 200 ký tự được chấp nhận. | P2 |
| TC-SP-05 | Giá không hợp lệ | Chạy riêng khi thêm/sửa với giá `0`, `-1`, `1.5`, `abc`, rỗng. | Không lưu; báo giá phải là số nguyên dương. Trường hợp `0` được bộ xử lý mock chặn dù form có thể gửi. | P1 |
| TC-SP-06 | Biên giá hợp lệ và quá dài | Chạy riêng giá `1`, `999999999999`, `1000000000000`. | Hai giá đầu hợp lệ; giá 13 chữ số bị từ chối; giá được lưu đúng dưới dạng chuỗi, không tự đổi đơn vị tiền. | P1 |
| TC-SP-07 | Danh mục hợp lệ | 1. Gửi form chưa chọn con. 2. Chọn nhóm khác để kiểm tra danh sách con. 3. [Tích hợp] Gửi ID con không tồn tại. | Form yêu cầu chọn con; danh sách con bám nhóm; mock từ chối ID không tồn tại. | P1 |
| TC-SP-08 | Năm xuất bản và số trang | Chạy từng trường với `0`, `-1`, `1.5`, `1`, `2026`/`240` và để trống. | Giá trị không nguyên dương bị chặn; số nguyên dương được lưu; trống được lưu là dữ liệu chưa cập nhật. | P2 |
| TC-SP-09 | Upload ảnh đúng loại và kích thước | Với từng JPEG, PNG, GIF, WebP hợp lệ, thử ảnh nhỏ hơn và bằng 2 MiB; lưu sách. | Upload có preview; lưu dạng data URL trong mock; tải lại vẫn có ảnh nếu storage đủ dung lượng. | P2 |
| TC-SP-10 | Từ chối file ảnh sai | Chọn PDF, SVG và ảnh hợp lệ lớn hơn 2 MiB; chạy riêng từng file. | Báo lỗi định dạng/dung lượng; không thay ảnh hợp lệ trước đó và không báo upload thành công. | P2 |
| TC-SP-11 | Kiểm tra URL ảnh | Thử `/images/books/book-01.webp`, URL HTTP(S) hợp lệ và `abc`; lưu từng trường hợp. | Đường dẫn ảnh nội bộ và HTTP(S) được form chấp nhận; `abc` bị chặn; URL đúng cú pháp nhưng ảnh lỗi không làm vỡ giao diện. | P2 |
| TC-SP-12 | Sửa thông tin sách | Mở B-NEW; sửa tên, tác giả, mô tả, giá, ảnh, danh mục; lưu và tải lại. | Cập nhật đúng sách, giữ ID; hiện thông báo thành công; client hiển thị dữ liệu mới. | P1 |
| TC-SP-13 | Rời form không lưu | Thay thông tin B-NEW rồi quay về danh sách mà không nhấn lưu; mở lại. | Dữ liệu đã lưu giữ nguyên. | P2 |
| TC-SP-14 | Ẩn sách và kiểm tra client | 1. Xác nhận ẩn B-NEW. 2. Kiểm tra admin, catalog client và URL chi tiết bằng User. 3. Thử thêm sách đó vào giỏ qua lớp API. | Admin vẫn thấy sách đã ẩn; client không liệt kê, chi tiết báo sách chưa sẵn sàng; thêm vào giỏ bị từ chối; dữ liệu không bị xóa vật lý. | P1 |
| TC-SP-15 | Hủy xác nhận ẩn | Chọn ẩn một sách đang bán, rồi hủy thao tác trong vùng xác nhận. | Sách vẫn đang bán và còn xuất hiện tại client. | P2 |
| TC-SP-16 | Giá mới cập nhật giỏ, giữ giá đơn cũ | 1. Có giỏ và đơn đã checkout chứa cùng B-01. 2. Admin đổi giá B-01 từ `100000` thành `110000`. 3. User mở lại giỏ và đơn cũ. | Giỏ đang mở dùng giá mới và tính lại tổng; đơn đã checkout giữ `unitPrice` và tổng tiền lúc mua. | P1 |
| TC-SP-17 | Chặn thao tác ghi trái quyền [Tích hợp] | Gửi thêm/sửa/ẩn sách bằng token A-USER và không token. | Từ chối; không tạo/sửa/ẩn sách. Không chỉ dựa vào việc giao diện đã ẩn nút quản trị. | P1 |
| TC-SP-18 | Lỗi lưu sách và đồng bộ nhiều tab | 1. Dùng hai tab Admin cùng hồ sơ, sửa sách ở tab đầu và xem tab sau. 2. [Tích hợp] Chạy lại sửa với storage ném lỗi. | Ghi thành công được phản ánh ở tab còn lại; khi ghi lỗi, báo lỗi và dữ liệu đã lưu trước đó giữ nguyên. | P1 |

### 3.6. UC-06 – Đặt hàng và thanh toán sách (User)

**Tiền điều kiện:** Đăng nhập A-USER; CART-01 được chuẩn bị mới cho từng ca, trừ ca giỏ rỗng. Sách đang bán và đủ tồn trên backend. Checkout hỗ trợ COD/VNPay sandbox; các ca dưới đây kiểm tra giỏ/đặt hàng cơ bản, các ca thanh toán, hủy và hoàn tiền bổ sung ở mục 3.15. Backend cần thông tin nhận hàng và Idempotency-Key.

| Mã TC | Nội dung kiểm thử | Dữ liệu và các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| TC-TT-01 | Kiểm tra số tiền trước đặt hàng | Mở CART-01 tại `/client/cart`; đối chiếu từng dòng và khung tóm tắt. | Hai dòng, 3 cuốn; tạm tính `320000` đồng; vận chuyển hiển thị Miễn phí; tổng cộng `320000` đồng. | P1 |
| TC-TT-02 | Đặt hàng thành công | 1. Mở CART-01. 2. Chọn Đặt hàng ngay. | Tạo/chuyển thành đơn `Processing` của A-USER; đúng số lượng và tổng; chuyển đến `/client/orders/<id>`. | P1 |
| TC-TT-03 | Giỏ sau checkout | Sau TC-TT-02, mở giỏ rồi thêm B-01 lần nữa. | Giỏ hiển thị rỗng sau checkout; thêm mới tạo giỏ đang mở, không sửa đơn vừa đặt. | P1 |
| TC-TT-04 | Chặn đặt giỏ rỗng | 1. Mở giỏ rỗng. 2. Kiểm tra giao diện. 3. [Tích hợp] Gọi checkout. | Giao diện không có thao tác đặt hàng cho giỏ rỗng; mock báo giỏ đang trống; không tạo đơn. | P1 |
| TC-TT-05 | Yêu cầu đăng nhập [Tích hợp] | Chạy checkout khi không có token hoặc token sai; đồng thời kiểm tra mở trang giỏ khi đăng xuất. | Không tạo đơn; lớp mock yêu cầu đăng nhập; giao diện giỏ chuyển về trang đăng nhập. | P1 |
| TC-TT-06 | Tính tiền theo giá hiện tại | 1. Chuẩn bị CART-01. 2. Admin đổi B-01 thành `110000`. 3. User đăng nhập lại, mở giỏ và checkout. | Đơn mới lưu B-01 đơn giá `110000`, B-02 `120000`; tổng `340000`; không dùng tổng cũ `320000`. | P1 |
| TC-TT-07 | Sách ngừng bán trước checkout | 1. Chuẩn bị CART-01. 2. Admin ẩn B-01. 3. User checkout. | Báo có sách ngừng bán; không tạo đơn; yêu cầu bỏ sách đó khỏi giỏ trước khi đặt. | P1 |
| TC-TT-08 | Chống thao tác đặt lặp trên giao diện | Nhấn nhanh nút Đặt hàng ngay nhiều lần khi đang xử lý một giỏ. | Nút có trạng thái đang xử lý và bị vô hiệu hóa; với chuỗi thao tác giao diện này chỉ có một đơn cho giỏ. Không suy rộng thành bảo đảm chống request đồng thời từ backend. | P1 |
| TC-TT-09 | Xem lịch sử và chi tiết | Sau checkout, mở `/client/orders`, chọn đơn mới và tải lại trang chi tiết. | Đơn còn sau tải lại, xuất hiện trong lịch sử mới nhất; thông tin sách, số lượng, đơn giá và tổng trùng dữ liệu đặt hàng. | P1 |
| TC-TT-10 | Không xem đơn người khác [Tích hợp] | Dùng token A-USER2 truy vấn chi tiết đơn vừa tạo bởi A-USER. Kiểm tra thêm trên URL chi tiết. | Không trả nội dung đơn; lớp mock báo không tìm thấy. | P1 |
| TC-TT-11 | Checkout thất bại khi không lưu được [Tích hợp] | Giả lập storage ném lỗi khi checkout CART-01. | Báo đặt hàng thất bại; dữ liệu lưu trước đó vẫn là giỏ; không có đơn mới trong lịch sử; không chuyển sang trang thành công. | P1 |
| TC-TT-12 | Không hiểu checkout là đã thanh toán | Đặt thành công rồi xem trang chi tiết và dữ liệu đơn. | Đơn mới là `Processing`/`UNPAID`. COD chỉ `PAID` khi admin xác nhận thu tiền; VNPay chỉ `PAID` sau IPN hợp lệ. Return URL không tự xác nhận tiền. Xem thêm `PAYMENTS.md` cho các ca hủy/hoàn/thanh toán lại. | P1 |

### 3.7. UC-07 – Quản lý giỏ hàng (User)

**Tiền điều kiện:** Đăng nhập A-USER; bắt đầu bằng giỏ rỗng trừ khi dòng kiểm thử nêu dữ liệu khác. B-01 và B-02 đang bán; giá theo seed.

| Mã TC | Nội dung kiểm thử | Dữ liệu và các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| TC-GH-01 | Thêm từ thẻ sách | Ở danh sách client, chọn thêm B-01 vào giỏ; mở giỏ. | Có một dòng B-01, số lượng 1, đơn giá/tổng `100000`; chỉ báo giỏ tăng tương ứng. | P1 |
| TC-GH-02 | Thêm từ chi tiết với số lượng | Mở B-01, chọn số lượng 2 rồi thêm; mở giỏ. | Có B-01 × 2, thành tiền `200000`; thông báo thêm thành công. | P1 |
| TC-GH-03 | Gộp cùng đầu sách | Đã có B-01 × 2; thêm lại B-01 × 3. | Một dòng B-01 có số lượng 5, tổng `500000`; không tạo dòng trùng sản phẩm. | P1 |
| TC-GH-04 | Giỏ nhiều sách | Chuẩn bị CART-01. | Hai dòng B-01 và B-02; chỉ báo giỏ đếm 3 cuốn, không chỉ đếm 2 dòng; tổng `320000`. | P1 |
| TC-GH-05 | Tăng/giảm số lượng | Với B-01 × 2, nhấn tăng một lần rồi giảm một lần, chờ hoàn tất từng thao tác. | Số lượng lần lượt 3 và 2; tiền dòng/tổng giỏ cập nhật chính xác sau mỗi bước. | P1 |
| TC-GH-06 | Biên số lượng trên giao diện | Chạy riêng với số lượng 1 và 999; kiểm tra nút giảm/tăng tương ứng. | Không giảm dưới 1 hoặc tăng vượt 999; nút tại biên bị vô hiệu hóa. | P2 |
| TC-GH-07 | Từ chối số lượng sai [Tích hợp] | Chạy thêm và cập nhật với `0`, `-1`, `1.5`, `1000`, chuỗi `"2"`. | Từ chối mọi bộ dữ liệu; số lượng phải là kiểu number nguyên từ 1–999; giỏ lưu trước đó giữ nguyên. | P1 |
| TC-GH-08 | Gộp vượt giới hạn [Tích hợp] | Đã có B-01 × 999; gửi thêm B-01 × 1. | Báo số lượng phải từ 1–999; dòng cũ vẫn 999; tổng tiền không thay đổi. | P1 |
| TC-GH-09 | Xóa một dòng và dòng cuối | Từ CART-01 xóa B-02, sau đó xóa B-01. | Sau lần đầu còn B-01 × 2, tổng `200000`; sau lần cuối giỏ rỗng và tổng 0. | P1 |
| TC-GH-10 | Xóa toàn bộ và hủy xác nhận | Với CART-01, mở xác nhận xóa toàn bộ rồi hủy; mở lại và xác nhận. | Hủy giữ nguyên giỏ; xác nhận làm rỗng giỏ và chỉ báo về 0. Không yêu cầu ID giỏ bị xóa vật lý trong mock. | P1 |
| TC-GH-11 | Phân biệt ID dòng và ID sách [Tích hợp] | Gửi cập nhật/xóa bằng `productId`, rồi chạy lại bằng `item.id` thật. | Dùng `productId` không tìm thấy dòng và không đổi giỏ; dùng `item.id` cập nhật/xóa đúng dòng. | P1 |
| TC-GH-12 | Lưu giỏ và tách tài khoản | 1. A-USER chuẩn bị CART-01, tải lại. 2. Đăng xuất, đăng nhập A-USER2. 3. Quay lại A-USER. | A-USER giữ CART-01; A-USER2 chỉ thấy giỏ riêng; quay lại A-USER khôi phục đúng giỏ. | P1 |
| TC-GH-13 | Khách chưa đăng nhập | Đăng xuất; nhấn thêm ở thẻ/chi tiết sách và thử mở `/client/cart`. | Yêu cầu/chuyển sang đăng nhập; không tạo giỏ hoặc thêm sách cho khách ẩn danh. | P1 |
| TC-GH-14 | Lỗi cập nhật số lượng [Tích hợp] | Giả lập storage ném lỗi khi tăng số lượng trên một dòng. | Giao diện báo lỗi, số lượng quay về giá trị cũ; tổng và dữ liệu đã lưu giữ nguyên. | P1 |

### 3.8. UC-08 – Tra cứu và tìm kiếm sách (User)

**Tiền điều kiện:** Khôi phục catalog seed gồm 32 sách đang bán. Không bắt buộc đăng nhập. Mặc định danh sách client dùng 16 sách/trang; tìm kiếm mock theo **tên sách và tác giả**, hỗ trợ không dấu.

| Mã TC | Nội dung kiểm thử | Dữ liệu và các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| TC-TK-01 | Xem catalog công khai | Khi chưa đăng nhập, mở `/client/products`. | Hiện catalog đang bán; không yêu cầu đăng nhập; seed nguyên có 32 kết quả, tối đa 16 sách ở trang đầu. | P1 |
| TC-TK-02 | Tìm theo tên đầy đủ hoặc một phần | Tìm lần lượt `Cây cam ngọt của tôi` và `cam ngọt`. | Có B-01; mọi kết quả khớp quy tắc tìm theo tên/tác giả. | P1 |
| TC-TK-03 | Tìm không dấu, không phân biệt hoa thường | Tìm `cay cam ngot cua toi`, rồi `CÂY CAM NGỌT CỦA TÔI`. | Đều tìm được B-01; kết quả tương ứng nhau trong cùng catalog. | P2 |
| TC-TK-04 | Tìm theo tác giả | Tìm `Haruki Murakami` hoặc `murakami`. | Có B-02 và chỉ các sách khớp tên/tác giả; không đòi hỏi khớp từ khóa chỉ có trong mô tả. | P1 |
| TC-TK-05 | Tìm từ thanh đầu trang | Nhập `Cây cam ngọt của tôi` vào thanh tìm kiếm của header; gửi. | Điều hướng đến `/client/products?search=...`; từ khóa được mã hóa URL đúng và kết quả có B-01. | P2 |
| TC-TK-06 | Từ khóa rỗng hoặc khoảng trắng | 1. Trong catalog, tìm bằng chuỗi rỗng/khoảng trắng. 2. Thử gửi chuỗi tương tự từ header. | Catalog bỏ điều kiện tìm; header không điều hướng cho từ khóa chỉ có khoảng trắng. Các bộ lọc khác vẫn được giữ theo thao tác hiện hành. | P2 |
| TC-TK-07 | Không tìm thấy sách | Tìm `zzzz-khong-co-sach-12345`, sau đó xóa từ khóa. | Hiện trạng thái không có kết quả; không có thẻ sách cũ bị giữ lại; xóa từ khóa khôi phục tập phù hợp. | P2 |
| TC-TK-08 | Lọc theo nhóm và danh mục con | Chọn Văn học rồi Văn học nước ngoài; sau đó chọn nhóm khác. | Lọc đúng `parentId` và `categoryId`; đổi nhóm xóa lựa chọn con trước đó. | P1 |
| TC-TK-09 | Kết hợp tìm và bộ lọc | Tìm B-01 trong nhóm Văn học, con Văn học nước ngoài; đổi sang nhóm không chứa B-01. | Kết quả là giao của các điều kiện; nhóm không phù hợp không trả B-01. | P2 |
| TC-TK-10 | Phân trang sau lọc | 1. Chuyển trang 2 của catalog. 2. Đặt từ khóa/bộ lọc mới. 3. Với tập trên 16 kết quả, chuyển trang tiếp. | Đổi điều kiện đưa về trang 1; `totalCount`/số trang tính trên tập đã lọc; không bỏ sót kết quả do phân trang trước lọc. | P2 |
| TC-TK-11 | Xem chi tiết và thông tin thiếu | Mở B-01 từ kết quả; đối chiếu thông tin xuất bản, giá, danh mục và ảnh. | Đúng sách; có tác giả, NXB, số trang theo seed; năm xuất bản còn thiếu hiển thị `Đang cập nhật`; có điều hướng về catalog. | P1 |
| TC-TK-12 | Sách đã ẩn hoặc ID không tồn tại | 1. Admin ẩn B-NEW rồi mở bằng User/khách. 2. Mở `/client/products/id-khong-ton-tai`. | Catalog không liệt kê sách ẩn; trang chi tiết báo sách chưa sẵn sàng/không tìm thấy và có đường quay lại; không hiển thị dữ liệu sách khác. | P1 |

### 3.9. UC-09 – Đăng ký tài khoản (User)

**Tiền điều kiện:** Chưa đăng nhập. Mở `/client/auth/register`. Mỗi ca tạo thành công dùng email A-NEW khác nhau; không tái dùng email đã có trừ ca kiểm tra trùng.

| Mã TC | Nội dung kiểm thử | Dữ liệu và các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| TC-DK-01 | Đăng ký hợp lệ | Nhập tên/email/mật khẩu A-NEW; xác nhận mật khẩu giống nhau; chọn Tạo tài khoản. | Tạo tài khoản vai trò `USER`; tự đăng nhập, chuyển `/client`; không cấp quyền Admin. | P1 |
| TC-DK-02 | Thiếu trường bắt buộc | Chạy riêng khi bỏ trống tên, email, mật khẩu hoặc xác nhận mật khẩu; giữ trường còn lại hợp lệ. | Báo lỗi trường tương ứng; không tạo tài khoản. | P2 |
| TC-DK-03 | Biên độ dài tên hiển thị | Chạy độc lập tên 1, 2, 100 và 101 ký tự; dùng ký tự rõ, không dùng khoảng trắng. | Form từ chối 1 và 101; chấp nhận 2 và 100 khi các trường khác hợp lệ. | P2 |
| TC-DK-04 | Tên chỉ có khoảng trắng | Nhập tên gồm ít nhất hai khoảng trắng, trường khác hợp lệ rồi gửi. | Mock từ chối tên rỗng sau trim; không tạo tài khoản dù kiểm tra độ dài trên form có thể đã qua. | P2 |
| TC-DK-05 | Email không hợp lệ | Chạy riêng `abc`, `abc@`, `abc@example`, email chứa khoảng trắng bên trong. | Trình duyệt hoặc form báo email không hợp lệ; không tạo tài khoản. | P2 |
| TC-DK-06 | Trùng email đã đăng ký | Dùng email `user@bookstore.vn`, các trường còn lại hợp lệ; gửi. | Báo email đã được đăng ký; không có tài khoản thứ hai hoặc tự đăng nhập vào tài khoản cũ. | P1 |
| TC-DK-07 | Trùng email khác hoa thường | Dùng email `USER@BOOKSTORE.VN` và các trường khác hợp lệ; gửi. | Bị xác định là email đã đăng ký; không tạo trùng. | P1 |
| TC-DK-08 | Biên mật khẩu trên giao diện | Chạy riêng mật khẩu 7 và 8 ký tự, xác nhận khớp; email mới cho mỗi lần. | Form chặn 7 ký tự; chấp nhận 8 ký tự khi dữ liệu khác hợp lệ. Không tự áp đặt yêu cầu chữ hoa/số/ký tự đặc biệt chưa có trong form. | P1 |
| TC-DK-09 | Xác nhận mật khẩu không khớp | Nhập mật khẩu `BookStore@123`, xác nhận `BookStore@124`; gửi. | Báo xác nhận không khớp; không tạo tài khoản. | P2 |
| TC-DK-10 | Bảo vệ vai trò [Tích hợp] | Gửi đăng ký hợp lệ kèm trường bổ sung `role: "ADMIN"`. | Tài khoản tạo mới vẫn là `USER`; không truy cập được giao diện quản trị. | P1 |
| TC-DK-11 | Đăng nhập lại tài khoản mới | 1. Đăng ký thành công. 2. Đăng xuất. 3. Đăng nhập lại bằng cùng email/mật khẩu. 4. Tải lại. | Đăng nhập thành công; khôi phục đúng tài khoản mới; quyền vẫn là User. | P1 |
| TC-DK-12 | Lỗi ghi tài khoản [Tích hợp] | Giả lập storage ném lỗi khi đăng ký hợp lệ; nạp lại storage ban đầu và thử đăng nhập email vừa dùng. | Báo không lưu được thay đổi; tài khoản không được ghi; không tạo phiên thành công; đăng nhập bằng email đó thất bại. | P1 |

### 3.10. Chatbot AI và chăm sóc khách hàng

| Tình huống | Kết quả mong đợi |
| --- | --- |
| Khách vãng lai mở chat, hỏi sách thiếu nhi dưới 200k | Có gợi ý sách đang mở bán, không vượt ngân sách; link mở đúng chi tiết |
| Admin đổi tên, lời chào, giới hạn số sách, lưu rồi tải lại | Cấu hình được lưu; cửa sổ client nhận thay đổi trong cùng trình duyệt |
| Admin tạm dừng chatbot | Client thấy trạng thái tạm nghỉ và liên hệ hỗ trợ; không gửi được tin mới |
| Gửi yêu cầu đơn hàng/đổi trả hoặc nội dung không tìm thấy | Log được đánh dấu cần hỗ trợ; có hướng dẫn liên hệ nhân viên |
| Admin lọc lượt cần chăm sóc, mở phiên và lưu ghi chú/đã xử lý | Lịch sử đúng phiên; lượt đã xử lý rời bộ lọc chờ; ghi chú không hiển thị ở client |
| User gọi API cấu hình, log quản trị hoặc báo cáo | Bị từ chối; cấu hình public không lộ system prompt |
| Nhập tin rỗng, quá 2.000 ký tự, cấu hình sai hoặc lưu trữ hết dung lượng | Không báo thành công và không ghi dở dữ liệu |
| Đăng xuất/đăng nhập tài khoản khác | Cửa sổ và mã phiên mới, không hiển thị hội thoại tài khoản trước |
| Mở chat trên điện thoại, dùng Enter/Shift+Enter/Escape | Gửi/xuống dòng/đóng đúng; khung chat vừa màn hình |

### 3.11. Báo cáo và thống kê doanh thu

| Tình huống | Kết quả mong đợi |
| --- | --- |
| Chọn cùng khoảng ngày, đổi ngày/tuần/tháng/năm | Tổng doanh thu, số đơn, số sách giữ nguyên; chỉ cách gom kỳ thay đổi |
| Đổi cột/đường, chọn điểm hoặc mở bảng dữ liệu | Biểu đồ/bảng cùng số liệu; kỳ không phát sinh có giá trị 0 |
| Đơn chưa hoàn thành, đơn sát 00:00 theo giờ Việt Nam | Chỉ tính đơn hoàn thành trong cả hai ngày biên; không dùng UTC làm ngày lịch |
| Sửa giá/tên sách sau khi đã bán | Báo cáo giữ tiền và tên tại thời điểm mua |
| Chuyển đơn sang hoàn thành rồi ghi lại cùng trạng thái | Doanh thu ghi nhận một lần, không đổi ngày hoàn thành |
| Khoảng trống, ngày đảo ngược/ngày không tồn tại | Thông báo rõ ràng; không lỗi chia cho 0 hoặc biểu đồ NaN |
| Xuất CSV | Có toàn bộ kỳ và sách bán chạy, giá tiền VND chính xác, tên chứa dấu phẩy/nháy được escape |

### 3.12. Thông tin sách và giao diện đã gỡ

| Tình huống | Kết quả mong đợi |
| --- | --- |
| Thêm/sửa ISBN, Publisher, PageCount, Discount | Lưu và hiển thị đúng trong chi tiết sách; ISBN kiểm tra checksum, số trang dương, giảm giá 0–100 |
| Sách có discount=20, price=80.000, mua 2 cuốn | Giỏ hàng 160.000 VND; không áp giảm giá lần thứ hai |
| Tìm các lối vào đăng ký mượn/quản lý nhà sách | Không còn menu, CTA, bảng mượn trên dashboard hoặc liên kết trong hồ sơ |
| Truy cập trực tiếp `/client/borrowing`, `/admin/borrowing`, `/admin/stores` | Trả 404 |
| Mở dữ liệu demo cũ | Giữ tài khoản, sách đã sửa, giỏ và đơn; tự bổ sung cấu hình/log chatbot |

### 3.13. Bổ sung nghiệp vụ phân quyền và bảo vệ dữ liệu

**Tiền điều kiện:** Dùng backend thật, A-GUEST/A-USER/A-USER2/A-ADMIN và fixture mục 2. Chuẩn bị token còn hạn, token bị sửa, phiên đã thu hồi/hết hạn; mỗi ca ghi rõ token thuộc tài khoản nào. API ghi dùng body/ID hợp lệ. Các ca thanh toán dùng cấu hình VNPay test hợp lệ.

| Mã TC | Nội dung kiểm thử | Dữ liệu và các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| TC-PQ-01 | Quyền xem catalog công khai | A-GUEST gọi GET `/products`, `/categories` và chi tiết sách đang bán; đối chiếu với A-USER. | Trả 200, xem được dữ liệu công khai; không có passwordHash/token/khóa thanh toán; không lộ sách đã ẩn. | P1 |
| TC-PQ-02 | Chặn truy cập màn quản trị | Lần lượt dùng A-GUEST và A-USER mở `/admin`, `/admin/products`, `/admin/orders`, `/admin/reports`. | Không hiển thị nội dung quản trị; chuyển đến đăng nhập. Đồng thời thực hiện TC-PQ-03/04 để xác nhận chặn ở server, không chỉ ẩn giao diện. | P1 |
| TC-PQ-03 | API riêng tư yêu cầu đăng nhập | Không gửi token; gọi GET `/orders/cart`, GET `/orders`, POST checkout với body/key hợp lệ và GET `/admin/orders`. | Mỗi request trả 401; không trả giỏ/đơn; không tạo đơn, trừ kho hoặc xóa giỏ của tài khoản khác. | P1 |
| TC-PQ-04 | User không đọc dữ liệu quản trị | A-USER gọi GET `/admin/orders`, `/admin/orders/<id>`, `/admin/reports/revenue` với query hợp lệ và `/admin/chatbot/logs`. | Trả 403 cho từng API; không trả danh sách khách hàng, đơn, doanh thu hoặc log quản trị. | P1 |
| TC-PQ-05 | User không ghi dữ liệu quản trị | A-USER gọi tạo/sửa/ẩn sách, tạo/sửa/xóa danh mục, điều chỉnh tồn, cập nhật trạng thái đơn và xác nhận hoàn tiền. Dùng body hợp lệ cho từng API. | Từng request trả 403; bản ghi sách/danh mục/tồn/đơn/hoàn tiền và nhật ký không bị thay đổi. | P1 |
| TC-PQ-06 | Admin thực hiện đúng chức năng được cấp | A-ADMIN tạo sách, điều chỉnh tồn có lý do/key; xem đơn của hai User; cập nhật một đơn đủ điều kiện. | Trả 200/201 theo hợp đồng; thao tác được lưu, có người thực hiện trong nhật ký liên quan; không cập nhật nhầm đơn/sách. | P1 |
| TC-PQ-07 | Chặn tự cấp vai trò khi đăng ký | Gọi POST `/auth/register` với thông tin mới hợp lệ nhưng thêm `role: "ADMIN"`; kiểm tra cả `role: 1`. | Backend strict schema trả 400, không tạo tài khoản từ body chứa trường lạ; đăng ký lại không có role tạo User, không phải Admin. Đây là kỳ vọng backend, khác ca mock TC-DK-10. | P1 |
| TC-PQ-08 | Chặn giả mạo token hoặc user ID | Sửa payload/chữ ký JWT của A-USER để giả Admin hoặc subject A-USER2; dùng token đó gọi `/auth/me` và API admin. | Trả 401; không tin vai trò/ID do trình duyệt tự khai; không đọc hoặc sửa dữ liệu của tài khoản bị giả mạo. | P1 |
| TC-PQ-09 | Phiên đã hết hạn hoặc thu hồi không còn quyền | Với fixture phiên hết hạn; và phiên đăng nhập rồi logout, dùng lại token gọi `/auth/me`, `/orders`, API admin. Chạy độc lập từng trường hợp. | Trả 401 kể cả JWT của phiên bị thu hồi chưa tới exp; không thực hiện nghiệp vụ; giao diện yêu cầu đăng nhập lại. | P1 |
| TC-PQ-10 | Quyền được kiểm tra lại từ database | Trong database kiểm thử, hạ A-ADMIN từ role=1 xuống 0 sau khi đã cấp token; giữ token và gọi GET `/admin/orders`; sau ca khôi phục fixture. | Request tiếp theo trả 403; `/auth/me` phản ánh User. Không tiếp tục cấp quyền Admin từ token/giao diện đã lưu trước đó. | P1 |
| TC-PQ-11 | Không truy cập/chỉnh đơn của người khác | A-USER2 gọi GET `/orders/<DH-ONLINE>`, POST `/orders/<id>/cancel` và POST `/orders/<id>/payments/vnpay` của A-USER. | Trả 404 từng API; không lộ nội dung đơn hoặc URL thanh toán; trạng thái, kho, khoản hoàn không đổi. | P1 |
| TC-PQ-12 | Không chỉnh giỏ của người khác | Lấy itemId trong giỏ A-USER; dùng A-USER2 PATCH số lượng hợp lệ và DELETE item đó; kiểm tra giỏ hai người. | Trả 404; giỏ A-USER không đổi; request không sửa/xóa một item khác trong giỏ A-USER2. | P1 |
| TC-PQ-13 | Phân quyền phiếu đổi trả | A-USER2 GET phiếu của A-USER và tạo phiếu bằng OrderItem của A-USER; A-USER gọi API admin chuyển trạng thái phiếu. | Hai thao tác truy cập đối tượng khác chủ trả 404; API quản trị trả 403; không lộ phiếu hoặc tạo/cập nhật phiếu trái quyền. | P1 |
| TC-PQ-14 | Không đổi người dùng/vai trò qua hồ sơ | A-USER PATCH `/users/me` với username hợp lệ nhưng thêm userId của A-USER2 hoặc role=1; kiểm tra độc lập từng body. | Trả 400 vì trường ngoài schema; cả hai hồ sơ/vai trò giữ nguyên. Body chỉ chứa trường được hỗ trợ chỉ sửa chính A-USER. | P1 |
| TC-PQ-15 | Chỉ trả thông tin thanh toán theo quyền | So sánh GET chi tiết đơn của chủ đơn và của Admin; xem `/payments/methods` và cấu hình chatbot public. | Chủ đơn thấy tiến độ nhưng không có gatewayTransactionNo/responseCode của payment, reference/note của paymentRefunds; Admin thấy các trường đối soát. Không response nào chứa hash secret, AUTH_SECRET hoặc paymentUrl trong lịch sử; chatbot public không có system prompt. | P1 |
| TC-PQ-16 | IPN công khai vẫn bắt buộc xác thực riêng | Không gửi Bearer token, gọi `/payments/vnpay/ipn` lần lượt với query thiếu/sai chữ ký và TT-OK hợp lệ trên đơn test. | IPN sai trả HTTP 200 với RspCode=97, không ghi nhận tiền; IPN hợp lệ trả RspCode=00 và cập nhật đúng một giao dịch. Việc endpoint không yêu cầu login không cho phép tự xác nhận thanh toán. | P1 |

### 3.14. Bổ sung nghiệp vụ quản lý tồn kho

**Tiền điều kiện:** Backend thật; mỗi ca dùng BK-KHO/BK-THIEU độc lập. Admin điều chỉnh qua POST `/admin/products/:id/stock-adjustments` với `{ delta, reason }` và header Idempotency-Key. Giỏ không giữ chỗ; checkout mới trừ tồn. Đối chiếu cả Books.stockQuantity và Inventory_Movements, không chỉ số hiển thị trên giao diện.

| Mã TC | Nội dung kiểm thử | Dữ liệu và các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| TC-KHO-01 | Tồn ban đầu và đường cập nhật hợp lệ | Admin tạo sách mới chỉ có trường được hỗ trợ; đọc tồn. Gửi lại tạo/sửa sách với trường tự chèn stockQuantity. | Sách mới có tồn 0; body tự chèn stockQuantity bị từ chối 400. Muốn nhập kho phải dùng API điều chỉnh có lý do và key. | P1 |
| TC-KHO-02 | Nhập thêm sách | BK-KHO tồn 10; Admin gửi delta=5, reason=`Nhập sách đợt kiểm thử`, K-01; tải lại chi tiết. | Trả 200, tồn 15; thêm đúng một movement +5 có reason, actorId và referenceKey; số tồn giữ sau tải lại. | P1 |
| TC-KHO-03 | Xuất/giảm tồn hợp lệ | BK-KHO tồn 10; gửi delta=-3, lý do hợp lệ, key mới. | Tồn còn 7; một movement -3; không sửa giá, đơn bán cũ hoặc số lượng trong các giỏ hiện có. | P1 |
| TC-KHO-04 | Giảm tồn về đúng 0 | BK-KHO tồn 10; gửi delta=-10; User thử thêm 1 cuốn vào giỏ. | Điều chỉnh thành công, tồn 0; thêm giỏ bị 409 do vượt tồn, không tạo dòng giỏ; sách không bị xóa hoặc đổi isActive. | P1 |
| TC-KHO-05 | Chặn tồn âm | Tồn 10; gửi delta=-11. Chụp tồn và số movement trước/sau. | Trả 409; tồn vẫn 10, không thêm movement và không lưu một phần điều chỉnh. | P1 |
| TC-KHO-06 | Kiểm tra biên dữ liệu điều chỉnh | Chạy riêng delta=0, 1.5, chuỗi `"5"`, ±1000001; thiếu lý do, lý do chỉ khoảng trắng hoặc 1001 ký tự. Trường còn lại hợp lệ. | Trả 400 từng bộ dữ liệu; không đổi kho/nhật ký. Delta nguyên khác 0 trong [-1000000,1000000] cùng lý do 1–1000 ký tự được xét tiếp theo tồn thực tế. | P2 |
| TC-KHO-07 | Gửi lặp cùng nội dung điều chỉnh | Tồn 10; gửi hai lần delta=3, cùng reason, K-01, cùng Admin và cùng sách. | Hai lần trả 200 nhưng tồn cuối chỉ 13; đúng một movement +3, không nhập thành 16. | P1 |
| TC-KHO-08 | Không tái dùng key cho nội dung khác | Sau lần +3 bằng K-01, gửi lại K-01 với delta=4 hoặc reason khác, cùng Admin/sách. | Trả 409; tồn và movement của lần +3 giữ nguyên; không ghi yêu cầu thứ hai. | P1 |
| TC-KHO-09 | Key thiếu hoặc sai định dạng | Gọi điều chỉnh với thiếu key, key 7 ký tự, 101 ký tự hoặc chứa khoảng trắng. | Trả 400; không đổi kho. Key hợp lệ dài 8–100 ký tự, gồm chữ/số/gạch dưới/gạch ngang. | P2 |
| TC-KHO-10 | Thêm giỏ không trừ tồn | Tồn 10; hai User lần lượt thêm 7 cuốn cùng sách vào giỏ; đọc kho sau mỗi thao tác. | Cả hai giỏ có 7 khi thêm còn hợp lệ; tồn vẫn 10, không có movement sale. Không coi hai giỏ là đã giữ 14 cuốn. | P1 |
| TC-KHO-11 | Checkout trừ đúng tồn và ghi sổ | BK-KHO tồn 10; A-USER đặt 2 cuốn COD; đối chiếu snapshot đơn, cart và movement. | Tồn 8; đơn có một dòng số lượng 2/đơn giá 100000; có một sale delta=-2; giỏ đã checkout rỗng. | P1 |
| TC-KHO-12 | Giỏ nhiều sách có một dòng thiếu tồn | Giỏ có BK-KHO x2 và BK-THIEU x2 khi trước đó đủ tồn; dùng Admin giảm BK-THIEU về 1 trước checkout. | Checkout trả 409; không tạo đơn/checkout request; cả hai sách giữ tồn ngay trước request, không lưu sale của BK-KHO; toàn bộ giỏ còn để khách sửa. | P1 |
| TC-KHO-13 | Hai khách tranh cuốn cuối | Chuẩn bị tồn 1 và hai giỏ mỗi giỏ 1 cuốn; gửi đồng thời hai checkout với key khác nhau. | Chính xác một request 201 và một request 409; một đơn được tạo, một sale -1, tồn 0; giỏ bên thất bại không bị xóa. | P1 |
| TC-KHO-14 | Điều chỉnh giảm kho tranh chấp checkout | Tồn 3; giỏ mua 2; gửi đồng thời Admin delta=-2 và User checkout 2. Lặp trên fixture mới để đổi thứ tự thắng. | Chỉ một thao tác thành công, thao tác còn lại 409; tồn cuối 1. Nhật ký chỉ phản ánh thao tác thành công, không có tồn âm hay đơn thiếu sách. | P1 |
| TC-KHO-15 | Hủy đơn thật hoàn tồn một lần | Tồn 10 trước đặt 2 cuốn; checkout còn 8; gửi đồng thời hai yêu cầu hủy cùng đơn đang Processing với lý do hợp lệ. | Đơn Cancelled, tồn cuối 10; đúng một movement cancel +2 cho sách, không hoàn thành 12; yêu cầu lặp không tạo thêm sự kiện hủy. | P1 |
| TC-KHO-16 | Đơn mẫu không phát sinh tồn giả | Ghi tồn hiện tại; hủy DH-MAU đang Processing, xác nhận không có sale của đơn. Chạy riêng đơn thật bị xóa sale bằng fixture lỗi. | Đơn seed hủy được nhưng không tăng kho/không tạo cancel movement cho phần chưa trừ. Đơn thật thiếu sale trả 409 cần đối soát; trạng thái và kho giữ nguyên. | P1 |
| TC-KHO-17 | Tồn khi đổi trả hoặc đổi sách | Tạo đơn đã giao; hoàn tất phiếu return có quantity=2, restockQuantity=1. Chạy riêng resolution=refund và exchange với sách thay thế đủ tồn. | Chỉ nhập lại 1 cuốn; exchange xuất đúng 2 cuốn thay thế. Movement return/exchange riêng và chỉ ghi một lần khi gửi lặp; hoàn tiền không tự nhập lại toàn bộ số đã mua. | P1 |
| TC-KHO-18 | Chặn tràn giới hạn số nguyên tồn | Dùng fixture riêng đặt tồn ở 2147483646; Admin +1 bằng key mới, sau đó +1 bằng key khác. | Lần đầu tồn 2147483647; lần sau 409, không tràn số hoặc ghi movement lỗi. Sau ca khôi phục fixture, không áp dụng dữ liệu biên lên catalog đang bán. | P2 |

### 3.15. Bổ sung xử lý đơn hàng, thanh toán và hủy/hoàn

**Tiền điều kiện:** Backend thật, các fixture mục 2; đơn thật có sale và đủ thông tin người nhận. POST checkout cần key; hủy gửi `{ note }`. Ca online dùng merchant test, callback ký đúng dữ liệu. Một dòng có nhiều trạng thái/bộ dữ liệu phải chạy độc lập và lưu kết quả từng lượt.

| Mã TC | Nội dung kiểm thử | Dữ liệu và các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| TC-XLDH-01 | Checkout COD lưu trọn giao dịch | Giỏ BK-KHO x2, tồn 10; gửi thông tin nhận hàng hợp lệ, COD, K-01; đọc đơn/giỏ/kho sau tạo. | Trả 201; đơn đúng chủ, Processing/UNPAID, tổng 200000; có snapshot, sự kiện đặt đơn, sale -2 và CheckoutRequest; tồn 8, giỏ rỗng. | P1 |
| TC-XLDH-02 | Checkout lặp và mất phản hồi | Gửi hai checkout đồng thời cùng User/body/K-01; giả lập client mất phản hồi. Sau khi xác định đơn đã được tạo, thêm sách vào giỏ mới rồi retry checkout với body/K-01 cũ. | Mọi lần xử lý thành công trả cùng ID đơn; chỉ một đơn, một lượt trừ kho và một CheckoutRequest; retry không mua lại hoặc xóa sách trong giỏ mới. | P1 |
| TC-XLDH-03 | Key checkout khác nội dung hoặc không có | Sau checkout K-01, gửi K-01 với shippingName/paymentMethod khác; chạy riêng key thiếu/sai. Gửi key mới khi giỏ đã rỗng. | Cùng key khác body trả 409; key thiếu/sai trả 400; key mới/giỏ rỗng trả 400. Không tạo thêm đơn hoặc sale. | P1 |
| TC-XLDH-04 | Không tin thông tin tiền/chủ đơn từ client | Gửi checkout có totalAmount/totalPrice=1 hoặc userId của A-USER2; chạy riêng từng trường tự chèn. Sau đó checkout body hợp lệ. | Body chứa trường ngoài schema trả 400. Đơn hợp lệ lấy chủ từ phiên, giá và tổng từ server; không tạo đơn 1 VND hoặc gán cho người khác. | P1 |
| TC-XLDH-05 | Snapshot lịch sử và giá trước checkout | Trước checkout đổi giá BK-KHO thành 110000, đặt 2 cuốn; sau checkout đổi tiếp tên/ảnh/giá thành 120000. | Đơn mới chốt tổng 220000 và thông tin tại checkout; các lần đọc sau không đổi snapshot/tổng theo catalog mới. | P1 |
| TC-XLDH-06 | Chặn bỏ bước, lùi bước và sửa đơn kết thúc | Dùng Admin thử Processing→Shipping, Preparing→Processing, Done→Processing, Cancelled→Preparing với body hợp lệ. | Trả 409 từng ca; không đổi trạng thái, completedAt, paymentStatus, số tiền hoặc tạo sự kiện cập nhật trái lệ. | P1 |
| TC-XLDH-07 | COD chỉ hoàn thành sau xác nhận thu tiền | Đưa DH-COD qua Preparing/Shipping; gửi Done thiếu paymentCollected hoặc false, rồi gửi true. | Hai lần đầu 400, đơn vẫn Shipping/UNPAID; lần true 200, Done/PAID, có completedAt và một sự kiện hoàn thành. | P1 |
| TC-XLDH-08 | Hoàn thành lặp không tăng doanh thu | Đơn đã Done; ghi completedAt và báo cáo cùng khoảng ngày; gửi lại Done nhiều lần, kể cả đồng thời; đọc lại báo cáo. | Trả lại đơn hiện có; completedAt và tổng tiền bất biến; không thêm sự kiện Done, không tăng số đơn/doanh thu hoặc ghi thêm sale. | P1 |
| TC-XLDH-09 | Giới hạn trạng thái hủy theo vai trò | Chạy độc lập: User hủy Processing và Preparing; Admin hủy Processing và Preparing; cả hai hủy Shipping/Done. Luôn gửi lý do hợp lệ. | User chỉ hủy Processing; Admin hủy được Processing/Preparing. Các trường hợp còn lại 409, không hoàn kho/tiền sai trạng thái. | P1 |
| TC-XLDH-10 | Xác nhận hủy và lý do | Mở hộp hủy trên giao diện; để trống/chỉ khoảng trắng, nhập lý do hợp lệ rồi chọn Giữ đơn. Gọi API riêng với note rỗng/2001 ký tự. | Không cho xác nhận khi lý do rỗng; Giữ đơn không gửi hủy; API dữ liệu sai trả 400. Khi xác nhận hợp lệ, lưu lý do trong lịch sử; client cũ POST body trống vẫn dùng lý do mặc định theo hợp đồng tương thích. | P2 |
| TC-XLDH-11 | VNPay thiếu cấu hình không tạo đơn dở | Bỏ cấu hình merchant trên server test; mở giỏ và thử checkout VNPAY qua API, trong khi giỏ và tồn hợp lệ. | Giao diện vô hiệu hóa VNPay, vẫn có COD; API trả 503; không tạo đơn, không trừ kho và không xóa giỏ. | P1 |
| TC-XLDH-12 | Tạo link VNPay và chống tạo trùng | DH-ONLINE Processing/UNPAID; gửi đồng thời hai yêu cầu tạo link; đối chiếu paymentUrl/expiresAt và Payment_Attempts. | Cùng một link còn hiệu lực, một attempt PENDING; số tiền khớp đơn và nhân 100 trong tham số VNPay; thời hạn 15 phút, mã tham chiếu duy nhất. | P1 |
| TC-XLDH-13 | Link thất bại/hết hạn và thanh toán lại | Gửi TT-FAIL cho attempt đầu; tạo link mới. Cho link mới hết hạn bằng clock/fixture test, đọc đơn và tạo link lần nữa. | Attempt thất bại/đã hết hạn được thể hiện đúng; cấp link mới với mã tham chiếu mới. Đơn vẫn Processing/UNPAID, giữ tồn đã trừ; không tự hủy, không tạo đơn hay trừ kho lần nữa. | P1 |
| TC-XLDH-14 | Chặn IPN giả mạo và sai số tiền | Chạy riêng: sửa chữ ký, merchant sai, thêm tham số vnp_ trùng; callback ký đúng nhưng số tiền khác; mã tham chiếu không tồn tại. | IPN trả HTTP 200 với RspCode lần lượt 97 cho xác thực/tham số sai, 04 cho sai tiền, 01 cho không có tham chiếu. Không ghi PAID, refund hoặc sự kiện thành công. | P1 |
| TC-XLDH-15 | Return không thay thế IPN | Chỉ gọi Return có chữ ký hợp lệ và mã thành công, chưa gửi IPN; sau đó gửi TT-OK, đọc lại trang chi tiết. Chạy thêm truy cập IPN bằng HEAD. | Return chuyển hướng về đơn nhưng đơn vẫn UNPAID khi chưa có IPN; IPN hợp lệ mới ghi PAID. Trang chờ tối đa 30 giây rồi cho làm mới nếu chưa xác nhận. HEAD IPN trả 405, không ghi tiền. | P1 |
| TC-XLDH-16 | IPN đồng thời và xử lý đơn đã trả online | Gửi đồng thời hai TT-OK cùng attempt; trước đó thử chuyển Preparing khi UNPAID, sau callback chuyển đủ Preparing/Shipping/Done. | Trước trả tiền bị 409; callback trả một mã 00, một mã 02; chỉ một lần ghi thành công. Sau PAID được xử lý đơn, Done không cần xác nhận thu COD; không thu tiền lần hai. | P1 |
| TC-XLDH-17 | Hủy đơn online đã trả và hoàn thủ công | Cho DH-ONLINE PAID rồi hủy khi Processing; Admin chuyển trả tiền trong môi trường test, xác nhận khoản hoàn bằng reference/note/refundConfirmed=true. | Hủy thành Cancelled/REFUND_PENDING, hoàn kho một lần; khoản hoàn đúng tiền đã thu. Xác nhận đủ chuyển REFUNDED, có thời điểm/người xác nhận; API không tự chuyển tiền qua ngân hàng. | P1 |
| TC-XLDH-18 | Tiền báo về sau khi hủy hoặc thu trùng | Chạy riêng: hủy đơn chưa trả rồi gửi TT-OK; gửi hủy đồng thời TT-OK; hai attempt khác nhau của cùng đơn cùng báo thu thành công. | Đơn đã hủy không được mở lại; mọi khoản thực thu được lưu để hoàn. Với đơn còn xử lý, chỉ một khoản được áp dụng, khoản dư có refund riêng; không bỏ mất tiền, không hoàn kho hai lần. | P1 |
| TC-XLDH-19 | Xác nhận hoàn tiền chống trùng/sai đối tượng | Với refund đang PENDING, gọi thiếu reference/note, refundConfirmed=false, refund thuộc đơn khác; sau đó xác nhận hợp lệ hai lần cùng nội dung và lần cuối đổi reference. | Thiếu/sai xác nhận trả 400; refund không thuộc đơn trả 404. Hai lần hợp lệ trả cùng kết quả, chỉ một sự kiện hoàn; đổi nội dung sau hoàn trả 409. Có nhiều khoản thì chỉ REFUNDED khi tất cả được xác nhận. | P1 |
| TC-XLDH-20 | Báo cáo và persistence sau hủy/hoàn | Ghi báo cáo; hủy/hoàn đơn chưa Done; đối chiếu lại. Tạo đơn online đã Done, xử lý phiếu hoàn đổi trả hợp lệ; khởi động lại server test, đăng nhập lại và đọc đơn/ledger/báo cáo. | Hủy đơn chưa ghi nhận doanh thu không làm netRevenue bị trừ thêm; khoản hoàn hủy/thu dư theo dõi riêng. Hoàn đổi trả đơn đã giao ghi RefundRecord và refunded/netRevenue đúng; dữ liệu đơn, payment/refund, tồn, completedAt giữ sau restart. | P1 |

### 3.16. Kiểm thử chịu tải và hiệu năng

**Mục đích:** Xác định mức phục vụ ổn định, khả năng xử lý tranh chấp và phục hồi sau tải cao. Các mức tải/ngưỡng dưới đây là **mục tiêu đề xuất cho báo cáo**, chưa phải số liệu đã đo hoặc cam kết năng lực của hệ thống.

**Chuẩn bị:** Dùng bản production (`npm run build`, `npm start`), PostgreSQL và database test riêng. Ghi cấu hình CPU/RAM/OS/Node/PostgreSQL, số tiến trình ứng dụng, độ trễ mạng và cấu hình pool; hiện mỗi tiến trình Prisma cấu hình tối đa 10 kết nối. Chuẩn bị khoảng 200 sách, 200 User, 10.000 đơn có chi tiết/lịch sử và tồn đủ cho tải thường. Dữ liệu này là fixture cần tạo, không phải quy mô hiện có của seed. Có thể dùng k6 hoặc JMeter; ghi công cụ/phiên bản khi chạy, mục này không yêu cầu cài hoặc chạy công cụ ngay.

**Mô hình tải và cách đo:**

- VU là người dùng ảo; mỗi VU ghi có tài khoản, giỏ và key riêng. Tạo phiên trước thời gian đo, tuân thủ giới hạn login, không đăng nhập lại trong mỗi vòng; không dùng chung giỏ của một User cho tải mua hàng thông thường.
- Tải hỗn hợp: 70% thao tác đọc catalog/tìm kiếm/chi tiết, 15% giỏ, 10% checkout COD, 5% truy vấn quản trị bằng tài khoản Admin riêng. Một lượt checkout luôn chuẩn bị giỏ hợp lệ; đo cả thời gian API checkout và tỷ lệ hoàn tất luồng. Có khoảng nghỉ 1–3 giây giữa các lượt người dùng; ghi tỷ lệ thực tế công cụ sinh được.
- Khởi động tải 2 phút trước đo; tách các pha tăng tải/giữ tải/giảm tải. Báo P50/P95/P99 theo nhóm API, request/giây, số VU thực tế, số thành công/thất bại theo mã HTTP/RspCode và thời gian chờ. Request bị bỏ do không đủ worker cũng phải báo, không tính như đã xử lý thành công.
- Mục tiêu tại tải thường 50 VU: P95 API đọc ≤1000 ms; P95 giỏ/checkout/cập nhật đơn ≤2000 ms; tỷ lệ lỗi ngoài dự kiến ≤1%; không có sai lệch đơn/tiền/kho. Chỉ tính khi request hợp lệ và không chủ đích gây xung đột/giới hạn tần suất. Vẫn thống kê toàn bộ 400/409/429, không loại lỗi ngoài dự kiến để làm đẹp tỷ lệ.
- Không gửi tải lớn tới VNPay, Gemini hoặc hệ thống ngoài. Dùng callback ký bằng khóa test/provider giả lập nội bộ. Báo riêng độ trễ ứng dụng; kết quả không chứng minh năng lực của cổng thanh toán thật.

| Mã TC | Nội dung kiểm thử | Dữ liệu và các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| TC-CT-01 | Đo đường cơ sở | Sau warm-up, chạy 1 VU trong 5 phút, catalog có phân trang/tìm kiếm và checkout COD trên các giỏ mới. Ghi response time và đối chiếu toàn bộ đơn tạo ra. | Có số liệu đường cơ sở P50/P95/P99/RPS, không lỗi ngoài dự kiến và không sai tiền/kho; dùng so sánh các mức tải sau, không suy ra công suất tối đa từ 1 VU. | P2 |
| TC-CT-02 | Tải thường trên catalog | Tăng 10→25→50 VU trong 3 phút, giữ 50 VU 10 phút; chỉ GET danh sách, tìm kiếm, chi tiết với dữ liệu phân bố nhiều sách/từ khóa. | P95 đọc ≤1000 ms, lỗi ngoài dự kiến ≤1% ở pha giữ; phân trang/tổng số vẫn đúng; không crash. Ghi CPU/RAM, DB query và kết nối thực tế. | P2 |
| TC-CT-03 | Tải hỗn hợp đọc/ghi | Chạy mô hình tỷ lệ đã nêu, tăng đến 50 VU rồi giữ 10 phút; mỗi checkout mới có giỏ/key riêng, tồn đủ; tách số liệu từng API. | Đạt ngưỡng tải thường; tất cả đơn thành công đúng chủ/giá/tổng, giỏ đã mua được xóa, kho/ledger khớp. Không ghi nhận lỗi 409 do fixture thiếu tồn như một bài đo đủ tồn thành công. | P1 |
| TC-CT-04 | Dồn tải vào sách cuối kho | 100 tài khoản/giỏ khác nhau cùng mua 1 cuốn của sách tồn 10, khởi phát đồng thời; chờ đủ 100 kết quả và đối chiếu DB. | Đúng 10 checkout 201, 90 checkout 409 nếu không có lỗi hạ tầng; tồn 0, 10 đơn/sale, không oversell. Nếu có timeout/5xx phải đối soát key/đơn và ghi Không đạt/Bị chặn theo nguyên nhân, không mặc định là thất bại không tạo đơn. | P1 |
| TC-CT-05 | Tải lặp trên cùng một thao tác | Gửi đồng thời 50 checkout cùng User/body/key; chạy đợt riêng 50 điều chỉnh tồn cùng sách/Admin/body/key. Không trộn với tải tài khoản độc lập. | Checkout chỉ có một đơn/một sale; điều chỉnh chỉ một movement và một lần delta. Ghi thời gian chờ khóa, mã HTTP và retry; mọi timeout phải đối soát theo key trước khi kết luận. | P1 |
| TC-CT-06 | Đột biến lượng truy cập | Từ 10 VU ổn định tăng lên 100 VU trong 10 giây, giữ 2 phút, giảm về 10 VU; dùng mô hình hỗn hợp và tồn đủ. | Không mất/ghi dở đơn hoặc sai kho. Ghi độ trễ/lỗi ở đỉnh; sau giảm tải, trong 2 phút mục tiêu trở lại ngưỡng tải thường. Không kết luận 100 VU đạt SLA nếu chỉ đạt tính toàn vẹn. | P2 |
| TC-CT-07 | Xác định điểm bão hòa | Chạy các bậc 25/50/100/150/200 VU, mỗi bậc 3 phút; ngừng tăng khi lỗi ngoài dự kiến >5% hoặc P95 ghi >10 giây liên tục 1 phút, hoặc đạt 200 VU. Ghi tài nguyên và nhóm API nghẽn. | Xác định mức lớn nhất còn đạt mục tiêu, mức bắt đầu suy giảm và nguyên nhân có số liệu. Tính toàn vẹn vẫn phải giữ ở mọi bậc; vượt ngưỡng mục tiêu phải báo rõ, không gán “Đạt 200 User” chỉ vì tiến trình chưa dừng. | P2 |
| TC-CT-08 | Chạy bền và theo dõi tài nguyên | Sau warm-up, giữ 25 VU tải hỗn hợp trong 30 phút; lấy mẫu CPU/RAM/kết nối và P95 mỗi phút; đối soát toàn bộ đợt sau chạy. | Đạt ngưỡng tải thường; không crash, mất kết nối kéo dài hoặc sai dữ liệu. Bộ nhớ/kết nối không tăng liên tục qua các khoảng 10 phút; nếu tăng phải ghi log và phân tích, không tự kết luận rò rỉ chỉ từ một ảnh chụp RAM. | P2 |
| TC-CT-09 | Giới hạn tần suất là phản hồi có chủ đích | Với một User và một đơn online chưa trả, gửi 21 yêu cầu tạo link trong cùng cửa sổ 60 giây cố định, không có lượt trước đó trong scope payment-link; kiểm tra lại sau cửa sổ mới. Không trộn với bài đo checkout. | 20 lượt đầu có thể trả 200 với cùng link; lượt 21 trả 429 và Retry-After; không sinh 20 attempt. Sau cửa sổ mới được xử lý lại. Báo 429 riêng như kết quả bảo vệ, không đồng nhất với lỗi 5xx. | P1 |
| TC-CT-10 | Tải callback và đối soát tiền | Chuẩn bị 20 đơn/attempt riêng; gửi tổng 100 IPN TT-OK, mỗi attempt lặp 5 lần, bằng khóa test nội bộ. Cho một nhóm đơn bị hủy trước/trong lúc callback. | Mỗi attempt thành công ghi một lần; IPN lặp trả RspCode=02; đơn đã hủy có khoản chờ hoàn, không mở lại. Đếm RspCode, event, payment/refund và movement, không chỉ đếm HTTP 200. | P1 |
| TC-CT-11 | Quản trị và báo cáo trong lúc có tải | Chạy 50 VU mua/tra cứu; một Admin đọc danh sách/chi tiết đơn, chuyển các đơn COD riêng đúng trạng thái và truy vấn báo cáo kỳ tháng. Ghi riêng latency báo cáo. | Admin không bị lộ/sửa nhầm dữ liệu do tải; trạng thái chuyển đúng và chỉ ghi nhận doanh thu một lần. Mục tiêu P95 danh sách/ghi ≤2000 ms, báo cáo ≤3000 ms; đối soát báo cáo sau khi chờ mọi request kết thúc. | P1 |
| TC-CT-12 | Phục hồi và đối soát sau tải | Kết thúc tải thường/đột biến, chờ các request đang chạy hoàn tất; kiểm tra ready, gửi 10 luồng mua mới, đọc đơn cũ và đối soát ledger. Khi chủ đích restart test server, lưu key của request chưa biết kết quả rồi retry đúng key. | Dịch vụ tiếp tục xử lý; không tạo đơn trùng từ retry. Tồn cuối = tồn đầu + tổng delta movement phát sinh trong đợt, không âm; số đơn/tiền/kho và payment/refund khớp. Mục tiêu trở lại ngưỡng tải thường trong 2 phút sau giảm tải. | P1 |

**Bộ bằng chứng cho kiểm thử tải:** Kịch bản công cụ và tham số, mã build/commit, cấu hình máy, fixture, thời điểm từng pha, thống kê latency/throughput/mã lỗi, log ứng dụng/PostgreSQL, biểu đồ tài nguyên và bảng đối soát DB trước/sau. Không đính kèm token, khóa merchant hoặc thông tin cá nhân thật.

## 4. Kịch bản kiểm thử xuyên suốt

Các kịch bản dưới đây kết hợp các TC đã liệt kê, không tính thành nhóm test case độc lập.

| Mã kịch bản | Trình tự | Điểm đối chiếu |
| --- | --- | --- |
| E2E-01 | Đăng ký → tìm sách → xem chi tiết → thêm giỏ → cập nhật số lượng → checkout → Admin chuyển đủ trạng thái → User xem đơn | Dữ liệu thuộc đúng tài khoản; số lượng và tiền nhất quán; trạng thái đến `Done`; đơn không biến mất sau tải lại. |
| E2E-02 | Admin tạo nhóm/con → thêm sách → User tra cứu và thêm giỏ → Admin đổi giá → User đặt hàng → Admin đổi giá tiếp | Tên nhóm và sách đồng bộ; giỏ lấy giá mới; đơn đã đặt giữ đơn giá/tổng tại checkout. |
| E2E-03 | User gửi phiếu đổi trả bằng sách mẫu đủ hạn → Admin tìm phiếu và xử lý từng bước → User xem kết quả | Phiếu đúng chủ; lịch sử đầy đủ; `completed` khóa cập nhật; không giả định phiếu tự liên kết với đơn E2E-01. |
| E2E-04 | User thêm sách → Admin ẩn sách → User checkout thất bại → User xóa sách đã ẩn → đặt các sách còn lại | Không đặt được sách ngừng bán; giỏ còn lại tính đúng; lịch sử đơn cũ không mất khi sách bị ẩn. |
| E2E-05 | User đặt đơn → User khác thử đọc/hủy/thanh toán đơn đó → Admin xử lý đúng đơn → chủ đơn kiểm tra lại | User khác bị chặn 404; chỉ Admin cập nhật tiến độ; chủ đơn thấy đúng trạng thái và thông tin được phép. Tham chiếu TC-PQ-04/05/11/15. |
| E2E-06 | Nhập 1 cuốn → hai User cùng thêm giỏ → checkout đồng thời → người thắng hủy → người còn lại checkout lại | Một người mua thành công; hủy hoàn đúng 1 cuốn; người còn lại mua được sau hoàn kho; ledger không tạo tồn âm hoặc tồn giả. Tham chiếu TC-KHO-10/13/15. |
| E2E-07 | Đặt VNPay → nhận IPN thành công → khách hủy khi Processing → Admin chuyển hoàn tiền test và xác nhận → khách xem tiến độ | Đơn Cancelled; paymentStatus đi qua PAID→REFUND_PENDING→REFUNDED; kho hoàn một lần, không ghi nhận doanh thu từ đơn chưa giao. Tham chiếu TC-XLDH-16/17/19/20. |
| E2E-08 | Chuẩn bị dữ liệu → chạy tải thường → tăng tải đột biến → giảm tải → retry request mất phản hồi và đối soát | Có số liệu hiệu năng và báo cáo mã lỗi từng pha; toàn vẹn đơn/tiền/kho, dịch vụ phục hồi theo mục tiêu. Tham chiếu TC-CT-03/06/12; không ghi Đạt nếu chưa có số đo. |

## 5. Ghi nhận kết quả thực thi

### 5.1. Mẫu biên bản cho từng test case

Sao chép mẫu này cho từng TC/bộ dữ liệu khi thực hiện. Chỉ đánh dấu **Đạt** sau khi đã đối chiếu đủ kết quả mong đợi và có bằng chứng tương ứng.

| Trường | Giá trị cần ghi |
| --- | --- |
| Mã test case / bộ dữ liệu | Ví dụ: `TC-SP-06 / giá 13 chữ số` |
| Build / commit | Điền khi chạy |
| Người kiểm thử | Điền khi chạy |
| Ngày giờ / trình duyệt | Điền khi chạy; ghi múi giờ nếu liên quan đổi trả |
| Tiền điều kiện thực tế | Tài khoản, ID đối tượng, dữ liệu đã chuẩn bị, mốc thời gian giả lập |
| Kết quả mong đợi | Tham chiếu dòng TC và bộ dữ liệu tương ứng |
| Kết quả thực tế | Chưa thực thi |
| Trạng thái | Chưa chạy / Đạt / Không đạt / Bị chặn / Không áp dụng |
| Bằng chứng | Ảnh màn hình, log, dữ liệu trước/sau hoặc output runner |
| Mã lỗi / ghi chú | Điền khi có khác biệt; ca Bị chặn cần ghi nguyên nhân |

### 5.2. Tiêu chí đánh giá

- **Đạt:** Tất cả bước và kết quả của bộ dữ liệu tương ứng đúng mong đợi, không phát sinh thay đổi dữ liệu ngoài phạm vi.
- **Không đạt:** Có khác biệt với kỳ vọng đã xác định cho môi trường kiểm thử; ghi dữ liệu tái hiện, kết quả thực tế và mã lỗi.
- **Bị chặn:** Chưa thể chạy do thiếu điều kiện/môi trường; không tính là đã kiểm chứng nghiệp vụ.
- **Không áp dụng:** Chức năng không thuộc bản được kiểm thử; ghi lý do, không dùng để bỏ qua lỗi của chức năng đang có.
- Đề xuất hoàn tất vòng kiểm thử khi đã chạy hết ca trong phạm vi, tất cả P1 đạt và các lỗi còn lại có quyết định xử lý được ghi nhận. Chưa thể kết luận chất lượng hệ thống từ tài liệu thiết kế này.

### 5.3. Mẫu kết quả kiểm thử chịu tải cho báo cáo

Ghi một dòng cho từng pha/mức tải hoặc nhóm API, không chỉ ghi trung bình chung của cả đợt. Dấu `—` là chưa có số đo, không phải giá trị 0. Lưu cấu hình máy, công cụ, script, số tiến trình, dữ liệu và giờ bắt đầu/kết thúc trong biên bản đợt.

| Đợt / mã TC / pha | VU mục tiêu / thực tế | Số request / request bị bỏ | RPS | P50 / P95 / P99 (ms) | 2xx / 4xx / 5xx / timeout | Lỗi ngoài dự kiến (%) | CPU / RAM / kết nối DB | Đối soát đơn, tiền, kho | Kết luận |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ví dụ: CT-RUN-01 / TC-CT-03 / giữ tải, API đọc | 50 / — | — / — | — | — / — / — | — / — / — / — | — | — / — / — | Chưa đối soát | Chưa chạy |
| Ví dụ: CT-RUN-01 / TC-CT-03 / giữ tải, API ghi | 50 / — | — / — | — | — / — / — | — / — / — / — | — | — / — / — | Chưa đối soát | Chưa chạy |

Với VNPay, ghi thêm số lượng từng RspCode; HTTP 200 không tự chứng minh thanh toán thành công. Với checkout/điều chỉnh tồn bị timeout, đối soát theo Idempotency-Key trước khi tính số đơn thành công/thất bại. Tỷ lệ lỗi ngoài dự kiến = số request có lỗi ngoài kỳ vọng của kịch bản / tổng request thực sự đã gửi × 100%; báo riêng số lượt không gửi được và các mã từ chối có chủ đích. Các ngưỡng đề xuất phải được chốt trước đợt chạy, không sửa ngưỡng sau khi thấy kết quả để chuyển Không đạt thành Đạt.

### 5.4. Tổng hợp các nhóm bổ sung và đối chiếu mã nguồn

| Nhóm bổ sung | Phạm vi mã TC | Số ca thiết kế | Nguồn đối chiếu chính trong dự án | Trạng thái tại lần bổ sung tài liệu |
| --- | --- | --- | --- | --- |
| Phân quyền | TC-PQ-01–TC-PQ-16 | 16 | `lib/server/auth.ts`, `lib/server/router.ts`, `lib/server/validators.ts`; kiểm thử tích hợp xác thực/role/ownership. | Chưa chạy theo biên bản này |
| Quản lý tồn kho | TC-KHO-01–TC-KHO-18 | 18 | `lib/server/services/catalog.ts`, `lib/server/services/orders.ts`, `lib/server/services/customer-services.ts`; schema/migration Books và Inventory_Movements. | Chưa chạy theo biên bản này |
| Xử lý đơn hàng | TC-XLDH-01–TC-XLDH-20 | 20 | Dịch vụ orders/payments, `lib/server/vnpay.ts`, serializers; `PAYMENTS.md`, `BACKEND_API.md` và các test backend/VNPay. | Chưa chạy theo biên bản này |
| Chịu tải/hiệu năng | TC-CT-01–TC-CT-12 | 12 | Khóa/transaction, pool trong `lib/prisma.ts`, rate limit trong router/http; các mức tải là kế hoạch đo bổ sung. | Chưa chạy, chưa có số liệu hiệu năng |
| **Tổng** | **4 nhóm** | **66** | Không tính lại các ca cũ, bảng nền không có mã TC và các kịch bản E2E. | **Không tự gán kết quả Đạt** |

`tests/backend.integration.mjs`, `tests/vnpay.test.mts` và `tests/order-cancellation.test.mjs` cung cấp bằng chứng tự động cho một phần nghiệp vụ. Khi đưa vào báo cáo, ghi đúng lệnh, build, thời điểm và tập dữ liệu đã chạy. Các test đồng thời vài request hiện có không thay thế TC-CT-01–12 và không chứng minh khả năng phục vụ 50/100/200 người dùng.



