-- Add missing columns to client_profile for phone recognition and subscription tracking
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "phone_number" varchar(50);
--> statement-breakpoint
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "trial_messages_remaining" integer DEFAULT 100 NOT NULL;
--> statement-breakpoint
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "trial_start_date" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "trial_end_date" timestamp;
--> statement-breakpoint
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "subscription_tier" varchar(50) DEFAULT 'free';
