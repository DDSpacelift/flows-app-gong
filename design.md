# Gong Flows App - Design Document

## Overview

The Gong Flows app provides integration with Gong's revenue intelligence platform, enabling automation around sales call recordings, transcripts, analytics, and insights. This app allows users to react to new calls, analyze conversations, extract insights, and integrate Gong data into their workflows.

## 1. App Configuration Parameters

### Authentication Method: OAuth 2.0

The app uses **OAuth 2.0 authentication** with authorization code flow, following the pattern used by the ClickUp app. This provides secure, scoped access to Gong resources.

**OAuth Flow**:

1. User initiates installation
2. App redirects to Gong OAuth authorization page
3. User grants permissions
4. Gong redirects back with authorization code
5. App exchanges code for access token and refresh token
6. Tokens are stored in app config

### App Configuration Fields

**`clientId`** (required)

- **Type**: `string`
- **Description**: OAuth client ID from your Gong app configuration
- **Sensitive**: `false`
- **Note**: Obtained from Gong Admin Settings > Ecosystem > API > Create OAuth App

**`clientSecret`** (required, sensitive)

- **Type**: `string`
- **Description**: OAuth client secret from your Gong app configuration
- **Sensitive**: `true`
- **Note**: Keep this secret secure; never expose in client-side code

**`accessToken`** (optional, sensitive)

- **Type**: `string`
- **Description**: OAuth access token (automatically populated after authorization)
- **Sensitive**: `true`
- **Note**: Managed automatically by the app's OAuth flow

**`refreshToken`** (optional, sensitive)

- **Type**: `string`
- **Description**: OAuth refresh token for renewing access tokens
- **Sensitive**: `true`
- **Note**: Used automatically when access token expires

**`baseUrl`** (optional)

- **Type**: `string`
- **Description**: Gong API base URL
- **Default**: `"https://api.gong.io"`
- **Note**: May differ for EU instances (`https://eu-api.gong.io`) or custom deployments

**`webhookSecret`** (optional, sensitive)

- **Type**: `string`
- **Description**: Secret token for verifying incoming webhooks from Gong
- **Sensitive**: `true`
- **Note**: Configure in Gong webhook settings; used to authenticate webhook requests

### App Signals

**`userId`** (string)

- **Name**: "User ID"
- **Description**: The Gong user ID associated with the authenticated account

**`workspaceId`** (string)

- **Name**: "Workspace ID"
- **Description**: The Gong workspace ID for this installation

### App Lifecycle

The app should implement `onSync` to:

1. **Check for OAuth credentials**:
   - If no `accessToken`, check for authorization code in prompts/config
   - If authorization code present, exchange for access token
   - Store `accessToken` and `refreshToken` in config

2. **Validate/refresh token**:
   - If `accessToken` exists, validate by calling `/v2/users` endpoint
   - If token expired (401 response), use `refreshToken` to get new access token
   - Update config with new tokens

3. **Retrieve user/workspace info**:
   - Call `/v2/users` to get authenticated user details
   - Update signals with `userId` and `workspaceId`

4. **Return status**:
   - `ready` when tokens are valid and user info retrieved
   - `in_progress` when waiting for OAuth authorization
   - `failed` when OAuth fails or credentials are invalid

5. **Create authorization prompt if needed**:
   - If no tokens and no authorization in progress, create prompt
   - Redirect user to Gong OAuth authorization URL
   - Include proper scopes (e.g., `api:calls:read`, `api:users:read`)

### App HTTP Handler

The app should implement `http.onRequest` to:

1. **Handle OAuth callback** (`/oauth/callback`):
   - Receive authorization code from Gong
   - Store code temporarily (for onSync to exchange)
   - Trigger sync to complete OAuth flow
   - Respond with success page

2. **Verify webhook signatures**:
   - Use `webhookSecret` to verify incoming webhook authenticity
   - Reject requests with invalid signatures (403)

3. **Route webhook events**:
   - Parse webhook payload
   - Route events to appropriate subscription blocks via internal messaging
   - Respond with 200 OK to acknowledge receipt

4. **Handle webhook challenge** (if applicable):
   - Some webhook systems send verification challenges
   - Respond appropriately to complete webhook registration

## 2. Blocks

### Category: Calls & Recordings

#### **Get Call Details**

**Description**: Retrieves detailed information about a specific call, including participants, duration, metadata, and recording status.

**Input Config Fields**:

- `callId` (string, required): The unique identifier of the call to retrieve

**Outputs**:

- `default` (Call Details): Emits call object with properties:
  - `id`: Call identifier
  - `title`: Call title/subject
  - `scheduled`: Scheduled start time (ISO 8601)
  - `started`: Actual start time (ISO 8601)
  - `duration`: Duration in seconds
  - `primaryUserId`: Gong user who owns the call
  - `direction`: Call direction (inbound/outbound/conference)
  - `system`: Source system (Zoom, Teams, etc.)
  - `scope`: Public/private scope
  - `media`: Recording availability status
  - `language`: Detected language
  - `workspaceId`: Workspace identifier
  - `parties`: Array of participants with names and affiliations
  - `content`: Content metadata (topics, trackers, etc.)

---

#### **Search Calls**

**Description**: Searches for calls based on various criteria like date range, participants, content, or custom filters.

**Input Config Fields**:

- `fromDateTime` (string, optional): Start of date range (ISO 8601)
- `toDateTime` (string, optional): End of date range (ISO 8601)
- `workspaceId` (string, optional): Filter by workspace
- `primaryUserId` (string, optional): Filter by call owner
- `cursor` (string, optional): Pagination cursor from previous search
- `contentSelector` (object, optional): Content filtering criteria:
  - `exposedFields`: Array of fields to include in response
  - `filter`: Filter conditions

**Outputs**:

- `default` (Search Results): Emits search results with:
  - `calls`: Array of call objects (same structure as Get Call Details)
  - `records`: Total number of matching calls
  - `cursor`: Pagination cursor for next page

---

#### **Download Call Recording**

**Description**: Retrieves the recording file URL for a specific call.

**Input Config Fields**:

- `callId` (string, required): The call identifier
- `audioFormat` (string, optional): Desired audio format (mp3/wav), defaults to mp3

**Outputs**:

- `default` (Recording URL): Emits:
  - `callId`: The call identifier
  - `recordingUrl`: Signed URL to download the recording
  - `expiresAt`: URL expiration timestamp

---

### Category: Transcripts & Analysis

#### **Get Call Transcript**

**Description**: Retrieves the full transcript of a call with speaker identification and timestamps.

**Input Config Fields**:

- `callId` (string, required): The call identifier

**Outputs**:

- `default` (Transcript): Emits transcript with:
  - `callId`: The call identifier
  - `transcript`: Array of transcript entries:
    - `speakerId`: Speaker identifier
    - `topic`: Current topic/segment
    - `sentences`: Array of sentences with:
      - `start`: Start time in seconds
      - `end`: End time in seconds
      - `text`: Transcript text

---

#### **Get Call Topics**

**Description**: Retrieves the topics discussed during a call, as automatically detected by Gong's AI.

**Input Config Fields**:

- `callId` (string, required): The call identifier

**Outputs**:

- `default` (Topics): Emits:
  - `callId`: The call identifier
  - `topics`: Array of topic objects:
    - `name`: Topic name
    - `duration`: Time spent on topic (seconds)
    - `segments`: Array of time ranges where topic was discussed

---

#### **Get Call Moments**

**Description**: Retrieves key moments from a call (objections, pricing discussions, next steps, etc.).

**Input Config Fields**:

- `callId` (string, required): The call identifier

**Outputs**:

- `default` (Moments): Emits:
  - `callId`: The call identifier
  - `moments`: Array of moment objects:
    - `type`: Moment type (objection, pricing, next_steps, etc.)
    - `timestamp`: When the moment occurred (seconds)
    - `duration`: Duration of the moment (seconds)
    - `context`: Surrounding conversation context

---

#### **Get Call Stats**

**Description**: Retrieves speaking statistics for a call (talk time, talk ratio, interactivity, etc.).

**Input Config Fields**:

- `callId` (string, required): The call identifier

**Outputs**:

- `default` (Stats): Emits:
  - `callId`: The call identifier
  - `stats`: Statistics object:
    - `longestMonologue`: Longest uninterrupted speech (seconds)
    - `talkToListenRatio`: Speaker talk/listen ratio
    - `interactivity`: Interaction score
    - `patience`: Patience score
    - `speakers`: Array of per-speaker stats:
      - `userId`: Speaker identifier
      - `talkTime`: Total talk time (seconds)
      - `talkPercentage`: Percentage of call duration

---

### Category: Users & Teams

#### **Get User Details**

**Description**: Retrieves information about a specific Gong user.

**Input Config Fields**:

- `userId` (string, required): The user identifier

**Outputs**:

- `default` (User Details): Emits:
  - `id`: User identifier
  - `emailAddress`: User email
  - `firstName`: First name
  - `lastName`: Last name
  - `active`: Whether user is active
  - `managerId`: Manager's user ID
  - `title`: Job title
  - `phoneNumber`: Phone number
  - `extension`: Extension
  - `personalMeetingUrls`: Array of meeting URLs

---

#### **List Users**

**Description**: Lists all users in the Gong workspace, with optional filtering.

**Input Config Fields**:

- `cursor` (string, optional): Pagination cursor
- `active` (boolean, optional): Filter by active status

**Outputs**:

- `default` (User List): Emits:
  - `users`: Array of user objects (same as Get User Details)
  - `cursor`: Pagination cursor for next page

---

### Category: CRM & Deals

#### **Get Call CRM Context**

**Description**: Retrieves CRM context associated with a call (account, opportunity, contacts).

**Input Config Fields**:

- `callId` (string, required): The call identifier

**Outputs**:

- `default` (CRM Context): Emits:
  - `callId`: The call identifier
  - `crmInfo`: CRM information object:
    - `account`: Account details
    - `opportunity`: Opportunity/deal details
    - `contacts`: Array of associated contacts

---

### Category: Webhooks & Subscriptions

#### **New Call Subscription**

**Description**: Subscribes to notifications when new calls are recorded in Gong. Emits an event for each new call.

**Entity Config** (optional):

- `workspaceId` (string, optional): Filter to specific workspace
- `userIds` (array of strings, optional): Filter to specific users

**Handler**: `onInternalMessage`

- Receives webhook payload from app's HTTP handler
- Filters based on entity config
- Emits to output if matches criteria

**Lifecycle**: `onSync` / `onDrain`

- Registers interest in new call webhooks using KV storage
- App HTTP handler routes to relevant blocks

**Outputs**:

- `default` (New Call): Emits call object:
  - `id`: Call identifier
  - `title`: Call title
  - `started`: Call start time
  - `duration`: Duration in seconds
  - `primaryUserId`: Call owner
  - `parties`: Call participants
  - `url`: URL to view call in Gong

---

#### **Transcript Ready Subscription**

**Description**: Subscribes to notifications when call transcripts become available. Emits when a call's transcript processing is complete.

**Entity Config** (optional):

- `workspaceId` (string, optional): Filter to specific workspace
- `userIds` (array of strings, optional): Filter to specific users

**Handler**: `onInternalMessage`

- Receives webhook from app HTTP handler
- Emits when transcript is ready

**Outputs**:

- `default` (Transcript Ready): Emits:
  - `callId`: Call identifier
  - `transcriptAvailable`: Boolean (always true)
  - `language`: Detected language
  - `duration`: Call duration

---

#### **Call Analyzed Subscription**

**Description**: Subscribes to notifications when Gong completes AI analysis of a call (topics, moments, stats available).

**Entity Config** (optional):

- `workspaceId` (string, optional): Filter to specific workspace
- `userIds` (array of strings, optional): Filter to specific users

**Handler**: `onInternalMessage`

- Receives webhook from app HTTP handler
- Emits when analysis is complete

**Outputs**:

- `default` (Analysis Complete): Emits:
  - `callId`: Call identifier
  - `analysisComplete`: Boolean (always true)
  - `topicsDetected`: Number of topics detected
  - `momentsDetected`: Number of key moments detected

---

### Category: Actions

#### **Share Call**

**Description**: Shares a call with specific users or generates a shareable link.

**Input Config Fields**:

- `callId` (string, required): The call identifier
- `userIds` (array of strings, optional): User IDs to share with
- `emailAddresses` (array of strings, optional): Email addresses to share with
- `message` (string, optional): Optional message to include

**Outputs**:

- `default` (Share Success): Emits:
  - `callId`: The call identifier
  - `shareUrl`: Public share URL (if generated)
  - `sharedWith`: Array of recipients

---

#### **Add Call Comment**

**Description**: Adds a comment to a specific moment in a call.

**Input Config Fields**:

- `callId` (string, required): The call identifier
- `timestamp` (number, required): Timestamp in seconds where comment applies
- `comment` (string, required): Comment text

**Outputs**:

- `default` (Comment Added): Emits:
  - `callId`: The call identifier
  - `commentId`: The created comment identifier
  - `timestamp`: Comment timestamp

---

## 3. Implementation Notes

### Authentication

**OAuth 2.0 Flow**:

- Use authorization code grant flow
- Authorization endpoint: `https://app.gong.io/oauth2/authorize`
- Token endpoint: `https://app.gong.io/oauth2/generate-customer-token`
- Required scopes (request based on needed functionality):
  - `api:calls:read:basic` - Read basic call information
  - `api:calls:read:extensive` - Read detailed call information including transcripts
  - `api:calls:read:media` - Access call recordings
  - `api:users:read` - Read user information
  - `api:crm:read` - Read CRM context

**Making API Requests**:

- Include `Authorization: Bearer ${accessToken}` header on all API requests
- Handle 401 responses by refreshing token using `refreshToken`
- Token refresh request to token endpoint with `grant_type=refresh_token`
- Example in TypeScript:

  ```typescript
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  // If 401 response, refresh token:
  const refreshResponse = await fetch(
    "https://app.gong.io/oauth2/generate-customer-token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    },
  );
  ```

### Rate Limiting

- Gong API has rate limits (exact limits depend on plan)
- Implement exponential backoff for 429 responses
- Consider caching frequently accessed data (users, workspace info)

### Webhooks

- Gong supports webhooks for real-time events
- Webhook registration may be manual (in Gong UI) or via API
- Verify webhook authenticity using signature verification if provided
- Route incoming webhooks to subscription blocks using internal messaging

### Pagination

- Many Gong APIs use cursor-based pagination
- Store cursors and provide them in subsequent requests
- Consider implementing "fetch all pages" helper for complete datasets

### Error Handling

- Follow Flows pattern: let errors propagate, don't wrap in success/failure
- Provide clear error messages for common issues (invalid credentials, call not found, etc.)
- Use Gong's error responses to provide meaningful feedback

### Testing

- Test with real Gong API credentials in development
- Verify webhook delivery and routing
- Test pagination for large datasets
- Validate transcript and analysis data structures

## 4. Future Enhancements

### Potential Additional Blocks

- **Get Call Snippets**: Extract specific snippets/clips from calls
- **Bulk Call Export**: Export multiple calls based on criteria
- **Custom Trackers**: Create or update custom trackers
- **Call Playlists**: Manage call playlists
- **Analytics Dashboard**: Aggregate stats across multiple calls
- **Smart Alerts**: Advanced filtering and alerting based on call content

### Advanced Features

- **Bidirectional CRM Sync**: Update CRM records based on call insights
- **AI-Powered Routing**: Route calls to specific flows based on content
- **Coaching Workflows**: Automated coaching suggestions based on call analysis
- **Deal Intelligence**: Aggregate insights across all calls for a deal
