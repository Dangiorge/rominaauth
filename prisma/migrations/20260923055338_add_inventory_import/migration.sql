-- CreateTable
CREATE TABLE "inventory_item_register" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uom" TEXT,
    "child_category" TEXT,
    "parent_category" TEXT,
    "default_value" DECIMAL(14,4),
    "default_tax" INTEGER,
    "state" TEXT,
    "source_created_at" TIMESTAMP(3),
    "source_type" INTEGER,
    "source_modified_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "inventory_item_register_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "target_table" TEXT NOT NULL DEFAULT 'inventory_item_register',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "new_count" INTEGER NOT NULL DEFAULT 0,
    "changed_count" INTEGER NOT NULL DEFAULT 0,
    "unchanged_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PREVIEWED',
    "uploaded_by" UUID NOT NULL,
    "committed_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batch_rows" (
    "id" BIGSERIAL NOT NULL,
    "batch_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "raw_data" JSONB NOT NULL,
    "changed_fields" JSONB,
    "error_message" TEXT,
    "item_id" INTEGER,

    CONSTRAINT "import_batch_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_item_register_code_name_key" ON "inventory_item_register"("code", "name");

-- AddForeignKey
ALTER TABLE "inventory_item_register" ADD CONSTRAINT "inventory_item_register_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_item_register"("id") ON DELETE SET NULL ON UPDATE CASCADE;
