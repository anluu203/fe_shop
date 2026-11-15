ALTER TYPE "PaymentMethod" ADD VALUE 'VNPAY';

CREATE TABLE "Payment_Attempts" (
  "id" VARCHAR(100) PRIMARY KEY,
  "orderId" INTEGER NOT NULL REFERENCES "Orders"("OrderID") ON DELETE RESTRICT ON UPDATE CASCADE,
  "amount" DECIMAL(14,2) NOT NULL CHECK ("amount" > 0),
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','SUCCEEDED','FAILED','EXPIRED')),
  "paymentUrl" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMPTZ(3),
  "gatewayTransactionNo" VARCHAR(30),
  "responseCode" VARCHAR(2),
  "applied" BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX "Payment_Attempts_gatewayTransactionNo_key" ON "Payment_Attempts"("gatewayTransactionNo");
CREATE INDEX "Payment_Attempts_orderId_createdAt_idx" ON "Payment_Attempts"("orderId", "createdAt");

CREATE TABLE "Order_Payment_Refunds" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL REFERENCES "Orders"("OrderID") ON DELETE RESTRICT ON UPDATE CASCADE,
  "paymentId" VARCHAR(100) REFERENCES "Payment_Attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "referenceKey" VARCHAR(150) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL CHECK ("amount" > 0),
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','REFUNDED')),
  "reason" TEXT NOT NULL,
  "reference" VARCHAR(150),
  "note" TEXT,
  "confirmedBy" INTEGER,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMPTZ(3)
);
CREATE UNIQUE INDEX "Order_Payment_Refunds_paymentId_key" ON "Order_Payment_Refunds"("paymentId");
CREATE UNIQUE INDEX "Order_Payment_Refunds_referenceKey_key" ON "Order_Payment_Refunds"("referenceKey");
CREATE INDEX "Order_Payment_Refunds_orderId_createdAt_idx" ON "Order_Payment_Refunds"("orderId", "createdAt");
