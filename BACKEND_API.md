# Backend BookStore

Backend chạy trong Next.js App Router, cùng cổng với giao diện. Prefix HTTP là `/api/v1`. Route Handler tại `app/api/v1/[...path]/route.ts` chuyển yêu cầu tới `lib/server/router.ts`; nghiệp vụ nằm trong `lib/server/services/`, truy vấn PostgreSQL bằng Prisma. Server Components gọi service trực tiếp.

## Khởi động

Cấu hình PostgreSQL trong `.env` theo `.env.example`, rồi chạy tại thư mục gốc:

```bash
npm ci
npm run server:setup
npm run dev
```

`server:setup` tạo AUTH_SECRET ngẫu nhiên nếu chưa có, giữ nguyên credential DB/secret đã cấu hình, bật database mode và `/api/v1`; sau đó tạo database nếu cần, áp dụng migration, sinh Prisma Client và nhập dữ liệu mẫu còn thiếu. Chi tiết dữ liệu import tại [MOCK_DATA_IMPORT.md](MOCK_DATA_IMPORT.md).

Truy cập `http://localhost:5173/client`, `/admin` và `/api/v1/ready`. `NEXT_PUBLIC_USE_MOCK=false`, `NEXT_PUBLIC_API_URL=/api/v1`. Sau khi đổi biến public phải restart dev hoặc build lại production.

Production:

```bash
npm run db:deploy
npm run db:generate
npm run build
npm run start
```

PostgreSQL và folder ảnh cần lưu trữ bền vững. Không chạy seed khi deploy nếu không cần dữ liệu demo. Trên database đã có schema nhưng chưa có admin, có thể đặt `ADMIN_EMAIL`, `ADMIN_PASSWORD` (ít nhất 12 ký tự), `ADMIN_NAME` trong môi trường rồi chạy `npm run server:admin`. Lệnh không in mật khẩu, đổi mật khẩu hoặc nâng quyền tài khoản đang tồn tại.

## Hợp đồng chung

- ID là chuỗi số nguyên dương, ví dụ `"12"`; các ID cũ như `book-01` chỉ là SeedKey và tham chiếu trong snapshot import.
- Auth dùng JWT Bearer có thời hạn 8 giờ. Chữ ký HS256 bằng AUTH_SECRET server, issuer `bookstore`, audience `bookstore-web`. DB lưu hash định danh phiên; mỗi yêu cầu kiểm tra hạn, thu hồi và role hiện tại. Không chấp nhận token demo.
- Đăng ký luôn USER. USER chỉ truy cập hồ sơ, giỏ, đơn và phiếu đổi trả của mình. Ghi sách/danh mục/tồn kho và các API `/admin` cần ADMIN.
- Mật khẩu hash scrypt với salt riêng; DTO không trả hash, token nội bộ, API key hoặc system prompt public.
- Tiền JSON là chuỗi nguyên VND. `price` là giá bán cuối cùng; backend không giảm giá lần nữa ở giỏ/checkout. DTO có `originalPrice`, `discount`, `stockQuantity`.
- Body JSON giới hạn 64 KiB, từ chối field ngoài schema; ảnh có giới hạn riêng. Lỗi `{ statusCode, error, message }`; HTTP 400 validation, 401 phiên, 403 quyền, 404 không tìm thấy, 409 xung đột, 413 quá dung lượng, 429 giới hạn tần suất, 503 dịch vụ tạm lỗi. Không gửi SQL/credential trong lỗi.
- `Page<T>` giữ `items`, `totalCount`, `pageNumber`, `pageSize`, `totalPages`, `hasPreviousPage`, `hasNextPage`; pageSize tối đa 100.
- Các response API dùng `Cache-Control: no-store`; ảnh bất biến dùng tên mới và cache dài hạn.
- Rate limit lưu PostgreSQL nên dùng chung giữa các instance. Khi không có reverse proxy được tin cậy, API public dùng quota chung; chỉ bật `TRUST_PROXY=true` khi proxy thay thế X-Forwarded-For và chặn truy cập trực tiếp backend.

## Endpoint

Tất cả đường dẫn trong bảng có prefix `/api/v1`.

| Nhóm | Method và endpoint | Quyền / dữ liệu |
| --- | --- | --- |
| Hệ thống | `GET /health`, `GET /ready` | Public; health tiến trình, ready truy vấn DB. |
| Tài khoản | `POST /auth/register`, `POST /auth/login` | Public; trả `{ accessToken, user }`. Register `{ username, email, password }`, login `{ email, password }`. |
| Phiên | `GET /auth/me`, `POST /auth/logout` | Đăng nhập; logout thu hồi phiên, trả 204. |
| Hồ sơ | `PATCH /users/me` | `{ username?, avatarUrl?, phoneNumber?, address? }`. |
| Danh mục cha | `GET/POST /category-parents`; `GET/PATCH/DELETE /category-parents/:id` | GET public, ghi ADMIN; `{ name, description?, imageUrl? }`; xóa khi có con trả 409. |
| Danh mục | `GET/POST /categories`; `GET/PATCH/DELETE /categories/:id` | GET public, ghi ADMIN; `{ name, parentId, description?, imageUrl? }`; lọc parentId; chặn xóa khi có sách. |
| Sách | `GET/POST /products`; `GET/PATCH/DELETE /products/:id` | GET public, ghi ADMIN; query page/pageSize/search/categoryId/parentId/includeInactive. Chỉ ADMIN được xem sách ẩn; DELETE là ẩn. |
| Tồn kho | `POST /admin/products/:id/stock-adjustments` | ADMIN; `{ delta, reason }`, Idempotency-Key bắt buộc; ghi InventoryMovement và chặn tồn âm. |
| Upload | `POST /images/products`, `/images/categories`, `/images/avatars` | Multipart `file`; sách/danh mục ADMIN, avatar đăng nhập. |
| Nhập URL ảnh | `POST /images/products/import` | ADMIN; `{ url }`, tải ảnh internet về folder local, trả URL nội bộ. |
| Giỏ | `GET/DELETE /orders/cart`; `POST /orders/cart/items`; `PATCH/DELETE /orders/cart/items/:itemId` | Giỏ của tài khoản; thêm `{ productId, quantity }`, sửa `{ quantity }`; số lượng 1–999 và không vượt tồn hiện tại. |
| Checkout | `POST /orders/checkout` | `{ shippingName, shippingPhone, shippingAddress, paymentMethod: "COD" }`; Idempotency-Key bắt buộc; trả đơn 201. |
| Đơn của khách | `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel` | Chỉ đơn của mình; khách hủy PENDING. |
| Đơn admin | `GET /admin/orders`, `GET /admin/orders/:id`; `PATCH /admin/orders/:id/status` | ADMIN; list phân trang/lọc status, sửa `{ status, paymentCollected?, note? }`. |
| Đánh giá | `GET/POST /products/:id/reviews`; `GET /admin/reviews`; `DELETE /admin/reviews/:id` | Đọc sách public; tạo cần đăng nhập với `{ Rating: 1..5, Comment? }`; quản trị ADMIN. |
| Tư vấn | `GET /consultation/options`; `GET /consultation/recommendations` | Public; query usage/component/budget; tên và giá từ sách thật. |
| Tư vấn admin | `GET/POST /admin/consultation/products`; `PATCH /admin/consultation/products/:id` | ADMIN; `{ bookId, component, usages, specs, reasons, isActive }`; profile gắn Book, không có catalog/giá riêng. |
| Đổi trả | `GET /returns/eligible-items`; `GET/POST /returns`; `GET /returns/:id` | Tài khoản; tạo `{ productId, quantity, contactName, phone, description }`; productId ở đây là OrderItem ID từ eligible-items. |
| Đổi trả admin | `GET /admin/returns`, `GET /admin/returns/:id`; `PATCH /admin/returns/:id/status` | ADMIN; tiến độ/kết quả theo mục bên dưới. |
| Chatbot | `GET /chatbot/config`; `POST /chatbot/messages` | Public hoặc tài khoản; `{ sessionId, message }`. Config public có `mode: rules/provider`. |
| Chatbot admin | `GET/PATCH /admin/chatbot/config`; `GET /admin/chatbot/logs`; `PATCH /admin/chatbot/logs/:id` | ADMIN; log update `{ resolved, adminNote }`; ghi chú nội bộ không gửi cho khách. |
| Báo cáo | `GET /admin/reports/revenue` | ADMIN; query from/to/period; thêm refunded/netRevenue cho hoàn tiền. |

PATCH chỉ gửi trường thay đổi, trừ cấu hình chatbot dùng toàn bộ nội dung form. Chi tiết DTO tại `lib/types/*` và validation tại `lib/server/validators.ts`. Danh sách đánh giá và log chatbot giữ response array tương thích, trả tối đa 1.000 bản ghi mới nhất; khi cần lịch sử dài hơn cần bổ sung phân trang đồng thời ở FE/API.

## Giá, tồn kho và đơn hàng

- Tạo sách tối thiểu có name, author, categoryId, price. originalPrice tùy chọn; nếu không có, dùng giá bán hoặc suy từ discount theo hợp đồng cũ. Khi có originalPrice, backend tính discount từ hai giá bằng Decimal; chặn giá gốc thấp hơn giá bán. Discount nhập ở form có thể tính lại giá bán từ giá gốc; giỏ luôn dùng giá bán cuối cùng.
- Sách mới/mẫu không có tồn được giữ ở 0. Admin vào chi tiết sách để nhập tồn có lý do trước khi bán. Không tự dùng tồn mượn làm tồn bán.
- Thêm giỏ chưa giữ chỗ tồn. Checkout khóa giỏ theo tài khoản và sách theo thứ tự ID, kiểm tra lại active/giá/tồn; tạo đơn, snapshot tên/giá/ảnh, trừ tồn, ghi lịch sử và xóa giỏ trong cùng transaction. Mọi thao tác giỏ sử dụng cùng khóa tài khoản.
- `Idempotency-Key` là chuỗi 8–100 ký tự `[A-Za-z0-9_-]` (UUID dùng được). Cùng key và cùng body trả lại đơn cũ; cùng key khác body trả 409. Lượt checkout khác key trên giỏ đã xử lý không tạo đơn thứ hai. Điều chỉnh tồn dùng cùng quy tắc key.
- DB `PENDING → PREPARING → SHIPPING → DELIVERED`; DTO `Processing → Preparing → Shipping → Done`. Admin phải gửi `paymentCollected: true` khi chuyển Done để xác nhận thu COD; completedAt chỉ ghi một lần.
- Khách hủy PENDING, admin hủy PENDING/PREPARING; trả tồn và ghi movement đúng một lần. Không hủy đơn đã giao/đang giao; không nhảy bước hoặc đi lùi.
- Đơn mẫu import chưa từng trừ tồn qua backend nên khi hủy không tự cộng tồn; chỉ hoàn phần có bút toán sale tương ứng. Đơn thật thiếu bút toán sẽ báo cần đối soát, tránh tạo thêm tồn không có căn cứ.
- Hiện chỉ nhận COD; tạo đơn là UNPAID, hoàn thành và xác nhận thu COD là PAID. Không có giao dịch online hoặc webhook giả.

## Ảnh trong folder dự án

Hai lựa chọn ở cả form thêm và sửa sản phẩm:

1. Upload từ máy: multipart → `/images/products`.
2. Dán URL file ảnh trực tiếp: JSON → `/images/products/import`.

Cả hai đều kiểm tra/decode ảnh và lưu WebP tĩnh tại `public/images/uploads/products/<uuid>.webp`. Trả `{ imageUrl: "/images/uploads/products/<uuid>.webp", mimeType: "image/webp", size }`; lưu imageUrl vào Book.coverImage. Ảnh từ URL được tải về, không phụ thuộc website nguồn khi hiển thị sau này. Server chỉ nhận đường dẫn local hợp lệ cho ảnh sản phẩm mới; avatar/danh mục vẫn hỗ trợ URL công khai trực tiếp.

JPEG/PNG/WebP/GIF đầu vào tối đa 2 MB và 25 triệu pixel, GIF lấy khung hình đầu tiên. Backend xác thực nội dung ảnh, tên ngẫu nhiên, chặn traversal; import URL chỉ HTTP/HTTPS cổng 80/443, kiểm tra DNS/IP public ở từng redirect, ghim kết nối vào IP đã kiểm tra, giới hạn redirect/timeout/byte tải. Không tải localhost, IP nội bộ, metadata hoặc file URL.

Route `/images/uploads/:target/:filename` phục vụ file runtime ngay sau upload kể cả production, không cần build lại. Ảnh seed trong `public/images/books/` tiếp tục dùng được. Ảnh mới không ghi vào Git. Có thể đặt IMAGE_ROOT phía server khi cần mount disk; mặc định đúng folder images trong dự án. Khi deploy nhiều instance, dùng cùng volume ảnh có quyền ghi; backup và restore folder cùng database.

`npm run server:maintenance` dọn session/quota hết hạn và ảnh chưa được gắn sử dụng sau 24 giờ. Lệnh kiểm tra tham chiếu từ sách, avatar, danh mục và snapshot ảnh trong đơn trước khi xóa. Không xóa ảnh cũ ngay khi người dùng đang lưu form hoặc ảnh còn được dùng trong lịch sử đơn.

## Đổi trả và báo cáo

- Hạn đổi trả mặc định `RETURN_WINDOW_DAYS=14`, có thể cấu hình 1–365 ngày; tính từ completedAt và cho phép hết ngày cuối theo múi giờ Việt Nam. Endpoint eligible-items chỉ trả chi tiết đơn DELIVERED của tài khoản, còn hạn và còn số lượng hợp lệ.
- Phiếu được khóa/kiểm tra tổng số lượng để nhiều lượt gửi không vượt số đã mua. Phiếu từ chối không tiêu thụ số lượng hợp lệ; phiếu hoàn tất có tiêu thụ.
- Trạng thái `received → checking → repairing → completed`; có thể rejected trước khi kết thúc. Ghi chú timeline là thông tin tiến độ khách hàng xem được.
- Hoàn tất phải có `resolution: exchange/refund`, `restockQuantity` từ 0 đến số sách đổi trả. Chỉ nhập lại phần đủ chất lượng bán. Exchange có thể gửi replacementBookId, mặc định sách cũ; kiểm tra/trừ tồn sách thay thế.
- Refund chỉ cho đơn COD đã thu tiền, yêu cầu `refundConfirmed: true` và ghi chú; tạo RefundRecord đúng một lần trong transaction cùng trạng thái/tồn. Đây là xác nhận hoàn tiền thủ công, không tự chuyển tiền qua ngân hàng.
- Báo cáo cộng đơn DELIVERED theo completedAt bất biến, dùng snapshot OrderItem; from/to gồm hai đầu theo Asia/Ho_Chi_Minh, tuần bắt đầu thứ Hai. Tối đa 366 ngày khi period=day; các kỳ khác tối đa 3.660 ngày.
- revenue là tổng đơn hoàn thành trong kỳ; refunded là các khoản hoàn được xác nhận trong kỳ theo ngày hoàn; netRevenue = revenue - refunded. Một khoản hoàn của đơn kỳ trước có thể làm netRevenue kỳ hiện tại âm. UI/CSV hiển thị riêng, không sửa tổng đơn cũ và không coi gross revenue là tiền thực thu.
- Phiếu đổi trả mẫu JSON không khớp chi tiết đơn vẫn nằm nguyên trong Seed_Documents; không được tự coi là phiếu hợp lệ của người dùng thật.

## Chatbot

Mặc định `rules`: tìm/gợi ý từ catalog PostgreSQL và ghi ChatLog, hiển thị rõ là tìm theo danh mục. Phiên guest gắn cookie HttpOnly/SameSite do server cấp; phiên tài khoản kiểm tra chủ sở hữu. Không nhận userId/role/catalog/prompt do client tự gửi.

Để nối mô hình, đặt `AI_API_URL` (URL đầy đủ endpoint tương thích Chat Completions) và `AI_API_KEY` phía server, sau đó chọn model thật trong cấu hình admin. Backend gửi systemPrompt/temperature/model, catalog tin cậy và lịch sử ngắn; yêu cầu JSON `{ answer, bookIds, needsHuman }`, kiểm tra schema, chỉ trả bookIds nằm trong tập sách server đưa vào. Mode public đổi thành provider. Không cho mô hình thực hiện ghi đơn, tồn hoặc hoàn tiền.

Timeout/lỗi provider hoặc phản hồi sai schema trả 503 và không tạo log thành công. Ghi chú admin không đưa vào context AI. Cấu hình provider/key thật và nghiệm thu dịch vụ bên ngoài là bước vận hành riêng; kiểm thử tự động dùng provider fixture.

## Kiểm chứng

```bash
npm test
npm run test:seed
npm run test:backend
```

`test:backend` build production, tạo database ngẫu nhiên riêng, áp dụng migration/import và chạy HTTP trên cổng trống. Kiểm tra auth/role/ownership, ảnh runtime, DNS pinning, catalog/tồn, checkout lặp/đồng thời, snapshot, hủy/giao đơn, đổi trả/hoàn, chatbot/provider, báo cáo và persistence sau restart. Test chỉ xóa database/folder ảnh ngẫu nhiên do chính nó tạo. Tài khoản PostgreSQL chạy test cần CREATE DATABASE.

Triển khai thực tế cần sao lưu trước migration, lưu AUTH_SECRET ổn định, cấu hình volume/HTTPS và chạy readiness sau deploy. Nếu migration lỗi, dùng backup hoặc migration sửa tiếp; không giả định mọi thay đổi schema tự rollback được. Chưa tích hợp thanh toán online; không mở lựa chọn chuyển khoản/ví trước khi có nhà cung cấp, webhook và kiểm thử sandbox.
