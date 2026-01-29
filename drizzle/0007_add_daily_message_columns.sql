-- Add daily message tracking columns for freemium model
-- These columns enable the 1-message-per-day free tier with daily reset

ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "daily_messages_used" integer NOT NULL DEFAULT 0;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "daily_message_reset_date" timestamp DEFAULT NOW();
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "daily_message_limit" integer NOT NULL DEFAULT 1;

-- Update daily_message_reset_date to NOT NULL after setting defaults
UPDATE "client_profile" SET "daily_message_reset_date" = NOW() WHERE "daily_message_reset_date" IS NULL;
ALTER TABLE "client_profile" ALTER COLUMN "daily_message_reset_date" SET NOT NULL;
