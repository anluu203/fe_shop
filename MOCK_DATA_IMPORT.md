# Nhập mock-data vào PostgreSQL

Script: `scripts/import-mock-data.mts`; phần kiểm tra và nhập dữ liệu nằm tại `scripts/mock-data-import.ts`.

## Chạy trên máy mới

1. Cài Node.js phù hợp với dự án và PostgreSQL đang hoạt động. Sao chép/clone dự án, gồm `mock-data/`, `prisma/migrations/` và ảnh trong `public/images/`.
2. Sao chép `.env.example` thành `.env`, cấu hình kết nối bằng `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`; hoặc dùng `DATABASE_URL`. Khi có cả hai, `DATABASE_URL` được ưu tiên. Không commit thông tin kết nối thật.
3. Tại thư mục gốc dự án chạy:

```bash
npm ci
npm run db:seed:check
npm run db:setup:seed
npm run db:check
```

- `db:seed:check` kiểm tra JSON, ID trùng, liên kết và tổng tiền; không kết nối hoặc ghi database.
- `db:setup:seed` tạo database nếu chưa có, áp dụng migration đã commit, sinh Prisma Client, rồi nhập dữ liệu. Tài khoản PostgreSQL cần quyền tạo database khi database chưa tồn tại.
- Nếu database đã được tạo sẵn và tài khoản không có quyền tạo database, chạy lần lượt `npm run db:deploy`, `npm run db:generate`, `npm run db:seed` thay cho `db:setup:seed`.
- `db:check` kiểm tra kết nối thật qua Prisma, đếm các bảng và liệt kê toàn bộ file đã nhập.

Khi schema và Prisma Client đã sẵn sàng, chỉ cần:

```bash
npm run db:seed
```

Cũng có thể gọi `npx prisma db seed` nhờ cấu hình seed trong `prisma.config.ts`. Import không tự chạy mỗi khi `npm install`, build hoặc mở ứng dụng.

## Dữ liệu được lưu ở đâu?

| File | Bảng nghiệp vụ / cách lưu |
| --- | --- |
| `users.json` | 3 `Users`; mật khẩu hash bằng scrypt với salt riêng, không lưu plaintext. |
| `category-parents.json` | 8 `Category_Parents`. |
| `categories.json` | 16 `Categories`, liên kết đúng danh mục cha. |
| `products.json` | 32 `Books`, liên kết đúng danh mục, giữ thông tin xuất bản và đường dẫn ảnh. |
| `orders.json` | 8 `Orders`, 8 `Order_Items`; giữ chủ sở hữu, giá/tên sách lúc mua và thời gian gốc. |
| `reviews.json` | 12 `Reviews`, liên kết đúng người dùng và sách. |
| `banners.json` | JSONB trong `Seed_Documents`, gồm danh sách sách và nội dung banner. |
| `site-content.json` | JSONB trong `Seed_Documents`, gồm thương hiệu, liên hệ và các section. |
| `sources.json` | JSONB trong `Seed_Documents`, gồm nguồn thông tin/ảnh của 32 sách. |
| `stores.json` | JSONB trong `Seed_Documents`, giữ 2 cửa hàng mẫu. |
| `borrowing.json` | JSONB trong `Seed_Documents`, giữ 32 cấu hình tồn mượn, 4 phiếu và timeline. |
| `customer-services.json` | JSONB trong `Seed_Documents`, giữ nhu cầu/nhóm tư vấn, 32 sách tư vấn, 4 sản phẩm đổi trả và 2 phiếu cùng timeline. |

Sau migration backend, 32 hồ sơ tư vấn còn được nhập vào Consultation_Profiles liên kết Book thật. Script seed cũng bổ sung các profile còn thiếu trên máy mới, không ghi đè profile admin đã sửa. Phiếu đổi trả mẫu không khớp chi tiết đơn vẫn chỉ giữ snapshot; yêu cầu đổi trả thực tế được tạo qua API trên đơn đã giao.

**Cả 12 file** đều có snapshot JSONB trong `Seed_Documents`, kể cả các file đã nhập bảng nghiệp vụ. Các trường thông tin đăng nhập như `password`, `passwordHash`, token, API key được loại khỏi snapshot; hash mật khẩu chỉ nằm trong `Users`. `Filename` là khóa, `Payload` là dữ liệu, `Checksum` là SHA-256 của JSON đã loại thông tin nhạy cảm và chuẩn hóa thứ tự key. Script tự tìm mọi file `.json` trong `mock-data/`; file bổ sung cũng được lưu snapshot.

Các nhóm lưu JSONB đã có dữ liệu trong PostgreSQL nhưng chưa có bảng nghiệp vụ/API riêng. Khi triển khai backend tương ứng, chuyển chúng sang các model quan hệ bằng migration/script có đối chiếu. Dữ liệu đổi trả mẫu hiện có tên sách không khớp chi tiết đơn được tham chiếu; script giữ nguyên snapshot thay vì tự tạo quan hệ mua hàng sai hoặc coi đây là yêu cầu đổi trả hợp lệ của tài khoản thật.

## Ánh xạ và giá trị mặc định

- ID nguồn như `book-01`, `user-reader`, `BS-2026-0001` được giữ trong `SeedKey`. Khóa chính database vẫn tự tăng; script dùng bảng ánh xạ để tạo khóa ngoại. `ReviewID=1` có `SeedKey=review-1`, không ép ghi đè ReviewID của bản ghi đã tồn tại.
- `username → FullName`, `name → Title`, `price → SellingPrice`, `imageUrl → CoverImage`; `ADMIN/USER → 1/0`.
- Trạng thái `Processing/Preparing/Shipping/Done → PENDING/PREPARING/SHIPPING/DELIVERED`. Đơn Done cũ chưa có `completedAt` dùng `updatedAt` làm thời điểm hoàn thành ban đầu theo hợp đồng dữ liệu demo.
- File sách hiện không có giá gốc, giảm giá hay tồn bán: nhập `OriginalPrice = SellingPrice`, `Discount = 0`, `StockQuantity = 0`. Không dùng `totalCopies` của dịch vụ mượn làm tồn kho bán, không tự suy đoán số lượng tồn.
- File đơn hiện không có địa chỉ giao hàng: nhập chuỗi rỗng và giữ nguyên thiếu thông tin trong snapshot; phương thức dùng mặc định COD của schema. Đây là đơn demo, chưa đầy đủ thông tin giao hàng/thanh toán của một đơn thật.
- Ảnh đã có ở `/images/books/...` được giữ nguyên URL; importer không tải lại ảnh internet hoặc lưu binary vào PostgreSQL. Máy khác cần có `public/images/` đi cùng source dự án.
- `AI_Configs` mặc định được migration tạo sẵn; không có file cấu hình/log chatbot trong `mock-data/`, nên script không tạo hội thoại giả hay ghi đè cấu hình chatbot đang sử dụng.

## Chạy lại và xử lý lỗi

- Import chạy trong một transaction; lỗi ở bất kỳ bản ghi nào sẽ rollback toàn bộ lượt nhập đó. Migration schema là bước riêng đã commit trước import.
- `SeedKey`/`Filename` duy nhất và advisory lock PostgreSQL giúp chạy lại hoặc chạy đồng thời từ nhiều máy không nhân bản dữ liệu.
- Script chỉ thêm các bản ghi còn thiếu. Nó không truncate, xóa dữ liệu thật, đổi giá/tồn/trạng thái đã sửa, thay mật khẩu hoặc cấp lại quyền cho người dùng đã tồn tại.
- Nếu email nguồn đang thuộc tài khoản khác không cùng SeedKey, script dừng và bảo toàn tài khoản đó. Không tự nhận tài khoản thật làm tài khoản demo.
- Nếu nội dung file đã thay đổi so với snapshot lần đầu, script dừng, không cập nhật một nửa giữa JSON và bảng nghiệp vụ. Dùng migration dữ liệu được kiểm tra riêng để cập nhật seed đã nhập; thay mật khẩu cũng cần luồng đặt lại riêng.
- Đọc bảng kết quả: `source` là số bản ghi nguồn, `created` là số thêm mới, `existing` là số đã có. Lần chạy lại không thay đổi nguồn phải có `created = 0` ở mọi nhóm.
- Nếu báo lỗi database, kiểm tra PostgreSQL, `.env` và chạy lại `db:deploy`/`db:generate`. Script không in query hoặc mật khẩu trong lỗi Prisma.

## Kiểm thử

```bash
npm run test:seed
```

Bộ kiểm thử tạo database ngẫu nhiên riêng `book_shop_seed_test_*`, áp dụng migration, kiểm tra import đầy đủ, hash mật khẩu, khóa ngoại, rollback, email trùng, chạy lại và chạy đồng thời; cuối cùng chỉ xóa database ngẫu nhiên do bài test tạo. Tài khoản chạy test cần quyền CREATE DATABASE. Database ứng dụng không bị xóa hoặc dùng để chứa fixture kiểm thử.

Script import chỉ làm công việc dữ liệu. Backend và việc tích hợp màn hình đã triển khai theo `BACKEND_IMPLEMENTATION_PLAN.md`; chạy `npm run server:setup` để cấu hình `/api/v1` và chế độ PostgreSQL, xem [BACKEND_API.md](BACKEND_API.md).
