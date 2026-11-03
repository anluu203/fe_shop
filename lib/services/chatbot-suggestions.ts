import type { Product } from "../types";
import type { AIConfig } from "../types/chatbot";
import { formatPrice } from "../utils/format";

interface ChatSuggestion {
  id: string;
  text: string;
  keywords?: readonly string[];
  maxPrice?: number;
  answer?: (contact: string) => string;
  needsHuman?: boolean;
}

// One shared list keeps the buttons and the server's AI-free replies in sync.
export const CHAT_SUGGESTIONS: readonly ChatSuggestion[] = [
  { id: "children", text: "Gợi ý sách thiếu nhi", keywords: ["thiếu nhi", "trẻ em"] },
  { id: "selfhelp", text: "Sách kỹ năng dưới 200k", keywords: ["kỹ năng", "phát triển bản thân", "tư duy"], maxPrice: 200000 },
  { id: "contact", text: "Liên hệ nhân viên", needsHuman: true, answer: (contact) => `Bạn có thể liên hệ nhân viên qua ${contact}. Hãy mô tả vấn đề và cung cấp mã đơn nếu có. Không gửi mật khẩu hay thông tin thanh toán trong chat.` },
  { id: "literature", text: "Gợi ý sách văn học", keywords: ["văn học", "tiểu thuyết", "truyện ngắn"] },
  { id: "manga", text: "Gợi ý truyện tranh, manga", keywords: ["truyện tranh", "manga", "comic"] },
  { id: "business", text: "Gợi ý sách kinh doanh", keywords: ["kinh doanh", "kinh tế", "quản trị", "tài chính"] },
  { id: "budget", text: "Tìm sách dưới 100k", maxPrice: 100000 },
  { id: "ordering", text: "Làm thế nào để đặt sách?", answer: () => "Chọn sách trong danh mục, mở chi tiết sách rồi thêm vào giỏ hàng. Đăng nhập tài khoản, kiểm tra giỏ hàng, điền thông tin nhận hàng và xác nhận đặt hàng." },
  { id: "orders", text: "Xem đơn hàng của tôi ở đâu?", needsHuman: true, answer: () => "Đăng nhập tài khoản và mở mục Đơn mua để xem danh sách đơn hàng. Chọn một đơn để xem chi tiết và tình trạng xử lý. Bạn có thể dùng nút Xem đơn hàng bên dưới." },
  { id: "returns", text: "Làm thế nào để yêu cầu đổi trả?", needsHuman: true, answer: (contact) => `Đăng nhập và mở mục Yêu cầu đổi trả, chọn sản phẩm đủ điều kiện rồi điền thông tin liên hệ và mô tả vấn đề. Bạn có thể dùng nút Yêu cầu đổi trả bên dưới hoặc liên hệ ${contact} để được hỗ trợ.` },
];

const normalize = (text: string) => text.trim().toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ");

export function suggestedChatReply<T extends Product>(
  message: string,
  catalog: readonly T[],
  config: Pick<AIConfig, "maxSuggestions" | "fallbackMessage" | "supportContact">,
) {
  const suggestion = CHAT_SUGGESTIONS.find((item) => normalize(item.text) === normalize(message));
  if (!suggestion) return null;
  if (suggestion.answer) return {
    answer: suggestion.answer(config.supportContact), books: [] as T[],
    needsHuman: suggestion.needsHuman ?? false, mode: "rules" as const,
  };
  const books = catalog.filter((book) => {
    if (!book.isActive || book.stockQuantity === 0 || Number(book.price) > (suggestion.maxPrice ?? Infinity)) return false;
    const text = normalize(`${book.name} ${book.author ?? ""} ${book.category.name} ${book.category.parent.name} ${book.description ?? ""}`);
    return !suggestion.keywords || suggestion.keywords.some((keyword) => text.includes(normalize(keyword)));
  }).sort((a, b) => Number(a.price) - Number(b.price) || a.id.localeCompare(b.id))
    .slice(0, config.maxSuggestions);
  return {
    answer: books.length
      ? `Bạn có thể tham khảo ${books.length} cuốn sách sau${suggestion.maxPrice ? `, giá không quá ${formatPrice(suggestion.maxPrice)}` : ""}. Giá bên dưới là giá đang bán tại nhà sách.`
      : `${config.fallbackMessage}\nLiên hệ hỗ trợ: ${config.supportContact}`,
    books, needsHuman: books.length === 0, mode: "rules" as const,
  };
}
