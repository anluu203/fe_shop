# BookStore

Nhà sách trực tuyến sử dụng Next.js App Router, React và TypeScript. Client có trợ lý tư vấn chọn sách và chăm sóc khách hàng; admin quản lý sách, đơn mua, cấu hình chatbot và báo cáo doanh thu. Giao diện giữ nền giấy, xanh rêu và tiêu đề serif.

## Chạy dự án

```bash
npm install
npm run dev
```

Truy cập **http://localhost:5173**. Mặc định dùng mock, không cần khởi động backend. Có thể sao chép `.env.example` thành `.env.local` để cấu hình rõ ràng.

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

Có thể đăng ký tài khoản khách hàng mới. Tài khoản, phiên đăng nhập và phân quyền trong chế độ mock được mô phỏng tại trình duyệt.

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
- **Demo dùng quy tắc tìm kiếm catalog, chưa gọi mô hình AI bên ngoài.** Model, temperature và system prompt được lưu làm cấu hình cho backend sau này. Không nhập API key vào trình duyệt. Khi dùng HTTP, backend chịu trách nhiệm gọi mô hình, xác thực và ghi PostgreSQL theo [CHATBOT_REPORTS_API.md](CHATBOT_REPORTS_API.md).
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

Khóa ngoại ngăn xóa danh mục đang chứa sách, người dùng đã có đơn hoặc sách đã được mua. Xóa người dùng/sách sẽ xóa giỏ hàng và đánh giá liên quan; xóa đơn sẽ xóa chi tiết của đơn. Tên và đơn giá trong `Order_Items` được lưu riêng để giữ lịch sử khi sửa catalog. Tổng tiền phải được tính và lưu cùng chi tiết đơn trong transaction ở bước triển khai checkout.

Chỉ import Prisma trong Server Components, Route Handlers hoặc Server Actions:

```ts
import { prisma } from "@/lib/prisma";

const books = await prisma.book.findMany({
  include: { category: true },
  orderBy: { createdAt: "desc" },
});
```

`lib/prisma.ts` bảo vệ bằng `server-only` và tái sử dụng connection pool khi hot reload. `PasswordHash` chỉ là cột lưu hash; API đăng ký sau này cần hash mật khẩu bằng thư viện phù hợp trước khi lưu, chuẩn hóa email, và không trả hash về trình duyệt.

Khi đổi schema, dùng `npm run db:migrate -- --name ten_thay_doi`, rồi `npm run db:generate`; áp dụng migration đã commit ở môi trường khác bằng `npm run db:deploy`. Các CHECK constraint được viết trong SQL migration, cần giữ lại trong các migration tiếp theo; không dùng `db push` để thay thế lịch sử migration. Prisma Client được sinh tự động sau `npm install` và không commit thư mục `generated/prisma/`.

Phần tích hợp hiện tại thiết lập database/ORM. Giao diện vẫn dùng mock như trước; chưa có API đăng nhập, CRUD hay checkout sử dụng PostgreSQL. Không tắt mock cho đến khi triển khai đủ endpoint bên dưới. Dữ liệu localStorage/JSON không tự chuyển vào PostgreSQL.

Tài liệu tham khảo: [Prisma ORM 7 với PostgreSQL](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql).

## Kết nối giao diện với API backend

Trong `.env.local`:

```dotenv
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

Khởi động lại dev server, hoặc build lại bản production sau khi đổi biến `NEXT_PUBLIC_*`. HTTP API và upload ảnh sẽ dùng backend đã cấu hình; dữ liệu mock vẫn giữ riêng trong trình duyệt. Tư vấn/đổi trả tiếp tục dùng service JSON hiện có cho đến khi có endpoint tương ứng.

Model `Product`/`ProductBody` bổ sung các trường tùy chọn `isbn`, `discount`, `author`, `publisher`, `publicationYear`, `pageCount`, `language`, `coverType`. Giá giữ dạng chuỗi VND. ISBN được chuẩn hóa bỏ gạch nối và kiểm tra checksum ISBN-10/13 ở giao diện/mock API. Truy vấn sách hỗ trợ thêm `parentId`; admin có thể truyền `includeInactive=1` để xem cả sách bị ẩn. Backend tương lai cần hỗ trợ những trường/truy vấn này.

Hợp đồng chatbot/báo cáo nằm trong `lib/api/chatbot.ts`, `lib/api/reports.ts` và [CHATBOT_REPORTS_API.md](CHATBOT_REPORTS_API.md). Các endpoint mới hiện được thực thi trong mock; cần triển khai chúng trên backend trước khi tắt mock. Các bảng Prisma vừa tạo chưa tự kết nối với giao diện.

## Kiểm thử

`npm test` chạy kiểm thử các module TypeScript: mua hàng, phân quyền, đồng bộ, tư vấn/đổi trả, tương thích dữ liệu cũ và `chatbot-reports.test.mjs` cho chatbot, ISBN/giảm giá, doanh thu, mốc ngày Việt Nam, ranh giới tuần/năm và CSV. `npm run test:db` kiểm tra bảng/ràng buộc PostgreSQL bằng transaction được rollback. Bộ kiểm thử không thay đổi JSON hoặc dữ liệu trình duyệt.
