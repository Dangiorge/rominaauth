-- Google Drive service-account configuration and its most recent saved test.
CREATE TABLE IF NOT EXISTS "public"."google_drive_config" (
    "id" SERIAL NOT NULL,
    "client_email" TEXT NOT NULL,
    "private_key" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "shared_drive_id" TEXT,
    "last_tested_at" TIMESTAMPTZ(6),
    "last_test_success" BOOLEAN,
    "last_test_error" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_drive_config_pkey" PRIMARY KEY ("id")
);
