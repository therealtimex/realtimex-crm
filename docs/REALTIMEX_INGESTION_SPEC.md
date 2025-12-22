# Technical Specification: RealTimeX Distributed Ingestion System

## 1. System Overview: "Cloud Buffer / Local Processor"
This architecture addresses the challenge of running advanced AI (ASR/LLM) on local devices while maintaining a reliable, centralized Ingestion Channel.

*   **The Problem:** Local devices are ephemeral (offline/asleep), but Inbound Data (Emails/Calls) is constant.
*   **The Solution:**
    *   **Cloud Buffer (Supabase):** A lightweight "Edge" layer that receives, validates, and stores data immediately as `raw` Activities. It effectively "parks" the data.
    *   **Local Processor (The Grid):** Your distributed network of Sales Agents' devices acts as a "Compute Grid." They poll the Cloud, "steal" pending work, perform the heavy AI lifting locally, and push the results back.

### 1.1 System Boundary & Responsibilities

This specification covers the **RealTimeX CRM** component. The system uses a simplified time-based work stealing architecture:

**RealTimeX CRM Responsibilities (This Codebase):**
*   Accept webhooks from external providers (Twilio, Postmark, Gmail, etc.)
*   Validate requests via `IngestionGuard` security layer
*   Normalize provider-specific payloads into standardized schema
*   Store as `raw` activities in Supabase `activities` table
*   Auto-link activities to contacts via email/phone matching
*   Expose work claiming RPCs:
    *   `claim_next_pending_activity(sales_id)` - claim my own work
    *   `claim_stale_activity()` - claim anyone's stale work (>5 min old)
    *   `unlock_stale_locks()` - cleanup crashed processing attempts
*   Display activities in UI with realtime updates

**RealTimeX App Responsibilities (Electron Desktop App):**
*   Host multiple Local Apps (including RealTimeX CRM) as embedded iframes/webviews
*   **Run MCP/A2A-compliant processing agent** with priority-based claiming:
    1. **Priority 1:** Claim my own fresh work (any age)
    2. **Priority 2:** Claim anyone's stale work (>5 minutes old)
*   Process activities using local AI models (Whisper, Claude, etc.)
*   Update results back to `activities` table
*   Provide shared AI services (ASR, LLM) for all Local Apps

**Integration Flow (Time-Based Work Stealing):**
```typescript
// RealTimeX Agent (Electron) - Simple priority-based loop
async function processingLoop() {
  const mySalesId = await getMySalesId();

  while (true) {
    let activity = null;

    // Priority 1: My own work (fresh or stale)
    const { data: myWork } = await supabase.rpc('claim_next_pending_activity', {
      p_agent_sales_id: mySalesId
    });
    activity = myWork?.[0];

    // Priority 2: Anyone's stale work (timeout fallback)
    if (!activity) {
      const { data: staleWork } = await supabase.rpc('claim_stale_activity');
      activity = staleWork?.[0];
    }

    // Process if found
    if (activity) {
      const result = await processWithAI(activity.raw_data);

      await supabase.from('activities').update({
        processing_status: 'completed',
        processed_data: result,
        locked_by: null,
        locked_at: null
      }).eq('id', activity.id);
    }

    await sleep(5000);
  }
}
```

**Why Time-Based Instead of Coordination Table:**
- ✅ Self-healing: Stale work (>5 min) automatically becomes eligible for stealing
- ✅ Simpler: No coordination table, no heartbeat, no toggle
- ✅ Resilient: Handles offline/crashed agents gracefully
- ✅ Efficient: No unnecessary database writes

**Work Stealing Scenarios:**
1. **Both users online:** Each agent processes their own work (no stealing)
2. **User offline:** Their work sits for 5 minutes, then becomes available to any agent
3. **Agent crashes:** Locked activities get unlocked after 5 minutes via `unlock_stale_locks()`

### 1.2 Realtime Notifications (Recommended)

For production deployments, use **Supabase Realtime** instead of polling for instant processing.

#### postMessage API: `SUPABASE_CONFIG`

CRM sends its Supabase configuration to RealTimeX App on mount:

**Message Format:**
```typescript
{
  type: 'SUPABASE_CONFIG',
  payload: {
    appName: 'atomic-crm',
    url: string,            // Supabase project URL
    anonKey: string,        // Supabase anon key
    tables: ['activities'], // Tables to monitor
    filters: {
      activities: 'processing_status=eq.raw'  // Only raw activities
    }
  }
}
```

**CRM Implementation:**
```typescript
// In CRM initialization (e.g., src/components/atomic-crm/root/CRM.tsx)
useEffect(() => {
  if (window.parent !== window) {
    const config = getSupabaseConfig();

    window.parent.postMessage({
      type: 'SUPABASE_CONFIG',
      payload: {
        appName: 'atomic-crm',
        url: config.url,
        anonKey: config.anonKey,
        tables: ['activities'],
        filters: { activities: 'processing_status=eq.raw' }
      }
    }, '*');
  }
}, []);
```

**RealTimeX App Implementation:**
```typescript
window.addEventListener('message', async (event) => {
  if (event.data.type === 'SUPABASE_CONFIG') {
    const { url, anonKey, filters } = event.data.payload;
    const supabase = createClient(url, anonKey);

    // Subscribe to new activities
    supabase
      .channel('atomic-crm-activities')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activities',
        filter: filters.activities
      }, async (payload) => {
        await tryClaimAndProcess(supabase, mySalesId);
      })
      .subscribe();

    // Polling fallback every 30s
    setInterval(() => tryClaimAndProcess(supabase, mySalesId), 30000);
  }
});
```

**Performance Comparison:**

| Approach | Processing Delay | DB Queries/min | Network Usage |
|----------|------------------|----------------|---------------|
| Polling (5s) | 0-5 seconds | 12 per agent | High |
| Realtime + Fallback (30s) | ~Instant (100-500ms) | 2 per agent | Low |

**Benefits:**
- ✅ 83% fewer database queries
- ✅ Instant processing (<500ms vs 0-5s delay)
- ✅ Better scalability for multiple agents
- ✅ Polling fallback ensures resilience

## 2. Database Schema Design

### A. The `activities` Table (Unified Event Store)
Replaces `contactNotes`, `dealNotes`, and `tasks`.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `type` | `text` | `email`, `call`, `sms`, `meeting`, `note`, `task`, `whatsapp`, `other`. |
| `direction` | `text` | `inbound`, `outbound`. |
| `sales_id` | `bigint` | Nullable. References `sales(id)`. If `NULL`, it is **Global/Unassigned**. |
| `contact_id` | `bigint` | Nullable. Links to `contacts(id)`. See Section 8 for auto-matching. |
| `processing_status` | `text` | `raw`, `processing`, `completed`, `failed`. State machine for work distribution. |
| `raw_data` | `jsonb` | Stores standardized source info: `{ "source_type": "url"\|"text", "content": "...", "subject": "...", "sender": "..." }`. |
| `processed_data` | `jsonb` | Stores AI results: `{ "transcript": "...", "summary": "...", "facts": [...] }`. |
| `metadata` | `jsonb` | Provider-specific info: `{ "twilio_sid": "...", "postmark_id": "...", "from": "+1234567890" }`. |
| `locked_by` | `uuid` | Auth user UUID (`auth.users.id`) of the agent processing this row. For audit trail. |
| `locked_at` | `timestamp` | Timestamp when lock was acquired. Used to detect stale locks (crashed agents). |
| `provider_id` | `uuid` | References `ingestion_providers(id)`. Links to channel configuration. |
| `created_at` | `timestamp` | Record creation time. |

### B. The `sales` Table Configuration
Added to control the Distributed Processing logic.

| Column | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `stale_threshold_minutes` | `integer` | `15` | Mins before my tasks can be stolen by others. |
| `allow_remote_processing` | `boolean` | `true` | Privacy Flag. If `false`, strictly local-only. |

### C. The `ingestion_providers` Table
Stores secure credentials and configuration for inbound channels.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `provider_code` | `text` | `twilio`, `postmark`, `gmail`, `generic`. Provider type identifier. |
| `name` | `text` | Friendly name for UI display (e.g., "US Support Line", "Sales Email"). |
| `is_active` | `boolean` | Enable/disable channel without deleting configuration. |
| `config` | `jsonb` | Provider-specific secrets: `{ "auth_token": "...", "webhook_secret": "..." }`. |
| `sales_id` | `bigint` | References `sales(id)`. Default owner for activities from this channel. If `NULL`, creates Global/Unassigned activities. |
| `ingestion_key` | `text` | **Unique**. Secret URL parameter used in webhook URLs: `/ingest-activity?key={ingestion_key}`. Acts as authentication token. |
| `created_at` | `timestamp` | Record creation time. |

### D. The `crm_processing_nodes` Table
Tracks processing node status for the CRM application across multiple devices.

**Purpose:** In a multi-app platform (RealTimeX), each Local App reports its own processing capacity. This table tracks which CRM instances are online and ready to process activities.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `sales_id` | `bigint` | References `sales(id)`. The user running this processing node. |
| `app_name` | `text` | Always `'atomic-crm'`. Distinguishes from other Local Apps in RealTimeX. |
| `device_name` | `text` | Device identifier (e.g., "MacBook Pro", "Windows Desktop"). From `navigator.platform`. |
| `status` | `text` | `ready`, `processing`, `offline`. Current node state. |
| `current_activity_id` | `uuid` | References `activities(id)`. The activity currently being processed (if any). |
| `processed_count` | `integer` | Total activities processed by this node (session counter). |
| `last_heartbeat` | `timestamp` | Last status update. Nodes without heartbeat for >2 minutes are considered offline. |
| `created_at` | `timestamp` | When this node first came online. |

**Unique Constraint:** `(sales_id, app_name, device_name)` - One node per user per device.

**Heartbeat Frequency:** Nodes update every 10 seconds while enabled.

## 3. Ingestion Security (`IngestionGuard`)
A centralized logic layer within the `ingest-activity` Edge Function that validates requests before database insertion.

### 3.1 Validation Strategies

**Authentication Flow:**
1.  Extract `ingestion_key` from URL query parameter: `?key={ingestion_key}`
2.  Lookup provider configuration from `ingestion_providers` table
3.  Apply provider-specific signature validation
4.  Reject invalid requests with HTTP 401

**Provider-Specific Validation:**

**1. Twilio (Voice/SMS)**
*   **Primary:** Validates `X-Twilio-Signature` header using HMAC-SHA1
*   **Algorithm:**
    1.  Concatenate webhook URL (full path + query params) with sorted POST parameters
    2.  Compute HMAC-SHA1 using stored `auth_token` from `config.auth_token`
    3.  Compare with `X-Twilio-Signature` header (constant-time comparison)
*   **Reference:** [Twilio Security Documentation](https://www.twilio.com/docs/usage/security#validating-requests)
*   **Status:** ⚠️ **REQUIRED BEFORE PRODUCTION** - Currently stubbed in implementation

**2. Postmark (Email)**
*   **Primary:** Validates source IP against Postmark's published IP ranges
*   **Fallback:** Trusts random `ingestion_key` as shared secret
*   **Status:** ✅ Implemented (IP validation in existing `postmark` function)

**3. Gmail (via Polling)**
*   **Authentication:** OAuth 2.0 tokens stored in `config.oauth_token`
*   **Validation:** Token refresh handled by polling Edge Function
*   **Status:** 🔮 Future implementation (Section 7)

**4. Generic/Internal**
*   **Option A:** Bearer token authentication (`Authorization: Bearer ak_live_...`)
*   **Option B:** HMAC signature in custom header (`X-Webhook-Signature`)
*   **Use Case:** Manual ingestion, internal tools, custom integrations

### 3.2 Security Best Practices

*   **Constant-time comparison** for all signature validation to prevent timing attacks
*   **Rate limiting** on ingestion endpoint (recommended: 100 requests/minute per channel)
*   **Ingestion keys** must be cryptographically random (min 32 bytes entropy)
*   **Config secrets** should be encrypted at rest in Supabase (using Vault or pgcrypto)
*   **Webhook URLs** should never be logged in plaintext (sanitize `ingestion_key` in logs)

## 4. Distributed Processing Logic ("Work Stealing")
Implemented via the `claim_next_pending_activity` RPC function.

**The Algorithm (Work Stealing):**
When an Agent (ID: `A`) asks for work, the DB runs this query:
1.  **Priority 1 (My Work):** Is there any `raw` task where `sales_id = A`? -> **Claim it.**
2.  **Priority 2 (Global Work):** Is there any `raw` task where `sales_id IS NULL`? -> **Claim it.**
3.  **Priority 3 (Stale Work):** Is there any task where:
    *   `sales_id != A` (Belongs to someone else)
    *   `allow_remote_processing = true` (They opted in)
    *   `created_at < NOW() - stale_threshold` (It's been waiting too long) -> **Claim it.**

**Mechanism:** `FOR UPDATE SKIP LOCKED` ensures zero race conditions.

## 5. UI/UX Specifications

### A. Channel Management Dashboard
*   **Location:** `Settings > Integrations > Ingestion Channels`
*   **Component:** `IngestionChannelsTab.tsx`
*   **Layout:** Responsive card grid (2 columns on desktop)
*   **Features:**
    *   **Add Channel:** Dialog form with provider selection (Twilio, Postmark, Gmail, Generic)
    *   **Channel Cards:** Display provider type, status badge (Active/Inactive), creation date
    *   **Webhook URL Display:** Auto-generated URL with copy-to-clipboard button
        *   Format: `{SUPABASE_URL}/functions/v1/ingest-activity?key={ingestion_key}`
        *   Must read `SUPABASE_URL` from localStorage config or environment variables
        *   Security: URL includes secret `ingestion_key` - show warning about keeping it private
    *   **Actions:** Delete channel (with confirmation dialog), toggle active status
    *   **Empty State:** Helpful message with "Add your first channel" CTA when no channels exist

### B. Activity Feed (Real-time)
*   **Component:** `ActivityFeed.tsx`
*   **Display Modes:**
    *   **Contact View:** Shows activities filtered by `contact_id` (embedded in Contact detail page)
    *   **Agent View:** Shows activities filtered by `sales_id` (personal activity dashboard)
    *   **Global View:** Shows all activities (team activity feed)
*   **Layout:** Vertical timeline with card-based activity items
*   **Activity Card States:**
    *   **Raw/Processing:**
        *   Blue border and background tint
        *   Animated progress bar at top
        *   Bouncing dots with "Processing content..." message
        *   Shows estimated wait time if available
    *   **Completed:**
        *   Default card styling with success icon
        *   Displays processed content (transcript, summary, facts)
        *   Audio player for call recordings (if applicable)
        *   Summary section with highlighted key information
    *   **Failed:**
        *   Red error icon
        *   Error message with retry action
*   **Realtime Updates:**
    *   Subscribes to Supabase `postgres_changes` on `activities` table
    *   Automatically refetches and updates UI when processing completes
    *   Smooth transition animations between states
*   **Activity Types:** Email (📧), Call (📞), SMS (💬), Meeting (📅), Note (📝), Task (✅)

### C. Processing Status Display
**Note:** The local processing agent runs in the **RealTimeX App** (parent platform), not the CRM itself.

*   **CRM Responsibility:** Display processing status in activity cards (as described in Section 5.B)
*   **RealTimeX App Responsibility:** Show processing node indicator in host app UI
    *   Status indicators: "⚪ Idle", "🔵 Processing X tasks", "⚫ Offline"
    *   Controls: Enable/disable local processing, adjust concurrency limits
    *   Queue visibility: Number of pending tasks available to claim

## 6. API Specifications

### 6.1 Webhook Ingestion Endpoint

**Endpoint:** `POST /functions/v1/ingest-activity`

**Query Parameters:**
*   `key` (required): The `ingestion_key` from `ingestion_providers` table
*   `provider` (optional, legacy): Provider type hint (superseded by key-based lookup)

**Request Headers:**
*   `Content-Type`: `application/json`, `application/x-www-form-urlencoded`, or `multipart/form-data`
*   Provider-specific headers:
    *   Twilio: `X-Twilio-Signature` (HMAC-SHA1 signature)
    *   Postmark: `X-Forwarded-For` (for IP validation)
    *   Generic: `Authorization: Bearer {api_key}` or `X-Webhook-Signature`

**Request Body:** Provider-specific payload (see normalization logic in Section 6.3)

**Response:**
*   **202 Accepted:** Activity successfully queued for processing
    ```json
    { "success": true, "id": "uuid-of-activity" }
    ```
*   **401 Unauthorized:** Invalid signature or authentication failure
*   **400 Bad Request:** Missing required parameters or invalid payload
*   **500 Internal Server Error:** Database insertion failed

### 6.2 Work Distribution RPC

**Function:** `claim_next_pending_activity(p_agent_sales_id bigint)`

**Purpose:** Atomic work-stealing function for RealTimeX App processing agents

**Input Parameters:**
*   `p_agent_sales_id`: The `sales.id` (BIGINT) of the requesting agent

**Return Type:** Table with columns:
*   `id` (uuid): Activity ID
*   `raw_data` (jsonb): Content to process
*   `type` (text): Activity type (email, call, sms, etc.)
*   `is_global` (boolean): Whether this was a global/unassigned task

**Side Effects:**
*   Sets `processing_status = 'processing'`
*   Sets `locked_by` to the agent's `auth.users.id` (UUID)
*   Sets `locked_at` to current timestamp

**Concurrency:** Uses `FOR UPDATE SKIP LOCKED` to prevent race conditions

**Example Usage:**
```typescript
const { data: activity } = await supabase.rpc('claim_next_pending_activity', {
  p_agent_sales_id: currentUser.salesId
});

if (activity) {
  // Process activity.raw_data
  // Then update with results (see Section 1.1)
}
```

### 6.3 Payload Normalization

The `normalizeActivity()` function in `ingest-activity/index.ts` transforms provider-specific payloads into the standard schema:

**Twilio Voice:**
```json
Input: { "RecordingUrl": "https://...", "CallSid": "CA123", "From": "+1234567890" }
Output: {
  "type": "call",
  "raw_data": { "source_type": "url", "content": "https://...", "format": "audio/wav" },
  "metadata": { "call_sid": "CA123", "from": "+1234567890", "duration": "120" }
}
```

**Twilio SMS:**
```json
Input: { "Body": "Hello", "MessageSid": "SM123", "From": "+1234567890" }
Output: {
  "type": "sms",
  "raw_data": { "source_type": "text", "content": "Hello" },
  "metadata": { "message_sid": "SM123", "from": "+1234567890" }
}
```

**Postmark Email:**
```json
Input: { "Subject": "Re: Deal", "TextBody": "Let's talk...", "From": "john@example.com" }
Output: {
  "type": "email",
  "raw_data": { "source_type": "text", "content": "Let's talk...", "subject": "Re: Deal", "sender": "john@example.com" },
  "metadata": { "message_id": "msg-123", "to": "sales@company.com" }
}
```

## 7. Future Capability: Polling (Gmail)

**Status:** 🔮 Planned for future release

### 7.1 Architecture

**Mechanism:** Periodic polling using `pg_cron` extension
*   **Trigger:** `pg_cron` job executes every 5 minutes
*   **Edge Function:** `fetch-gmail-updates` runs serverless function
*   **OAuth Storage:** Refresh tokens stored in `ingestion_providers.config.oauth_token`

### 7.2 Implementation Flow

1.  **Initial Setup:**
    *   User authorizes Gmail access via OAuth 2.0 flow
    *   Store refresh token in `ingestion_providers` table (encrypted)
    *   Create `pg_cron` job: `SELECT cron.schedule('gmail-poll', '*/5 * * * *', 'SELECT fetch_gmail_updates()')`

2.  **Polling Logic:**
    *   Edge function fetches new emails using Gmail API
    *   Filters by labels/query (e.g., `in:inbox is:unread`)
    *   Extracts sender email from `From:` header
    *   Attempts contact matching (Section 8)
    *   Inserts as `type='email', processing_status='raw'`

3.  **Token Refresh:**
    *   Automatically refresh OAuth token when expired
    *   Update stored token in database
    *   Handle authorization revocation gracefully (notify admin)

### 7.3 Security Considerations

*   OAuth tokens must be encrypted at rest using Supabase Vault or `pgcrypto`
*   Use minimal Gmail API scopes (read-only for inbox)
*   Rate limiting: Respect Gmail API quotas (250 quota units per user per second)
*   Deduplication: Check `metadata.message_id` to prevent duplicate ingestion

## 8. Contact Matching Algorithm

**Problem:** When an activity arrives (email from `john@example.com`, call from `+1234567890`), how do we link it to the correct contact?

### 8.1 Matching Logic

**Priority Order:**

1.  **Exact Email Match:**
    ```sql
    SELECT id FROM contacts
    WHERE email = metadata->>'from'
    LIMIT 1
    ```

2.  **Exact Phone Match (E.164 normalized):**
    ```sql
    SELECT id FROM contacts
    WHERE phone_number = normalize_phone(metadata->>'from')
    LIMIT 1
    ```

3.  **Fuzzy Phone Match (last 10 digits):**
    *   Strip country codes and formatting
    *   Match on last 10 digits only (for US numbers)

4.  **No Match → Orphan Activity:**
    *   Leave `contact_id = NULL`
    *   Display in "Unmatched Activities" view
    *   Provide manual "Link to Contact" action

### 8.2 Implementation Options

**Option A: Trigger-Based (Automatic)**
```sql
CREATE OR REPLACE FUNCTION auto_link_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- Try email match
  IF NEW.metadata->>'from' IS NOT NULL THEN
    SELECT id INTO NEW.contact_id
    FROM contacts
    WHERE email = NEW.metadata->>'from'
    LIMIT 1;
  END IF;

  -- Try phone match if email failed
  IF NEW.contact_id IS NULL AND NEW.metadata->>'from' LIKE '+%' THEN
    SELECT id INTO NEW.contact_id
    FROM contacts
    WHERE phone_number = NEW.metadata->>'from'
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_activity_link_contact
BEFORE INSERT ON activities
FOR EACH ROW EXECUTE FUNCTION auto_link_contact();
```

**Option B: Post-Processing (Manual Review)**
*   Activities inserted with `contact_id = NULL`
*   Background job or UI action prompts agent to link
*   Allows for verification before linking

### 8.3 Auto-Create Contacts (Optional)

**Configuration:** Add `auto_create_contacts` boolean to `ingestion_providers` table

**Logic:** If enabled and no match found, automatically create new contact:
```typescript
const newContact = {
  email: metadata.from,
  first_name: extractFirstName(metadata.from), // "john@example.com" → "john"
  last_name: "",
  sales_id: activity.sales_id || null, // Assign to channel owner
  tags: ["auto-created", "unqualified"]
};
```

**Risk:** May create duplicate contacts if matching fails. Recommend manual review for production.

## 9. Error Handling & Recovery

### 9.1 Stale Lock Recovery

**Problem:** Agent crashes mid-processing, leaving activity stuck in `processing` state.

**Solution:** Automatic timeout-based reset

```sql
CREATE OR REPLACE FUNCTION reset_stale_locks()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  UPDATE activities
  SET
    processing_status = 'raw',
    locked_by = NULL,
    locked_at = NULL,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{recovery_count}',
      to_jsonb(COALESCE((metadata->>'recovery_count')::int, 0) + 1)
    )
  WHERE
    processing_status = 'processing'
    AND locked_at < NOW() - INTERVAL '30 minutes';

  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron
SELECT cron.schedule(
  'reset-stale-locks',
  '*/10 * * * *',  -- Every 10 minutes
  'SELECT reset_stale_locks()'
);
```

**Monitoring:** Track `metadata.recovery_count` - if > 3, mark as `failed` and alert admin.

### 9.2 Failed Processing Retry

**Manual Retry:**
*   UI action in Activity Feed: "Retry Processing"
*   Resets `processing_status = 'raw'`, clears lock
*   Agent picks it up in next polling cycle

**Automatic Retry (Optional):**
```sql
-- Retry failed activities after 1 hour (max 3 attempts)
UPDATE activities
SET processing_status = 'raw', locked_by = NULL, locked_at = NULL
WHERE
  processing_status = 'failed'
  AND COALESCE((metadata->>'retry_count')::int, 0) < 3
  AND created_at > NOW() - INTERVAL '24 hours'
  AND locked_at < NOW() - INTERVAL '1 hour';
```

### 9.3 Error Logging

**Structured Error Storage:**
```json
{
  "processing_status": "failed",
  "metadata": {
    "error": {
      "timestamp": "2025-01-15T10:30:00Z",
      "type": "TranscriptionError",
      "message": "Audio file format not supported",
      "agent_id": "uuid-of-agent",
      "retry_count": 2
    }
  }
}
```

**Error Categories:**
*   `TranscriptionError`: ASR failed (corrupt audio, unsupported format)
*   `DownloadError`: Failed to fetch recording from Twilio URL (expired link)
*   `LLMError`: Summarization API timeout or rate limit
*   `ValidationError`: Malformed `raw_data` structure

### 9.4 Dead Letter Queue

**Permanent Failures:** After max retries, move to separate table for investigation
```sql
CREATE TABLE activity_failures (
  id uuid PRIMARY KEY,
  original_activity_id uuid REFERENCES activities(id),
  failure_reason text,
  raw_data jsonb,
  created_at timestamp DEFAULT NOW()
);
```

## 10. Production Checklist

Before deploying to production, ensure:

### 10.1 Security
- [ ] Implement Twilio signature validation (replace stub in `ingestionGuard.ts`)
- [ ] Enable rate limiting on ingestion endpoint (100 req/min per channel)
- [ ] Encrypt `ingestion_providers.config` secrets using Supabase Vault
- [ ] Rotate all `ingestion_key` values to cryptographically random strings
- [ ] Set up webhook URL monitoring (alert on 4xx/5xx responses)

### 10.2 Database
- [ ] Add indexes on `activities(contact_id)`, `activities(sales_id)`, `activities(created_at)`
- [ ] Set up `pg_cron` for stale lock recovery
- [ ] Configure RLS policies based on team structure (Section 2.D recommended additions)
- [x] Enable Supabase Realtime for `activities` table
- [ ] Set up database backups and point-in-time recovery

### 10.3 Monitoring
- [ ] Track `claim_next_pending_activity()` call frequency per agent
- [ ] Alert on activities stuck in `processing` > 1 hour
- [ ] Monitor ingestion endpoint error rates
- [ ] Track contact matching success rate (orphan activity percentage)
- [ ] Set up Sentry/logging for Edge Function errors

### 10.4 UI/UX
- [ ] Fix missing `Label` import in `IngestionChannelsTab.tsx`
- [ ] Update webhook URL generation to use config-based `SUPABASE_URL`
- [ ] Add "Retry Processing" action for failed activities
- [ ] Implement "Link to Contact" UI for orphan activities
- [ ] Add processing time estimates to activity cards

### 10.5 Testing
- [ ] End-to-end test: Twilio webhook → ingestion → processing → UI update
- [ ] Test work-stealing under concurrent load (multiple agents)
- [ ] Validate stale lock recovery with simulated crash
- [ ] Test contact matching with various email/phone formats
- [ ] Verify Realtime updates propagate correctly to all connected clients
