import { api } from "./client";
import type {
  AIConfig,
  PublicAIConfig,
  ChatBody,
  ChatLog,
  ChatReply,
} from "../types/chatbot";

export const chatbotApi = {
  getConfig: () => api.get<PublicAIConfig>("/chatbot/config"),
  send: (body: ChatBody) => api.post<ChatReply>("/chatbot/messages", body),
};
export const adminChatbotApi = {
  getConfig: () => api.get<AIConfig>("/admin/chatbot/config"),
  updateConfig: (body: Omit<AIConfig, "updatedAt">) =>
    api.patch<AIConfig>("/admin/chatbot/config", body),
  getLogs: () => api.get<ChatLog[]>("/admin/chatbot/logs"),
  updateLog: (id: string, body: Pick<ChatLog, "resolved" | "adminNote">) =>
    api.patch<ChatLog>(`/admin/chatbot/logs/${id}`, body),
};
