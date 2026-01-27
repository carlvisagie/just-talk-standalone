-- Add payment_flow table for multi-instance scalability
CREATE TABLE IF NOT EXISTS "payment_flow" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "client_profile_id" varchar(255) NOT NULL REFERENCES "client_profile"("id") ON DELETE CASCADE,
  "step" varchar(50) NOT NULL DEFAULT 'sent_link',
  "phone_number" varchar(50) NOT NULL,
  "checkout_url" text,
  "attempts" integer NOT NULL DEFAULT 0,
  "failure_reason" text,
  "started_at" timestamp NOT NULL DEFAULT now(),
  "link_sent_at" timestamp,
  "last_prompt_time" timestamp NOT NULL DEFAULT now(),
  "completed_at" timestamp
);

-- Add system_setting table for shared cached values
CREATE TABLE IF NOT EXISTS "system_setting" (
  "key" varchar(255) PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Add index for faster payment flow lookups
CREATE INDEX IF NOT EXISTS "payment_flow_client_id_idx" ON "payment_flow" ("client_profile_id");
CREATE INDEX IF NOT EXISTS "payment_flow_started_at_idx" ON "payment_flow" ("started_at");
