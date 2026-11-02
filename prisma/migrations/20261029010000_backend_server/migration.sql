-- Backend services: additive schema, preserved imported data.
BEGIN;
-- AlterTable
ALTER TABLE "Cart_Items" ADD COLUMN     "CreatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "UpdatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Order_Items" ADD COLUMN     "BookImage" TEXT;

-- AlterTable
ALTER TABLE "Orders" ADD COLUMN     "PaymentStatus" VARCHAR(30) NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "ShippingName" VARCHAR(150) NOT NULL DEFAULT '',
ADD COLUMN     "ShippingPhone" VARCHAR(20) NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Sessions" (
    "id" VARCHAR(64) NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkout_Requests" (
    "userId" INTEGER NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "orderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checkout_Requests_pkey" PRIMARY KEY ("userId","key")
);

-- CreateTable
CREATE TABLE "Order_Events" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "actorId" INTEGER,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_Events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory_Movements" (
    "id" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceKey" VARCHAR(150) NOT NULL,
    "actorId" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inventory_Movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation_Profiles" (
    "bookId" INTEGER NOT NULL,
    "component" VARCHAR(40) NOT NULL,
    "usages" JSONB NOT NULL,
    "specs" JSONB NOT NULL,
    "reasons" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consultation_Profiles_pkey" PRIMARY KEY ("bookId")
);

-- CreateTable
CREATE TABLE "Return_Requests" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "contactName" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "description" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'received',
    "resolution" VARCHAR(30),
    "restockQuantity" INTEGER NOT NULL DEFAULT 0,
    "replacementBookId" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Return_Requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Return_Events" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "note" TEXT NOT NULL,
    "actorId" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Return_Events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund_Records" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "actorId" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_Records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat_Sessions" (
    "id" VARCHAR(100) NOT NULL,
    "userId" INTEGER,
    "ownerHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chat_Sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Uploaded_Assets" (
    "filename" VARCHAR(150) NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "target" VARCHAR(30) NOT NULL,
    "mimeType" VARCHAR(60) NOT NULL,
    "size" INTEGER NOT NULL,
    "sourceUrl" TEXT,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Uploaded_Assets_pkey" PRIMARY KEY ("filename")
);

-- CreateTable
CREATE TABLE "Rate_Limit_Windows" (
    "key" VARCHAR(64) NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Rate_Limit_Windows_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Sessions_userId_expiresAt_idx" ON "Sessions"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Order_Events_orderId_createdAt_idx" ON "Order_Events"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_Movements_referenceKey_key" ON "Inventory_Movements"("referenceKey");

-- CreateIndex
CREATE INDEX "Inventory_Movements_bookId_createdAt_idx" ON "Inventory_Movements"("bookId", "createdAt");

-- CreateIndex
CREATE INDEX "Return_Requests_userId_createdAt_idx" ON "Return_Requests"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Return_Requests_orderItemId_status_idx" ON "Return_Requests"("orderItemId", "status");

-- CreateIndex
CREATE INDEX "Return_Events_requestId_createdAt_idx" ON "Return_Events"("requestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_Records_requestId_key" ON "Refund_Records"("requestId");

-- CreateIndex
CREATE INDEX "Refund_Records_createdAt_idx" ON "Refund_Records"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Uploaded_Assets_imageUrl_key" ON "Uploaded_Assets"("imageUrl");

-- CreateIndex
CREATE INDEX "Uploaded_Assets_createdAt_idx" ON "Uploaded_Assets"("createdAt");

-- CreateIndex
CREATE INDEX "Rate_Limit_Windows_expiresAt_idx" ON "Rate_Limit_Windows"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Categories_ParentID_CategoryName_key" ON "Categories"("ParentID", "CategoryName");

-- CreateIndex
CREATE UNIQUE INDEX "Category_Parents_Name_key" ON "Category_Parents"("Name");

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout_Requests" ADD CONSTRAINT "Checkout_Requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout_Requests" ADD CONSTRAINT "Checkout_Requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Orders"("OrderID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order_Events" ADD CONSTRAINT "Order_Events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Orders"("OrderID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory_Movements" ADD CONSTRAINT "Inventory_Movements_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Books"("BookID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation_Profiles" ADD CONSTRAINT "Consultation_Profiles_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Books"("BookID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Return_Requests" ADD CONSTRAINT "Return_Requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Return_Requests" ADD CONSTRAINT "Return_Requests_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "Order_Items"("OrderItemID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Return_Events" ADD CONSTRAINT "Return_Events_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Return_Requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund_Records" ADD CONSTRAINT "Refund_Records_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Return_Requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Uploaded_Assets" ADD CONSTRAINT "Uploaded_Assets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Users"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Preserve historic book covers when the catalog changes later.
UPDATE "Order_Items" oi SET "BookImage" = b."CoverImage" FROM "Books" b WHERE b."BookID" = oi."BookID";

-- Import consultation metadata against actual book foreign keys; prices stay in Books.
INSERT INTO "Consultation_Profiles" ("bookId", "component", "usages", "specs", "reasons", "isActive")
SELECT b."BookID", item->>'component', item->'usages', item->'specs', item->'reasons', true
FROM "Seed_Documents" d CROSS JOIN LATERAL jsonb_array_elements(d."Payload"->'products') item
JOIN "Books" b ON b."SeedKey" = item->>'id'
WHERE d."Filename" = 'customer-services.json'
ON CONFLICT ("bookId") DO NOTHING;

ALTER TABLE "Return_Requests" ADD CONSTRAINT "Return_Requests_Quantity_check" CHECK ("quantity" > 0 AND "restockQuantity" >= 0 AND "restockQuantity" <= "quantity");
ALTER TABLE "Return_Requests" ADD CONSTRAINT "Return_Requests_Status_check" CHECK ("status" IN ('received', 'checking', 'repairing', 'completed', 'rejected'));
ALTER TABLE "Refund_Records" ADD CONSTRAINT "Refund_Records_Amount_check" CHECK ("amount" > 0);
ALTER TABLE "Books" ADD CONSTRAINT "Books_PublicationYear_check" CHECK ("PublicationYear" IS NULL OR "PublicationYear" BETWEEN 1 AND 9999);

COMMIT;
