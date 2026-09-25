-- CreateEnum
CREATE TYPE "StoreGrade" AS ENUM ('MAIN', 'SUB');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('GRN_RECEIPT', 'TRANSFER_IN', 'TRANSFER_OUT');

-- AlterTable
ALTER TABLE "document_access_policies" ADD COLUMN     "permissions" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "stores" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER,
    "company_id" INTEGER,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "grade" "StoreGrade" NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grns" (
    "id" SERIAL NOT NULL,
    "grn_number" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "supplier_name" TEXT,
    "reference_note" TEXT,
    "received_date" DATE NOT NULL,
    "remarks" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grn_lines" (
    "id" SERIAL NOT NULL,
    "grn_id" INTEGER NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "uom" TEXT,
    "unit_cost" DECIMAL(14,4),
    "remarks" TEXT,

    CONSTRAINT "grn_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_transfers" (
    "id" SERIAL NOT NULL,
    "transfer_number" TEXT NOT NULL,
    "from_store_id" INTEGER NOT NULL,
    "to_store_id" INTEGER NOT NULL,
    "transfer_date" DATE NOT NULL,
    "remarks" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_transfer_lines" (
    "id" SERIAL NOT NULL,
    "transfer_id" INTEGER NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "uom" TEXT,
    "remarks" TEXT,

    CONSTRAINT "internal_transfer_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" BIGSERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "movement_type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "uom" TEXT,
    "unit_cost" DECIMAL(14,4),
    "reference_type" TEXT NOT NULL,
    "reference_id" INTEGER NOT NULL,
    "occurred_at" DATE NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_code_key" ON "stores"("code");

-- CreateIndex
CREATE UNIQUE INDEX "grns_grn_number_key" ON "grns"("grn_number");

-- CreateIndex
CREATE UNIQUE INDEX "internal_transfers_transfer_number_key" ON "internal_transfers"("transfer_number");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grns" ADD CONSTRAINT "grns_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grns" ADD CONSTRAINT "grns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_lines" ADD CONSTRAINT "grn_lines_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "grns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_lines" ADD CONSTRAINT "grn_lines_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_item_register"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_transfers" ADD CONSTRAINT "internal_transfers_from_store_id_fkey" FOREIGN KEY ("from_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_transfers" ADD CONSTRAINT "internal_transfers_to_store_id_fkey" FOREIGN KEY ("to_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_transfers" ADD CONSTRAINT "internal_transfers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_transfer_lines" ADD CONSTRAINT "internal_transfer_lines_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "internal_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_transfer_lines" ADD CONSTRAINT "internal_transfer_lines_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_item_register"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_item_register"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
