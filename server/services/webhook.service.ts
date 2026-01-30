import { getDb } from "../db";
import { webhookEndpoints } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

interface WebhookPayload {
  userId: number;
  deviceId: string;
  status: "up" | "down";
  timestamp: Date;
  detectionMethod: "polling" | "trap" | "fast_polling";
  reason?: string;
  retryAttempts?: number;
}

/**
 * Register a webhook endpoint for a user
 */
export async function registerWebhook(
  userId: number,
  name: string,
  url: string,
  secret?: string
) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error("Invalid webhook URL");
    }

    const generatedSecret = secret || crypto.randomBytes(32).toString("hex");

    const result = await db.insert(webhookEndpoints).values({
      userId,
      name,
      url,
      secret: generatedSecret,
      enabled: 1,
    });

    console.log(`[Webhook] Registered webhook endpoint: ${name} (${url})`);
    return { ...result, secret: generatedSecret };
  } catch (error) {
    console.error("[Webhook] Failed to register webhook:", error);
    return null;
  }
}

/**
 * Get all webhook endpoints for a user
 */
export async function getWebhooks(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const webhooks = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.userId, userId));

    return webhooks;
  } catch (error) {
    console.error("[Webhook] Failed to get webhooks:", error);
    return [];
  }
}

/**
 * Enable/disable a webhook endpoint
 */
export async function toggleWebhook(webhookId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(webhookEndpoints)
      .set({ enabled: enabled ? 1 : 0 })
      .where(eq(webhookEndpoints.id, webhookId));

    console.log(`[Webhook] ${enabled ? "Enabled" : "Disabled"} webhook ${webhookId}`);
    return true;
  } catch (error) {
    console.error("[Webhook] Failed to toggle webhook:", error);
    return false;
  }
}

/**
 * Delete a webhook endpoint
 */
export async function deleteWebhook(webhookId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, webhookId));

    console.log(`[Webhook] Deleted webhook ${webhookId}`);
    return true;
  } catch (error) {
    console.error("[Webhook] Failed to delete webhook:", error);
    return false;
  }
}

/**
 * Trigger all webhooks for a user with a state change event
 */
export async function triggerWebhooks(payload: WebhookPayload) {
  const webhooks = await getWebhooks(payload.userId);

  if (webhooks.length === 0) {
    console.log("[Webhook] No webhooks configured for user");
    return;
  }

  const enabledWebhooks = webhooks.filter((w) => w.enabled === 1);

  for (const webhook of enabledWebhooks) {
    await sendWebhook(webhook, payload);
  }
}

/**
 * Send webhook payload to an endpoint
 */
async function sendWebhook(
  webhook: typeof webhookEndpoints.$inferSelect,
  payload: WebhookPayload
) {
  try {
    // Create HMAC signature
    const timestamp = Date.now();
    const signature = createSignature(payload, webhook.secret || "", timestamp);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": timestamp.toString(),
        "X-Webhook-ID": webhook.id.toString(),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(
        `[Webhook] Webhook ${webhook.id} returned status ${response.status}: ${webhook.url}`
      );
    } else {
      console.log(`[Webhook] Successfully triggered webhook ${webhook.id}`);

      // Update last triggered time
      const db = await getDb();
      if (db) {
        await db
          .update(webhookEndpoints)
          .set({ lastTriggeredAt: new Date() })
          .where(eq(webhookEndpoints.id, webhook.id));
      }
    }
  } catch (error) {
    console.error(`[Webhook] Failed to send webhook ${webhook.id}:`, error);
  }
}

/**
 * Create HMAC signature for webhook verification
 */
function createSignature(payload: WebhookPayload, secret: string, timestamp: number): string {
  const message = `${timestamp}.${JSON.stringify(payload)}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

/**
 * Verify webhook signature (for receiving webhooks)
 */
export function verifyWebhookSignature(
  signature: string,
  timestamp: string,
  body: string,
  secret: string
): boolean {
  try {
    const ts = parseInt(timestamp, 10);
    const now = Date.now();

    // Check timestamp is within 5 minutes
    if (Math.abs(now - ts) > 5 * 60 * 1000) {
      console.warn("[Webhook] Webhook timestamp too old, possible replay attack");
      return false;
    }

    const message = `${ts}.${body}`;
    const expectedSignature = crypto.createHmac("sha256", secret).update(message).digest("hex");

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (error) {
    console.error("[Webhook] Failed to verify signature:", error);
    return false;
  }
}

/**
 * Test webhook endpoint
 */
export async function testWebhook(webhookId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    const webhooks = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, webhookId));

    if (webhooks.length === 0) {
      return false;
    }

    const webhook = webhooks[0];

    const testPayload: WebhookPayload = {
      userId: webhook.userId,
      deviceId: "TEST-DEVICE",
      status: "up",
      timestamp: new Date(),
      detectionMethod: "polling",
      reason: "Test webhook",
    };

    await sendWebhook(webhook, testPayload);
    return true;
  } catch (error) {
    console.error("[Webhook] Failed to test webhook:", error);
    return false;
  }
}
