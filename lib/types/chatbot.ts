import type { Product } from "./index";

export interface AIConfig {
  enabled: boolean;
  botName: string;
  welcomeMessage: string;
  fallbackMessage: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxSuggestions: number;
  supportContact: string;
  updatedAt: string;
}
export type PublicAIConfig = Pick<
  AIConfig,
  "enabled" | "botName" | "welcomeMessage" | "supportContact"
>;
export interface ChatLog {
  id: string;
  sessionId: string;
  userId: string | null;
  customerName: string;
  question: string;
  answer: string;
  recommendedBooks: string[];
  needsHuman: boolean;
  resolved: boolean;
  adminNote: string;
  createdAt: string;
}
export interface ChatReply {
  id: string;
  answer: string;
  books: Product[];
  needsHuman: boolean;
  createdAt: string;
}
export interface ChatBody {
  sessionId: string;
  message: string;
}
