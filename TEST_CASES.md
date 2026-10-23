# KIỂM THỬ HỆ THỐNG (TEST CASES)

**Dự án:** BookStore – Hệ thống bán sách trực tuyến  
**Ngày lập:** 21/10/2026  
**Cơ sở lập:** Giao diện, lớp API, bộ xử lý mock, dịch vụ đổi trả và các bộ kiểm thử hiện có trong dự án.  
**Trạng thái tài liệu:** Thiết kế ca kiểm thử; chưa thực thi và chưa kết luận Đạt/Không đạt.


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
| TC-DH-06 | Xử lý trọn vòng đời | Với đơn `Processing`, chọn lần lượt chuyển sang `Preparing`, `Shipping`, `Done`. | Mỗi lần chỉ tiến một bước; nhãn và thanh tiến độ cập nhật đúng; tải lại vẫn giữ trạng thái. | P1 |
| TC-DH-07 | Khóa nút ở đơn hoàn thành | Mở đơn `Done`. | Hiện thông báo hoàn thành; không còn nút chuyển sang trạng thái khác. | P1 |
| TC-DH-08 | Chặn lùi/bỏ bước [Tích hợp] | Chạy riêng: `Processing` → `Shipping`; `Shipping` → `Preparing`; `Done` → `Processing`. | Mock từ chối; trạng thái và dữ liệu đơn không thay đổi. | P1 |
| TC-DH-09 | Gửi lại trạng thái hiện tại [Tích hợp] | Gửi `Preparing` cho đơn đang `Preparing`. | Bản mock hiện tại chấp nhận, giữ nguyên trạng thái; không tạo đơn mới hoặc sửa các dòng tiền. Khác biệt backend được ghi tại mục 6. | P2 |
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

**Tiền điều kiện:** Đăng nhập A-USER; CART-01 được chuẩn bị mới cho từng ca, trừ ca giỏ rỗng. Sách đang bán. Chức năng thanh toán ở bản hiện tại chỉ bao gồm hiển thị tổng tiền và xác nhận đặt hàng qua checkout.

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
| TC-TT-12 | Không hiểu checkout là đã thanh toán | Đặt thành công rồi xem trang chi tiết và dữ liệu đơn. | Trạng thái chỉ là `Processing`; không suy diễn đã trừ tiền/đã nhận thanh toán từ thông báo đặt hàng. Giao dịch ngân hàng, ví, COD và hoàn tiền chưa có trong luồng hiện tại. | P1 |

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

## 4. Kịch bản kiểm thử xuyên suốt

Các kịch bản dưới đây kết hợp các TC đã liệt kê, không tính thành nhóm test case độc lập.

| Mã kịch bản | Trình tự | Điểm đối chiếu |
| --- | --- | --- |
| E2E-01 | Đăng ký → tìm sách → xem chi tiết → thêm giỏ → cập nhật số lượng → checkout → Admin chuyển đủ trạng thái → User xem đơn | Dữ liệu thuộc đúng tài khoản; số lượng và tiền nhất quán; trạng thái đến `Done`; đơn không biến mất sau tải lại. |
| E2E-02 | Admin tạo nhóm/con → thêm sách → User tra cứu và thêm giỏ → Admin đổi giá → User đặt hàng → Admin đổi giá tiếp | Tên nhóm và sách đồng bộ; giỏ lấy giá mới; đơn đã đặt giữ đơn giá/tổng tại checkout. |
| E2E-03 | User gửi phiếu đổi trả bằng sách mẫu đủ hạn → Admin tìm phiếu và xử lý từng bước → User xem kết quả | Phiếu đúng chủ; lịch sử đầy đủ; `completed` khóa cập nhật; không giả định phiếu tự liên kết với đơn E2E-01. |
| E2E-04 | User thêm sách → Admin ẩn sách → User checkout thất bại → User xóa sách đã ẩn → đặt các sách còn lại | Không đặt được sách ngừng bán; giỏ còn lại tính đúng; lịch sử đơn cũ không mất khi sách bị ẩn. |

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



