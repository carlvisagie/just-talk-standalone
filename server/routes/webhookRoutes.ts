/**
 * WEBHOOK ROUTES
 * 
 * Express routes for handling Stripe webhooks
 * Raw body parsing required for signature verification
 */

import express, { Request, Response } from "express";
import { handleStripeWebhook } from "../webhooks/stripeWebhook";
import { ENV } from "../_core/env";

const router = express.Router();

/**
 * Stripe webhook endpoint
 * POST /api/webhooks/stripe
 * 
 * IMPORTANT: This route requires raw body parsing for signature verification
 * The raw body middleware must be applied before JSON parsing
 */
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      // handleStripeWebhook handles everything internally
      await handleStripeWebhook(req, res);
    } catch (error: any) {
      console.error("[Webhook Route] Unexpected error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
