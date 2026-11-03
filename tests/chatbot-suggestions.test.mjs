import test from "node:test";
import assert from "node:assert/strict";
import { browserModules } from "./helpers.mjs";

function setup() {
  return browserModules().load("lib/services/chatbot-suggestions.ts");
}
const config = { maxSuggestions: 2, fallbackMessage: "Chưa có sách phù hợp.", supportContact: "hotline@example.test" };
const book = (id, category, price, overrides = {}) => ({
  id, name: `Cuốn ${id}`, author: "Tác giả", description: "", price: String(price), isActive: true,
  stockQuantity: 5, category: { name: category, parent: { name: category } }, ...overrides,
});

test("suggested book questions respect topic, price, availability and the configured count", () => {
  const { suggestedChatReply } = setup();
  const catalog = [book("a", "Kỹ năng sống", 199000), book("b", "Kỹ năng sống", 99000),
    book("c", "Kỹ năng sống", 201000), book("d", "Văn học", 50000),
    book("e", "Kỹ năng sống", 30000, { isActive: false }), book("f", "Kỹ năng sống", 20000, { stockQuantity: 0 })];
  const reply = suggestedChatReply("Sách kỹ năng dưới 200k", catalog, config);
  assert.equal(reply.mode, "rules");
  assert.deepEqual(Array.from(reply.books, (item) => item.id), ["b", "a"]);
  assert.deepEqual(Array.from(suggestedChatReply("Tìm sách dưới 100k", catalog, config).books, (item) => item.id), ["d", "b"]);
  assert.equal(suggestedChatReply("  SACH KY NANG DUOI 200K  ", catalog, config).books.length, 2);
  assert.equal(suggestedChatReply("Sách kỹ năng dưới 200k", catalog, { ...config, maxSuggestions: 1 }).books.length, 1);
});

test("all client suggestions have deterministic replies including empty catalogs, and free text stays with AI", () => {
  const { CHAT_SUGGESTIONS, suggestedChatReply } = setup();
  assert.ok(CHAT_SUGGESTIONS.length > 3);
  for (const { text } of CHAT_SUGGESTIONS) {
    const reply = suggestedChatReply(text, [], config);
    assert.equal(reply.mode, "rules");
    assert.ok(reply.answer.length > 0);
    assert.equal(reply.books.length, 0);
  }
  assert.match(suggestedChatReply("Liên hệ nhân viên", [], config).answer, /hotline@example.test/);
  assert.match(suggestedChatReply("Gợi ý sách thiếu nhi", [], config).answer, /Chưa có sách phù hợp/);
  assert.equal(suggestedChatReply("Gợi ý sách thiếu nhi nhưng chỉ tác giả Việt Nam", [], config), null);
  assert.equal(suggestedChatReply("Tôi cần một cuốn sách về chủ đề khác", [], config), null);
});

test("suggested questions also work in mock mode and keep admin logs", async () => {
  const runtime = browserModules();
  const { CHAT_SUGGESTIONS } = runtime.load("lib/services/chatbot-suggestions.ts");
  const { mockRequest } = runtime.load("lib/mock/request.ts");
  for (const suggestion of CHAT_SUGGESTIONS) {
    const reply = await mockRequest("/chatbot/messages", "POST", JSON.stringify({ sessionId: "quick-question-session", message: suggestion.text }), {}, null);
    assert.equal(reply.mode, "rules");
    assert.ok(reply.answer.length > 0);
  }
  const logs = await mockRequest("/admin/chatbot/logs", "GET", undefined, {}, "bookstore-demo:user-admin");
  assert.equal(logs.length, CHAT_SUGGESTIONS.length);
});
