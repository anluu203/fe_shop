-- CreateSchema
-- Keep initial schema creation atomic if a statement fails.
BEGIN;

CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'BANK_TRANSFER', 'E_WALLET');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Users" (
    "UserID" SERIAL NOT NULL,
    "FullName" VARCHAR(150) NOT NULL,
    "Email" VARCHAR(254) NOT NULL,
    "PasswordHash" TEXT NOT NULL,
    "PhoneNumber" VARCHAR(20),
    "Address" TEXT,
    "Role" SMALLINT NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("UserID")
);

-- CreateTable
CREATE TABLE "Categories" (
    "CategoryID" SERIAL NOT NULL,
    "CategoryName" VARCHAR(150) NOT NULL,
    "Description" TEXT,

    CONSTRAINT "Categories_pkey" PRIMARY KEY ("CategoryID")
);

-- CreateTable
CREATE TABLE "Books" (
    "BookID" SERIAL NOT NULL,
    "CategoryID" INTEGER NOT NULL,
    "Title" VARCHAR(255) NOT NULL,
    "Author" VARCHAR(255) NOT NULL,
    "Publisher" VARCHAR(255),
    "Description" TEXT,
    "OriginalPrice" DECIMAL(14,2) NOT NULL,
    "SellingPrice" DECIMAL(14,2) NOT NULL,
    "StockQuantity" INTEGER NOT NULL DEFAULT 0,
    "CoverImage" TEXT,
    "CreatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Books_pkey" PRIMARY KEY ("BookID")
);

-- CreateTable
CREATE TABLE "Cart_Items" (
    "CartItemID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "BookID" INTEGER NOT NULL,
    "Quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Cart_Items_pkey" PRIMARY KEY ("CartItemID")
);

-- CreateTable
CREATE TABLE "Orders" (
    "OrderID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "OrderDate" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "TotalAmount" DECIMAL(14,2) NOT NULL,
    "ShippingAddress" TEXT NOT NULL,
    "PaymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
    "OrderStatus" "OrderStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("OrderID")
);

-- CreateTable
CREATE TABLE "Order_Items" (
    "OrderItemID" SERIAL NOT NULL,
    "OrderID" INTEGER NOT NULL,
    "BookID" INTEGER NOT NULL,
    "BookTitle" VARCHAR(255) NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "UnitPrice" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "Order_Items_pkey" PRIMARY KEY ("OrderItemID")
);

-- CreateTable
CREATE TABLE "Reviews" (
    "ReviewID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "BookID" INTEGER NOT NULL,
    "Rating" SMALLINT NOT NULL,
    "Comment" TEXT,
    "CreatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reviews_pkey" PRIMARY KEY ("ReviewID")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_Email_key" ON "Users"("Email");

-- CreateIndex
CREATE INDEX "Books_CategoryID_idx" ON "Books"("CategoryID");

-- CreateIndex
CREATE INDEX "Cart_Items_BookID_idx" ON "Cart_Items"("BookID");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_Items_UserID_BookID_key" ON "Cart_Items"("UserID", "BookID");

-- CreateIndex
CREATE INDEX "Orders_UserID_OrderDate_idx" ON "Orders"("UserID", "OrderDate");

-- CreateIndex
CREATE INDEX "Orders_OrderStatus_idx" ON "Orders"("OrderStatus");

-- CreateIndex
CREATE INDEX "Order_Items_BookID_idx" ON "Order_Items"("BookID");

-- CreateIndex
CREATE UNIQUE INDEX "Order_Items_OrderID_BookID_key" ON "Order_Items"("OrderID", "BookID");

-- CreateIndex
CREATE INDEX "Reviews_UserID_idx" ON "Reviews"("UserID");

-- CreateIndex
CREATE INDEX "Reviews_BookID_CreatedAt_idx" ON "Reviews"("BookID", "CreatedAt");

-- AddForeignKey
ALTER TABLE "Books" ADD CONSTRAINT "Books_CategoryID_fkey" FOREIGN KEY ("CategoryID") REFERENCES "Categories"("CategoryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart_Items" ADD CONSTRAINT "Cart_Items_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart_Items" ADD CONSTRAINT "Cart_Items_BookID_fkey" FOREIGN KEY ("BookID") REFERENCES "Books"("BookID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order_Items" ADD CONSTRAINT "Order_Items_OrderID_fkey" FOREIGN KEY ("OrderID") REFERENCES "Orders"("OrderID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order_Items" ADD CONSTRAINT "Order_Items_BookID_fkey" FOREIGN KEY ("BookID") REFERENCES "Books"("BookID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_BookID_fkey" FOREIGN KEY ("BookID") REFERENCES "Books"("BookID") ON DELETE CASCADE ON UPDATE CASCADE;

-- Business constraints are enforced by PostgreSQL, including writes outside Prisma.
ALTER TABLE "Users" ADD CONSTRAINT "Users_Role_check" CHECK ("Role" IN (0, 1));
ALTER TABLE "Books" ADD CONSTRAINT "Books_OriginalPrice_check" CHECK ("OriginalPrice" >= 0);
ALTER TABLE "Books" ADD CONSTRAINT "Books_SellingPrice_check" CHECK ("SellingPrice" >= 0);
ALTER TABLE "Books" ADD CONSTRAINT "Books_StockQuantity_check" CHECK ("StockQuantity" >= 0);
ALTER TABLE "Cart_Items" ADD CONSTRAINT "Cart_Items_Quantity_check" CHECK ("Quantity" > 0);
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_TotalAmount_check" CHECK ("TotalAmount" >= 0);
ALTER TABLE "Order_Items" ADD CONSTRAINT "Order_Items_Quantity_check" CHECK ("Quantity" > 0);
ALTER TABLE "Order_Items" ADD CONSTRAINT "Order_Items_UnitPrice_check" CHECK ("UnitPrice" >= 0);
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_Rating_check" CHECK ("Rating" BETWEEN 1 AND 5);

COMMIT;
