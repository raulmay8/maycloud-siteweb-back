CREATE TYPE "CrmActivityType" AS ENUM ('PHONE_CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'STATUS_CHANGE', 'NOTE', 'OTHER');
CREATE TYPE "CrmEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE "CrmLinkType" AS ENUM ('WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'LINKEDIN', 'GOOGLE_MAPS', 'OTHER');
CREATE TYPE "CrmOfferingPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "crm_lead_statuses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL, "color" VARCHAR(20), "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true, "is_final" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "crm_lead_statuses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "crm_lead_statuses_code_key" ON "crm_lead_statuses"("code");
CREATE INDEX "crm_lead_statuses_is_active_sort_order_idx" ON "crm_lead_statuses"("is_active", "sort_order");

CREATE TABLE "crm_business_types" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(120) NOT NULL, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "crm_business_types_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "crm_business_types_code_key" ON "crm_business_types"("code");
CREATE INDEX "crm_business_types_is_active_name_idx" ON "crm_business_types"("is_active", "name");

CREATE TABLE "crm_lead_categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "name" VARCHAR(100) NOT NULL,
  "color" VARCHAR(20), "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "crm_lead_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "crm_lead_categories_name_key" ON "crm_lead_categories"("name");
CREATE INDEX "crm_lead_categories_is_active_name_idx" ON "crm_lead_categories"("is_active", "name");

CREATE TABLE "crm_digital_assets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(120) NOT NULL, "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "crm_digital_assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "crm_digital_assets_code_key" ON "crm_digital_assets"("code");
CREATE INDEX "crm_digital_assets_is_active_sort_order_idx" ON "crm_digital_assets"("is_active", "sort_order");

CREATE TABLE "crm_service_offerings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(120) NOT NULL, "description" VARCHAR(500),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "crm_service_offerings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "crm_service_offerings_code_key" ON "crm_service_offerings"("code");
CREATE INDEX "crm_service_offerings_is_active_name_idx" ON "crm_service_offerings"("is_active", "name");

CREATE TABLE "crm_leads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "company" VARCHAR(160) NOT NULL,
  "contact_name" VARCHAR(120), "position" VARCHAR(120), "phone" VARCHAR(30),
  "email" VARCHAR(255), "address" VARCHAR(300), "city" VARCHAR(120),
  "status_id" UUID NOT NULL, "business_type_id" UUID, "created_by_id" UUID NOT NULL,
  "assigned_to_id" UUID, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "crm_leads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "crm_leads_status_id_updated_at_idx" ON "crm_leads"("status_id", "updated_at");
CREATE INDEX "crm_leads_business_type_id_idx" ON "crm_leads"("business_type_id");
CREATE INDEX "crm_leads_assigned_to_id_idx" ON "crm_leads"("assigned_to_id");
CREATE INDEX "crm_leads_company_idx" ON "crm_leads"("company");
CREATE INDEX "crm_leads_email_idx" ON "crm_leads"("email");

CREATE TABLE "crm_lead_category_assignments" (
  "lead_id" UUID NOT NULL, "category_id" UUID NOT NULL,
  CONSTRAINT "crm_lead_category_assignments_pkey" PRIMARY KEY ("lead_id", "category_id")
);
CREATE INDEX "crm_lead_category_assignments_category_id_idx" ON "crm_lead_category_assignments"("category_id");

CREATE TABLE "crm_lead_digital_assets" (
  "lead_id" UUID NOT NULL, "digital_asset_id" UUID NOT NULL, "details" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crm_lead_digital_assets_pkey" PRIMARY KEY ("lead_id", "digital_asset_id")
);
CREATE INDEX "crm_lead_digital_assets_digital_asset_id_idx" ON "crm_lead_digital_assets"("digital_asset_id");

CREATE TABLE "crm_lead_service_offerings" (
  "lead_id" UUID NOT NULL, "service_offering_id" UUID NOT NULL,
  "priority" "CrmOfferingPriority" NOT NULL DEFAULT 'MEDIUM', "notes" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crm_lead_service_offerings_pkey" PRIMARY KEY ("lead_id", "service_offering_id")
);
CREATE INDEX "crm_lead_service_offerings_service_offering_id_idx" ON "crm_lead_service_offerings"("service_offering_id");

CREATE TABLE "crm_lead_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "lead_id" UUID NOT NULL,
  "type" "CrmLinkType" NOT NULL, "label" VARCHAR(100), "url" VARCHAR(2048) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "crm_lead_links_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "crm_lead_links_lead_id_type_idx" ON "crm_lead_links"("lead_id", "type");

CREATE TABLE "crm_lead_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "lead_id" UUID NOT NULL,
  "content" TEXT NOT NULL, "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "crm_lead_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "crm_lead_notes_lead_id_created_at_idx" ON "crm_lead_notes"("lead_id", "created_at");

CREATE TABLE "crm_lead_activities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "lead_id" UUID NOT NULL,
  "type" "CrmActivityType" NOT NULL, "description" TEXT, "performed_by_id" UUID NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crm_lead_activities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "crm_lead_activities_lead_id_occurred_at_idx" ON "crm_lead_activities"("lead_id", "occurred_at");

CREATE TABLE "crm_emails" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "lead_id" UUID NOT NULL,
  "sender_user_id" UUID NOT NULL, "recipient" VARCHAR(255) NOT NULL,
  "subject" VARCHAR(200) NOT NULL, "content" TEXT NOT NULL,
  "status" "CrmEmailStatus" NOT NULL DEFAULT 'PENDING',
  "provider_message_id" VARCHAR(500), "error_message" TEXT, "sent_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "crm_emails_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "crm_emails_lead_id_created_at_idx" ON "crm_emails"("lead_id", "created_at");
CREATE INDEX "crm_emails_status_created_at_idx" ON "crm_emails"("status", "created_at");

ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "crm_lead_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_business_type_id_fkey" FOREIGN KEY ("business_type_id") REFERENCES "crm_business_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_lead_category_assignments" ADD CONSTRAINT "crm_lead_category_assignments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_lead_category_assignments" ADD CONSTRAINT "crm_lead_category_assignments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "crm_lead_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_lead_digital_assets" ADD CONSTRAINT "crm_lead_digital_assets_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_lead_digital_assets" ADD CONSTRAINT "crm_lead_digital_assets_digital_asset_id_fkey" FOREIGN KEY ("digital_asset_id") REFERENCES "crm_digital_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_lead_service_offerings" ADD CONSTRAINT "crm_lead_service_offerings_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_lead_service_offerings" ADD CONSTRAINT "crm_lead_service_offerings_service_offering_id_fkey" FOREIGN KEY ("service_offering_id") REFERENCES "crm_service_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_lead_links" ADD CONSTRAINT "crm_lead_links_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_lead_notes" ADD CONSTRAINT "crm_lead_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_lead_notes" ADD CONSTRAINT "crm_lead_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_lead_activities" ADD CONSTRAINT "crm_lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_lead_activities" ADD CONSTRAINT "crm_lead_activities_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_emails" ADD CONSTRAINT "crm_emails_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_emails" ADD CONSTRAINT "crm_emails_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
