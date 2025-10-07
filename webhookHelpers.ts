/**
 * Webhook verification and routing logic for Gong webhooks
 */

import { kv, messaging, http } from "@slflows/sdk/v1";

/**
 * Webhook event types from Gong
 */
export type GongWebhookEventType =
  | "call-created"
  | "call-transcript-ready"
  | "call-analyzed";

/**
 * Gong webhook payload structure
 */
export interface GongWebhookPayload {
  eventType: GongWebhookEventType;
  eventId: string;
  eventTime: string;
  isTest?: boolean;
  call?: {
    id: string;
    url?: string;
    title?: string;
    scheduled?: string;
    started?: string;
    duration?: number;
    primaryUserId?: string;
    direction?: string;
    system?: string;
    scope?: string;
    media?: string;
    language?: string;
    workspaceId?: string;
  };
}

/**
 * Handles incoming webhook events and routes them to subscribed blocks
 */
export async function handleGongWebhook(
  payload: GongWebhookPayload,
  requestId: string,
): Promise<void> {
  // Handle test webhooks
  if (payload.isTest) {
    await http.respond(requestId, {
      statusCode: 200,
      body: { message: "Test webhook received" },
    });
    return;
  }

  // Get registered subscription blocks for this event type
  const subscriptionKey = `webhook:subscription:${payload.eventType}`;
  const subscriptions = await kv.app.get(subscriptionKey);

  if (!subscriptions?.value || !Array.isArray(subscriptions.value)) {
    // No subscriptions for this event type
    await http.respond(requestId, {
      statusCode: 200,
      body: { message: "No subscriptions for this event type" },
    });
    return;
  }

  // Route to all subscribed blocks
  const blockIds: string[] = subscriptions.value
    .filter((sub: any) => {
      // Filter by workspace if specified
      if (sub.workspaceId && payload.call?.workspaceId) {
        return sub.workspaceId === payload.call.workspaceId;
      }
      return true;
    })
    .map((sub: any) => sub.blockId);

  if (blockIds.length > 0) {
    await messaging.sendToBlocks({
      blockIds,
      body: {
        type: "gong_webhook",
        payload,
      },
    });
  }

  await http.respond(requestId, {
    statusCode: 200,
    body: { message: "Webhook processed" },
  });
}

/**
 * Registers a block for webhook events
 */
export async function registerWebhookSubscription(
  blockId: string,
  eventType: GongWebhookEventType,
  workspaceId?: string,
): Promise<void> {
  const subscriptionKey = `webhook:subscription:${eventType}`;

  // Get existing subscriptions
  const existing = await kv.app.get(subscriptionKey);
  const subscriptions = existing?.value || [];

  // Add this block if not already registered
  const alreadyRegistered = subscriptions.some(
    (sub: any) => sub.blockId === blockId,
  );

  if (!alreadyRegistered) {
    subscriptions.push({ blockId, workspaceId });
    await kv.app.set({
      key: subscriptionKey,
      value: subscriptions,
    });
  }
}

/**
 * Unregisters a block from webhook events
 */
export async function unregisterWebhookSubscription(
  blockId: string,
  eventType: GongWebhookEventType,
): Promise<void> {
  const subscriptionKey = `webhook:subscription:${eventType}`;

  // Get existing subscriptions
  const existing = await kv.app.get(subscriptionKey);
  if (!existing?.value) return;

  const subscriptions = existing.value;

  // Remove this block
  const filtered = subscriptions.filter((sub: any) => sub.blockId !== blockId);

  await kv.app.set({
    key: subscriptionKey,
    value: filtered,
  });
}
