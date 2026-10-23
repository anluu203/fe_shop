import type { ChatBody, ChatLog, ChatReply } from "../types/chatbot";
import type { User } from "../types";
import { hydrateProduct, type MockState } from "./store";
import { formatPrice } from "../utils/format";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
// Deliberately deterministic demo. Production sends these requests to the authenticated backend.
export function createChatReply(
  state: MockState,
  user: User | null,
  body: ChatBody,
): ChatReply {
  const config = state.aiConfig;
  if (!config.enabled)
    throw new Error(
      "Chatbot đang tạm nghỉ. Vui lòng liên hệ nhân viên hỗ trợ.",
    );
  if (
    typeof body.message !== "string" ||
    !body.message.trim() ||
    body.message.length > 2000
  )
    throw new Error("Tin nhắn cần từ 1 đến 2.000 ký tự.");
  if (
    typeof body.sessionId !== "string" ||
    !/^[a-zA-Z0-9_-]{8,100}$/.test(body.sessionId)
  )
    throw new Error("Phiên trò chuyện không hợp lệ.");
  const message = body.message.trim(),
    text = normalize(message);
  const previous = state.chatLogs.filter((l) => l.sessionId === body.sessionId);
  if (previous.some((l) => l.userId !== (user?.id ?? null)))
    throw new Error("Phiên trò chuyện không thuộc tài khoản hiện tại.");
  const query = normalize(
    previous
      .filter((l) => !l.needsHuman)
      .slice(-2)
      .map((l) => l.question)
      .concat(message)
      .join(" "),
  );
  const budget = [
    ...query.matchAll(
      /(\d+(?:[.,]\d+)*)\s*(trieu|tr|nghin|ngan|k|vnd|dong|d|₫)(?=\s|$|[,.!?])/g,
    ),
  ].at(-1);
  const amount = budget?.[1];
  const number = amount
    ? Number(
        /^\d{1,3}([.,]\d{3})+$/.test(amount)
          ? amount.replace(/[.,]/g, "")
          : amount.replace(",", "."),
      )
    : Infinity;
  const maximum = budget
    ? number *
      (/^(trieu|tr)$/.test(budget[2])
        ? 1000000
        : /^(nghin|ngan|k)$/.test(budget[2])
          ? 1000
          : 1)
    : Infinity;
  const topic = query.replace(
    /\d+(?:[.,]\d+)*\s*(trieu|tr|nghin|ngan|k|vnd|dong|d|₫)(?=\s|$|[,.!?])/g,
    "",
  );
  const words = topic
    .split(/[^a-z0-9]+/)
    .filter(
      (word) =>
        word.length > 2 &&
        ![
          "sach",
          "cho",
          "minh",
          "toi",
          "tim",
          "muon",
          "duoi",
          "nghin",
          "ngan",
          "vnd",
          "mot",
          "nhung",
          "nao",
          "ban",
          "goi",
          "thich",
          "doc",
          "voi",
          "van",
          "chon",
          "hay",
          "nhat",
          "giup",
          "can",
          "xem",
          "them",
        ].includes(word),
    );
  const service =
    /don hang|giao hang|doi tra|hoan tien|khieu nai|nhan vien|lien he|cham soc/.test(
      text,
    );
  const candidates = state.products
    .filter((book) => book.isActive && Number(book.price) <= maximum)
    .map((book) => {
      const product = hydrateProduct(state, book);
      const title = normalize(
        `${product.name} ${product.author ?? ""} ${product.category.name} ${product.category.parent.name}`,
      );
      const description = normalize(product.description ?? "");
      return {
        product,
        score: words.reduce(
          (sum, word) =>
            sum +
            (title.includes(word) ? 3 : description.includes(word) ? 1 : 0),
          0,
        ),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || Number(a.product.price) - Number(b.product.price),
    );
  const broad =
    /goi y|tu van|chon sach|sach hay|ban chay|nen doc/.test(query) ||
    Number.isFinite(maximum);
  const matched = candidates.filter((c) => c.score > 0);
  const books = service
    ? []
    : (matched.length
        ? matched
        : broad && words.length === 0
          ? candidates
          : Number.isFinite(maximum) && words.every((w) => /^\d+$/.test(w))
            ? candidates
            : []
      )
        .slice(0, config.maxSuggestions)
        .map((c) => c.product);
  // Generic recommendation requests can offer a selection without claiming personalization.
  if (
    !service &&
    !books.length &&
    /^(goi y sach|tu van chon sach|sach hay|sach ban chay)[.!? ]*$/.test(text)
  )
    books.push(
      ...candidates.slice(0, config.maxSuggestions).map((c) => c.product),
    );
  const needsHuman = service || books.length === 0;
  const answer = service
    ? `Mình đã ghi nhận yêu cầu chăm sóc khách hàng. Vui lòng liên hệ ${config.supportContact} và cung cấp mã đơn nếu có. Bạn cũng có thể xem đơn mua và gửi yêu cầu đổi trả trong tài khoản. Không gửi mật khẩu hay thông tin thanh toán trong chat.`
    : books.length
      ? `Bạn có thể tham khảo ${books.length} cuốn sách sau${Number.isFinite(maximum) ? `, giá không quá ${formatPrice(maximum)}` : ""}. Giá bên dưới là giá đang bán. Bạn muốn tìm thêm theo tác giả hoặc thể loại nào?`
      : `${config.fallbackMessage}\nLiên hệ hỗ trợ: ${config.supportContact}`;
  const log: ChatLog = {
    id: `chat-${crypto.randomUUID()}`,
    sessionId: body.sessionId,
    userId: user?.id ?? null,
    customerName: user?.username ?? "Khách vãng lai",
    question: message,
    answer,
    recommendedBooks: books.map((b) => b.id),
    needsHuman,
    resolved: false,
    adminNote: "",
    createdAt: new Date().toISOString(),
  };
  state.chatLogs.push(log);
  return { id: log.id, answer, books, needsHuman, createdAt: log.createdAt };
}
