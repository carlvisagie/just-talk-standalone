import { db } from "./_core/db.js";
import { clientProfile } from "../drizzle/schema";
import { user, conversation, message, subscription } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

export async function getUserByOpenId(openId: string) {
  const [found] = await db.select().from(user).where(eq(user.openId, openId));
  return found;
}

export async function createUser(data: {
  id: string;
  openId: string;
  name: string;
  email?: string;
  avatar?: string;
}) {
  await db.insert(user).values(data);
  return await getUserByOpenId(data.openId);
}

export async function upsertUser(data: {
  openId: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
}) {
  const existing = await getUserByOpenId(data.openId);
  
  if (existing) {
    // Update existing user - build update object dynamically
    console.log('[upsertUser] Updating existing user with data:', JSON.stringify(data));
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.loginMethod !== undefined) updateData.loginMethod = data.loginMethod;
    if (data.lastSignedIn !== undefined) updateData.lastSignedIn = data.lastSignedIn;
    
    console.log('[upsertUser] Built updateData:', JSON.stringify(updateData), 'keys:', Object.keys(updateData).length);
    // Only update if there are fields to update
    if (Object.keys(updateData).length > 0) {
      await db
        .update(user)
        .set(updateData)
        .where(eq(user.openId, data.openId));
    }
    return await getUserByOpenId(data.openId);
  } else {
    // Create new user
    const newUserId = randomBytes(16).toString("hex");
    await db
      .insert(user)
      .values({
        id: newUserId,
        openId: data.openId,
        name: data.name || "User",
        email: data.email || undefined,
        avatar: data.avatar || undefined,
      });
    return await getUserByOpenId(data.openId);
  }
}

export async function getConversationById(conversationId: string) {
  const [found] = await db
    .select()
    .from(conversation)
    .where(eq(conversation.id, conversationId));
  return found;
}

export async function createConversation(userId: string, conversationId: string) {
  await db
    .insert(conversation)
    .values({
      id: conversationId,
      userId,
    });
  return await getConversationById(conversationId);
}

export async function getMessagesByConversationId(conversationId: string) {
  return db
    .select()
    .from(message)
    .where(eq(message.conversationId, conversationId))
    .orderBy(message.createdAt);
}

export async function createMessage(data: {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  mood?: string;
}) {
  await db.insert(message).values(data);
  const [created] = await db.select().from(message).where(eq(message.id, data.id));
  return created;
}

export async function getSubscriptionByClientProfileId(clientProfileId: string) {
  const [found] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.clientProfileId, clientProfileId));
  return found;
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  const [found] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId));
  return found;
}
