import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { ENV } from "./env";
import * as fs from "fs";
import * as path from "path";

/**
 * Run database migrations automatically on startup
 * This ensures tables exist before the app tries to use them
 */
export async function runMigrations() {
  if (!ENV.databaseUrl) {
    throw new Error("DATABASE_URL is required for migrations");
  }

  console.log("[Migrations] Starting database migration...");

  try {
    // Create a migration-specific connection
    const migrationConnection = postgres(ENV.databaseUrl, { max: 1 });
    const migrationDb = drizzle(migrationConnection);

    // Get all migration files in order
    const migrationsDir = path.join(process.cwd(), "drizzle");
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort to ensure correct order (0000_, 0001_, etc.)

    console.log(`[Migrations] Found ${migrationFiles.length} migration files`);

    // Execute each migration file
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      console.log(`[Migrations] Running ${migrationFile}...`);
      
      const migrationSQL = fs.readFileSync(migrationPath, "utf-8");
      
      // Split by statement separator and execute each statement
      const statements = migrationSQL
        .split("--> statement-breakpoint")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        try {
          await migrationConnection.unsafe(statement);
          console.log(`[Migrations] ✓ ${migrationFile} statement ${i + 1}/${statements.length}`);
        } catch (error: any) {
          // Ignore "already exists" errors (idempotent migrations)
          if (error.message?.includes("already exists") || error.message?.includes("duplicate column")) {
            console.log(`[Migrations] ⊘ ${migrationFile} statement ${i + 1}/${statements.length} skipped (already exists)`);
          } else {
            console.error(`[Migrations] ✗ ${migrationFile} statement ${i + 1}/${statements.length} failed:`, error.message);
            throw error;
          }
        }
      }
      
      console.log(`[Migrations] ✓ ${migrationFile} completed`);
    }

    await migrationConnection.end();
    console.log("[Migrations] ✓ Database migration completed successfully");
  } catch (error: any) {
    console.error("[Migrations] ✗ Migration failed:", error.message);
    throw error;
  }
}
