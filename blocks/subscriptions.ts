import { AppBlock, events, kv } from "@slflows/sdk/v1";

export const newCallSubscription: AppBlock = {
  name: "New Call Subscription",
  description:
    "Subscribes to notifications when new calls are recorded in Gong. Emits an event for each new call.",
  category: "Webhooks & Subscriptions",

  config: {
    workspaceId: {
      name: "Workspace ID",
      description: "Filter to specific workspace (optional)",
      type: "string",
      required: false,
    },
    userIds: {
      name: "User IDs",
      description: "Filter to specific users (optional)",
      type: {
        type: "array",
        items: { type: "string" },
      },
      required: false,
    },
  },

  async onSync(input) {
    // Register this block as interested in new call webhooks
    await kv.app.set({
      key: `webhook_subscription:new_call_subscription:${input.block.id}`,
      value: {
        blockId: input.block.id,
        workspaceId: input.block.config.workspaceId,
        userIds: input.block.config.userIds,
      },
    });

    return {
      newStatus: "ready",
    };
  },

  async onDrain(input) {
    // Unregister from webhooks
    await kv.app.delete([
      `webhook_subscription:new_call_subscription:${input.block.id}`,
    ]);

    return {
      newStatus: "drained",
    };
  },

  async onInternalMessage(input) {
    const message = input.message.body as any;

    if (
      message.type === "gong_webhook" &&
      message.eventType === "call_created"
    ) {
      const payload = message.payload;
      const call = payload.call || {};

      // Apply filters
      const config = input.block.config;
      if (config.workspaceId && call.workspaceId !== config.workspaceId) {
        return;
      }
      if (
        config.userIds &&
        Array.isArray(config.userIds) &&
        !config.userIds.includes(call.primaryUserId)
      ) {
        return;
      }

      await events.emit({
        id: call.id,
        title: call.title,
        started: call.started,
        duration: call.duration,
        primaryUserId: call.primaryUserId,
        parties: call.parties,
        url: call.url,
      });
    }
  },

  outputs: {
    default: {
      name: "New Call",
      description: "Emitted when a new call is recorded",
      default: true,
      type: {
        type: "object",
        properties: {
          id: { type: "string", description: "Call identifier" },
          title: { type: "string", description: "Call title" },
          started: { type: "string", description: "Call start time" },
          duration: { type: "number", description: "Duration in seconds" },
          primaryUserId: { type: "string", description: "Call owner" },
          parties: {
            type: "array",
            description: "Call participants",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                affiliation: { type: "string" },
              },
            },
          },
          url: { type: "string", description: "URL to view call in Gong" },
        },
        required: ["id"],
      },
    },
  },
};

export const transcriptReadySubscription: AppBlock = {
  name: "Transcript Ready Subscription",
  description:
    "Subscribes to notifications when call transcripts become available. Emits when a call's transcript processing is complete.",
  category: "Webhooks & Subscriptions",

  config: {
    workspaceId: {
      name: "Workspace ID",
      description: "Filter to specific workspace (optional)",
      type: "string",
      required: false,
    },
    userIds: {
      name: "User IDs",
      description: "Filter to specific users (optional)",
      type: {
        type: "array",
        items: { type: "string" },
      },
      required: false,
    },
  },

  async onSync(input) {
    // Register this block as interested in transcript ready webhooks
    await kv.app.set({
      key: `webhook_subscription:transcript_ready_subscription:${input.block.id}`,
      value: {
        blockId: input.block.id,
        workspaceId: input.block.config.workspaceId,
        userIds: input.block.config.userIds,
      },
    });

    return {
      newStatus: "ready",
    };
  },

  async onDrain(input) {
    // Unregister from webhooks
    await kv.app.delete([
      `webhook_subscription:transcript_ready_subscription:${input.block.id}`,
    ]);

    return {
      newStatus: "drained",
    };
  },

  async onInternalMessage(input) {
    const message = input.message.body as any;

    if (
      message.type === "gong_webhook" &&
      message.eventType === "transcript_ready"
    ) {
      const payload = message.payload;
      const call = payload.call || {};

      // Apply filters
      const config = input.block.config;
      if (config.workspaceId && call.workspaceId !== config.workspaceId) {
        return;
      }
      if (
        config.userIds &&
        Array.isArray(config.userIds) &&
        !config.userIds.includes(call.primaryUserId)
      ) {
        return;
      }

      await events.emit({
        callId: call.id,
        transcriptAvailable: true,
        language: call.language,
        duration: call.duration,
      });
    }
  },

  outputs: {
    default: {
      name: "Transcript Ready",
      description: "Emitted when a call transcript is ready",
      default: true,
      type: {
        type: "object",
        properties: {
          callId: { type: "string", description: "Call identifier" },
          transcriptAvailable: {
            type: "boolean",
            description: "Always true",
          },
          language: { type: "string", description: "Detected language" },
          duration: { type: "number", description: "Call duration" },
        },
        required: ["callId", "transcriptAvailable"],
      },
    },
  },
};

export const callAnalyzedSubscription: AppBlock = {
  name: "Call Analyzed Subscription",
  description:
    "Subscribes to notifications when Gong completes AI analysis of a call (topics, moments, stats available).",
  category: "Webhooks & Subscriptions",

  config: {
    workspaceId: {
      name: "Workspace ID",
      description: "Filter to specific workspace (optional)",
      type: "string",
      required: false,
    },
    userIds: {
      name: "User IDs",
      description: "Filter to specific users (optional)",
      type: {
        type: "array",
        items: { type: "string" },
      },
      required: false,
    },
  },

  async onSync(input) {
    // Register this block as interested in call analyzed webhooks
    await kv.app.set({
      key: `webhook_subscription:call_analyzed_subscription:${input.block.id}`,
      value: {
        blockId: input.block.id,
        workspaceId: input.block.config.workspaceId,
        userIds: input.block.config.userIds,
      },
    });

    return {
      newStatus: "ready",
    };
  },

  async onDrain(input) {
    // Unregister from webhooks
    await kv.app.delete([
      `webhook_subscription:call_analyzed_subscription:${input.block.id}`,
    ]);

    return {
      newStatus: "drained",
    };
  },

  async onInternalMessage(input) {
    const message = input.message.body as any;

    if (
      message.type === "gong_webhook" &&
      message.eventType === "call_analyzed"
    ) {
      const payload = message.payload;
      const call = payload.call || {};
      const analysis = payload.analysis || {};

      // Apply filters
      const config = input.block.config;
      if (config.workspaceId && call.workspaceId !== config.workspaceId) {
        return;
      }
      if (
        config.userIds &&
        Array.isArray(config.userIds) &&
        !config.userIds.includes(call.primaryUserId)
      ) {
        return;
      }

      await events.emit({
        callId: call.id,
        analysisComplete: true,
        topicsDetected: analysis.topicsDetected || 0,
        momentsDetected: analysis.momentsDetected || 0,
      });
    }
  },

  outputs: {
    default: {
      name: "Analysis Complete",
      description: "Emitted when call analysis is complete",
      default: true,
      type: {
        type: "object",
        properties: {
          callId: { type: "string", description: "Call identifier" },
          analysisComplete: {
            type: "boolean",
            description: "Always true",
          },
          topicsDetected: {
            type: "number",
            description: "Number of topics detected",
          },
          momentsDetected: {
            type: "number",
            description: "Number of key moments detected",
          },
        },
        required: ["callId", "analysisComplete"],
      },
    },
  },
};
