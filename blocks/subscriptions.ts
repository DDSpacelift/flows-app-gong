import { AppBlock, events } from "@slflows/sdk/v1";
import {
  registerWebhookSubscription,
  unregisterWebhookSubscription,
  GongWebhookPayload,
} from "../webhookHelpers";
import { gongCallSchema } from "../jsonschema/jsonschema";

export const newCallSubscription: AppBlock = {
  name: "New Call Subscription",
  description:
    "Receives webhook events when a new call is recorded/uploaded in Gong. Emits events as soon as Gong registers a new call, before processing is complete.",
  category: "Webhooks",

  config: {
    workspaceId: {
      name: "Workspace ID",
      description: "Only emit events for calls from this workspace (optional)",
      type: "string",
      required: false,
    },
  },

  async onSync(input) {
    // Register this block for webhook events
    await registerWebhookSubscription(
      input.block.id,
      "call-created",
      input.block.config.workspaceId as string | undefined,
    );

    return {
      newStatus: "ready",
    };
  },

  async onDrain(input) {
    // Unregister this block from webhook events
    await unregisterWebhookSubscription(input.block.id, "call-created");

    return {
      newStatus: "drained",
    };
  },

  async onInternalMessage(input) {
    const messageBody = input.message.body as any;

    if (messageBody.type === "gong_webhook") {
      const payload: GongWebhookPayload = messageBody.payload;

      if (payload.eventType === "call-created") {
        await events.emit({
          eventId: payload.eventId,
          eventTime: payload.eventTime,
          call: payload.call,
        });
      }
    }
  },

  outputs: {
    default: {
      name: "New Call",
      description: "Emitted when a new call is recorded in Gong.",
      default: true,
      type: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description: "Unique identifier of the webhook event",
          },
          eventTime: {
            type: "string",
            description: "ISO 8601 timestamp of when the event occurred",
          },
          call: gongCallSchema,
        },
        required: ["eventId", "eventTime", "call"],
      },
    },
  },
};

export const transcriptReadySubscription: AppBlock = {
  name: "Transcript Ready Subscription",
  description:
    "Receives webhook events when a call's transcript has been processed and is ready for retrieval. This typically fires a few minutes after a call is recorded.",
  category: "Webhooks",

  config: {
    workspaceId: {
      name: "Workspace ID",
      description: "Only emit events for calls from this workspace (optional)",
      type: "string",
      required: false,
    },
  },

  async onSync(input) {
    // Register this block for webhook events
    await registerWebhookSubscription(
      input.block.id,
      "call-transcript-ready",
      input.block.config.workspaceId as string | undefined,
    );

    return {
      newStatus: "ready",
    };
  },

  async onDrain(input) {
    // Unregister this block from webhook events
    await unregisterWebhookSubscription(
      input.block.id,
      "call-transcript-ready",
    );

    return {
      newStatus: "drained",
    };
  },

  async onInternalMessage(input) {
    const messageBody = input.message.body as any;

    if (messageBody.type === "gong_webhook") {
      const payload: GongWebhookPayload = messageBody.payload;

      if (payload.eventType === "call-transcript-ready") {
        await events.emit({
          eventId: payload.eventId,
          eventTime: payload.eventTime,
          call: payload.call,
        });
      }
    }
  },

  outputs: {
    default: {
      name: "Transcript Ready",
      description: "Emitted when a call transcript is ready for retrieval.",
      default: true,
      type: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description: "Unique identifier of the webhook event",
          },
          eventTime: {
            type: "string",
            description: "ISO 8601 timestamp of when the event occurred",
          },
          call: gongCallSchema,
        },
        required: ["eventId", "eventTime", "call"],
      },
    },
  },
};

export const callAnalyzedSubscription: AppBlock = {
  name: "Call Analyzed Subscription",
  description:
    "Receives webhook events when a call has been fully analyzed by Gong (topics extracted, questions identified, action items detected, sentiment analyzed, etc.). This is the final processing stage.",
  category: "Webhooks",

  config: {
    workspaceId: {
      name: "Workspace ID",
      description: "Only emit events for calls from this workspace (optional)",
      type: "string",
      required: false,
    },
  },

  async onSync(input) {
    // Register this block for webhook events
    await registerWebhookSubscription(
      input.block.id,
      "call-analyzed",
      input.block.config.workspaceId as string | undefined,
    );

    return {
      newStatus: "ready",
    };
  },

  async onDrain(input) {
    // Unregister this block from webhook events
    await unregisterWebhookSubscription(input.block.id, "call-analyzed");

    return {
      newStatus: "drained",
    };
  },

  async onInternalMessage(input) {
    const messageBody = input.message.body as any;

    if (messageBody.type === "gong_webhook") {
      const payload: GongWebhookPayload = messageBody.payload;

      if (payload.eventType === "call-analyzed") {
        await events.emit({
          eventId: payload.eventId,
          eventTime: payload.eventTime,
          call: payload.call,
        });
      }
    }
  },

  outputs: {
    default: {
      name: "Call Analyzed",
      description: "Emitted when a call has been fully analyzed by Gong.",
      default: true,
      type: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description: "Unique identifier of the webhook event",
          },
          eventTime: {
            type: "string",
            description: "ISO 8601 timestamp of when the event occurred",
          },
          call: gongCallSchema,
        },
        required: ["eventId", "eventTime", "call"],
      },
    },
  },
};
