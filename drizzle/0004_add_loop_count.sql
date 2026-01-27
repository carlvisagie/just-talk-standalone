-- Add loop_count column to payment_flow table for tracking repeated prompts
ALTER TABLE "payment_flow" ADD COLUMN IF NOT EXISTS "loop_count" integer NOT NULL DEFAULT 0;
