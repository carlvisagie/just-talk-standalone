CREATE TABLE IF NOT EXISTS "behavioral_pattern" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"client_profile_id" varchar(255) NOT NULL,
	"pattern_type" varchar(50) NOT NULL,
	"pattern_data" json,
	"trend" varchar(50),
	"significance" varchar(50),
	"ai_analysis" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_profile" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255),
	"preferred_name" varchar(255),
	"pronouns" varchar(50),
	"age" integer,
	"location" varchar(255),
	"communication_style" text,
	"preferred_channel" varchar(50),
	"best_time_to_reach" varchar(100),
	"common_triggers" json,
	"coping_strategies" json,
	"emotional_patterns" text,
	"current_goals" json,
	"past_wins" json,
	"ongoing_challenges" json,
	"crisis_risk_level" varchar(50) DEFAULT 'none',
	"last_crisis_date" timestamp,
	"crisis_notes" text,
	"first_contact_date" timestamp DEFAULT now() NOT NULL,
	"last_contact_date" timestamp DEFAULT now() NOT NULL,
	"total_conversations" integer DEFAULT 0 NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"total_phone_calls" integer DEFAULT 0 NOT NULL,
	"total_sms" integer DEFAULT 0 NOT NULL,
	"ai_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"client_profile_id" varchar(255),
	"user_id" varchar(255),
	"channel" varchar(50) DEFAULT 'web' NOT NULL,
	"mood" varchar(50),
	"topic" varchar(255),
	"sentiment" varchar(50),
	"crisis_detected" boolean DEFAULT false NOT NULL,
	"crisis_level" varchar(50) DEFAULT 'none',
	"message_count" integer DEFAULT 0 NOT NULL,
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crisis_log" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"client_profile_id" varchar(255) NOT NULL,
	"conversation_id" varchar(255),
	"crisis_level" varchar(50) NOT NULL,
	"indicators" json,
	"transcript" text,
	"escalated" boolean DEFAULT false NOT NULL,
	"escalated_to" varchar(255),
	"escalation_time" timestamp,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolution" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interaction_log" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"client_profile_id" varchar(255),
	"interaction_type" varchar(50) NOT NULL,
	"target" varchar(255),
	"duration" integer,
	"metadata" json,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"conversation_id" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"mood" varchar(50),
	"sentiment" varchar(50),
	"crisis_keywords" json,
	"audio_url" text,
	"transcription_confidence" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"client_profile_id" varchar(255) NOT NULL,
	"stripe_subscription_id" varchar(255) NOT NULL,
	"stripe_customer_id" varchar(255) NOT NULL,
	"stripe_price_id" varchar(255) NOT NULL,
	"tier" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"open_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"avatar" text,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_open_id_unique" UNIQUE("open_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "voice_signature" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"client_profile_id" varchar(255) NOT NULL,
	"voiceprint" json,
	"confidence_threshold" real DEFAULT 0.8 NOT NULL,
	"last_recognized" timestamp,
	"recognition_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "behavioral_pattern" ADD CONSTRAINT "behavioral_pattern_client_profile_id_client_profile_id_fk" FOREIGN KEY ("client_profile_id") REFERENCES "public"."client_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_profile" ADD CONSTRAINT "client_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_client_profile_id_client_profile_id_fk" FOREIGN KEY ("client_profile_id") REFERENCES "public"."client_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crisis_log" ADD CONSTRAINT "crisis_log_client_profile_id_client_profile_id_fk" FOREIGN KEY ("client_profile_id") REFERENCES "public"."client_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crisis_log" ADD CONSTRAINT "crisis_log_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_log" ADD CONSTRAINT "interaction_log_client_profile_id_client_profile_id_fk" FOREIGN KEY ("client_profile_id") REFERENCES "public"."client_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_client_profile_id_client_profile_id_fk" FOREIGN KEY ("client_profile_id") REFERENCES "public"."client_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_signature" ADD CONSTRAINT "voice_signature_client_profile_id_client_profile_id_fk" FOREIGN KEY ("client_profile_id") REFERENCES "public"."client_profile"("id") ON DELETE cascade ON UPDATE no action;