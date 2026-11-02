# BookStore

Nhà sách trực tuyến sử dụng Next.js App Router, React và TypeScript. Client có trợ lý tư vấn chọn sách và chăm sóc khách hàng; admin quản lý sách, đơn mua, cấu hình chatbot và báo cáo doanh thu. Giao diện giữ nền giấy, xanh rêu và tiêu đề serif.

Backend hiện chạy ngay trong Next.js với Prisma/PostgreSQL tại `/api/v1`, cùng cổng 5173. Có API tài khoản/phân quyền, sách/danh mục/tồn kho, ảnh local (upload hoặc nhập URL), giỏ/checkout COD, đơn, đánh giá, tư vấn, đổi trả, chatbot và báo cáo. Hướng dẫn và hợp đồng hiện tại: [BACKEND_API.md](BACKEND_API.md), [FE_API_HANDOFF.md](FE_API_HANDOFF.md).

## Chạy dự án

```bash
npm ci
npm run server:setup
npm run dev
```

Sao chép `.env.example` thành `.env` và cấu hình PostgreSQL trước khi setup. Truy cập **http://localhost:5173**; `/api/v1/ready` xác nhận database. Mặc định dùng database; để chạy demo browser cũ có thể bật `NEXT_PUBLIC_USE_MOCK=true`. `server:setup` giữ credential DB và AUTH_SECRET đã có, sinh secret nếu thiếu và import dữ liệu mẫu không trùng. Dữ liệu sách import chưa có tồn bán, admin cần nhập tồn tại trang sửa sách trước khi khách mua.

```bash
npm test
npx tsc --noEmit --incremental false
npm run build
npm run start
```

`dev` và `start` đều chạy ở cổng 5173; dừng dev trước khi chạy bản production. `npm run test:customer-services` chạy riêng các kiểm thử tư vấn/đổi trả.

## Tài khoản trải nghiệm

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Quản trị | admin@bookstore.vn | BookStore@123 |
| Khách hàng | user@bookstore.vn | BookStore@123 |

Có thể đăng ký tài khoản khách hàng mới. Lệnh seed đã nhập các tài khoản mẫu vào PostgreSQL với mật khẩu được hash; đăng nhập thật cấp JWT có phiên được kiểm tra và thu hồi ở server. Trong chế độ mock, các luồng này được mô phỏng tại trình duyệt.

- Khách hàng: `/client`, `/client/products`, `/client/cart`, `/client/orders`, `/client/profile`; cửa sổ chatbot có trên toàn bộ khu vực `/client`.
- Quản trị: `/admin`, `/admin/chatbot`, `/admin/reports`, quản lý sách, danh mục, đơn hàng và đánh giá.
- Giữ các URL `/client/warranty` và `/admin/warranty` để tương thích, nội dung hiển thị là **đổi trả sách**.

## Dữ liệu dùng chung

Thư mục `mock-data/` chứa dữ liệu khởi tạo cho cả admin và client:

| File | Nội dung |
| --- | --- |
| `products.json` | 32 sách, giá demo, tác giả và thông tin xuất bản |
| `category-parents.json`, `categories.json` | 8 nhóm sách và các danh mục con |
| `users.json`, `orders.json` | Tài khoản, đơn hàng mẫu ở các trạng thái |
| `stores.json` | Dữ liệu cũ, giữ để tương thích dữ liệu demo đã lưu |
| `banners.json`, `site-content.json` | Banner, thông tin thương hiệu và nhóm sách trang chủ bằng ID |
| `customer-services.json` | Nhu cầu đọc, gợi ý sách, hồ sơ và phiếu đổi trả mẫu |
| `borrowing.json` | Dữ liệu cũ, giao diện mượn sách đã được gỡ |
| `sources.json` | URL nguồn thông tin và ảnh bìa từ Nhã Nam, Alpha Books, NXB Kim Đồng |

Ảnh bìa tải sẵn tại `public/images/books/`, không cần truy cập CDN bên ngoài khi chạy demo. Giá và dữ liệu giao dịch là minh họa. Các trường xuất bản không xác minh được để trống và hiển thị “Đang cập nhật”.

`lib/api/*` giữ các hàm API hiện có. Khi bật mock, `lib/api/client.ts` chuyển request sang `lib/mock/request.ts`. Store dùng JSON làm seed, lưu thay đổi vào `bookstore:database:v1`; phiên đăng nhập dùng `bookstore:access-token:v1`. Tư vấn tham chiếu catalog sách chung, còn các phiếu đổi trả mới được lưu theo tài khoản.

- Admin thêm/sửa/ẩn sách, đổi tên danh mục hoặc cập nhật đơn hàng sẽ được phản ánh tại client trên cùng trình duyệt, kể cả tab đang mở.
- Giỏ hàng và đơn hàng thuộc từng tài khoản. Checkout chuyển giỏ sang đơn đang xử lý; admin chỉ chuyển lần lượt: xử lý → đóng gói → giao hàng → hoàn thành.
- Thay đổi được lưu trong trình duyệt, không ghi ngược JSON và không đồng bộ giữa thiết bị. Phiên đăng nhập được chia sẻ giữa các tab cùng trình duyệt.
- Upload mock hỗ trợ JPEG, PNG, GIF, WebP, tối đa **2 MB/ảnh**, lưu dạng data URL. Nếu vượt dung lượng localStorage, thao tác lưu báo lỗi và giữ nguyên dữ liệu đã lưu trước đó.
- Hồ sơ đổi trả mẫu dùng ngày minh họa trong JSON; các tài khoản cùng thấy phiếu mẫu, còn phiếu tự tạo được tách theo tài khoản. Thời hạn được tính theo ngày Việt Nam, gồm cả ngày kết thúc.

## Chatbot và chăm sóc khách hàng

- Mở **Hỏi BookStore AI** ở góc dưới, hoặc nút tư vấn trên trang chủ/danh mục/chi tiết sách. Hỗ trợ khách vãng lai, gợi ý sách có link chi tiết và tiếp nhận nhu cầu hỗ trợ đơn hàng/đổi trả.
- `/admin/chatbot`: bật/tắt chatbot, tên trợ lý, lời chào, thông báo dự phòng, số sách gợi ý và liên hệ hỗ trợ. Tab lịch sử tìm theo người hỏi/nội dung/mã phiên, lọc lượt cần hỗ trợ và lưu ghi chú nội bộ/trạng thái xử lý cho từng lượt.
- Chế độ mock chỉ tìm theo quy tắc trong trình duyệt. Backend thật mặc định tìm trong catalog PostgreSQL; khi cấu hình AI_API_URL/AI_API_KEY, backend gọi provider bằng model, temperature và system prompt của admin. Không nhập API key vào trình duyệt; xem [CHATBOT_REPORTS_API.md](CHATBOT_REPORTS_API.md).
- Lịch sử quản trị lưu trong localStorage dùng chung của demo. Cửa sổ khách giữ hội thoại trong bộ nhớ khi điều hướng; tải lại trang tạo phiên mới. Đăng nhập/đăng xuất đổi cửa sổ và mã phiên để không lẫn hội thoại giữa tài khoản.
- Cấu hình và log tự bổ sung vào dữ liệu demo cũ, giữ sách đã sửa, tài khoản, giỏ hàng và đơn mua. Khách không đọc API lịch sử quản trị hoặc ghi chú nội bộ.

## Báo cáo doanh thu

- `/admin/reports`: lọc từ/đến ngày, gom theo ngày/tuần/tháng/năm, biểu đồ cột hoặc đường, bảng số liệu, top 20 sách bán chạy và xuất CSV toàn bộ kết quả.
- Chỉ tính đơn `Done`, theo `completedAt` và múi giờ Việt Nam. Với đơn cũ chưa có ngày hoàn thành, dùng `updatedAt`, sau đó `createdAt`. Tuần bắt đầu thứ Hai; khoảng ngày bao gồm cả hai đầu. Kỳ chưa bán có giá trị 0.
- Tiền được cộng bằng BigInt từ tổng đơn và đơn giá đã chốt; thay đổi giá/tên sách trong catalog không sửa lịch sử bán. Giảm giá sách (`discount`) là phần trăm mô tả giá bán: `price` đã là giá sau giảm và checkout không giảm thêm lần nữa.
- Đã gỡ các route `/client/borrowing`, `/admin/borrowing`, `/admin/stores` và toàn bộ liên kết/giao diện liên quan. Module dữ liệu/API cũ được giữ để không phá dữ liệu demo đã lưu; truy cập trực tiếp các route cũ trả 404.

## Đặt lại dữ liệu demo

Mở DevTools → Console ở website và chạy:

```js
Object.keys(localStorage)
  .filter((key) => key.startsWith("bookstore:"))
  .forEach((key) => localStorage.removeItem(key));
location.reload();
```

Thao tác này đặt lại dữ liệu BookStore và đăng xuất; dữ liệu website khác được giữ nguyên. Sau khi chỉnh JSON, đặt lại dữ liệu để trình duyệt nạp seed mới.

## PostgreSQL và Prisma ORM

Đã tích hợp Prisma ORM 7 và PostgreSQL cho phần server của Next.js. Cấu trúc database nằm tại `prisma/schema.prisma`, lịch sử tạo bảng và ràng buộc nằm tại `prisma/migrations/`. Yêu cầu Node.js 20.19+, 22.12+ hoặc 24+.

Cấu hình kết nối trong `.env` (file này không được commit):

```dotenv
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
DB_DATABASE=book_shop
```

Có thể dùng `DATABASE_URL` thay cho `DB_*`; khi cùng tồn tại, `DATABASE_URL` được ưu tiên. Các lệnh Prisma và script database đọc `.env` tại thư mục gốc. Biến kết nối chỉ dùng ở server, không thêm tiền tố `NEXT_PUBLIC_`.

```bash
npm install
npm run db:setup
npm run db:check
npm run test:db
npm run db:studio
```

`db:setup` tạo database nếu chưa có, áp dụng migration và sinh Prisma Client. PostgreSQL phải đang chạy; tài khoản cần quyền tạo database (hoặc database đã được tạo trước) và quyền tạo bảng. Lệnh không xóa database hoặc dữ liệu hiện có. `db:check` kiểm tra kết nối thật bằng Prisma và đếm bản ghi trong các bảng; không thêm dữ liệu mẫu.

Để nhập toàn bộ `mock-data/` trên máy hiện tại hoặc máy khác:

```bash
npm run db:seed:check
npm run db:setup:seed
npm run db:check
```

Nếu đã setup schema, chạy `npm run db:seed`. Script thêm dữ liệu thiếu, không tạo trùng hoặc ghi đè bản ghi đã nhập; mật khẩu được hash. Người dùng, danh mục cha/con, sách, đơn, đánh giá và hồ sơ tư vấn vào các bảng nghiệp vụ; các nhóm chưa có model riêng và snapshot cả 12 file được lưu JSONB trong `Seed_Documents`, không chứa mật khẩu plaintext. Xem [hướng dẫn import, ánh xạ dữ liệu và kiểm thử](MOCK_DATA_IMPORT.md). Lệnh seed chỉ làm công việc dữ liệu; `server:setup` cấu hình backend và giao diện sử dụng PostgreSQL.

`test:db` kiểm tra đọc/ghi, khóa ngoại, ràng buộc, xóa liên quan và lịch sử giá trên PostgreSQL thật; các bản ghi kiểm thử nằm trong transaction được rollback. Sequence ID vẫn có thể tăng sau kiểm thử. Lệnh này chạy riêng, không nằm trong `npm test`.

| Bảng | Nội dung |
| --- | --- |
| `Users` | Tài khoản; email duy nhất; `Role`: 0 = khách hàng, 1 = admin |
| `Categories` | Danh mục sách |
| `Books` | Sách, danh mục, giá và tồn kho |
| `Cart_Items` | Giỏ hàng; mỗi cặp người dùng/sách có một dòng |
| `Orders` | Đơn hàng, địa chỉ giao, thanh toán và trạng thái |
| `Order_Items` | Bổ sung chi tiết sách trong đơn: tên sách tại thời điểm mua, số lượng, đơn giá |
| `Reviews` | Đánh giá từ 1 đến 5 sao và bình luận |
| `Chat_Logs` | Câu hỏi/trả lời theo phiên, tài khoản tùy chọn, sách gợi ý và xử lý chăm sóc |
| `AI_Configs` | Một cấu hình chatbot chung (ConfigID = 1), không lưu API key |

`Books` có `ISBN` (tùy chọn), `Publisher` (đã có từ đầu), `PageCount` (số nguyên dương hoặc null) và `Discount` (0–100%, 2 chữ số thập phân). Migration mới giữ dữ liệu cũ, tính phần trăm giảm giá từ OriginalPrice/SellingPrice, tạo hai bảng chatbot và một cấu hình mặc định. Xóa tài khoản đặt UserID trong log về null, giữ lịch sử hỗ trợ.

Tên bảng/cột giữ theo thiết kế (`Users`, `UserID`, `FullName`...), các model/field Prisma dùng tên TypeScript như `User`, `id`, `fullName` thông qua `@map`/`@@map`. Khi truy vấn SQL trực tiếp cần đặt tên trong dấu nháy kép, ví dụ `SELECT * FROM "Books"`.

Giá tiền dùng `Decimal(14,2)`, thời gian dùng `timestamptz`. Migration ràng buộc giá/tồn kho/tổng tiền không âm, số lượng mua lớn hơn 0, vai trò 0/1 và điểm 1–5. `PaymentMethod`: `COD`, `BANK_TRANSFER`, `E_WALLET`. `OrderStatus`: `PENDING` (chờ xác nhận), `SHIPPING` (đang giao), `DELIVERED` (đã giao), `CANCELLED` (đã hủy).

Khóa ngoại ngăn xóa danh mục đang chứa sách, người dùng đã có đơn hoặc sách đã được mua. API ẩn sách thay vì xóa vật lý. Tên, ảnh và đơn giá trong `Order_Items` được lưu riêng để giữ lịch sử khi sửa catalog; checkout tính tổng, trừ tồn, tạo đơn/chi tiết và xóa giỏ trong cùng transaction.

Chỉ import Prisma trong Server Components, Route Handlers hoặc Server Actions:

```ts
import { prisma } from "@/lib/prisma";

const books = await prisma.book.findMany({
  include: { category: true },
  orderBy: { createdAt: "desc" },
});
```

`lib/prisma.ts` bảo vệ bằng `server-only` và tái sử dụng connection pool khi hot reload. API đăng ký chuẩn hóa email, hash mật khẩu scrypt với salt riêng và không trả hash về trình duyệt; guard kiểm tra phiên và role hiện hành trong database.

Khi đổi schema, dùng `npm run db:migrate -- --name ten_thay_doi`, rồi `npm run db:generate`; áp dụng migration đã commit ở môi trường khác bằng `npm run db:deploy`. Các CHECK constraint được viết trong SQL migration, cần giữ lại trong các migration tiếp theo; không dùng `db push` để thay thế lịch sử migration. Prisma Client được sinh tự động sau `npm install` và không commit thư mục `generated/prisma/`.

Phần tích hợp hiện tại có API nghiệp vụ sử dụng PostgreSQL và frontend đã gọi `/api/v1` khi tắt mock. Dữ liệu localStorage không tự chuyển vào PostgreSQL; dữ liệu JSON chỉ được nhập khi chạy lệnh seed ở trên. Tư vấn đã có Consultation_Profiles liên kết Book; các phiếu đổi trả mới dùng OrderItem thật, không lấy phiếu mẫu không khớp đơn làm dữ liệu khách hàng.

Tài liệu tham khảo: [Prisma ORM 7 với PostgreSQL](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql).

## Kết nối giao diện với API backend

Trong `.env`:

```dotenv
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=/api/v1
```

Khởi động lại dev server, hoặc build lại bản production sau khi đổi biến `NEXT_PUBLIC_*`. HTTP API, ảnh, tư vấn và đổi trả dùng backend Next.js; dữ liệu mock vẫn giữ riêng trong trình duyệt. Không cần backend cổng 8080.

Model `Product`/`ProductBody` hỗ trợ thông tin xuất bản, ISBN, giá gốc/bán, discount và tồn kho. Backend chuẩn hóa ISBN và kiểm tra checksum ISBN-10/13; giá là chuỗi nguyên VND. Truy vấn sách hỗ trợ `parentId`, `categoryId`, tìm kiếm không dấu theo tên/tác giả/mô tả/ISBN; chỉ admin được dùng `includeInactive=1` để xem sách ẩn. Thay đổi tồn đi qua API stock-adjustments và có nhật ký riêng.

Hợp đồng chatbot/báo cáo nằm trong `lib/api/chatbot.ts`, `lib/api/reports.ts` và [CHATBOT_REPORTS_API.md](CHATBOT_REPORTS_API.md); các endpoint đã triển khai trên backend. Chatbot mặc định tìm sách từ catalog theo quy tắc; cấu hình AI_API_URL/AI_API_KEY và model thật để dùng provider. Thanh toán hiện là COD; chuyển khoản/ví chưa được mở.

## Kiểm thử

`npm test` chạy kiểm thử các module TypeScript: mua hàng, phân quyền, đồng bộ, tư vấn/đổi trả, tương thích dữ liệu cũ và `chatbot-reports.test.mjs` cho chatbot, ISBN/giảm giá, doanh thu, mốc ngày Việt Nam, ranh giới tuần/năm và CSV. `npm run test:db` kiểm tra bảng/ràng buộc PostgreSQL bằng transaction được rollback. Bộ kiểm thử không thay đổi JSON hoặc dữ liệu trình duyệt.
