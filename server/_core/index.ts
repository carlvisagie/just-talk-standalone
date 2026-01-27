import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { setupTwilioRoutes } from "../twilioRoutes";
import { createConversationRelayServer } from "../conversationRelay";
import webhookRoutes from "../routes/webhookRoutes";
import { db } from "./db";
import { 
  checkDatabaseHealth, 
  verifyDatabaseSchema, 
  startHealthMonitoring,
  retryOperation 
} from "./dbHealth";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // INTELLIGENT CORE: Database initialization with self-healing
  console.log("[Intelligent Core] Initializing database layer...");
  
  // Step 1: Verify database connectivity with retry
  console.log("[Database] Checking connectivity...");
  const connected = await retryOperation(
    () => checkDatabaseHealth(),
    5, // 5 retries
    2000 // 2 second base delay
  );
  
  if (!connected) {
    throw new Error("Failed to connect to database after multiple retries");
  }
  console.log("[Database] Connection verified ✓");
  
  // Step 2: Run migrations to ensure schema is up to date
  console.log("[Database] Running migrations...");
  try {
    const { runMigrations } = await import("./runMigrations");
    await runMigrations();
    console.log("[Database] Migrations completed ✓");
  } catch (error: any) {
    console.error("[Database] Migration error:", error.message);
    // Continue anyway - tables might already exist
    console.log("[Database] Continuing despite migration error (tables may already exist)");
  }
  
  // Step 3: Verify schema integrity
  console.log("[Database] Verifying schema...");
  const schemaValid = await verifyDatabaseSchema();
  if (!schemaValid) {
    console.warn("[Database] Schema verification failed - some tables may be missing");
    console.warn("[Database] Server will start anyway - tables will be created on first use");
  } else {
    console.log("[Database] Schema verified ✓");
  }
  
  // Step 4: Start continuous health monitoring
  startHealthMonitoring(30000); // Check every 30 seconds
  console.log("[Intelligent Core] Database layer initialized with self-monitoring ✓");
  
  
  const app = express();
  const server = createServer(app);
  
  // CRITICAL: Stripe webhooks MUST be registered BEFORE JSON parser!
  // The webhook route uses express.raw() internally, but if express.json()
  // runs first, it consumes the raw body and signature verification fails.
  app.use("/api/webhooks", webhookRoutes);
  
  // Configure body parser with larger size limit for file uploads
  // This MUST come AFTER webhook routes
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Twilio webhooks under /api/twilio/*
  setupTwilioRoutes(app);
  
  // ConversationRelay WebSocket server for state-of-the-art voice AI
  createConversationRelayServer(server);
  console.log("[ConversationRelay] WebSocket server initialized at /conversation-relay");
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
