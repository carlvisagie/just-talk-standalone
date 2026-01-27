-- Migration: Move payment flow state into client_profile (single source of truth)
-- This eliminates the need for a separate payment_flow table

ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "payment_flow_step" varchar(50);
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "payment_flow_checkout_url" text;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "payment_flow_started_at" timestamp;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "payment_flow_last_prompt_at" timestamp;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "payment_flow_loop_count" integer DEFAULT 0;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "payment_flow_completed_at" timestamp;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "payment_flow_attempts" integer DEFAULT 0;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "payment_flow_last_failure_reason" text;
