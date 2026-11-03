import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { chatMode, geminiModel, geminiReply } from "../lib/server/gemini";
import { defaultAIConfig, DEFAULT_GEMINI_MODEL } from "../lib/services/chatbot-config";
import type { Product } from "../lib/types";
import { aiFailure } from "../lib/server/ai-errors";

const originalEnv = { ...process.env };
afterEach(() => {
  for (const key of ["GEMINI_API_KEY", "AI_API_URL", "AI_API_KEY"]) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

const books = ["1", "2", "3"].map((id): Product => ({
  id, name: `Sách ${id}`, author: "Tác giả", description: "Sách kỹ năng",
  price: "120000", imageUrl: null, categoryId: "1", isActive: true,
  category: { id: "1", name: "Kỹ năng", description: null, parentId: "1", parent: { id: "1", name: "Sách", description: null }, createdAt: "", updatedAt: "" },
  createdAt: "", updatedAt: "",
}));

test("Gemini takes priority and existing default/legacy models resolve without changing saved data", () => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.AI_API_URL;
  delete process.env.AI_API_KEY;
  assert.equal(chatMode(), "rules");
  process.env.AI_API_URL = "https://provider.invalid";
  process.env.AI_API_KEY = "provider-test";
  assert.equal(chatMode(), "provider");
  process.env.GEMINI_API_KEY = "gemini-test";
  assert.equal(chatMode(), "gemini");
  for (const model of ["backend-default", "gpt-old", "gemini-2.5-flash"]) {
    assert.equal(geminiModel(model), DEFAULT_GEMINI_MODEL);
  }
  assert.equal(geminiModel("gemini-3.5-flash-lite"), "gemini-3.5-flash-lite");
});

test("real SDK serializes saved instructions, private history and schema; recommendations use only catalog IDs", async (t) => {
  process.env.GEMINI_API_KEY = "gemini-test";
  const requests: Record<string, unknown>[] = [];
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
    const request = new Request(url, init);
    assert.equal(new URL(request.url).hostname, "generativelanguage.googleapis.com");
    requests.push(await request.json() as Record<string, unknown>);
    return Response.json({
      id: "interaction-test", status: "completed", model: DEFAULT_GEMINI_MODEL,
      steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify({
        answer: "Bạn có thể đọc Sách 2.", bookIds: ["2", "unknown", "2", "1", "3"], needsHuman: false,
      }) }] }],
    });
  });
  const config = { ...defaultAIConfig, model: "gemini-3.8-flash", maxSuggestions: 2, systemPrompt: "Hướng dẫn của admin" };
  const result = await geminiReply({ config, message: "Có cuốn nào khác?", books, history: [{ question: "Tìm sách kỹ năng", answer: "Bạn muốn chủ đề nào?" }] });
  assert.deepEqual(result.books.map((book) => book.id), ["2", "1"]);
  assert.equal(result.answer, "Bạn có thể đọc Sách 2.");
  const payload = requests[0];
  assert.equal(payload.model, "gemini-3.8-flash");
  assert.equal(payload.store, false);
  assert.match(String(payload.system_instruction), /Hướng dẫn của admin/);
  assert.match(JSON.stringify(payload.input), /Tìm sách kỹ năng/);
  assert.match(JSON.stringify(payload.input), /Có cuốn nào khác/);
  assert.match(JSON.stringify(payload.response_format), /application\/json/);
  assert.equal((payload.generation_config as Record<string, unknown>).temperature, undefined);
  await geminiReply({ config: { ...config, model: "gemini-3.5-flash-lite", temperature: 0.7 }, message: "Xin chào", books, history: [] });
  assert.equal((requests[1].generation_config as Record<string, unknown>).temperature, 0.7);
});

test("malformed, incomplete and failed Gemini responses are rejected", async (t) => {
  process.env.GEMINI_API_KEY = "gemini-test";
  let status = "completed", output = "not json", httpStatus = 200;
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json(httpStatus === 200 ? {
      id: "interaction-test", status, steps: [{ type: "model_output", content: [{ type: "text", text: output }] }],
    } : { error: { code: 503, message: "Unavailable", status: "UNAVAILABLE" } }, { status: httpStatus });
  });
  const send = () => geminiReply({ config: defaultAIConfig, message: "Gợi ý sách", books, history: [] });
  await assert.rejects(send());
  output = JSON.stringify({ answer: "", bookIds: [], needsHuman: false });
  await assert.rejects(send());
  output = JSON.stringify({ answer: "Xin chào", bookIds: [], needsHuman: false });
  status = "incomplete";
  await assert.rejects(send(), /incomplete/);
  httpStatus = 503;
  await assert.rejects(send());
  assert.equal(calls, 4, "Failures must not silently retry billable requests");
});

test("AI failures distinguish overload, quota, credentials, timeout and invalid output without exposing upstream details", () => {
  for (const [status, code] of [[503, "AI_BUSY"], [429, "AI_QUOTA"], [403, "AI_ACCESS"], [400, "AI_CONFIG"], [404, "AI_CONFIG"]] as const) {
    const result = aiFailure({ status, message: "private-api-key-or-request-details" });
    assert.equal(result.code, code);
    assert.equal(result.status, 503);
    assert.doesNotMatch(result.message, /private-api-key/);
  }
  assert.match(aiFailure({ status: 503 }).message, /quá tải/);
  assert.equal(aiFailure({ name: "APIConnectionTimeoutError" }).status, 504);
  assert.equal(aiFailure(new SyntaxError("invalid json")).status, 502);
  assert.equal(aiFailure({ name: "AIResponseError" }).code, "AI_RESPONSE");
  assert.equal(aiFailure(null).code, "AI_UNAVAILABLE");
});
