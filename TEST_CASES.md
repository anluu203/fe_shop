# Test cases – Website bán linh kiện máy tính

## 1. Đăng nhập và đăng xuất (User/Admin)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-DN-01 | User đăng nhập hợp lệ | Có tài khoản User trên backend; chưa đăng nhập | Mở `/client/auth/login`; nhập email và mật khẩu đúng; chọn Đăng nhập. | Lưu token tại `accessToken`; hiển thị đúng tài khoản; chuyển đến `/client`. | Cao |
| TC-DN-02 | Admin đăng nhập hợp lệ | Có tài khoản Admin trên backend; chưa đăng nhập | Nhập thông tin Admin đúng và gửi form. | Đăng nhập thành công; chuyển `/admin`; hiển thị menu quản trị. | Cao |
| TC-DN-03 | Bỏ trống thông tin | Chưa đăng nhập | Chạy riêng với email rỗng, mật khẩu rỗng và cả hai rỗng; gửi form. | Báo trường bắt buộc; không tạo phiên. | Trung bình |
| TC-DN-04 | Email sai định dạng | Chưa đăng nhập | Thử `abc`, `abc@`, `abc@example`; nhập mật khẩu rồi gửi từng trường hợp. | Form hoặc trình duyệt báo email không hợp lệ; không đăng nhập. | Trung bình |
| TC-DN-05 | Sai email hoặc mật khẩu | Có một tài khoản hợp lệ | Chạy riêng: email đúng/mật khẩu sai; email chưa đăng ký/mật khẩu bất kỳ. | Hiển thị lỗi xác thực từ API; không tạo phiên cho cả hai trường hợp. | Cao |
| TC-DN-06 | Ẩn/hiện mật khẩu | Đang ở form đăng nhập | Nhập mật khẩu; nhấn biểu tượng mắt hai lần. | Chuyển giữa dạng rõ và che; giữ nguyên giá trị nhập. | Thấp |
| TC-DN-07 | Khôi phục phiên | Đã đăng nhập; token còn hiệu lực | Tải lại trang; mở giỏ hàng hoặc hồ sơ. | Gọi lấy tài khoản hiện tại và khôi phục đúng User; không yêu cầu đăng nhập lại. | Cao |
| TC-DN-08 | Token không hợp lệ/hết hạn | Hồ sơ trình duyệt kiểm thử có `accessToken` sai hoặc hết hạn | Tải lại; truy cập `/admin` hoặc `/client/profile`. | Xóa token lỗi; không khôi phục tài khoản; trang cần quyền chuyển đến đăng nhập. | Cao |
| TC-DN-09 | Chặn User/khách vào quản trị | Chạy riêng với User và khách chưa đăng nhập | Mở trực tiếp `/admin`, `/admin/products`, `/admin/orders`, `/admin/stores`, `/admin/warranty`, `/admin/consultation`. | Không hiển thị nội dung quản trị; chuyển đến `/client/auth/login`. | Cao |
| TC-DN-10 | Đăng xuất | Đã đăng nhập | Chọn Đăng xuất ở menu tài khoản; tải lại rồi mở trang cần đăng nhập. | Xóa `accessToken`; giao diện về trạng thái khách; giỏ/đơn/hồ sơ yêu cầu đăng nhập. | Cao |

## 2. Đăng ký tài khoản (User)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-DK-01 | Đăng ký hợp lệ | Backend hoạt động; email chưa tồn tại | Mở `/client/auth/register`; nhập `Nguyễn Văn An`, email mới `kiemthu.<mã-lần-chạy>@example.com`, mật khẩu và xác nhận `TechStore@123`; gửi. | Tạo User mới; tự đăng nhập; chuyển `/client`; không có quyền Admin. | Cao |
| TC-DK-02 | Thiếu trường bắt buộc | Chưa đăng nhập | Lần lượt bỏ trống tên, email, mật khẩu, xác nhận; giữ trường còn lại hợp lệ rồi gửi. | Báo lỗi trường tương ứng; không tạo tài khoản. | Trung bình |
| TC-DK-03 | Biên tên hiển thị | Mỗi lần dùng email mới | Chạy riêng tên 1, 2, 100, 101 ký tự rõ; các trường khác hợp lệ. | Form từ chối 1 và 101; chấp nhận 2 và 100 khi API thành công. | Trung bình |
| TC-DK-04 | Email sai định dạng | Đang đăng ký | Thử `abc`, `abc@`, email chứa khoảng trắng bên trong; gửi từng bộ dữ liệu. | Báo email không hợp lệ; không gửi đăng ký thành công. | Trung bình |
| TC-DK-05 | Email đã tồn tại | Có User với email đã biết | Đăng ký lại email đó; thử thêm biến thể viết hoa; dùng tên/mật khẩu hợp lệ. | API từ chối email trùng; không tạo tài khoản thứ hai. | Cao |
| TC-DK-06 | Biên mật khẩu tối thiểu | Mỗi lần dùng email mới | Thử mật khẩu 7 và 8 ký tự; xác nhận khớp. | Form từ chối 7; cho gửi với 8 ký tự; không tự yêu cầu quy tắc ký tự chưa có. | Cao |
| TC-DK-07 | Xác nhận không khớp | Các trường khác hợp lệ | Nhập `TechStore@123`, xác nhận `TechStore@124`; gửi. | Báo mật khẩu xác nhận không khớp; không tạo tài khoản. | Trung bình |
| TC-DK-08 | Giới hạn backend theo hợp đồng API | Kiểm thử trực tiếp `POST /auth/register`; mỗi bộ dùng email mới | Chạy mật khẩu 72/73 ký tự và tên chỉ khoảng trắng; các trường khác hợp lệ. | Mật khẩu 72 được chấp nhận; 73 hoặc tên rỗng sau chuẩn hóa bị từ chối; không bỏ qua validation khi gọi trực tiếp. | Cao |
| TC-DK-09 | Đăng nhập lại tài khoản mới | Đã đăng ký thành công | Đăng xuất; đăng nhập bằng email/mật khẩu vừa tạo; tải lại. | Đăng nhập và khôi phục đúng tài khoản mới; vai trò vẫn `USER`. | Cao |

## 3. Quản lý hồ sơ cá nhân (User/Admin)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-HS-01 | Xem hồ sơ | Đã đăng nhập | Mở `/client/profile`; đối chiếu thông tin với tài khoản hiện tại. | Đúng tên, email, vai trò, ngày tạo và ảnh đại diện nếu có. | Trung bình |
| TC-HS-02 | Sửa tên hiển thị | Đã đăng nhập; API cập nhật hoạt động | Đổi tên thành `Nguyễn Văn An`; lưu; tải lại. | Báo thành công; tên trên hồ sơ/menu cập nhật; tên mới được giữ sau tải lại. | Cao |
| TC-HS-03 | Tên không hợp lệ | Đang ở hồ sơ | Chạy riêng tên rỗng, toàn khoảng trắng, 1 ký tự; lưu. | Báo tên tối thiểu 2 ký tự; không ghi đè tên hợp lệ trước đó. | Trung bình |
| TC-HS-04 | Đổi ảnh bằng URL | Backend hỗ trợ trường `avatarUrl` | Nhập URL HTTP(S) ảnh hợp lệ ở bộ chọn ảnh; lưu ảnh đại diện; tải lại. | API nhận URL; ảnh hồ sơ và tài khoản cập nhật, được giữ sau tải lại. | Trung bình |
| TC-HS-05 | Upload ảnh đúng loại | Endpoint `/images/avatars` được triển khai | Lần lượt chọn JPEG, PNG, GIF, WebP hợp lệ nhỏ hơn 5 MiB; lưu ảnh. | Upload có preview; lưu URL trả về vào hồ sơ; không gửi file qua JSON. | Trung bình |
| TC-HS-06 | Từ chối ảnh không hợp lệ | Đang ở bộ chọn ảnh | Chạy riêng PDF, SVG và ảnh lớn hơn `5 × 1024 × 1024` byte. | Báo định dạng hoặc dung lượng không hợp lệ; không thay ảnh đã lưu. | Trung bình |
| TC-HS-07 | Xóa ảnh và lỗi cập nhật | Tài khoản đang có avatar | Xóa URL và lưu để gửi `null`; sau đó giả lập API cập nhật trả lỗi trong một lần sửa khác. | Xóa thành công trở về ảnh mặc định; lần sửa lỗi hiển thị thông báo, không báo thành công hoặc mất dữ liệu đã lưu. | Trung bình |

## 4. Tra cứu, tìm kiếm và xem chi tiết linh kiện (User)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-TK-01 | Xem danh sách công khai | Backend có sản phẩm đang bán; chưa đăng nhập | Mở `/client/products`. | Tải danh sách mà không yêu cầu đăng nhập; hiển thị tên, ảnh, giá và thông tin danh mục. | Cao |
| TC-TK-02 | Tìm theo tên | Có sản phẩm `AMD Ryzen 7 7800X3D` | Tìm tên đầy đủ rồi tìm `Ryzen` trên danh sách. | Kết quả chứa sản phẩm khớp; tổng kết quả theo điều kiện tìm. | Cao |
| TC-TK-03 | Tìm không phân biệt hoa thường | Có sản phẩm tên chứa `Ryzen` | Tìm `RYZEN` rồi `ryzen`. | Hai truy vấn trả tập kết quả tương đương theo hợp đồng API. | Trung bình |
| TC-TK-04 | Tìm từ thanh đầu trang | Đang ở trang client bất kỳ | Nhập từ khóa chứa khoảng trắng/ký tự đặc biệt; gửi; thử thêm chuỗi chỉ có khoảng trắng. | Điều hướng đến trang kết quả với URL mã hóa đúng; header không tìm bằng chuỗi trắng. | Trung bình |
| TC-TK-05 | Chọn nhóm và danh mục con | Có nhóm Linh kiện máy tính, các con CPU/RAM | Chọn nhóm; kiểm tra danh sách con; chọn CPU. | Danh sách con bám nhóm đã chọn; sau chọn CPU, gửi `categoryId` đúng và chỉ hiện sản phẩm CPU. | Cao |
| TC-TK-06 | Kết hợp tìm kiếm, lọc và bỏ lọc | Có sản phẩm ở nhiều danh mục | Chọn CPU, tìm `Ryzen`; xóa từ khóa; bỏ danh mục. | Áp dụng đồng thời tìm và lọc; bỏ từng điều kiện khôi phục tập kết quả tương ứng. | Trung bình |
| TC-TK-07 | Phân trang | Có hơn 20 sản phẩm phù hợp | Chuyển trang 1 → 2; thay từ khóa hoặc danh mục khi đang ở trang 2. | Mỗi trang tối đa 20; chuyển trang giữ điều kiện lọc; đổi điều kiện đưa về trang 1. | Trung bình |
| TC-TK-08 | Không có kết quả | Catalog hoạt động | Tìm `zzzz-khong-co-linh-kien-987`; sau đó xóa từ khóa. | Hiển thị trạng thái không tìm thấy; không giữ thẻ cũ; xóa từ khóa tải lại danh sách. | Trung bình |
| TC-TK-09 | Chi tiết, ảnh lỗi và sản phẩm không tồn tại | Có một sản phẩm hợp lệ; có UUID không tồn tại | Mở chi tiết sản phẩm hợp lệ; thử ảnh không tải được; mở ID không tồn tại. | Đúng tên, mô tả, giá, danh mục; ảnh lỗi có cách hiển thị thay thế; ID sai không lộ sản phẩm khác và có liên kết quay lại. | Cao |

## 5. Quản lý giỏ hàng (User)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-GH-01 | Thêm từ thẻ sản phẩm | User đăng nhập; giỏ rỗng; CPU đang bán giá `8000000` | Chọn thêm CPU ở danh sách; mở `/client/cart`. | Một dòng CPU × 1; tạm tính `8000000` đồng; chỉ báo giỏ tăng 1. | Cao |
| TC-GH-02 | Thêm từ chi tiết, gộp cùng sản phẩm | User có CPU × 1; CPU giá `8000000` | Tại chi tiết CPU, chọn số lượng 2 và thêm. | Một dòng CPU × 3; tạm tính `24000000`; không tạo dòng trùng. | Cao |
| TC-GH-03 | Tính tiền nhiều dòng | User có CPU × 2 giá `8000000`, RAM × 1 giá `1000000` | Mở giỏ; kiểm tra dòng và tổng số lượng. | Hai dòng; 3 linh kiện; thành tiền `16000000` và `1000000`; tạm tính `17000000`. | Cao |
| TC-GH-04 | Tăng/giảm số lượng | User có CPU × 2 | Tăng lên 3, chờ API xong; giảm về 2. | API cập nhật đúng `item.id`; số lượng, tiền dòng, tạm tính và tổng dự kiến tính lại. | Cao |
| TC-GH-05 | Biên số lượng | Có giỏ với số lượng 1 hoặc 999 | Kiểm tra nút giảm tại 1; nút tăng tại 999; gọi API trực tiếp với 0, -1, 1.5, 1000. | UI không vượt 1–999; API từ chối số lượng không hợp lệ, giữ dữ liệu trước đó. | Cao |
| TC-GH-06 | Gộp vượt giới hạn | Giỏ đã có một sản phẩm × 999 | Gửi thêm cùng sản phẩm × 1. | API từ chối tổng vượt 999; không tăng số lượng hoặc tạo dòng mới. | Cao |
| TC-GH-07 | Xóa dòng và dòng cuối | Giỏ có hai dòng sản phẩm | Xóa một dòng; kiểm tra tiền; xóa tiếp dòng cuối. | Xóa đúng sản phẩm; cuối cùng giỏ rỗng, chỉ báo về 0; không cho checkout giỏ rỗng. | Cao |
| TC-GH-08 | Xóa toàn bộ/hủy xác nhận | Giỏ có nhiều dòng | Mở xác nhận xóa giỏ rồi hủy; mở lại và xác nhận xóa. | Hủy giữ dữ liệu; xác nhận làm rỗng toàn bộ giỏ; không ảnh hưởng đơn đã đặt. | Cao |
| TC-GH-09 | Lưu và tách giỏ theo tài khoản | Hai User có giỏ khác nhau | User A tải lại; đăng xuất sang B; đăng nhập lại A. | Mỗi User chỉ thấy giỏ riêng; A vẫn giữ dữ liệu đã lưu trên backend. | Cao |
| TC-GH-10 | Khách chưa đăng nhập | Chưa đăng nhập | Nhấn thêm sản phẩm; mở trực tiếp `/client/cart`; gọi API giỏ không token. | Giao diện yêu cầu đăng nhập; API không trả/ghi giỏ của tài khoản khác. | Cao |

## 6. Xem trước địa chỉ và vận chuyển trong giỏ hàng (User)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-VC-01 | Hiển thị thông tin mẫu | User có giỏ không rỗng | Mở phần Thông tin giao hàng. | Có người nhận, điện thoại, địa chỉ, ghi chú mẫu và nhãn Xem trước; thông báo chưa áp dụng khi đặt hàng. | Trung bình |
| TC-VC-02 | Sửa thông tin mẫu hợp lệ | Đang mở giỏ | Chọn Thay đổi; nhập `Nguyễn An`, `0901234567`, địa chỉ hợp lệ; chọn Lưu thông tin mẫu. | Hiển thị dữ liệu vừa nhập trong phiên trang; không gọi API cập nhật địa chỉ thật. | Trung bình |
| TC-VC-03 | Thiếu tên hoặc địa chỉ | Đang sửa thông tin mẫu | Chạy riêng tên rỗng/trắng và địa chỉ rỗng/trắng; lưu. | Form báo cần tên và địa chỉ; không thay thông tin mẫu trước đó. | Trung bình |
| TC-VC-04 | Điện thoại mẫu không hợp lệ/hợp lệ | Đang sửa thông tin mẫu | Chạy riêng `123`, `1901234567`, `0901 234 567`, `+84 901 234 567`; giữ trường khác hợp lệ. | Hai số đầu bị chặn; hai số sau được chấp nhận; quy tắc là 10 chữ số bắt đầu 0 hoặc +84 và 9 chữ số. | Trung bình |
| TC-VC-05 | Hủy sửa và tải lại | Có thông tin mẫu đã lưu trong phiên | Sửa nháp rồi hủy; kiểm tra; tải lại trang. | Hủy không áp dụng nháp; tải lại khởi tạo lại thông tin mẫu, không coi là địa chỉ lưu trên backend. | Trung bình |
| TC-VC-06 | Biên miễn phí giao tiêu chuẩn | Chuẩn bị lần lượt giỏ có tạm tính `499999`, `500000`, `500001` đồng | Chọn giao tiêu chuẩn cho từng giỏ. | Phí dự kiến lần lượt `30000`, `0`, `0`; ngưỡng căn cứ tạm tính trước giảm giá. | Trung bình |
| TC-VC-07 | Chọn giao nhanh | Giỏ ở dưới và trên ngưỡng `500000` | Chọn giao nhanh; đổi lại giao tiêu chuẩn. | Giao nhanh luôn dự kiến `50000`; tiêu chuẩn theo ngưỡng; tổng dự kiến thay đổi, chưa ghi phí vào đơn thật. | Trung bình |

## 7. Xem trước khuyến mãi trong giỏ hàng (User)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-KM-01 | Áp dụng LINHKIEN5 đúng ngưỡng | User có giỏ tạm tính `500000`; giao tiêu chuẩn | Nhập `LINHKIEN5`; chọn Áp dụng thử. | Giảm dự kiến `25000`; phí dự kiến 0; tổng dự kiến `475000`; có nhãn ưu đãi mẫu. | Trung bình |
| TC-KM-02 | Không đủ ngưỡng LINHKIEN5 | Giỏ tạm tính `499999` | Nhập mã rồi áp dụng thử. | Báo cần đạt `500000`; không giảm tiền; tổng dự kiến vẫn gồm phí giao tương ứng. | Trung bình |
| TC-KM-03 | Giới hạn giảm tối đa | Chạy với giỏ `2000000` và `3000000` | Chọn `LINHKIEN5` cho từng giỏ. | Cả hai giảm tối đa `100000`, không giảm quá trần 100.000 đồng. | Trung bình |
| TC-KM-04 | Mã GIAM100K và biên điều kiện | Giỏ lần lượt `1999999` và `2000000` | Nhập `GIAM100K`; áp dụng thử từng trường hợp. | Dưới ngưỡng bị từ chối; đúng ngưỡng giảm dự kiến `100000`. | Trung bình |
| TC-KM-05 | Chuẩn hóa và mã sai | Giỏ đủ điều kiện | Thử `  linhkien5  `; thử `MAKHONGTONTAI` và chuỗi rỗng. | Mã có khoảng trắng/viết thường chuẩn hóa thành `LINHKIEN5`; mã sai/rỗng báo không hợp lệ. | Trung bình |
| TC-KM-06 | Chỉ chọn một mã | Giỏ `3000000`; đang chọn LINHKIEN5 | Chọn GIAM100K, sau đó Bỏ chọn. | GIAM100K thay thế mã cũ; không cộng dồn hai mã; bỏ chọn đưa giảm giá về 0. | Trung bình |
| TC-KM-07 | Giỏ giảm dưới điều kiện | Đang áp dụng GIAM100K cho giỏ đủ `2000000` | Giảm số lượng/xóa dòng để tạm tính còn `1500000`. | Không tính giảm; hiện thông báo mã không còn đủ điều kiện; tính lại tổng dự kiến. | Trung bình |
| TC-KM-08 | Làm tròn giảm giá và cộng phí | Giỏ `500001`, giao nhanh | Chọn LINHKIEN5. | Giảm `25000` do làm tròn xuống; phí `50000`; tổng dự kiến `525001`. | Trung bình |
| TC-KM-09 | Ưu đãi theo đơn giá sản phẩm | Giỏ có hai dòng đơn giá `999999` và `1000000` | Xem ghi chú ưu đãi của từng dòng. | Dưới 1 triệu hiển thị gợi ý mã LINHKIEN5; từ 1 triệu hiển thị quà tặng mẫu; không tự thêm quà vào đơn. | Thấp |

## 8. Đặt hàng và xác nhận tổng tiền (User)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-TT-01 | Checkout thành công | User có CPU × 2 giá `8000000`, RAM × 1 giá `1000000`; backend hoạt động | Chọn Đặt hàng ngay. | Đơn ở `Processing`, đúng chủ và 3 linh kiện, tổng tiền hàng `17000000`; chuyển `/client/orders/<id>`. | Cao |
| TC-TT-02 | Giỏ rỗng sau đặt hàng | Vừa checkout thành công | Mở lại giỏ; thêm một sản phẩm mới. | Giỏ cũ không còn là giỏ đang mở; giỏ mới độc lập; đơn đã đặt giữ nguyên. | Cao |
| TC-TT-03 | Chặn checkout giỏ rỗng | User có giỏ rỗng hoặc chưa có giỏ | Kiểm tra UI; gọi `POST /orders/checkout` trực tiếp. | Không có thao tác đặt cho giỏ rỗng; API từ chối, không tạo đơn rỗng. | Cao |
| TC-TT-04 | Giá được tính lại tại checkout | Giỏ có CPU × 2; giá CPU đổi từ `8000000` thành `8500000` trước đặt | Mở lại giỏ rồi checkout. | Đơn dùng giá hiện tại `8500000`, tổng tiền hàng `17000000`; không dùng giá/tổng cũ. | Cao |
| TC-TT-05 | Số tiền xem trước khác số tiền đơn | Giỏ `2000000`, chọn giao nhanh, GIAM100K và sửa địa chỉ mẫu | Xem tổng `1950000`; checkout; kiểm tra request và đơn trả về. | Tổng dự kiến `1950000`; checkout không gửi địa chỉ/phí/mã mẫu; đơn theo API là tiền hàng `2000000`, không khẳng định đã áp dụng ưu đãi thật. | Cao |
| TC-TT-06 | Tránh gửi lặp từ giao diện | Giỏ không rỗng; làm chậm phản hồi API | Nhấn nhanh Đặt hàng ngay nhiều lần. | Nút bị vô hiệu hóa khi xử lý; một thao tác giao diện không tạo nhiều đơn; không suy ra bảo đảm chống mọi request đồng thời. | Cao |
| TC-TT-07 | API checkout thất bại | Giỏ có dữ liệu; giả lập API trả lỗi trước khi tạo đơn | Nhấn Đặt hàng ngay. | Hiện thông báo lỗi; không chuyển sang chi tiết đơn thành công; giỏ chưa được xóa do UI tự giả định thành công. | Cao |

## 9. Theo dõi đơn hàng (User)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-DU-01 | Xem lịch sử đơn | User có nhiều đơn đã đặt và một giỏ đang mở | Mở `/client/orders`. | Chỉ hiện đơn của tài khoản, mới nhất trước; không đưa `AddingItem` vào lịch sử. | Cao |
| TC-DU-02 | Xem chi tiết đơn | Có đơn CPU × 2 đơn giá `8000000`, RAM × 1 đơn giá `1000000` | Mở chi tiết và tải lại. | Đúng mã đơn, ngày, trạng thái, hai dòng, 3 linh kiện và tổng `17000000`; thông tin giữ sau tải lại. | Cao |
| TC-DU-03 | Không có đơn hàng | User mới chưa checkout | Mở lịch sử; chọn đường dẫn mua sắm từ trạng thái rỗng. | Có thông báo chưa có đơn; điều hướng về danh sách sản phẩm được. | Trung bình |
| TC-DU-04 | Không xem đơn tài khoản khác | User A có đơn; đăng nhập User B | Mở trực tiếp URL chi tiết đơn A; gọi API bằng token B. | API không trả thông tin đơn A; báo không tìm thấy/không được truy cập; UI không lộ dữ liệu đơn. | Cao |
| TC-DU-05 | Theo dõi cập nhật và giữ giá cũ | Đã có đơn; Admin thay giá sản phẩm và tiến trạng thái đơn | User mở lại lịch sử/chi tiết. | Hiển thị trạng thái mới sau tải lại; đơn giá/tổng vẫn theo lúc checkout, không đổi theo giá catalog. | Cao |

## 10. Tư vấn chọn linh kiện (User/khách)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-TV-01 | Truy cập tư vấn công khai | Chưa đăng nhập; dữ liệu tư vấn mặc định | Mở `/client/consultation`. | Hiện lựa chọn nhu cầu, 6 loại linh kiện và ngân sách; chưa hiển thị kết quả khi chưa chọn Xem gợi ý. | Trung bình |
| TC-TV-02 | Gợi ý văn phòng | Catalog tư vấn chưa chỉnh sửa | Chọn Văn phòng/Học tập, CPU, ngân sách `5000000`; gửi. | Có Intel Core i3-12100 giá `2790000`; không có CPU chỉ dành gaming/creative. | Cao |
| TC-TV-03 | Khớp đồng thời nhu cầu và loại | Catalog tư vấn mặc định | Chọn Gaming, GPU, ngân sách `20000000`. | Có RTX 4060 và RTX 4070 SUPER; không có CPU/RAM; mỗi kết quả kèm lý do gaming và thông số. | Cao |
| TC-TV-04 | Biên ngân sách | Catalog mặc định có RTX 4060 giá `7490000` | Chọn Gaming/GPU; thử `7489999` rồi `7490000`. | Dưới giá không có RTX 4060; bằng giá có RTX 4060; không vượt ngân sách. | Cao |
| TC-TV-05 | Ngân sách không hợp lệ | Đang ở form tư vấn | Chạy riêng rỗng, `0`, `-1`, `1.5`, số vượt giới hạn số nguyên an toàn JavaScript. | Báo ngân sách phải là số nguyên dương hợp lệ; không tạo truy vấn hợp lệ mới. | Trung bình |
| TC-TV-06 | Sắp giá tăng dần, không có kết quả | Catalog tư vấn mặc định | Chọn Gaming/SSD, ngân sách `5000000`; sau đó chọn ngân sách `1`. | Ban đầu SSD 990.000 trước 2.990.000; ngân sách 1 hiển thị không có sản phẩm phù hợp. | Trung bình |
| TC-TV-07 | Đặt lại bộ tư vấn | Đã chạy truy vấn, có thể đang báo lỗi | Chọn Đặt lại. | Về office/CPU/`5000000`; xóa query và lỗi; trở lại hướng dẫn ban đầu. | Trung bình |
| TC-TV-08 | Phản ánh thay đổi catalog tư vấn | Có sản phẩm tư vấn đang hiển thị; storage dùng chung | Admin ẩn/sửa giá sản phẩm trong quản lý tư vấn; trở lại User chạy truy vấn cũ. | Sản phẩm ẩn không được gợi ý; giá sửa ảnh hưởng điều kiện ngân sách; không giả định catalog tư vấn tự đồng bộ catalog bán hàng. | Cao |

## 11. Tra cứu và gửi yêu cầu bảo hành (User)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-BH-01 | Yêu cầu đăng nhập | Chưa đăng nhập | Mở `/client/warranty`. | Chuyển về đăng nhập; không mở dashboard tài khoản. | Cao |
| TC-BH-02 | Tra cứu hồ sơ thật | Đăng nhập; đơn Done đã có hồ sơ bảo hành ở backend | Mở trang; tìm theo tên, serial, mã đơn; chuyển trang danh sách. | Gọi `/warranties/products` với JWT, bộ lọc và phân trang; hiện đúng dữ liệu của mình và tổng `totalCount`; không ghép dữ liệu mẫu. | Cao |
| TC-BH-03 | Lọc đầy đủ tình trạng bảo hành | Có các hồ sơ active, expired, unknown, not_covered, not_started | Thử từng bộ lọc, kết hợp từ khóa; đổi lọc khi ở trang 2. | Gửi `coverage` và `search` lên server, trở về trang 1; không coi unknown/not_covered là hết hạn; kết quả rỗng có thông báo. | Trung bình |
| TC-BH-04 | Gửi yêu cầu hợp lệ | Thiết bị có `canRequest: true` | Nhập tên, điện thoại, mô tả; gửi hai lần liên tiếp khi request còn chờ. | Chỉ gửi một POST với productId UUID, contactName, phone, description; chờ thành công mới hiện ticketCode và tải lại thiết bị/lịch sử; không ghi localStorage. | Cao |
| TC-BH-05 | Thiếu liên hệ/mô tả | Có sản phẩm đủ điều kiện tạo phiếu | Chạy riêng tên rỗng/trắng, mô tả rỗng/trắng; các trường khác hợp lệ. | Báo đúng trường lỗi; không tạo phiếu. | Trung bình |
| TC-BH-06 | Chuẩn hóa điện thoại và giới hạn DTO | Mỗi lần dùng thiết bị chưa có phiếu hoạt động | Thử `123`, `0901 234 567`, `+84 901 234 567`, `0901-234-567`; tên dài hơn 200, mô tả dài hơn 2000. | `123` bị chặn; định dạng hợp lệ bỏ dấu phân cách; giới hạn tên/mô tả khớp backend. | Trung bình |
| TC-BH-07 | Chặn ngoài điều kiện và gửi trùng | Backend trả `canRequest: false` hoặc dữ liệu đổi trước khi POST | Kiểm tra nút gửi; mô phỏng POST trả 409 do có phiếu khác đang xử lý. | Nút dựa trên canRequest; lỗi 409 hiện lý do và tải lại dữ liệu, không báo thành công giả. | Cao |
| TC-BH-08 | Dữ liệu nullable và phiếu cũ | Có serial/expiresAt null và phiếu productId null | Xem thiết bị và lịch sử; chuyển trang lịch sử; chọn Xem lịch sử của một thiết bị. | Serial null hiện Chưa cập nhật, hạn null hiện Chưa xác định; phiếu cũ vẫn xem được trong toàn bộ lịch sử; lọc theo UUID thiết bị và đọc các trang lịch sử độc lập. | Cao |
| TC-BH-09 | Tách tài khoản và lưu trên backend | Hai User có thiết bị riêng | A gửi phiếu; đăng nhập A ở trình duyệt khác; chuyển sang B. | A thấy dữ liệu đã lưu trên server; B chỉ thấy phiếu của B; không gửi userId/ownerId từ client, không đọc phiếu mock đã lưu trước đây. | Cao |
| TC-BH-10 | Lỗi API và làm mới dữ liệu | Có thể mô phỏng mất mạng, lỗi validation, hết hạn token | Gọi API lỗi; thử lại; quay lại tab sau khi Admin cập nhật. | Hiện lỗi, không fallback mock; 401 xóa phiên và chuyển đăng nhập; khi quay lại tab tải tiến độ mới; tìm kiếm nhanh không bị response cũ ghi đè. | Cao |

## 12. Quản lý nhóm và danh mục linh kiện (Admin)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-DM-01 | Xem và lọc danh mục | Admin đăng nhập; có nhóm và danh mục | Mở `/admin/categories`; chọn từng nhóm, sau đó xem tất cả. | Hiển thị đúng con thuộc nhóm; bỏ lọc trả toàn bộ danh mục con. | Trung bình |
| TC-DM-02 | Thêm nhóm cha | Tên `Nhóm kiểm thử <mã>` chưa tồn tại | Mở thêm cha; nhập tên, mô tả; lưu; tải lại. | Tạo nhóm mới đúng dữ liệu; tồn tại sau tải lại. | Cao |
| TC-DM-03 | Sửa nhóm cha | Có nhóm kiểm thử và một danh mục con | Đổi tên, mô tả nhóm; lưu. | Cập nhật đúng nhóm, giữ ID; danh mục con giữ liên kết đến nhóm. | Cao |
| TC-DM-04 | Tên cha/con bắt buộc | Admin đang thêm/sửa danh mục | Chạy riêng tên rỗng và toàn khoảng trắng cho cả hai cấp. | Form chặn lưu; không tạo/sửa dữ liệu không hợp lệ. | Trung bình |
| TC-DM-05 | Thêm con và chọn cha | Có nhóm kiểm thử | Thêm con `CPU kiểm thử`; thử chưa chọn cha; sau đó chọn cha hợp lệ và lưu. | Thiếu cha bị chặn; có cha tạo con đúng `parentId`. | Cao |
| TC-DM-06 | Chuyển con sang nhóm khác | Có hai nhóm và một con chưa chứa sản phẩm | Sửa con, chọn nhóm thứ hai; lưu; kiểm tra bộ lọc hai nhóm. | Con giữ ID, thuộc nhóm mới; không còn trong tập con của nhóm cũ. | Cao |
| TC-DM-07 | Tên trùng và độ dài theo API | Backend chạy theo hợp đồng; tên kiểm thử được chuẩn bị riêng | Gửi tên cha trùng; con trùng trong cùng cha; tên 150/151 ký tự cho hai cấp. | API từ chối tên trùng theo phạm vi quy định và tên 151; cho phép 150 nếu hợp lệ. | Cao |
| TC-DM-08 | Ảnh danh mục | Endpoint `/images/categories` sẵn sàng | Upload PNG hợp lệ dưới 5 MiB; lưu nhóm/con; tải lại. | Preview và URL ảnh được lưu cho đúng đối tượng; không đổi danh mục khác. | Trung bình |
| TC-DM-09 | Xóa danh mục rỗng/hủy xóa | Có con rỗng thuộc cha kiểm thử | Hủy xác nhận xóa một lần; xác nhận xóa con; sau đó xóa cha đã rỗng. | Hủy giữ nguyên; xác nhận xóa đúng đối tượng; không còn sau tải lại. | Cao |
| TC-DM-10 | Chặn xóa đối tượng còn liên kết | Có cha còn con; con còn sản phẩm | Thử xóa cha, sau đó con đang có sản phẩm. | API báo xung đột; không mất cây danh mục hoặc sản phẩm. | Cao |
| TC-DM-11 | Phân quyền API ghi | Có token User và request quản trị mẫu | Gửi tạo/sửa/xóa danh mục bằng token User và không token. | API trả 403/401; dữ liệu không thay đổi; không chỉ dựa vào chặn đường dẫn UI. | Cao |

## 13. Quản lý sản phẩm linh kiện (Admin)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-SP-01 | Xem, tìm và phân trang | Admin đăng nhập; hơn 20 sản phẩm | Mở `/admin/products`; tìm tên; chuyển trang rồi đổi từ khóa. | Hiện tối đa 20 dòng/trang; tìm theo query; đổi từ khóa về trang 1. | Trung bình |
| TC-SP-02 | Thêm sản phẩm hợp lệ | Có danh mục con CPU | Mở `/admin/products/new`; nhập `CPU kiểm thử <mã>`, giá `8000000`, danh mục CPU, mô tả và URL ảnh hợp lệ; lưu. | Tạo sản phẩm mới đang bán; chuyển về danh sách; client truy vấn được sản phẩm. | Cao |
| TC-SP-03 | Tên bắt buộc và biên độ dài | Các trường khác hợp lệ; mỗi lần độc lập | Thử tên rỗng/trắng, 1, 200, 201 ký tự khi thêm/sửa. | Chặn rỗng/trắng/201; cho phép 1 và 200 khi API nhận dữ liệu hợp lệ. | Trung bình |
| TC-SP-04 | Giá không hợp lệ | Đang thêm/sửa sản phẩm | Thử rỗng, `abc`, `-1`, `1.5`, `0`; giữ trường khác hợp lệ. | Không lưu; giá phải là chuỗi số nguyên dương; `0` phải bị API chặn nếu form cho gửi. | Cao |
| TC-SP-05 | Biên độ dài giá | Mỗi bộ dữ liệu trên sản phẩm kiểm thử riêng | Thử `1`, `999999999999`, `1000000000000` khi thêm/sửa. | Hai giá đầu hợp lệ; 13 chữ số bị chặn bởi form/API; giữ giá đúng đơn vị VND. | Cao |
| TC-SP-06 | Quan hệ danh mục | Có nhiều nhóm và danh mục con | Đổi nhóm để kiểm tra danh sách con; thử không chọn con; gọi API với UUID con không tồn tại. | Chỉ gợi ý con thuộc nhóm; thiếu con không cho lưu; API không tạo quan hệ đến con không tồn tại. | Cao |
| TC-SP-07 | URL và upload ảnh | Có endpoint upload sản phẩm | Thử URL HTTPS hợp lệ và `abc`; upload JPEG/PNG/GIF/WebP dưới 5 MiB; thử file PDF và ảnh quá 5 MiB. | URL sai/file sai bị chặn; ảnh hợp lệ có preview; lưu URL từ endpoint `/images/products`. | Trung bình |
| TC-SP-08 | Sửa thông tin sản phẩm | Có sản phẩm kiểm thử đang bán | Mở `/admin/products/<id>`; đổi tên, mô tả, giá, ảnh, danh mục; lưu và tải lại. | Cập nhật đúng sản phẩm, giữ ID; thông báo thành công; client thấy dữ liệu mới khi nạp lại. | Cao |
| TC-SP-09 | Hủy form | Có sản phẩm đã lưu | Sửa dữ liệu rồi chọn Hủy; mở lại. | Quay về danh sách; dữ liệu chưa lưu không ghi đè dữ liệu cũ. | Trung bình |
| TC-SP-10 | Ẩn sản phẩm và hủy xác nhận | Có sản phẩm kiểm thử đang bán | Mở xác nhận ẩn rồi hủy; sau đó xác nhận ẩn; truy vấn catalog và chi tiết client. | Hủy giữ đang bán; xác nhận cập nhật `isActive=false`; client không còn liệt kê hoặc mở chi tiết sản phẩm đã ẩn; không xóa vật lý. | Cao |
| TC-SP-11 | Giá giỏ và lịch sử đơn | Có giỏ đang mở và đơn đã checkout cùng sản phẩm | Admin đổi giá; User nạp lại giỏ và chi tiết đơn cũ. | Giỏ cập nhật đơn giá hiện hành; đơn cũ giữ đơn giá/tổng đã checkout. | Cao |
| TC-SP-12 | Phân quyền và lỗi ghi | Có request thêm/sửa/ẩn hợp lệ | Gọi bằng User/không token; chạy riêng một lần Admin gặp API lỗi trước ghi. | Trái quyền bị từ chối; lỗi không được báo thành công; dữ liệu trước ghi được giữ. | Cao |

## 14. Quản lý đơn hàng (Admin)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-DH-01 | Danh sách đơn quản trị | Admin đăng nhập; có đơn và giỏ `AddingItem` | Mở `/admin/orders`. | Hiện đơn với khách, thời gian, tổng, trạng thái; không đưa giỏ đang chọn hàng vào danh sách. | Cao |
| TC-DH-02 | Lọc trạng thái | Có đơn ở đủ bốn trạng thái sau checkout | Chọn Processing, Preparing, Shipping, Done rồi Tất cả. | Chỉ trả trạng thái được chọn; Tất cả bỏ lọc; đổi lọc về trang đầu. | Trung bình |
| TC-DH-03 | Phân trang | Có hơn 20 đơn phù hợp | Chuyển trang khi có và không có lọc trạng thái. | Mỗi trang tối đa 20; giữ điều kiện lọc; số trang/tổng đếm theo tập đã lọc. | Trung bình |
| TC-DH-04 | Chi tiết và tổng tiền | Có đơn CPU × 2 giá `8000000`, RAM × 1 giá `1000000` trong dữ liệu tải về | Mở chi tiết. | Đúng khách, mã, ngày, tiến độ; 3 linh kiện; tổng `17000000`, đúng đơn giá từng dòng. | Cao |
| TC-DH-05 | Tiến trạng thái đúng luồng | Có đơn `Processing` | Chuyển lần lượt sang `Preparing`, `Shipping`, `Done`; tải lại sau mỗi bước. | Lưu đúng từng bước; thanh tiến độ và nhãn cập nhật; User thấy trạng thái mới khi nạp lại. | Cao |
| TC-DH-06 | Chặn lùi/bỏ bước qua API | Có đơn kiểm thử độc lập cho từng bộ dữ liệu | Gửi Processing → Shipping, Shipping → Preparing, Preparing → Preparing. | API từ chối chuyển trái luồng/gửi lại trạng thái theo hợp đồng, không đổi đơn. | Cao |
| TC-DH-07 | Đơn hoàn thành | Có đơn `Done` | Mở chi tiết; thử cập nhật tiếp qua API. | Không có nút tiến trạng thái; API từ chối thay đổi từ Done. | Cao |
| TC-DH-08 | Phân quyền đơn quản trị | Có token User/không token | Gọi danh sách admin và cập nhật trạng thái bằng hai trường hợp này. | Trả 403/401; không lộ danh sách quản trị hoặc sửa đơn. | Cao |
| TC-DH-09 | Mở đơn cũ ngoài 100 đơn đầu | Có hơn 100 đơn; biết ID đơn cũ | Mở trực tiếp `/admin/orders/<id-đơn-cũ>` ngoài trang 100 đơn đầu. | Mở được đơn còn tồn tại; không coi đơn là mất chỉ vì truy vấn danh sách ban đầu giới hạn 100. | Cao |
| TC-DH-10 | Cập nhật trạng thái thất bại | Đơn hợp lệ; API lỗi trước khi ghi | Nhấn tiến trạng thái. | Hiện lỗi; không hiển thị trạng thái mới như đã lưu; dữ liệu đơn và tổng tiền giữ nguyên. | Cao |

## 15. Quản lý cửa hàng (Admin)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-CH-01 | Xem danh sách/rỗng | Admin đăng nhập; API stores hoạt động | Mở `/admin/stores`; chạy với dữ liệu có cửa hàng và danh sách rỗng. | Hiện đúng cửa hàng; khi rỗng báo chưa có cửa hàng; có nút thêm. | Trung bình |
| TC-CH-02 | Thêm cửa hàng | Đang ở trang quản lý cửa hàng | Nhập `Tech Store kiểm thử`, mô tả, địa chỉ, URL ảnh; lưu. | Tạo cửa hàng; đóng form; danh sách được tải lại và còn sau reload. | Cao |
| TC-CH-03 | Tên cửa hàng bắt buộc | Đang thêm/sửa | Thử tên rỗng và toàn khoảng trắng; lưu. | Form báo tên không được để trống; không gửi ghi thành công. | Trung bình |
| TC-CH-04 | Sửa thông tin | Có cửa hàng kiểm thử | Đổi tên, mô tả, địa chỉ, URL ảnh; lưu; tải lại. | Cập nhật đúng ID; phản ánh dữ liệu mới; không cần giả định response PATCH là object Store. | Cao |
| TC-CH-05 | Hủy form và xóa cửa hàng | Có cửa hàng kiểm thử | Sửa rồi Hủy; thử xóa và hủy xác nhận; cuối cùng xác nhận xóa. | Hủy giữ dữ liệu; xác nhận xóa mới loại cửa hàng khỏi danh sách. | Cao |
| TC-CH-06 | Chặn đường dẫn UI và báo lỗi thao tác | Chạy riêng User truy cập và Admin gặp API ghi lỗi | User mở `/admin/stores`; Admin thêm/sửa/xóa khi API báo lỗi. | User bị chuyển đăng nhập; Admin thấy lỗi, không báo thành công. Không suy ra API stores đã giới hạn role Admin chỉ từ guard giao diện. | Cao |

## 16. Quản lý dữ liệu tư vấn linh kiện (Admin)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-QTV-01 | Danh sách, tìm/lọc và thống kê | Admin đăng nhập; catalog tư vấn có dữ liệu | Mở `/admin/consultation`; kết hợp tên, loại CPU, nhu cầu office, trạng thái đang hiện. | Kết quả là giao các điều kiện; tổng/đang hiện/đang ẩn phản ánh toàn catalog hiện có. | Trung bình |
| TC-QTV-02 | Thêm sản phẩm tư vấn | Đang ở quản lý tư vấn | Nhập tên `CPU tư vấn thử`, loại CPU, giá `3000000`, thông số `6 nhân`, nhu cầu gaming và lý do; lưu. | Có ID mới; lưu dữ liệu tư vấn tại trình duyệt; xuất hiện trong gợi ý gaming/CPU đủ ngân sách. | Cao |
| TC-QTV-03 | Tên và giá không hợp lệ | Các trường còn lại hợp lệ | Chạy riêng tên rỗng/trắng; giá rỗng, 0, âm, thập phân, vượt số nguyên an toàn. | Báo trường lỗi; không lưu sản phẩm tư vấn không hợp lệ. | Trung bình |
| TC-QTV-04 | Nhu cầu và lý do bắt buộc | Đang thêm/sửa | Bỏ chọn mọi nhu cầu; sau đó chọn hai nhu cầu nhưng để thiếu lý do của một nhu cầu. | Không lưu; yêu cầu ít nhất một nhu cầu và lý do cho từng nhu cầu đã chọn. | Trung bình |
| TC-QTV-05 | Thông số bắt buộc và chuẩn hóa | Đang thêm sản phẩm tư vấn | Thử thông số chỉ xuống dòng/khoảng trắng; sau đó nhập hai dòng hợp lệ có khoảng trắng đầu/cuối. | Trống bị chặn; hợp lệ lưu từng dòng đã trim và bỏ dòng trống. | Trung bình |
| TC-QTV-06 | Sửa giá và lý do | Có sản phẩm tư vấn đang hiện | Đổi giá, loại, nhu cầu, lý do; lưu; User chạy lại truy vấn. | Cập nhật đúng ID; gợi ý User dùng dữ liệu mới, không giữ điều kiện giá cũ. | Cao |
| TC-QTV-07 | Ẩn và bật hiển thị lại | Có sản phẩm tư vấn phù hợp truy vấn User | Chọn Ẩn khỏi gợi ý; kiểm tra User; bật lại. | Sản phẩm vẫn trong quản trị; không được gợi ý khi ẩn; có thể xuất hiện lại khi bật và đủ điều kiện. | Cao |
| TC-QTV-08 | Hủy sửa, lưu sau tải lại | Storage hoạt động | Sửa nháp rồi đóng form; mở lại; lưu sửa hợp lệ và tải lại trang. | Nháp bị bỏ; dữ liệu đã lưu còn sau tải lại; catalog tư vấn không tự ghi vào API sản phẩm bán hàng. | Trung bình |
| TC-QTV-09 | Storage bị chặn hoặc dữ liệu hỏng | Service được nạp với storage stub lỗi/JSON sai | Nạp catalog; thực hiện chỉnh sửa hợp lệ khi không ghi được. | Nạp dữ liệu dự phòng; cảnh báo rõ; thay đổi chỉ giữ trong phiên khi ghi lỗi, không bảo đảm còn sau reload. | Cao |

## 17. Tiếp nhận và xử lý bảo hành (Admin)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-QBH-01 | Tiếp nhận phiếu mới | User đã gửi phiếu lên backend; Admin có thể dùng trình duyệt khác | Mở `/admin/warranty`; chọn Làm mới. | Lấy danh sách từ `/admin/warranties/requests`, đúng ownerId và ticketCode; không cần dùng chung localStorage. | Cao |
| TC-QBH-02 | Tìm/lọc, phân trang và thống kê | Có nhiều hơn 20 phiếu ở các trạng thái | Tìm mã, tên khách, điện thoại, serial, mã đơn; kết hợp trạng thái; chuyển trang. | Query gửi lên server, đổi lọc về trang 1; tổng danh sách dùng totalCount; bốn ô đếm lấy stats toàn hệ thống, không theo bộ lọc hay số dòng đang xem. | Trung bình |
| TC-QBH-03 | Xem chi tiết và lịch sử | Có phiếu hợp lệ và phiếu cũ productId/ownerId null | Chọn phiếu; đối chiếu tên, serial, đơn, hạn, liên hệ, mô tả và lịch sử. | Gọi chi tiết bằng UUID; hiện ticketCode và request.product; phiếu cũ không bị coi là mẫu; timeline đúng dữ liệu backend. | Cao |
| TC-QBH-04 | Xử lý đủ vòng đời | Có phiếu mới `received` | Lưu lần lượt `checking`, `repairing`, `completed`, mỗi bước ghi chú riêng. | Tiến Đã tiếp nhận → Đang kiểm tra → Đang sửa chữa → Hoàn tất; mỗi lần thêm một sự kiện, giữ lịch sử cũ. | Cao |
| TC-QBH-05 | Giữ trạng thái và ghi chú bắt buộc | Phiếu đang `checking` | Lưu cùng trạng thái với ghi chú có khoảng trắng đầu/cuối; chạy riêng ghi chú rỗng/trắng. | Ghi chú hợp lệ được trim và thêm lịch sử; ghi chú rỗng bị chặn, không thêm sự kiện. | Trung bình |
| TC-QBH-06 | Chặn bỏ bước/lùi bước | Phiếu chưa hoàn tất | Kiểm tra lựa chọn trạng thái; mô phỏng phiếu đổi bởi Admin khác trước PATCH. | Chỉ chọn bước hiện tại/kế tiếp; 409 hiện lý do và tải lại chi tiết, danh sách, stats để chọn bước hợp lệ. | Cao |
| TC-QBH-07 | Khóa phiếu hoàn tất | Có phiếu completed | Mở chi tiết; kiểm tra sau khi hoàn tất từ repairing. | Không có form cập nhật tiếp; hiển thị trạng thái và timeline backend đã lưu. | Cao |
| TC-QBH-08 | Đúng chủ phiếu, lưu sau tải lại | Hai User có phiếu riêng | Admin cập nhật phiếu A; tải lại; A/B xem tiến độ ở trình duyệt khác. | Chỉ phiếu A thay đổi; timeline do backend trả; User không xem được dữ liệu người khác. | Cao |
| TC-QBH-09 | Chống gửi lặp và xác nhận kết quả | PATCH được cố ý làm chậm | Nhấn lưu liên tiếp, kiểm tra lúc chờ và khi thành công. | Form/nút bị khóa trong lúc gửi, chỉ một PATCH; chỉ báo thành công sau response; danh sách, chi tiết và stats được tải lại. | Trung bình |
| TC-QBH-10 | Lỗi API, quyền và ghi chú | Có phiếu chưa hoàn tất | Thử ghi chú hơn 2000 ký tự, lỗi 400/403/404/500, mất mạng và JWT hết hạn. | Giới hạn ghi chú đúng DTO; hiện lỗi API, 403 báo thiếu quyền; 401 chuyển đăng nhập; không lưu tiến độ vào localStorage hoặc báo đã lưu khi PATCH thất bại. | Cao |

## 18. Thống kê tổng quan (Admin)

| Mã TC | Nội dung kiểm thử | Tiền điều kiện | Dữ liệu và bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| TC-TQ-01 | Đếm đơn theo trạng thái | Có lần lượt 3 Processing, 2 Preparing, 1 Shipping, 4 Done | Mở `/admin`. | Bốn thẻ đếm 3, 2, 1, 4; tổng 10; dùng `totalCount`, không nhầm với một dòng lấy bằng `pageSize=1`. | Cao |
| TC-TQ-02 | Không tính giỏ vào tổng | Ngoài các đơn, có nhiều giỏ `AddingItem` | Nạp dashboard. | Tổng chỉ cộng bốn trạng thái đơn sau checkout; giỏ không làm tăng tổng. | Trung bình |
| TC-TQ-03 | Điều hướng từ thống kê | Dashboard có các thẻ trạng thái | Chọn thẻ Processing rồi Shipping. | Đến danh sách đơn với bộ lọc trạng thái tương ứng. | Trung bình |
| TC-TQ-04 | Đếm lại sau cập nhật | Có đơn Processing đã được tính | Chuyển đơn sang Preparing; mở lại dashboard. | Processing giảm 1, Preparing tăng 1, tổng số đơn giữ nguyên. | Cao |
