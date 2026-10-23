import type { AIConfig, PublicAIConfig } from "../types/chatbot";

export const defaultAIConfig: AIConfig = {
  enabled: true,
  botName: "BookStore AI",
  welcomeMessage:
    "Xin chào! Bạn muốn tìm sách về chủ đề nào? Hãy chia sẻ sở thích và ngân sách của bạn.",
  fallbackMessage:
    "Mình chưa tìm được thông tin phù hợp. Bạn có thể mô tả thêm hoặc liên hệ nhân viên hỗ trợ.",
  systemPrompt:
    "Bạn là trợ lý tư vấn sách của BookStore. Chỉ sử dụng danh mục sách và chính sách được cung cấp. Không bịa giá, tồn kho hoặc trạng thái đơn hàng. Chuyển nhân viên hỗ trợ khi không đủ thông tin.",
  model: "backend-default",
  temperature: 0.3,
  maxSuggestions: 3,
  supportContact: "support@bookstore.vn",
  updatedAt: "2026-10-23T00:00:00.000Z",
};
export function publicAIConfig(config: AIConfig): PublicAIConfig {
  const { enabled, botName, welcomeMessage, supportContact } = config;
  return { enabled, botName, welcomeMessage, supportContact };
}
export function validateAIConfig(config: AIConfig) {
  for (const [key, limit] of [
    ["botName", 80],
    ["welcomeMessage", 1000],
    ["fallbackMessage", 1000],
    ["systemPrompt", 6000],
    ["model", 100],
    ["supportContact", 254],
  ] as const) {
    if (
      typeof config[key] !== "string" ||
      !config[key].trim() ||
      config[key].length > limit
    )
      throw new Error(`Trường ${key} cần từ 1 đến ${limit} ký tự.`);
  }
  if (typeof config.enabled !== "boolean")
    throw new Error("Trạng thái chatbot không hợp lệ.");
  if (
    !Number.isInteger(config.maxSuggestions) ||
    config.maxSuggestions < 1 ||
    config.maxSuggestions > 5
  )
    throw new Error("Số sách gợi ý phải từ 1 đến 5.");
  if (
    typeof config.temperature !== "number" ||
    !Number.isFinite(config.temperature) ||
    config.temperature < 0 ||
    config.temperature > 2
  )
    throw new Error("Temperature phải từ 0 đến 2.");
}
