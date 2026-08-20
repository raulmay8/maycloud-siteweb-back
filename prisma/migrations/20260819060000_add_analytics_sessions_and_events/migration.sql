CREATE TYPE "AnalyticsEventType" AS ENUM ('CONTACT_FORM_INTERACTION');

CREATE TABLE "analytics_sessions" (
    "id" BIGSERIAL NOT NULL,
    "session_token" UUID NOT NULL,
    "visitor_token" UUID,
    "landing_path" VARCHAR(500) NOT NULL,
    "referrer_host" VARCHAR(255),
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics_events" (
    "id" BIGSERIAL NOT NULL,
    "event_token" UUID NOT NULL,
    "session_id" BIGINT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "page_path" VARCHAR(500) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analytics_sessions_session_token_key" ON "analytics_sessions"("session_token");
CREATE INDEX "analytics_sessions_started_at_idx" ON "analytics_sessions"("started_at");
CREATE INDEX "analytics_sessions_visitor_token_started_at_idx" ON "analytics_sessions"("visitor_token", "started_at");
CREATE UNIQUE INDEX "analytics_events_event_token_key" ON "analytics_events"("event_token");
CREATE INDEX "analytics_events_type_occurred_at_idx" ON "analytics_events"("type", "occurred_at");
CREATE INDEX "analytics_events_session_id_type_idx" ON "analytics_events"("session_id", "type");

ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "analytics_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
