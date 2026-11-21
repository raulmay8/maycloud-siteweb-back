-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- AlterTable
ALTER TABLE "crm_business_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_digital_assets" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_emails" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_lead_activities" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_lead_categories" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_lead_links" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_lead_notes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_lead_statuses" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_leads" ADD COLUMN     "partner_id" UUID,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_service_offerings" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "country" VARCHAR(120),
    "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partners_email_key" ON "partners"("email");

-- CreateIndex
CREATE INDEX "partners_status_created_at_idx" ON "partners"("status", "created_at");

-- CreateIndex
CREATE INDEX "crm_leads_partner_id_idx" ON "crm_leads"("partner_id");

-- AddForeignKey
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
