# Gong App - Design Document

## Overview

This document outlines the design for the Gong integration app for Spacelift Flows. Gong is a revenue intelligence platform that captures and analyzes customer interactions (calls, meetings, emails) to provide insights for sales teams. This app provides read-only access to retrieve call data, transcripts, user information, and receive webhook notifications for call events.

## 1. App Configuration Parameters

The app requires authentication credentials and optional configuration for webhook handling.

### Configuration Fields

#### `accessKey` (required, sensitive)

- **Type**: string
- **Description**: Your Gong API access key. Obtain this from Gong's Company Settings → Ecosystem → API → API keys.
- **Sensitive**: true
- **Required**: true

#### `accessKeySecret` (required, sensitive)

- **Type**: string
- **Description**: Your Gong API access key secret. This is used together with the access key for Basic Authentication.
- **Sensitive**: true
- **Required**: true

#### `apiBaseUrl` (optional)

- **Type**: string
- **Description**: The base URL for Gong API endpoints. Defaults to the standard Gong API endpoint.
- **Default**: `https://api.gong.io`
- **Required**: false

### App Lifecycle

The app will implement an `onSync` handler that:

1. Validates the access key and secret by making a test API call (e.g., to the users endpoint)
2. Returns `ready` status if authentication succeeds
3. Returns `failed` status with appropriate error message if authentication fails

### App HTTP Handler

The app will implement an `http.onRequest` handler to:

1. Receive webhook events from Gong
2. Verify webhook signatures using JWT public key validation (if configured)
3. Route events to appropriate subscription blocks based on event type
4. Handle webhook verification challenges

## 2. Blocks

### 2.1 Call Retrieval

#### Search Calls

**Name**: Search Calls
**Description**: Searches for calls in Gong with flexible filtering options. Returns paginated call data including metadata, participants, call duration, and basic call information. This is the primary way to discover and retrieve calls based on various criteria.

**Category**: Calls

**Input Config Fields**:

- `fromDateTime` (string, optional) - Start date/time in ISO 8601 format (e.g., "2025-01-01T00:00:00Z")
- `toDateTime` (string, optional) - End date/time in ISO 8601 format
- `workspaceId` (string, optional) - Filter calls by specific workspace ID
- `contentSelector` (object, optional) - Advanced content filtering options (expositors, keywords, etc.)
- `cursor` (string, optional) - Pagination cursor from previous response for fetching next page

**Outputs**:

- `default` - Emits paginated call data with cursor for next page

---

#### Get Call Details

**Name**: Get Call Details
**Description**: Retrieves comprehensive information about a specific call, including topics, questions asked, action items, sentiment analysis, call structure, and participant details.

**Category**: Calls

**Input Config Fields**:

- `callId` (string, required) - The unique identifier of the call to retrieve

**Outputs**:

- `default` - Emits detailed call information including analysis and metadata

---

#### Get Call Transcript

**Name**: Get Call Transcript
**Description**: Retrieves the full transcript of a specific call with timestamps, speaker attribution, and sentence-level segmentation.

**Category**: Calls

**Input Config Fields**:

- `callId` (string, required) - The unique identifier of the call

**Outputs**:

- `default` - Emits transcript data with speaker information and timestamps

---

### 2.2 User Management

#### Get User Details

**Name**: Get User Details
**Description**: Retrieves detailed information about a specific Gong user including their profile, email, role, and settings.

**Category**: Users

**Input Config Fields**:

- `userId` (string, required) - The unique identifier of the user

**Outputs**:

- `default` - Emits user details

---

### 2.3 Webhook Subscriptions

#### New Call Subscription

**Name**: New Call Subscription
**Description**: Receives webhook events when a new call is recorded/uploaded in Gong. This block has no inputs and uses the app's HTTP endpoint to receive webhooks. Emits events as soon as Gong registers a new call, before processing is complete.

**Category**: Webhooks

**Lifecycle**: This block registers itself with the app's webhook routing on sync.

**Block Config Fields**:

- `workspaceId` (string, optional) - Only emit events for calls from this workspace

**Entity Lifecycle**:

- `onSync` - Registers the block ID with the app-level KV store for webhook routing
- `onDrain` - Removes the block ID from webhook routing registry

**Internal Message Handler**: Receives routed webhook payloads from app's HTTP handler

**Outputs**:

- `default` - Emits call data when a new call is recorded

---

#### Transcript Ready Subscription

**Name**: Transcript Ready Subscription
**Description**: Receives webhook events when a call's transcript has been processed and is ready for retrieval. This typically fires a few minutes after a call is recorded, once Gong has completed speech-to-text processing.

**Category**: Webhooks

**Lifecycle**: This block registers itself with the app's webhook routing on sync.

**Block Config Fields**:

- `workspaceId` (string, optional) - Only emit events for calls from this workspace

**Entity Lifecycle**:

- `onSync` - Registers the block ID with the app-level KV store for webhook routing
- `onDrain` - Removes the block ID from webhook routing registry

**Internal Message Handler**: Receives routed webhook payloads from app's HTTP handler

**Outputs**:

- `default` - Emits call data when transcript is ready

---

#### Call Analyzed Subscription

**Name**: Call Analyzed Subscription
**Description**: Receives webhook events when a call has been fully analyzed by Gong (topics extracted, questions identified, action items detected, sentiment analyzed, etc.). This is the final processing stage and indicates all call insights are available.

**Category**: Webhooks

**Lifecycle**: This block registers itself with the app's webhook routing on sync.

**Block Config Fields**:

- `workspaceId` (string, optional) - Only emit events for calls from this workspace

**Entity Lifecycle**:

- `onSync` - Registers the block ID with the app-level KV store for webhook routing
- `onDrain` - Removes the block ID from webhook routing registry

**Internal Message Handler**: Receives routed webhook payloads from app's HTTP handler

**Outputs**:

- `default` - Emits call data when analysis is complete

---

## 3. Implementation Notes

### Authentication

All API blocks will use Basic Authentication by combining the access key and secret:

```
Authorization: Basic base64(accessKey:accessKeySecret)
```

### Rate Limiting

The app should handle Gong's rate limits (3 calls/second, 10,000 calls/day):

- Implement exponential backoff for rate limit errors
- Consider adding rate limit status to app signals if needed

### Webhook Signature Verification

The app's HTTP handler should:

1. Verify JWT signature if webhook rules are configured with signed JWT
2. Handle the `isTest` field in webhook payloads (Gong sends test payloads)
3. Route webhook events to subscribed blocks via internal messaging

### Error Handling

- All blocks should let errors propagate naturally (no try-catch wrapping)
- Use descriptive error messages that include Gong API error details
- Handle pagination properly for list operations

### JSON Schema

All input and output types should have comprehensive JSON schemas defined, following the pattern from the Slack app example.

### Block Organization

Blocks should be organized in the `blocks/` directory by category:

- `blocks/calls.ts` - Call retrieval blocks (search, get details, get transcript)
- `blocks/users.ts` - User management blocks (get user details)
- `blocks/subscriptions.ts` - Webhook subscription blocks (new call, transcript ready, call analyzed)
- `blocks/index.ts` - Block registry

### Shared Utilities

Common functionality should be extracted to helper files:

- `gongClient.ts` - HTTP client for Gong API with auth header handling
- `webhookHelpers.ts` - Webhook signature verification and routing logic
- `jsonschema/jsonschema.ts` - Reusable JSON schema definitions

## 4. Future Enhancements

Potential additions for future versions:

- **List Users**: Block for retrieving paginated list of all users in the organization
- **Deal Retrieval**: Blocks for retrieving deal/opportunity information
- **Coaching Insights**: Blocks for accessing coaching scorecards and feedback
- **Topics & Trackers**: Blocks for retrieving custom topics and tracker data
- **Advanced Call Search**: More sophisticated filtering options and full-text search
- **Call Statistics**: Aggregated analytics and metrics for calls
- **Meeting Retrieval**: Blocks for retrieving scheduled meeting information
