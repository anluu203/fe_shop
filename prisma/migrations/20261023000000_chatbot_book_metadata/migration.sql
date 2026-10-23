BEGIN;

-- Publisher already exists in the initial migration. Preserve existing books.
ALTER TABLE "Books"
  ADD COLUMN "ISBN" VARCHAR(17),
  ADD COLUMN "PageCount" INTEGER,
  ADD COLUMN "Discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD CONSTRAINT "Books_PageCount_check" CHECK ("PageCount" IS NULL OR "PageCount" > 0),
  ADD CONSTRAINT "Books_Discount_check" CHECK ("Discount" BETWEEN 0 AND 100),
  ADD CONSTRAINT "Books_ISBN_check" CHECK ("ISBN" IS NULL OR "ISBN" ~ '^([0-9]{13}|[0-9]{9}[0-9X])$');

-- Backfill the percentage from existing prices without changing either price.
UPDATE "Books" SET "Discount" = ROUND(("OriginalPrice" - "SellingPrice") / "OriginalPrice" * 100, 2)
WHERE "OriginalPrice" > 0 AND "SellingPrice" <= "OriginalPrice";

CREATE TABLE "AI_Configs" (
  "ConfigID" INTEGER NOT NULL DEFAULT 1 PRIMARY KEY CHECK ("ConfigID" = 1),
  "Enabled" BOOLEAN NOT NULL DEFAULT true,
  "BotName" VARCHAR(80) NOT NULL DEFAULT 'BookStore AI',
  "WelcomeMessage" TEXT NOT NULL,
  "FallbackMessage" TEXT NOT NULL,
  "SystemPrompt" TEXT NOT NULL,
  "Model" VARCHAR(100) NOT NULL DEFAULT 'backend-default',
  "Temperature" DECIMAL(3,2) NOT NULL DEFAULT 0.3 CHECK ("Temperature" BETWEEN 0 AND 2),
  "MaxSuggestions" INTEGER NOT NULL DEFAULT 3 CHECK ("MaxSuggestions" BETWEEN 1 AND 5),
  "SupportContact" VARCHAR(254) NOT NULL,
  "UpdatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "AI_Configs" ("WelcomeMessage", "FallbackMessage", "SystemPrompt", "SupportContact")
VALUES ('Xin chào! Bạn muốn tìm sách về chủ đề nào? Hãy chia sẻ sở thích và ngân sách của bạn.',
  'Mình chưa tìm được thông tin phù hợp. Bạn có thể mô tả thêm hoặc liên hệ nhân viên hỗ trợ.',
  'Bạn là trợ lý tư vấn sách của BookStore. Chỉ sử dụng danh mục sách và chính sách được cung cấp. Không bịa giá, tồn kho hoặc trạng thái đơn hàng. Chuyển nhân viên hỗ trợ khi không đủ thông tin.',
  'support@bookstore.vn');

CREATE TABLE "Chat_Logs" (
  "ChatLogID" SERIAL PRIMARY KEY,
  "SessionID" VARCHAR(100) NOT NULL,
  "UserID" INTEGER,
  "Question" TEXT NOT NULL CHECK (char_length("Question") BETWEEN 1 AND 2000),
  "Answer" TEXT NOT NULL,
  "RecommendedBooks" JSONB NOT NULL DEFAULT '[]',
  "NeedsHuman" BOOLEAN NOT NULL DEFAULT false,
  "Resolved" BOOLEAN NOT NULL DEFAULT false,
  "AdminNote" TEXT NOT NULL DEFAULT '',
  "CreatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Chat_Logs_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Chat_Logs_SessionID_CreatedAt_idx" ON "Chat_Logs"("SessionID", "CreatedAt");
CREATE INDEX "Chat_Logs_UserID_idx" ON "Chat_Logs"("UserID");
CREATE INDEX "Chat_Logs_NeedsHuman_Resolved_CreatedAt_idx" ON "Chat_Logs"("NeedsHuman", "Resolved", "CreatedAt");
COMMIT;
