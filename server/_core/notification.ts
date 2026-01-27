/**
 * Owner notification system (stub for standalone deployment)
 */

export async function notifyOwner({
  title,
  content,
}: {
  title: string;
  content: string;
}): Promise<boolean> {
  // In standalone mode, just log to console
  console.log('[OWNER NOTIFICATION]', { title, content });
  return true;
}
