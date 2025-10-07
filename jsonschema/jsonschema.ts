/**
 * Reusable JSON Schema definitions for Gong API types
 */

export const gongCallIdSchema = {
  type: "string",
  description: "Unique identifier of a Gong call",
};

export const gongUserIdSchema = {
  type: "string",
  description: "Unique identifier of a Gong user",
};

export const gongWorkspaceIdSchema = {
  type: "string",
  description: "Unique identifier of a Gong workspace",
};

export const gongDateTimeSchema = {
  type: "string",
  description: "ISO 8601 date-time string (e.g., '2025-01-01T00:00:00Z')",
};

export const gongCallSchema = {
  type: "object",
  description: "Gong call object with metadata and participants",
  properties: {
    id: gongCallIdSchema,
    url: {
      type: "string",
      description: "URL to view the call in Gong",
    },
    title: {
      type: "string",
      description: "Title of the call",
    },
    scheduled: gongDateTimeSchema,
    started: gongDateTimeSchema,
    duration: {
      type: "number",
      description: "Duration of the call in seconds",
    },
    primaryUserId: gongUserIdSchema,
    direction: {
      type: "string",
      enum: ["inbound", "outbound", "conference", "unknown"],
      description: "Direction of the call",
    },
    system: {
      type: "string",
      description: "System that recorded the call (e.g., 'Zoom', 'Phone')",
    },
    scope: {
      type: "string",
      enum: ["internal", "external", "unknown"],
      description: "Whether the call was internal or external",
    },
    media: {
      type: "string",
      enum: ["video", "audio", "unknown"],
      description: "Media type of the call",
    },
    language: {
      type: "string",
      description: "Language of the call (e.g., 'eng')",
    },
    workspaceId: gongWorkspaceIdSchema,
    sdrDisposition: {
      type: "string",
      description: "SDR disposition if set",
    },
    clientUniqueId: {
      type: "string",
      description: "Client-provided unique identifier",
    },
  },
  required: ["id"],
};

export const gongParticipantSchema = {
  type: "object",
  description: "Participant in a Gong call",
  properties: {
    userId: gongUserIdSchema,
    name: {
      type: "string",
      description: "Name of the participant",
    },
    emailAddress: {
      type: "string",
      description: "Email address of the participant",
    },
    phoneNumber: {
      type: "string",
      description: "Phone number of the participant",
    },
    affiliation: {
      type: "string",
      enum: ["internal", "external", "unknown"],
      description: "Whether the participant is internal or external",
    },
    methods: {
      type: "array",
      description: "Methods used by the participant",
      items: { type: "string" },
    },
  },
};

export const gongTranscriptSentenceSchema = {
  type: "object",
  description: "A single sentence in a call transcript",
  properties: {
    speakerId: {
      type: "string",
      description: "ID of the speaker",
    },
    topic: {
      type: "string",
      description: "Topic being discussed",
    },
    start: {
      type: "number",
      description: "Start time in seconds from call start",
    },
    end: {
      type: "number",
      description: "End time in seconds from call start",
    },
    text: {
      type: "string",
      description: "Text content of the sentence",
    },
  },
  required: ["speakerId", "start", "end", "text"],
};

export const gongUserSchema = {
  type: "object",
  description: "Gong user object with profile information",
  properties: {
    id: gongUserIdSchema,
    emailAddress: {
      type: "string",
      description: "Email address of the user",
    },
    firstName: {
      type: "string",
      description: "First name of the user",
    },
    lastName: {
      type: "string",
      description: "Last name of the user",
    },
    active: {
      type: "boolean",
      description: "Whether the user is active",
    },
    managerId: gongUserIdSchema,
    managerEmailAddress: {
      type: "string",
      description: "Email address of the user's manager",
    },
    trustedEmailAddress: {
      type: "string",
      description: "Trusted email address for the user",
    },
    extension: {
      type: "string",
      description: "Phone extension",
    },
    phoneNumber: {
      type: "string",
      description: "Phone number",
    },
    created: gongDateTimeSchema,
    settings: {
      type: "object",
      description: "User settings",
    },
  },
  required: ["id", "emailAddress"],
};
