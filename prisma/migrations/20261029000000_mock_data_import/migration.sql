-- Additive schema changes for portable mock-data import. Existing rows are preserved.
BEGIN;

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PREPARING';

-- AlterTable
ALTER TABLE "Books" ADD COLUMN     "CoverType" VARCHAR(100),
ADD COLUMN     "IsActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "Language" VARCHAR(100),
ADD COLUMN     "PublicationYear" INTEGER,
ADD COLUMN     "SeedKey" VARCHAR(150),
ADD COLUMN     "UpdatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Categories" ADD COLUMN     "CreatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ImageUrl" TEXT,
ADD COLUMN     "ParentID" INTEGER,
ADD COLUMN     "SeedKey" VARCHAR(150),
ADD COLUMN     "UpdatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Order_Items" ADD COLUMN     "CreatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "SeedKey" VARCHAR(150),
ADD COLUMN     "UpdatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Orders" ADD COLUMN     "CompletedAt" TIMESTAMPTZ(3),
ADD COLUMN     "SeedKey" VARCHAR(150),
ADD COLUMN     "UpdatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Reviews" ADD COLUMN     "SeedKey" VARCHAR(150);

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "AvatarUrl" TEXT,
ADD COLUMN     "SeedKey" VARCHAR(150),
ADD COLUMN     "UpdatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Category_Parents" (
    "ParentID" SERIAL NOT NULL,
    "SeedKey" VARCHAR(150),
    "Name" VARCHAR(150) NOT NULL,
    "Description" TEXT,
    "ImageUrl" TEXT,
    "CreatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_Parents_pkey" PRIMARY KEY ("ParentID")
);

-- CreateTable
CREATE TABLE "Seed_Documents" (
    "Filename" VARCHAR(255) NOT NULL,
    "Payload" JSONB NOT NULL,
    "Checksum" VARCHAR(64) NOT NULL,
    "RecordCount" INTEGER NOT NULL,
    "ImportedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Seed_Documents_pkey" PRIMARY KEY ("Filename")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_Parents_SeedKey_key" ON "Category_Parents"("SeedKey");

-- CreateIndex
CREATE UNIQUE INDEX "Books_SeedKey_key" ON "Books"("SeedKey");

-- CreateIndex
CREATE UNIQUE INDEX "Categories_SeedKey_key" ON "Categories"("SeedKey");

-- CreateIndex
CREATE INDEX "Categories_ParentID_idx" ON "Categories"("ParentID");

-- CreateIndex
CREATE UNIQUE INDEX "Order_Items_SeedKey_key" ON "Order_Items"("SeedKey");

-- CreateIndex
CREATE UNIQUE INDEX "Orders_SeedKey_key" ON "Orders"("SeedKey");

-- CreateIndex
CREATE UNIQUE INDEX "Reviews_SeedKey_key" ON "Reviews"("SeedKey");

-- CreateIndex
CREATE UNIQUE INDEX "Users_SeedKey_key" ON "Users"("SeedKey");

-- AddForeignKey
ALTER TABLE "Categories" ADD CONSTRAINT "Categories_ParentID_fkey" FOREIGN KEY ("ParentID") REFERENCES "Category_Parents"("ParentID") ON DELETE RESTRICT ON UPDATE CASCADE;


COMMIT;
