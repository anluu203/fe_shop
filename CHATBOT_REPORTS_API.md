# Hợp đồng tích hợp chatbot và báo cáo

Các endpoint dưới đây đã triển khai bằng Next.js Route Handlers và Prisma. Prefix `NEXT_PUBLIC_API_URL=/api/v1`, cùng cổng 5173 với giao diện. Dùng Bearer JWT có phiên trong PostgreSQL; backend kiểm tra quyền độc lập với giao diện. Hướng dẫn vận hành tại [BACKEND_API.md](BACKEND_API.md).

| Method | Endpoint | Quyền | Kết quả |
| --- | --- | --- | --- |
| GET | `/chatbot/config` | Public | `PublicAIConfig`: enabled, botName, welcomeMessage, supportContact |
| POST | `/chatbot/messages` | Public hoặc tài khoản | `ChatReply`; body `{ sessionId, message }` |
| GET | `/admin/chatbot/config` | ADMIN | `AIConfig` |
| PATCH | `/admin/chatbot/config` | ADMIN | Cấu hình sau cập nhật |
| GET | `/admin/chatbot/logs` | ADMIN | `ChatLog[]`, mới nhất trước |
| PATCH | `/admin/chatbot/logs/:id` | ADMIN | `ChatLog`; body `{ resolved, adminNote }` |
| GET | `/admin/reports/revenue?from=2026-10-01&to=2026-10-31&period=day` | ADMIN | `RevenueReport` |

Kiểu chi tiết nằm trong `lib/types/chatbot.ts` và `lib/types/reports.ts`. Tiền trả về là chuỗi số nguyên VND, timestamp là ISO có múi giờ. ID frontend hiện là chuỗi, Prisma dùng số nguyên; backend cần serialize ID sang chuỗi và ánh xạ `Product`/`Book`, `Done`/`DELIVERED` theo hệ thống đăng nhập và catalog thực tế. Không trộn token demo hoặc ID trong JSON seed với tài khoản PostgreSQL.

## Chatbot

- `message`: 1–2.000 ký tự sau kiểm tra; `sessionId`: 8–100 ký tự `[a-zA-Z0-9_-]`. Lấy `userId` từ phiên đăng nhập, bỏ qua userId do client gửi. Phiên đã gắn tài khoản phải thuộc tài khoản đó; phiên khách cần định danh ký/cookie trên server khi triển khai thật.
- `ChatReply`: `{ id, answer, books: Product[], needsHuman, createdAt }`. Chỉ trả các sách đang bán, sử dụng dữ liệu giá và catalog tin cậy từ server. Không cho mô hình thực thi sửa đơn, hoàn tiền hoặc thay đổi dữ liệu.
- Lưu một `Chat_Logs` cho mỗi lượt gửi thành công; ghi câu hỏi, trả lời, ID sách gợi ý, tình trạng cần người hỗ trợ. Lỗi gọi AI hoặc ghi log phải trả lỗi rõ ràng để giao diện giữ lại câu hỏi cho lần gửi lại.
- `AIConfig`: enabled, botName (1–80), welcomeMessage/fallbackMessage (1–1.000), systemPrompt (1–6.000), model (1–100), temperature (0–2), maxSuggestions (1–5), supportContact (1–254), updatedAt. ConfigID duy nhất là 1. Không trả systemPrompt hoặc model trong endpoint public.
- Cấu hình provider bằng AI_API_URL/AI_API_KEY qua biến môi trường server; backend dùng system prompt, model và temperature khi gọi provider tương thích Chat Completions. Chưa có provider/key thì mode=rules tìm kiếm catalog DB; public config trả mode để UI hiển thị đúng. Không trình bày chế độ rules như đã gọi mô hình.
- `adminNote`: tối đa 2.000 ký tự, chỉ ADMIN được đọc/ghi. Trạng thái xử lý tính theo từng lượt; `needsHuman && !resolved` là lượt cần chăm sóc. Ghi chú nội bộ chưa phải tin nhắn gửi cho khách.
- Backend thật cần giới hạn tần suất, kích thước request và thời gian gọi mô hình; không tin lịch sử, catalog, cấu hình hay role từ trình duyệt.

## Báo cáo

- `from`, `to`: ngày lịch `YYYY-MM-DD`, bao gồm hai đầu, múi giờ `Asia/Ho_Chi_Minh`; `period`: day/week/month/year. Tuần bắt đầu thứ Hai. Kỳ đầu/cuối chỉ cộng phần nằm trong khoảng lọc.
- Tối đa 366 ngày với period=day; các kỳ còn lại tối đa 3.660 ngày. Ngày đảo ngược, ngày không tồn tại hoặc kỳ lạ trả lỗi validation.
- Chỉ đơn hoàn thành. Schema Orders đã có completedAt; backend ghi một lần khi chuyển DELIVERED/Done và không sửa khi request cùng trạng thái lặp lại. Đơn COD cần paymentCollected=true để xác nhận thu tiền. Không dùng ngày cập nhật tùy ý cho đơn mới.
- Đơn demo cũ dùng updatedAt, sau đó createdAt nếu chưa có completedAt. Tổng hợp tiền bằng số nguyên/Decimal; dữ liệu sách bán chạy dùng đơn giá và tên chốt tại thời điểm mua trong Order_Items.
- `RevenueReport` gồm query, revenue, orders, quantity, averageOrder, buckets (cả kỳ 0), bestSellers. Xếp sách theo số lượng giảm dần, hòa thì theo doanh thu; giao diện hiển thị top 20, CSV xuất toàn bộ.
- API thật bổ sung refunded và netRevenue: tiền hoàn được xác nhận trong kỳ theo ngày hoàn và revenue trừ refunded. Khoản hoàn đơn kỳ trước có thể khiến netRevenue kỳ này âm; không thay đổi giá/tổng đơn gốc. UI và CSV hiển thị riêng các khoản này.

## Thông tin sách

`isbn` là ISBN-10/13 đã chuẩn hóa bỏ gạch nối, có checksum hợp lệ hoặc chuỗi rỗng; PostgreSQL lưu null khi chưa biết. `publisher` và `pageCount` giữ tên hợp đồng cũ. `discount` là phần trăm 0–100 tối đa 2 chữ số thập phân, mặc định 0; `price` luôn là giá bán sau giảm. Không nhân giảm giá thêm trong giỏ/checkout. SQL `Books.Discount` mô tả chênh lệch giữa OriginalPrice và SellingPrice; backend cần giữ ba trường nhất quán khi sửa giá.

Các route giao diện mượn sách và quản lý nhà sách đã gỡ. Module dữ liệu cũ được giữ để tương thích localStorage; không còn màn hình gọi các endpoint này.
