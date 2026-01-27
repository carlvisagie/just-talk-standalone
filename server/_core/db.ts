import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ENV } from "./env";

if (!ENV.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const connection = postgres(ENV.databaseUrl, {
  ssl: ENV.isProduction ? 'require' : false,
});

export const db = drizzle(connection);
