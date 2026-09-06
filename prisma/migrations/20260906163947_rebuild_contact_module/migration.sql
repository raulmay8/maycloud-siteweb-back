/*
  Warnings:

  - You are about to drop the column `subject` on the `contact_messages` table. All the data in the column will be lost.
  - Added the required column `project_stage_id` to the `contact_messages` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "analytics_events_session_id_type_idx";

-- AlterTable
ALTER TABLE "contact_messages" DROP COLUMN "subject",
ADD COLUMN     "company_or_project" VARCHAR(160),
ADD COLUMN     "phone" VARCHAR(30),
ADD COLUMN     "project_stage_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "languages" (
    "id" UUID NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "native_name" VARCHAR(80) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "development_options" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "development_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "development_option_translations" (
    "development_option_id" UUID NOT NULL,
    "language_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "development_option_translations_pkey" PRIMARY KEY ("development_option_id","language_id")
);

-- CreateTable
CREATE TABLE "project_stages" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "project_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_stage_translations" (
    "project_stage_id" UUID NOT NULL,
    "language_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "project_stage_translations_pkey" PRIMARY KEY ("project_stage_id","language_id")
);

-- CreateTable
CREATE TABLE "contact_message_development_options" (
    "contact_message_id" UUID NOT NULL,
    "development_option_id" UUID NOT NULL,

    CONSTRAINT "contact_message_development_options_pkey" PRIMARY KEY ("contact_message_id","development_option_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "languages_code_key" ON "languages"("code");

-- CreateIndex
CREATE INDEX "languages_is_active_sort_order_idx" ON "languages"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "development_options_code_key" ON "development_options"("code");

-- CreateIndex
CREATE INDEX "development_options_is_active_sort_order_idx" ON "development_options"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "development_option_translations_language_id_idx" ON "development_option_translations"("language_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_stages_code_key" ON "project_stages"("code");

-- CreateIndex
CREATE INDEX "project_stages_is_active_sort_order_idx" ON "project_stages"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "project_stage_translations_language_id_idx" ON "project_stage_translations"("language_id");

-- CreateIndex
CREATE INDEX "contact_message_development_options_development_option_id_idx" ON "contact_message_development_options"("development_option_id");

-- CreateIndex
CREATE INDEX "contact_messages_project_stage_id_idx" ON "contact_messages"("project_stage_id");

-- AddForeignKey
ALTER TABLE "development_option_translations" ADD CONSTRAINT "development_option_translations_development_option_id_fkey" FOREIGN KEY ("development_option_id") REFERENCES "development_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_option_translations" ADD CONSTRAINT "development_option_translations_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_stage_translations" ADD CONSTRAINT "project_stage_translations_project_stage_id_fkey" FOREIGN KEY ("project_stage_id") REFERENCES "project_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_stage_translations" ADD CONSTRAINT "project_stage_translations_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_project_stage_id_fkey" FOREIGN KEY ("project_stage_id") REFERENCES "project_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_message_development_options" ADD CONSTRAINT "contact_message_development_options_contact_message_id_fkey" FOREIGN KEY ("contact_message_id") REFERENCES "contact_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_message_development_options" ADD CONSTRAINT "contact_message_development_options_development_option_id_fkey" FOREIGN KEY ("development_option_id") REFERENCES "development_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
