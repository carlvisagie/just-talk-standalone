ALTER TABLE "client_profile" ADD COLUMN "trial_messages_remaining" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "client_profile" ADD COLUMN "trial_start_date" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "client_profile" ADD COLUMN "trial_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "client_profile" ADD COLUMN "subscription_tier" varchar(50) DEFAULT 'free';