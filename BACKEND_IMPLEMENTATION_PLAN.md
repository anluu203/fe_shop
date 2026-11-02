# Kế hoạch triển khai backend BookStore

Ngày lập: 29/10/2026. Trạng thái: đã triển khai backend Next.js/Prisma và tích hợp các luồng giao diện trong phạm vi M0–M7, gồm ảnh local từ hai nguồn, COD, tư vấn/đổi trả, chatbot catalog/provider adapter và báo cáo. Production build và kiểm thử HTTP trên database riêng đã chạy thành công; hướng dẫn thực tế tại [BACKEND_API.md](BACKEND_API.md). Cấu hình provider thật, thanh toán online và deploy hạ tầng vẫn là phần vận hành theo mục 9.

## 1. Mục tiêu và phạm vi

Hoàn thiện các luồng đang có màn hình tại `/client` và `/admin` bằng Next.js App Router Route Handlers, Prisma và PostgreSQL. Mỗi thao tác nghiệp vụ phải được xác thực, kiểm tra quyền và lưu tại server; dữ liệu vẫn còn sau khi đổi trình duyệt hoặc khởi động lại ứng dụng.

Phạm vi gồm tài khoản, hồ sơ, danh mục hai cấp, sách và tồn kho, ảnh, giỏ hàng, checkout, đơn hàng, đánh giá, tư vấn chọn sách, đổi trả, chatbot và báo cáo doanh thu. Bổ sung đăng xuất phía server, hủy đơn trước khi giao và các thông tin giao hàng cần thiết để các luồng này hoạt động thực tế.

Yêu cầu ảnh sản phẩm bổ sung: cả màn hình thêm mới và cập nhật đều có hai lựa chọn **dán URL ảnh từ internet** hoặc **upload ảnh từ máy cá nhân**. Cả hai nguồn được đưa về thư mục `public/images/uploads/products/` trong dự án; URL lưu cho sản phẩm là `/images/uploads/products/<tên-file>`. Với URL internet, backend tải bản sao ảnh về thư mục này trước khi lưu sản phẩm. Đây là cách thống nhất yêu cầu ảnh sản phẩm trỏ trực tiếp về folder images của dự án.

Các module mượn sách và quản lý cửa hàng đã mất màn hình theo `CHATBOT_REPORTS_API.md`; không đưa vào các mốc dưới đây. Banner và thông tin thương hiệu có thể tiếp tục là nội dung tĩnh. Các tham chiếu sách nổi bật phải dùng ID/slug thật, không giữ `book-01`, `book-13` trong chế độ database.

Thanh toán COD được triển khai trong luồng mua hàng. Chuyển khoản/ví điện tử cần nhà cung cấp và thông tin tích hợp; chỉ mở trên giao diện sau khi có bước triển khai và nghiệm thu riêng ở mục 9. Không coi việc tạo đơn là đã thu tiền.

## 2. Hiện trạng và các điểm phải sửa

Nguồn đối chiếu: `prisma/schema.prisma`, `lib/api/*`, `lib/types/*`, `contexts/*`, `lib/services/customer-services.ts`, `FE_API_HANDOFF.md`, `CHATBOT_REPORTS_API.md` và các màn hình hiện tại.

- Prisma đã kết nối database `book_shop`, có 4 migration đã áp dụng. Dữ liệu import được giữ nguyên; bổ sung 32 Consultation_Profiles và các bảng nghiệp vụ backend. Snapshot đủ 12 file vẫn nằm trong Seed_Documents, đã loại mật khẩu plaintext.
- API chạy qua `app/api/v1/[...path]/route.ts`, dispatcher và service kiểm tra quyền/validation trước truy vấn Prisma; ảnh runtime có Route Handler riêng.
- `.env` tắt mock và gọi `/api/v1` cùng ứng dụng, không phụ thuộc cổng 8080.
- Đã cài đủ dependency Prisma, adapter, `pg`, `tsx`, sinh Prisma Client và kiểm thử script import trên database mới, chạy lại, chạy đồng thời và rollback khi lỗi.
- Tài liệu bàn giao cũ ghi UUID/JWT; Prisma hiện dùng ID số nguyên. Không áp dụng nguyên văn phần UUID của tài liệu cũ.
- Migration import đã thêm danh mục cha, ảnh, thông tin xuất bản, trạng thái ẩn, các timestamp và SeedKey cần giữ dữ liệu mẫu; session, tư vấn/đổi trả và các bảng nghiệp vụ khác tiếp tục theo kế hoạch bên dưới.
- FE dùng `Processing → Preparing → Shipping → Done`; DB đã có `PENDING`, `PREPARING`, `SHIPPING`, `DELIVERED`, `CANCELLED`. Cần ánh xạ DTO trong API khi triển khai.
- Giỏ vẫn dùng DTO Order/AddingItem tương thích FE nhưng lưu Cart_Items riêng. Thao tác giỏ và checkout dùng chung khóa tài khoản.
- Checkout đã có body nhận hàng/COD và Idempotency-Key qua API client, CartContext và màn hình giỏ.
- Tư vấn/đổi trả đã có API và màn hình dùng PostgreSQL ở chế độ thật; nhánh mock chỉ phục vụ demo khi bật rõ ràng.
- Trang chủ Server Component đã gọi catalog service trực tiếp, các section seed ID ánh xạ qua SeedKey sang ID DB.

## 3. Kiến trúc và hợp đồng thống nhất

```text
Client Components → /api/v1/... → Route Handler → Service → Prisma → PostgreSQL
Server Components ────────────────────────────→ Service → Prisma → PostgreSQL
```

- Đặt API tại `app/api/v1/**/route.ts`, dùng Node.js runtime cho Prisma và xử lý file. Đọc tài liệu trong `node_modules/next/dist/docs/` trước khi viết, nhất là Route Handlers, authentication và backend-for-frontend.
- Route Handler xử lý HTTP, xác thực, validation và serialize; service xử lý nghiệp vụ, transaction và quyền trên dữ liệu. Prisma chỉ được import phía server.
- Tách `lib/server/auth`, `lib/server/services`, `lib/server/validators`, `lib/server/serializers`, `lib/server/http`; tiếp tục dùng singleton `lib/prisma.ts`.
- Browser dùng `/api/v1` cùng origin. Sửa `lib/api/client.ts`, `lib/api/images.ts` và `lib/utils/image.ts` để hỗ trợ base URL tương đối. Server Components gọi service trực tiếp, không tự fetch vào server khi build.
- Giữ Bearer access token để tương thích AuthContext hiện có. Token ký bằng thư viện xác thực, có hạn sử dụng; thêm Session lưu định danh token, thời hạn và trạng thái thu hồi. Guard kiểm tra session và role hiện hành từ DB; logout thu hồi session trên server. FE xóa phiên và yêu cầu đăng nhập lại khi hết hạn. JWT secret chỉ ở server.
- DTO giữ ID dạng chuỗi số nguyên, ví dụ `"12"`; parse và kiểm tra integer an toàn trước truy vấn. Role DB `0/1` serialize thành `USER/ADMIN`; `fullName → username`, `title → name`, `sellingPrice → price`, `coverImage → imageUrl`.
- Tiền JSON là chuỗi nguyên VND; tính bằng Decimal/số nguyên, không dùng float. Chặn phần lẻ VND ở API. Migration dữ liệu hiện có phải kiểm tra và báo cáo giá có phần lẻ trước khi áp dụng quy tắc mới.
- Giữ envelope `Page<T>` và lỗi `{ message, error, statusCode }`. Chuẩn hóa 400/401/403/404/409/413/429/500/503; không trả SQL, token hoặc mật khẩu trong lỗi/log. DELETE 204 không có JSON.
- API riêng tư không cache dùng chung. Giới hạn body, phân trang, tần suất đăng nhập/chat/upload; rate limit dùng kho chung khi chạy nhiều instance.
- Tạo tài liệu OpenAPI hoặc bảng endpoint có request/response/error và đồng bộ lại hai tài liệu bàn giao.

## 4. Bổ sung schema và migration

Các trường danh mục/sách/đơn, SeedKey và bảng snapshot phục vụ import đã có trong migration `20261029000000_mock_data_import`; bảng dưới mô tả toàn bộ đích cần đạt khi hoàn thiện backend, gồm cả phần đã tạo và phần còn lại.

| Nhóm | Thay đổi dự kiến |
| --- | --- |
| User | Thêm `avatarUrl`, `updatedAt`; dùng `fullName` cho tên hiển thị; mở API hồ sơ cho `phoneNumber`, `address`. Email chuẩn hóa lowercase, kiểm tra dữ liệu trùng trước migration. |
| Session | User, token/session identifier, thời hạn, thời điểm thu hồi; index và quy trình dọn session hết hạn. Không lưu bearer token nguyên văn. |
| CategoryParent | Bảng danh mục cha, tên, mô tả, ảnh, slug duy nhất, timestamps. |
| Category | Thêm `parentId`, ảnh, timestamps; unique tên trong cùng cha nếu áp dụng quy tắc bàn giao; index FK. |
| Book | Thêm `isActive`, `updatedAt`, `publicationYear`, `language`, `coverType`, slug/seed key ổn định; giữ tồn kho và giá hiện có. |
| CartItem | Thêm timestamps; giữ unique user/book. Dùng revision giỏ hoặc khóa bản ghi user để tuần tự hóa mọi thao tác giỏ và checkout. |
| Order | Thêm `PREPARING`, `completedAt`, `updatedAt`, tên/số điện thoại người nhận, trạng thái thanh toán, snapshot phí/tổng nếu có. |
| OrderEvent | Lịch sử trạng thái: trước/sau, người thực hiện, ghi chú, timestamp. |
| CheckoutRequest | Idempotency key gắn user, request hash và order kết quả; unique user/key để chống tạo đơn trùng. |
| InventoryMovement | Sách, biến động số lượng, lý do, đơn/yêu cầu đổi trả liên quan, người thao tác; chống lặp cùng một sự kiện nghiệp vụ. |
| ConsultationProfile | Liên kết sách thật; nhu cầu đọc, nhóm nội dung, điểm nổi bật/lý do và trạng thái hiển thị. Giá, tên, tồn kho lấy từ Book. |
| ReturnRequest/ReturnEvent | Chủ sở hữu, order item, số lượng, nội dung, liên hệ, trạng thái, kết quả xử lý và timeline. |
| ChatSession | Phiên khách có cookie ký hoặc định danh do server cấp; liên kết tài khoản khi phù hợp, kiểm tra chủ sở hữu. |
| UploadedAsset | Đường dẫn tương đối trong `public/images`, URL nội bộ, loại file, kích thước, người upload/import và trạng thái gắn với bản ghi nghiệp vụ. Thêm nguồn `UPLOAD/REMOTE_URL` và `sourceUrl` tùy chọn để phân biệt ảnh từ máy với ảnh tải từ internet. |

Thứ tự migration: thêm bảng/cột nullable và default → backfill dữ liệu cũ → kiểm tra ràng buộc → đặt NOT NULL/unique/index cần thiết. Không reset hoặc `db push` thay migration. Chạy thử trên bản sao database trước khi deploy; giữ các CHECK constraint trong migration hiện có.

Seed development phải chạy lại được mà không nhân bản dữ liệu. Map ID JSON sang ID DB bằng slug/seed key, liên kết đúng danh mục/sách/đơn. Không tự nhập localStorage hoặc mật khẩu demo thành tài khoản production; tài khoản admin ban đầu được tạo bằng script với mật khẩu từ môi trường.

## 5. Danh sách luồng và endpoint

Mọi đường dẫn dưới đây có prefix `/api/v1`. Các endpoint tư vấn/đổi trả là hợp đồng mới cần thêm vào FE; những endpoint còn lại bám theo `lib/api/*`.

| Luồng | Endpoint chính | Quyền và hành vi |
| --- | --- | --- |
| Hệ thống | `GET /health`, `GET /ready` | Health kiểm tra tiến trình; ready kiểm tra DB, không lộ thông tin kết nối. |
| Tài khoản | `POST /auth/register`, `/auth/login`, `/auth/logout`; `GET /auth/me` | Register/login public, giới hạn tần suất; register luôn USER; logout thu hồi phiên. |
| Hồ sơ | `PATCH /users/me` | Chủ tài khoản; sửa tên, avatar, điện thoại, địa chỉ; không nhận role từ client. |
| Nhóm sách | `GET/POST /category-parents`; `GET/PATCH/DELETE /category-parents/:id` | GET public, ghi ADMIN; chặn xóa khi còn danh mục con. |
| Danh mục | `GET/POST /categories`; `GET/PATCH/DELETE /categories/:id` | GET public, ghi ADMIN; lọc parentId; chặn xóa khi còn sách. |
| Sách | `GET/POST /products`; `GET/PATCH/DELETE /products/:id` | GET public chỉ sách active; ghi ADMIN; DELETE ẩn. `includeInactive=1` và xem sách ẩn chỉ ADMIN. |
| Tồn kho | `POST /admin/products/:id/stock-adjustments` | ADMIN nhập/chỉnh tồn có lý do và ghi biến động; không sửa tổng tồn bằng giá trị cũ từ trình duyệt. |
| Upload ảnh | `POST /images/avatars`, `/images/products`, `/images/categories` | Multipart field `file`; avatar cần đăng nhập, ảnh sách/danh mục ADMIN. Ảnh sản phẩm lưu `public/images/uploads/products/`; trả `{ imageUrl, mimeType, size }` với URL nội bộ. |
| Nhập ảnh sản phẩm từ URL | `POST /images/products/import` | ADMIN; JSON `{ url }`. Tải và kiểm tra ảnh, lưu cùng folder ảnh upload; trả cùng DTO với `imageUrl` nội bộ. URL website cần là địa chỉ file ảnh trực tiếp. |
| Giỏ hàng | `GET/DELETE /orders/cart`; `POST /orders/cart/items`; `PATCH/DELETE /orders/cart/items/:itemId` | USER/ADMIN chỉ giỏ của mình; trả DTO tương thích Order/AddingItem; tăng cùng sách phải atomic. |
| Checkout | `POST /orders/checkout` | Chủ giỏ; body mới gồm người nhận, điện thoại, địa chỉ, phương thức; có Idempotency-Key. |
| Đơn của khách | `GET /orders`, `GET /orders/:id`; `POST /orders/:id/cancel` | Chỉ đơn của mình; không gồm giỏ; hủy trước SHIPPING, hoàn tồn đúng một lần. |
| Quản trị đơn | `GET /admin/orders`, `GET /admin/orders/:id`; `PATCH /admin/orders/:id/status` | ADMIN; phân trang/lọc; chi tiết hỗ trợ màn hình hiện có, sửa client đang lấy chi tiết qua API của khách. |
| Đánh giá | `GET/POST /products/:id/reviews`; `GET /admin/reviews`; `DELETE /admin/reviews/:id` | GET sách public; tạo cần đăng nhập, rating 1–5, giới hạn nội dung; admin xem/xóa. Giữ quy tắc hiện tại cho phép khách đăng nhập đánh giá; yêu cầu đã mua là thay đổi chính sách riêng. |
| Tư vấn | `GET /consultation/options`, `GET /consultation/recommendations` | Public; lọc nhu cầu, nhóm, ngân sách; chỉ sách đang bán, giá từ DB. |
| Quản trị tư vấn | `GET/POST /admin/consultation/products`; `PATCH /admin/consultation/products/:id` | ADMIN quản lý hồ sơ tư vấn liên kết Book, bật/tắt; chuyển FE khỏi service đồng bộ localStorage. |
| Đổi trả của khách | `GET /returns/eligible-items`; `GET/POST /returns`; `GET /returns/:id` | Đăng nhập; chỉ order item đã mua/được giao và còn hạn; kiểm tra số lượng đã/đang đổi trả. |
| Quản trị đổi trả | `GET /admin/returns`, `GET /admin/returns/:id`; `PATCH /admin/returns/:id/status` | ADMIN kiểm tra, xử lý, ghi timeline và kết quả; không lấy ownerId do client làm căn cứ phân quyền. |
| Chatbot | `GET /chatbot/config`; `POST /chatbot/messages` | Public hoặc đăng nhập; phiên có chủ sở hữu; catalog và giá lấy từ server. |
| Quản trị chatbot | `GET/PATCH /admin/chatbot/config`; `GET /admin/chatbot/logs`; `PATCH /admin/chatbot/logs/:id` | ADMIN; ghi chú nội bộ không public; chỉ public config các trường được cho phép. |
| Doanh thu | `GET /admin/reports/revenue` | ADMIN; from/to/period; tương thích RevenueReport và CSV hiện có. |

Danh sách sản phẩm tìm theo tên/tác giả/ISBN, hỗ trợ lọc cha/con và phân trang có giới hạn. Các danh sách hiện trả array giữ tương thích ở lần tích hợp đầu; nếu chuyển sang phân trang phải sửa client và màn hình trong cùng mốc.

## 6. Quy tắc nghiệp vụ trọng yếu

### Ảnh sản phẩm: dán URL hoặc upload từ máy

**Đường dẫn lưu và URL**

- Giữ các ảnh có sẵn trong `public/images/`, gồm `public/images/books/`. Tạo riêng `public/images/uploads/products/` cho file mới để tránh ghi đè ảnh ban đầu.
- Ví dụ file trên đĩa `public/images/uploads/products/550e8400-e29b-41d4-a716-446655440000.webp` có URL `/images/uploads/products/550e8400-e29b-41d4-a716-446655440000.webp`; khi local chạy cổng 5173, trình duyệt truy cập qua `http://localhost:5173/images/uploads/products/...`.
- Prisma lưu URL tương đối này vào `Book.coverImage`, serializer trả `Product.imageUrl`. Không lưu đường dẫn ổ đĩa Windows, base64, blob URL hoặc địa chỉ localhost cố định vào DB.
- Backend tạo thư mục nếu chưa có; tên file do server sinh ngẫu nhiên và phần mở rộng theo nội dung đã xác thực. Không dùng nguyên tên file do người dùng gửi để tạo đường dẫn.

**Luồng A — upload từ máy**

1. Người quản trị chọn chế độ upload, chọn file và xem preview.
2. FE gửi `multipart/form-data` tới `POST /api/v1/images/products`; server xác thực ADMIN và kiểm tra file.
3. Server ghi file hoàn chỉnh vào folder ảnh, tạo metadata UploadedAsset rồi trả URL nội bộ. Nếu ghi file/metadata thất bại, dọn phần đã tạo và trả lỗi.
4. FE gán URL trả về vào `imageUrl`, sau đó gửi `POST /products` hoặc `PATCH /products/:id`. Chặn lưu trong lúc đang upload hoặc upload thất bại.

**Luồng B — dán URL internet**

1. Người quản trị chọn chế độ URL, dán địa chỉ ảnh trực tiếp, ví dụ `https://example.com/book.jpg`.
2. FE gửi URL tới `POST /api/v1/images/products/import`; backend tải ảnh về, kiểm tra và lưu vào `public/images/uploads/products/`.
3. Server trả URL `/images/uploads/products/...`; FE dùng URL nội bộ đó khi tạo/cập nhật sản phẩm. `sourceUrl` chỉ là metadata nguồn, không dùng làm URL hiển thị sản phẩm sau khi nhập thành công.
4. URL không tải được, trỏ tới HTML hoặc không phải ảnh hợp lệ phải báo lỗi rõ ràng; giữ ảnh hiện tại khi cập nhật và không lưu sản phẩm với ảnh nhập thất bại.

**Quy tắc dùng chung**

- JPEG, PNG, WebP, GIF; giới hạn 2 MB/file cho cả upload và tải URL. Đồng bộ UI đang giới hạn 5 MB ở chế độ thật về cùng giới hạn backend; kiểm tra chữ ký file, dung lượng thực tế và giới hạn số pixel ảnh, không chỉ Content-Type.
- Chỉ nhận HTTP/HTTPS cho nguồn internet; chặn URL có thông tin đăng nhập, localhost, IP nội bộ/link-local/metadata và scheme khác. Kiểm tra DNS/IP ở mỗi lần redirect, giới hạn redirect/timeout, giới hạn byte trong lúc đọc stream và ràng buộc kết nối tới IP đã kiểm tra để chống SSRF/DNS rebinding. Không fetch tùy ý URL khi người dùng chỉ đang gõ vào ô nhập.
- API tạo/cập nhật ảnh sản phẩm kiểm tra asset nội bộ tồn tại và được phép gắn vào sản phẩm. Đường dẫn có sẵn `/images/books/...` tiếp tục dùng được. Không tin rằng mọi chuỗi bắt đầu bằng `/images/` đều hợp lệ; chặn path traversal và không cho chọn file ngoài folder ảnh.
- Khi sửa sản phẩm không đổi ảnh, giữ nguyên URL hiện tại. Khi đổi nguồn ảnh, chỉ cập nhật URL DB sau khi ảnh mới đã lưu thành công; tạo tên file mới thay vì ghi đè để tránh cache ảnh cũ.
- Upload/import trước khi bấm lưu có thể tạo file chưa gắn sản phẩm. Có cleanup sau thời gian chờ; ảnh cũ chỉ dọn sau khi cập nhật DB thành công và xác nhận không còn được dùng ở sản phẩm/bản ghi khác. Không xóa ảnh seed có sẵn hoặc dữ liệu đơn hàng chỉ vì người dùng đóng form.
- Việc ghi file và transaction DB không atomic chung: cần xử lý bù/dọn file khi lưu DB lỗi, và không xóa ảnh cũ trước khi commit ảnh mới.
- Image resolver dùng nguyên đường dẫn `/images/...` cùng origin ở chế độ thật, không tự ghép sang cổng 8080.
- Bảo đảm file mới tạo sau build được truy cập ngay dưới `/images/uploads/...`: triển khai Route Handler đọc file trong phạm vi folder upload hoặc cấu hình static mapping của web server. Nghiệm thu bằng `next start`, không chỉ `next dev`; không yêu cầu build lại cho mỗi lần thêm ảnh.
- Production dùng filesystem có quyền ghi và volume bền vững gắn đúng thư mục ảnh; backup/restore file cùng DB. Nếu chạy nhiều instance, tất cả phải dùng chung folder. File ảnh upload/import là dữ liệu runtime, không tự động commit vào Git.

### Giá và tồn kho

- `price` hiện là giá bán sau giảm. Không trừ discount lần nữa ở giỏ hoặc checkout.
- Đề xuất bổ sung `originalPrice` vào form/DTO quản trị để tránh suy ngược giá gốc từ tỷ lệ đã làm tròn. Lưu giá gốc và giá bán nguyên VND; tính `discount` bằng Decimal theo hai giá, làm tròn 2 chữ số. Đặt `0 < sellingPrice <= originalPrice`; khi UI nhập phần trăm thì tính giá bán từ giá gốc và từ chối trường hợp làm giá bán bằng 0. Đồng bộ lại hợp đồng cũ cho quy tắc này.
- Thêm giỏ không giữ chỗ tồn. Lúc đọc giỏ lấy giá mới; lúc checkout kiểm tra lại sách active, tồn và giá, lưu snapshot tên/đơn giá vào OrderItem.
- Nhập/chỉnh tồn và bán/hủy/đổi trả cùng ghi InventoryMovement trong transaction tương ứng; không cho tồn âm hoặc ghi cùng sự kiện hai lần.

### Checkout và trạng thái đơn

```text
Cart_Items → checkout → PENDING → PREPARING → SHIPPING → DELIVERED
                         └──────────┴────────→ CANCELLED (trước SHIPPING)

DTO FE: AddingItem       Processing  Preparing  Shipping   Done / Cancelled
```

1. Xác thực, validate địa chỉ/điện thoại/phương thức và idempotency key; cùng key với body khác trả 409.
2. Trong transaction, khóa giỏ theo user/revision; mọi thao tác giỏ phải dùng cùng cơ chế khóa để không mất item khi checkout chạy đồng thời.
3. Kiểm tra/tính giá từ DB; trừ tồn bằng cập nhật có điều kiện `stock >= quantity` hoặc khóa hàng theo thứ tự ID cố định. Retry có giới hạn với lỗi xung đột transaction.
4. Tạo Order, OrderItems snapshot, trạng thái thanh toán ban đầu, OrderEvent và InventoryMovement; xóa đúng các dòng giỏ đã xử lý và lưu kết quả idempotency trong cùng transaction.
5. Nếu lỗi, rollback toàn bộ. Request lặp trả lại đơn đã tạo, không trừ tồn hoặc tạo đơn lần nữa. Hai key khác nhau trên cùng giỏ cũng không được tạo hai đơn từ cùng nội dung.

Admin chỉ chuyển đúng bước; dùng điều kiện trạng thái hiện tại để chống hai thao tác đồng thời. Chuyển lại cùng trạng thái không tạo sự kiện mới. DELIVERED ghi `completedAt` lần đầu và không thay đổi sau đó. Hủy chỉ trước giao hàng, khôi phục tồn một lần. FE bổ sung Cancelled và form người nhận/thanh toán, hiển thị trạng thái và lỗi từ server.

### Đổi trả và thanh toán

- Phiếu liên kết OrderItem thật, không dựa vào danh sách bảo hành JSON. Thời hạn tính theo completedAt và chính sách cấu hình; cần xác định số ngày trước nghiệm thu.
- Khóa/kiểm tra tổng số lượng đổi trả theo order item để không vượt số đã mua khi có nhiều request.
- Map trạng thái cũ `received/checking/repairing/completed` sang tiếp nhận/kiểm tra/xử lý/hoàn tất; bổ sung từ chối và kết quả `đổi sách/hoàn tiền` để không đánh đồng mọi phiếu hoàn tất.
- Nhận lại sách không tự cộng tồn bán được: admin xác nhận chất lượng và số lượng có thể nhập lại. Đổi sách cần trừ tồn sách thay thế; mọi biến động xử lý một lần.
- Hoàn tiền có trạng thái/ledger riêng. COD có thể ghi nhận hoàn thủ công kèm người xác nhận; thanh toán online phải xác nhận kết quả provider trước khi báo hoàn thành.

### Chatbot và báo cáo

- Chatbot dùng sách thật và profile tư vấn; API key chỉ ở server. Có thể hoàn thiện tìm kiếm dựa quy tắc trước, ghi rõ chế độ này; nghiệm thu AI thật sau khi cấu hình provider/model/key.
- Ràng buộc ChatSession với khách/tài khoản; người dùng không đọc được log của người khác. Không cho chatbot tự sửa đơn, tồn kho hoặc hoàn tiền.
- Giới hạn message/sessionId, tần suất, timeout; lỗi gọi model hoặc ghi log trả lỗi rõ ràng. Tránh giữ transaction DB trong lúc chờ model.
- Lưu ChatLog sau phản hồi thành công; chỉ trả sách active. Admin có thể xem, ghi chú và đánh dấu xử lý.
- Báo cáo cơ sở theo hợp đồng hiện tại: tổng giá bán của đơn DELIVERED theo completedAt bất biến, múi giờ Asia/Ho_Chi_Minh, tuần bắt đầu thứ Hai; gồm bucket 0 và bán chạy từ snapshot OrderItem.
- Báo cáo cơ sở là doanh thu đơn hoàn thành, không đồng nghĩa tiền thực thu. Nếu hỗ trợ hoàn tiền, bổ sung tổng hoàn và doanh thu sau hoàn, công khai quy tắc kỳ ghi nhận thay vì sửa totalAmount của đơn cũ.

## 7. Tích hợp frontend bắt buộc

- Sửa API base URL, upload và image resolver; browser gọi cùng origin, loại bỏ phụ thuộc cổng 8080.
- Cập nhật `components/ui/ImageUpload.tsx`, `lib/api/images.ts` và form thêm/sửa sách để có hai chế độ dán URL/upload; URL internet phải nhập về folder local trước khi lưu. Hiển thị preview, loading và lỗi tương ứng; sản phẩm dùng URL `/images/...` sau thành công. Áp dụng yêu cầu này cho ảnh sản phẩm, không tự thay hành vi avatar/danh mục trong component dùng chung.
- Trang chủ gọi catalog service từ Server Component; có trạng thái lỗi phù hợp thay vì âm thầm hiển thị rỗng khi DB lỗi.
- AuthContext gọi logout server và xử lý 401; không để token demo được chấp nhận bởi BE.
- Đồng bộ DTO, status mapping, trường hồ sơ, tồn kho, giá gốc và checkout; sửa màn hình chi tiết đơn admin dùng route admin.
- Thay toàn bộ thao tác consultation/returns trong localStorage bằng async API, cập nhật loading/error/retry ở các màn hình liên quan. Route giao diện `/warranty` có thể giữ để tương thích.
- Tải lại dữ liệu server sau mutation; sự kiện storage trong cùng trình duyệt không phải cơ chế đồng bộ DB giữa các thiết bị.
- Chuyển cấu hình các section sách nổi bật sang slug/ID thật; không dùng seed ID cũ làm foreign key.
- Chỉ tắt mock cho môi trường nghiệm thu khi các luồng đã chuyển đủ. Chế độ thật không tự rơi về mock khi API lỗi.

## 8. Thứ tự thực hiện và tiêu chí hoàn thành

Mỗi mốc triển khai gồm schema/API, sửa FE liên quan và kiểm thử luồng tương ứng; không để dồn toàn bộ tích hợp FE tới cuối.

| Mốc | Công việc | Điều kiện hoàn thành |
| --- | --- | --- |
| M0 | Khôi phục dependencies, Prisma Client, kiểm tra DB/migration; cập nhật hợp đồng ID/status/tiền/auth, skeleton HTTP và health/ready. | `db:check`, `db:status` chạy được; API ready xác nhận DB; thống nhất contract và kế hoạch migration dữ liệu. |
| M1 | User/Session, register/login/me/logout, role/ownership guard, hồ sơ và bootstrap admin. | Đăng ký/lưu/đăng nhập trên DB thật; logout hoặc token hết hạn bị từ chối; USER không ghi API admin. |
| M2 | Danh mục hai cấp, sách, giá/tồn, upload và nhập URL ảnh vào `public/images/uploads/products/`, seed development, trang chủ/catalog và quản trị tương ứng. | Admin tạo/sửa/ẩn sách bằng cả hai nguồn ảnh; DB trả URL nội bộ, ảnh mới đọc được ngay; client đọc cùng dữ liệu; search/filter hoạt động; sách ẩn không mua được. |
| M3 | Giỏ, checkout COD, transaction/idempotency, trạng thái/hủy đơn, ledger tồn và màn hình mua hàng/admin. | Một lượt mua hoàn chỉnh; request lặp và hai khách tranh tồn không tạo đơn/trừ tồn sai. |
| M4 | Đánh giá, hồ sơ tư vấn, API và màn hình tư vấn. | Admin và client dùng cùng DB; mutation đúng quyền; giá tư vấn theo catalog thật. |
| M5 | Đổi trả, hạn/số lượng, timeline, xử lý tồn và hoàn thủ công COD. | Chỉ đổi trả sản phẩm đã mua hợp lệ; tiến độ có ở trình duyệt khác; xử lý lặp không cộng tồn/hoàn tiền hai lần. |
| M6 | ChatSession, config/log/admin, công cụ tìm sách và tích hợp provider AI khi đã có cấu hình. | Public không lộ config nội bộ; phiên tách biệt; phản hồi/gợi ý lấy dữ liệu thật, lỗi provider có xử lý. |
| M7 | Báo cáo DB, CSV hiện có, chỉ số hoàn tiền nếu đã mở luồng hoàn. | Tổng hợp đúng snapshot, completedAt, biên ngày/tuần; đối chiếu được với đơn kiểm thử. |
| M8 | Kiểm thử toàn bộ, build/start production, migration deploy, storage/backup/log/monitoring và cập nhật tài liệu. | Tất cả luồng trong phạm vi chạy ở chế độ thật; dữ liệu tồn tại qua restart và browser khác. |

M6 có thể bắt đầu sau M2 và M1; M7 phụ thuộc M3. M5 cần đơn DELIVERED từ M3. Triển khai lần lượt theo mốc giúp có luồng chạy và nghiệm thu được sau mỗi nhóm thay đổi.

## 9. Phần cần thông tin tích hợp hoặc chính sách trước nghiệm thu

Các điểm này không chặn M0–M4; giữ dưới dạng cấu hình/quy tắc được ghi rõ trong thời gian triển khai.

- Hạn đổi trả, điều kiện sách được nhận lại, phí giao hàng và ai được hủy ở từng trạng thái. Đề xuất ban đầu: khách hủy PENDING, admin hủy PENDING/PREPARING; chưa hỗ trợ hủy khi SHIPPING.
- Lưu trữ ảnh đã chốt theo yêu cầu: file mới nằm trong `public/images/uploads/products/`, URL là `/images/uploads/products/...`, áp dụng cho cả upload từ máy và nhập URL internet. Khi triển khai production cần bố trí quyền ghi, volume bền vững, phục vụ file runtime và backup folder này cùng DB; kiểm tra ảnh vẫn đọc được sau restart/redeploy.
- Nhà cung cấp AI, model và API key để nghiệm thu phản hồi AI thật; cấu hình thiếu phải được báo rõ, không trình bày tìm kiếm quy tắc như gọi mô hình.
- Nếu mở chuyển khoản/ví: bổ sung Payment/PaymentEvent, API tạo giao dịch/xem trạng thái và webhook; xác thực chữ ký, đối chiếu amount/currency/order, chống event trùng, timeout/retry và hoàn tiền. Sandbox pass trước khi mở phương thức trên FE.
- Quên/đổi mật khẩu và xác minh email chưa có màn hình hiện tại. Nếu mở rộng, cần token một lần có hạn, gửi email, revoke session khi đổi mật khẩu và bổ sung UI tương ứng; không đưa chúng vào tiêu chí hoàn thành các luồng màn hình đang có.

## 10. Kiểm thử và nghiệm thu cuối

1. Kiểm thử API/DB thật trên database test riêng: validation, hash mật khẩu, role, ownership, serialization, email trùng và rollback. Bài test ghi DB không chạy vào database nghiệp vụ đang dùng.
2. Checkout: giỏ rỗng; sách bị ẩn/hết tồn; giá đổi; hai khách mua cuốn cuối; cùng giỏ checkout đồng thời; retry cùng key; đổi body cùng key; cart mutation trong lúc checkout; lỗi giữa transaction.
3. Trạng thái: nhảy bước/đi lùi bị chặn; completedAt bất biến; hủy đồng thời không hoàn tồn hai lần; ledger đối chiếu được.
4. Đổi trả: khác chủ bị từ chối; quá hạn; số lượng vượt mua; request song song; nhập lại sách hỏng; xử lý/hoàn tiền lặp.
5. Ảnh: tạo và sửa sản phẩm bằng cả upload và URL internet; xác nhận file nằm trong `public/images/uploads/products/`, DB lưu URL nội bộ và file mới hiển thị ngay dưới production server sau build. Kiểm tra đổi nguồn, giữ ảnh cũ khi lỗi, hủy form/cleanup, tên file trùng, ảnh seed vẫn hiển thị, file giả MIME/quá dung lượng/quá số pixel, sai quyền và path traversal. Với import URL: ảnh 404/timeout, HTML, redirect vòng hoặc về IP nội bộ, DNS rebinding, stream vượt giới hạn; ảnh đã nhập vẫn hiển thị khi website nguồn ngừng phục vụ. Kiểm tra sau restart/redeploy và khi truy cập từ trình duyệt khác.
6. Chatbot: phiên khách/tài khoản khác nhau; lộ prompt/key; disabled; model timeout; lỗi ghi log; chỉ gợi ý sách thật đang active.
7. Báo cáo: không có đơn, nhiều kỳ, ranh giới ngày Việt Nam, tuần qua năm, đơn chưa hoàn thành, snapshot giá sau sửa catalog và hoàn tiền theo chính sách đã chọn.
8. E2E hai tài khoản + admin: đăng ký → cập nhật hồ sơ → tìm sách → thêm giỏ → checkout → admin xử lý → nhận hàng → đánh giá/đổi trả; kiểm tra lại dữ liệu ở trình duyệt khác và sau restart.
9. Chạy `npm test`, kiểm thử API/E2E bổ sung, `npm run test:db` trên DB test, TypeScript, lint, build và smoke test bằng production server. Phân biệt lỗi có từ trước với lỗi do thay đổi mới.
10. Deploy: backup trước migration, chạy migration bằng quy trình deploy, sinh client theo bản build, readiness check; có phương án khôi phục backup hoặc sửa migration tiến tới nếu bước deploy lỗi. Không giả định enum/schema migration luôn rollback được tự động.

Hoàn thành khi toàn bộ endpoint trong phạm vi đã có guard/validation, các màn hình đang dùng PostgreSQL thật, ca kiểm thử trọng yếu pass, không cần backend cổng 8080 và tài liệu phản ánh đúng hành vi đã triển khai. Thanh toán online và AI provider chỉ được đánh dấu hoàn tất khi đã nghiệm thu tích hợp tương ứng.
