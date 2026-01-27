/**
 * HEALTH CHECK & MONITORING API
 * 
 * Exposes system health status for monitoring and alerting
 */

import { router, publicProcedure } from "./_core/trpc";
import { getHealthStatus, checkDatabaseHealth, verifyDatabaseSchema } from "./_core/dbHealth";

export const healthRouter = router({
  /**
   * Get current system health status
   */
  status: publicProcedure.query(async () => {
    const dbHealth = getHealthStatus();
    const currentCheck = await checkDatabaseHealth();
    
    return {
      status: currentCheck ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: currentCheck,
        lastCheck: dbHealth.lastCheck,
        consecutiveFailures: dbHealth.consecutiveFailures,
        lastError: dbHealth.lastError,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }),
  
  /**
   * Deep health check - verifies database schema
   */
  deep: publicProcedure.query(async () => {
    const dbConnected = await checkDatabaseHealth();
    const schemaValid = await verifyDatabaseSchema();
    
    return {
      status: (dbConnected && schemaValid) ? "healthy" : "unhealthy",
      checks: {
        databaseConnection: dbConnected,
        databaseSchema: schemaValid,
      },
      timestamp: new Date().toISOString(),
    };
  }),
});
