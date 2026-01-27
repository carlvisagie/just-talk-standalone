import { randomBytes } from 'crypto';

/**
 * Generate a truly unique ID with a prefix
 * Uses crypto.randomBytes for guaranteed uniqueness even under high load
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = randomBytes(8).toString('hex'); // 16 hex chars = very high entropy
  return `${prefix}_${timestamp}_${random}`;
}

// Convenience functions for common ID types
export const generateClientId = () => generateId('client');
export const generateConversationId = () => generateId('conv');
export const generateMessageId = () => generateId('msg');
export const generateLogId = () => generateId('log');
export const generateCrisisId = () => generateId('crisis');
export const generateVoiceId = () => generateId('voice');
export const generateSubscriptionId = () => generateId('sub');
