-- Migration: Three-Tier Memory Architecture
-- This migration adds the comprehensive client profile architecture for perfect memory

-- ============================================================================
-- NEW TABLE: client_relationship
-- Explicit storage for people in client's life (wife, son, boss, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "client_relationship" (
  "id" varchar(255) PRIMARY KEY,
  "client_profile_id" varchar(255) NOT NULL REFERENCES "client_profile"("id") ON DELETE CASCADE,
  
  -- Person Details
  "name" varchar(255) NOT NULL,
  "relationship" varchar(100) NOT NULL,
  "nickname" varchar(100),
  
  -- Context
  "age" integer,
  "occupation" varchar(255),
  "notes" text,
  
  -- Emotional Context
  "emotional_context" text,
  "recent_mentions" json,
  
  -- Tracking
  "first_mentioned" timestamp DEFAULT now() NOT NULL,
  "last_mentioned" timestamp DEFAULT now() NOT NULL,
  "mention_count" integer DEFAULT 1 NOT NULL,
  "importance" integer DEFAULT 5 NOT NULL,
  
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_client_relationship_profile" ON "client_relationship"("client_profile_id");
CREATE INDEX IF NOT EXISTS "idx_client_relationship_importance" ON "client_relationship"("importance" DESC);

-- ============================================================================
-- NEW TABLE: key_insight
-- AI-extracted important facts with importance ranking
-- ============================================================================

CREATE TABLE IF NOT EXISTS "key_insight" (
  "id" varchar(255) PRIMARY KEY,
  "client_profile_id" varchar(255) NOT NULL REFERENCES "client_profile"("id") ON DELETE CASCADE,
  
  -- Insight Content
  "insight" text NOT NULL,
  "category" varchar(50) NOT NULL,
  
  -- Importance & Relevance
  "importance" integer DEFAULT 5 NOT NULL,
  "relevance_score" real DEFAULT 1.0 NOT NULL,
  
  -- Source Tracking
  "source" varchar(50) NOT NULL,
  "source_conversation_id" varchar(255),
  
  -- Temporal
  "created_at" timestamp DEFAULT now() NOT NULL,
  "last_relevant_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_key_insight_profile" ON "key_insight"("client_profile_id");
CREATE INDEX IF NOT EXISTS "idx_key_insight_importance" ON "key_insight"("importance" DESC);
CREATE INDEX IF NOT EXISTS "idx_key_insight_category" ON "key_insight"("category");

-- ============================================================================
-- ALTER client_profile: Add new Tier 1 & Tier 2 fields
-- ============================================================================

-- Tier 1: Core Identity additions
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "email" varchar(255);
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "timezone" varchar(100);
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "language" varchar(50) DEFAULT 'en';
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "occupation" varchar(255);
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "life_stage" varchar(100);
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "significant_events" json;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "upcoming_events" json;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "emergency_contact" json;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "safety_plan_notes" text;

-- Tier 2: Active Context additions
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "strengths_and_resources" json;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "recent_topics" json;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "last_interaction_summary" text;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "last_interaction_date" timestamp;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "last_interaction_channel" varchar(50);

-- Engagement Tracking additions
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "total_video_sessions" integer DEFAULT 0;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "platform_engagement" json;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "video_sessions_summary" json;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "community_engagement" json;

-- Subscription additions
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "subscription_status" varchar(50) DEFAULT 'active';
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "stripe_customer_id" varchar(255);

-- AI Synthesis Layer additions
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "key_insights" json;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "next_best_actions" json;
ALTER TABLE "client_profile" ADD COLUMN IF NOT EXISTS "conversation_preferences" json;

-- ============================================================================
-- ALTER conversation: Add AI summary fields
-- ============================================================================

ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "ai_summary" text;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "key_points" json;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "action_items" json;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "follow_up_needed" boolean DEFAULT false;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "follow_up_reason" text;

-- ============================================================================
-- ALTER message: Add extracted info field for profile updates
-- ============================================================================

ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "extracted_info" json;

-- ============================================================================
-- ALTER interaction_log: Add summary and significance fields
-- ============================================================================

ALTER TABLE "interaction_log" ADD COLUMN IF NOT EXISTS "summary" text;
ALTER TABLE "interaction_log" ADD COLUMN IF NOT EXISTS "significance" varchar(50);
