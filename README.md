# BookStore

Nhà sách trực tuyến và thư viện chia sẻ sử dụng Next.js App Router, React và TypeScript. Client mang phong cách tạp chí đọc sách với nền giấy, xanh rêu và tiêu đề serif. Admin sử dụng điều hướng ngang, dashboard tổng quan bán/mượn sách và bảng quản lý riêng. Giữ lớp API, contexts và các luồng mua hàng hiện có.

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

- Khách hàng: `/client`, `/client/products`, `/client/borrowing`, `/client/cart`, `/client/orders`, `/client/profile`.
- Quản trị: `/admin`, `/admin/borrowing`, quản lý sách, danh mục, nhà sách, đơn hàng, tư vấn và đổi trả.
- Giữ các URL `/client/warranty` và `/admin/warranty` để tương thích, nội dung hiển thị là **đổi trả sách**.

## Dữ liệu dùng chung

Thư mục `mock-data/` chứa dữ liệu khởi tạo cho cả admin và client:

| File | Nội dung |
| --- | --- |
| `products.json` | 32 sách, giá demo, tác giả và thông tin xuất bản |
| `category-parents.json`, `categories.json` | 8 nhóm sách và các danh mục con |
| `users.json`, `orders.json` | Tài khoản, đơn hàng mẫu ở các trạng thái |
| `stores.json` | Nhà sách, cũng hiển thị tại footer client |
| `banners.json`, `site-content.json` | Banner, thông tin thương hiệu và nhóm sách trang chủ bằng ID |
| `customer-services.json` | Nhu cầu đọc, gợi ý sách, hồ sơ và phiếu đổi trả mẫu |
| `borrowing.json` | Số bản sách cho mượn và các phiếu mượn mẫu |
| `sources.json` | URL nguồn thông tin và ảnh bìa từ Nhã Nam, Alpha Books, NXB Kim Đồng |

Ảnh bìa tải sẵn tại `public/images/books/`, không cần truy cập CDN bên ngoài khi chạy demo. Giá và dữ liệu giao dịch là minh họa. Các trường xuất bản không xác minh được để trống và hiển thị “Đang cập nhật”.

`lib/api/*` giữ các hàm API hiện có. Khi bật mock, `lib/api/client.ts` chuyển request sang `lib/mock/request.ts`. Store dùng JSON làm seed, lưu thay đổi vào `bookstore:database:v1`; phiên đăng nhập dùng `bookstore:access-token:v1`. Tư vấn tham chiếu catalog sách chung, còn các phiếu đổi trả mới được lưu theo tài khoản.

- Admin thêm/sửa/ẩn sách, đổi tên danh mục hoặc cập nhật đơn hàng sẽ được phản ánh tại client trên cùng trình duyệt, kể cả tab đang mở.
- Giỏ hàng và đơn hàng thuộc từng tài khoản. Checkout chuyển giỏ sang đơn đang xử lý; admin chỉ chuyển lần lượt: xử lý → đóng gói → giao hàng → hoàn thành.
- Thay đổi được lưu trong trình duyệt, không ghi ngược JSON và không đồng bộ giữa thiết bị. Phiên đăng nhập được chia sẻ giữa các tab cùng trình duyệt.
- Upload mock hỗ trợ JPEG, PNG, GIF, WebP, tối đa **2 MB/ảnh**, lưu dạng data URL. Nếu vượt dung lượng localStorage, thao tác lưu báo lỗi và giữ nguyên dữ liệu đã lưu trước đó.
- Hồ sơ đổi trả mẫu dùng ngày minh họa trong JSON; các tài khoản cùng thấy phiếu mẫu, còn phiếu tự tạo được tách theo tài khoản. Thời hạn được tính theo ngày Việt Nam, gồm cả ngày kết thúc.

## Đăng ký mượn sách

- Khách mở **Mượn sách** ở điều hướng, hoặc chọn nút mượn trên thẻ/trang chi tiết sách. Tại `/client/borrowing`, chọn sách, điền tên và điện thoại, nhà sách nhận, ngày nhận và thời hạn **7 / 14 / 30 ngày** (mặc định 14 ngày).
- Ngày nhận được chọn từ hôm nay đến 30 ngày tới. Mỗi phiếu một bản sách; mỗi tài khoản có tối đa **5 phiếu đang hoạt động**, không có hai phiếu hoạt động cho cùng một cuốn.
- Khách xem trạng thái, lịch sử xử lý và hạn trả trong tab **Phiếu mượn của tôi**. Có thể hủy trước khi nhận sách.
- Admin mở `/admin/borrowing`: tìm/lọc phiếu, duyệt hoặc từ chối với ghi chú. Luồng chính: **Chờ duyệt → Chờ nhận sách → Đang mượn → Đã trả**. Admin có thể hủy phiếu đã duyệt khi chưa bàn giao.
- Số bản chỉ được giữ khi duyệt, không giữ lúc gửi đăng ký. Bàn giao bắt đầu vào hoặc sau ngày hẹn; hạn trả tính từ ngày bàn giao thực tế theo ngày Việt Nam. Quá hạn là nhãn tự tính cho phiếu đang mượn, không thay đổi lịch sử trạng thái.
- Tab **Kho sách cho mượn** cho phép bật/tắt cho mượn và chỉnh số bản mỗi đầu sách (0–100). Không được giảm xuống dưới số bản đã giữ chỗ/đang mượn. Khi hủy phiếu đã duyệt hoặc trả sách, bản sách tự khả dụng trở lại. Kho mượn độc lập với đơn mua sách.
- Các phiếu được tách theo tài khoản, admin xem toàn bộ; thay đổi đồng bộ giữa các tab cùng trình duyệt. Không thu phí mượn hoặc xử lý phạt trong demo.
- Database v1 đã lưu từ phiên bản trước tự bổ sung collection mượn sách, giữ nguyên tài khoản, sách đã sửa, giỏ hàng và đơn mua. Không cần đặt lại dữ liệu khi nâng cấp.

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

Model `Product`/`ProductBody` bổ sung các trường tùy chọn `author`, `publisher`, `publicationYear`, `pageCount`, `language`, `coverType`. Giá giữ dạng chuỗi VND. Truy vấn sách hỗ trợ thêm `parentId`; admin có thể truyền `includeInactive=1` để xem cả sách bị ẩn. Backend tương lai cần hỗ trợ những trường/truy vấn này.

Các hợp đồng mượn sách nằm trong `lib/types/borrowing.ts` và `lib/api/borrowing.ts`: `GET /borrowing/books`, `GET/POST /borrowing/loans`, `PATCH /borrowing/loans/:id/cancel`, `GET /admin/borrowing/loans`, `PATCH /admin/borrowing/loans/:id`, `GET /admin/borrowing/inventory`, `PATCH /admin/borrowing/inventory/:productId`. Khi tắt mock, backend tương lai cần triển khai các endpoint này.

## Kiểm thử

`npm test` chạy các kiểm thử trực tiếp trên module TypeScript: phân quyền, đăng nhập/đăng ký, lọc trước phân trang, CRUD, giỏ hàng, checkout, cập nhật trạng thái, đồng bộ dữ liệu, lỗi lưu trữ, đường dẫn ảnh, tư vấn, đổi trả và mượn sách. Bộ mượn sách kiểm tra kho khả dụng, chống trùng, giới hạn phiếu, xác nhận/nhận/trả, ngày quá hạn và nâng cấp dữ liệu cũ. Bộ kiểm thử dùng bộ nhớ riêng, không thay đổi JSON hay dữ liệu trình duyệt của bạn.
