# Time-Based Work Stealing Architecture

## Overview

This document explains the simplified work distribution architecture for processing activities in RealTimeX CRM, designed for integration with the RealTimeX App (Electron desktop app with MCP/A2A agent).

## Key Principle

**Use activity age as the coordination signal** - no status reporting, no heartbeat, just time-based prioritization.

### Why Time-Based Instead of Coordination Table?

**Problems with coordination tables:**
- ❌ Users enable toggle but go offline → work sits unprocessed forever
- ❌ Browser crashes → stale records remain
- ❌ Requires heartbeat overhead (database writes every 10s)
- ❌ Additional table to maintain and debug

**Benefits of time-based approach:**
- ✅ Self-healing: Stale work automatically becomes eligible for stealing
- ✅ Simpler: No coordination table, no heartbeat, no toggle
- ✅ Resilient: Handles offline/crashed agents gracefully
- ✅ Efficient: No unnecessary database writes

## Architecture

### Separation of Concerns

| Component | Responsibility |
|-----------|---------------|
| **Webhook Endpoint** | Accept inbound data, validate, store as `raw` activities |
| **RealTimeX Agent (Electron)** | Claim work, process with AI, update results |
| **Supabase (Cloud Buffer)** | Store queue, enable work stealing via `FOR UPDATE SKIP LOCKED` |

### Data Flow

```
┌─────────────────────────────────────────────┐
│ External Provider (Twilio, Postmark, etc)   │
│ Sends webhook to Supabase Edge Function     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ Supabase Edge Function: ingest-activity     │
│ • Validates signature                       │
│ • Normalizes payload                        │
│ • Auto-links to contact (email/phone match) │
│ • Stores as processing_status='raw'         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ activities table (work queue)               │
│ • processing_status='raw'                   │
│ • locked_by=NULL                            │
│ • created_at timestamp                      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ RealTimeX Agent (Electron) - Polling Loop   │
│                                             │
│ Priority 1: My fresh work                   │
│   claim_next_pending_activity(my_sales_id) │
│   → Returns activities <5 min old          │
│                                             │
│ Priority 2: Anyone's stale work             │
│   claim_stale_activity()                   │
│   → Returns activities >5 min old          │
│                                             │
│ Process with AI:                            │
│   • ASR (Whisper) for audio                 │
│   • LLM for summarization & facts           │
│                                             │
│ Update results:                             │
│   • processing_status='completed'          │
│   • processed_data={transcript, facts}     │
└─────────────────────────────────────────────┘
```

## Work Stealing Algorithm

### Priority-Based Claiming

```typescript
async function processingLoop() {
  while (true) {
    let activity = null;

    // Priority 1: My own work (any age)
    activity = await claimMyWork(myUserId);

    // Priority 2: Stale work from anyone (>5 minutes old)
    if (!activity) {
      activity = await claimStaleWork();
    }

    // Process if found
    if (activity) {
      await processActivity(activity);
    }

    // Wait before next iteration
    await sleep(5000);
  }
}
```

### Database Functions

**1. Claim My Work (Fresh):**
```sql
CREATE OR REPLACE FUNCTION claim_next_pending_activity(p_agent_sales_id bigint)
RETURNS TABLE(...) AS $$
BEGIN
  RETURN QUERY
  UPDATE activities
  SET
    locked_by = 'agent',
    locked_at = NOW(),
    processing_status = 'processing'
  WHERE id = (
    SELECT id FROM activities
    WHERE processing_status = 'raw'
      AND sales_id = p_agent_sales_id  -- Only my activities
      AND locked_by IS NULL
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;
```

**2. Claim Stale Work (Timeout Fallback):**
```sql
CREATE OR REPLACE FUNCTION claim_stale_activity()
RETURNS TABLE(...) AS $$
BEGIN
  RETURN QUERY
  UPDATE activities
  SET
    locked_by = 'agent',
    locked_at = NOW(),
    processing_status = 'processing'
  WHERE id = (
    SELECT id FROM activities
    WHERE processing_status = 'raw'
      AND created_at < NOW() - INTERVAL '5 minutes'  -- Stale threshold
      AND locked_by IS NULL
    ORDER BY created_at ASC  -- Oldest first
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;
```

**3. Unlock Stale Locks (Cleanup):**
```sql
CREATE OR REPLACE FUNCTION unlock_stale_locks()
RETURNS INTEGER AS $$
DECLARE
  unlocked_count INTEGER;
BEGIN
  UPDATE activities
  SET
    locked_by = NULL,
    locked_at = NULL,
    processing_status = 'raw'
  WHERE
    processing_status = 'processing'
    AND locked_at < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS unlocked_count = ROW_COUNT;
  RETURN unlocked_count;
END;
$$ LANGUAGE plpgsql;
```

## RealTimeX Agent Implementation

### Complete Agent Example (TypeScript)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get current user's sales_id
async function getMySalesId(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from('sales')
    .select('id')
    .eq('user_id', user.id)
    .single();
  return data.id;
}

// Claim work from my queue
async function claimMyWork(salesId: number) {
  const { data } = await supabase.rpc('claim_next_pending_activity', {
    p_agent_sales_id: salesId
  });
  return data && data.length > 0 ? data[0] : null;
}

// Claim stale work from anyone
async function claimStaleWork() {
  const { data } = await supabase.rpc('claim_stale_activity');
  return data && data.length > 0 ? data[0] : null;
}

// Process activity with local AI
async function processActivity(activity: Activity) {
  let result: any = {};

  try {
    // Step 1: ASR (if audio)
    if (activity.raw_data.source_type === 'url') {
      const audioBuffer = await fetchAudio(activity.raw_data.content);
      result.transcript = await whisper.transcribe(audioBuffer);
    } else {
      result.transcript = activity.raw_data.content;
    }

    // Step 2: LLM Summarization
    result.summary = await llm.summarize(result.transcript);

    // Step 3: Fact Extraction
    result.facts = await llm.extractFacts(result.transcript);

    // Update as completed
    await supabase
      .from('activities')
      .update({
        processing_status: 'completed',
        processed_data: result,
        locked_by: null,
        locked_at: null
      })
      .eq('id', activity.id);

    console.log(`✓ Processed activity ${activity.id}`);
  } catch (error) {
    // Mark as failed
    await supabase
      .from('activities')
      .update({
        processing_status: 'failed',
        locked_by: null,
        locked_at: null
      })
      .eq('id', activity.id);

    console.error(`✗ Failed to process activity ${activity.id}:`, error);
  }
}

// Main processing loop
async function startAgent() {
  const mySalesId = await getMySalesId();
  console.log(`Agent started for sales_id: ${mySalesId}`);

  while (true) {
    // Priority 1: My work
    let activity = await claimMyWork(mySalesId);

    // Priority 2: Stale work
    if (!activity) {
      activity = await claimStaleWork();
    }

    // Process if found
    if (activity) {
      await processActivity(activity);
    } else {
      // No work available, wait a bit
      await sleep(5000);
    }
  }
}

// Start the agent
startAgent();
```

## Realtime Notifications (Event-Driven Processing)

Instead of polling every 5 seconds, the RealTimeX App can use **Supabase Realtime** for instant push notifications when new activities arrive.

### Architecture: CRM Provides Config via postMessage

The CRM sends its Supabase configuration to the parent Electron app, which then subscribes directly to Realtime channels.

### CRM Side: Share Supabase Config

Add this to CRM initialization (e.g., `src/components/atomic-crm/root/CRM.tsx`):

```typescript
import { useEffect } from 'react';
import { getSupabaseConfig } from "@/lib/supabase-config";

export const CRM = (props) => {
  // ... existing code ...

  // Send Supabase config to parent on mount
  useEffect(() => {
    if (window.parent !== window) {
      const config = getSupabaseConfig();

      if (config) {
        window.parent.postMessage({
          type: 'SUPABASE_CONFIG',
          payload: {
            appName: 'atomic-crm',
            url: config.url,
            anonKey: config.anonKey,
            tables: ['activities'],
            filters: {
              activities: 'processing_status=eq.raw'
            }
          }
        }, '*');
      }
    }
  }, []);

  // ... rest of component ...
};
```

### RealTimeX App: Subscribe to Realtime Channels

```typescript
import { createClient } from '@supabase/supabase-js';

const appConfigs = new Map();
let processing = false;

// Listen for Supabase config from Local Apps
window.addEventListener('message', async (event) => {
  if (event.data.type === 'SUPABASE_CONFIG') {
    const { appName, url, anonKey, filters } = event.data.payload;

    // Store config
    appConfigs.set(appName, { url, anonKey });

    // Initialize Supabase client
    const supabase = createClient(url, anonKey);

    // Get current user's sales_id
    const mySalesId = await getMySalesId(supabase);

    console.log(`[${appName}] Subscribed to Realtime for sales_id: ${mySalesId}`);

    // Subscribe to new activities (instant processing)
    supabase
      .channel(`${appName}-new-activities`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activities',
        filter: filters.activities
      }, async (payload) => {
        console.log(`[${appName}] New activity detected:`, payload.new.id);

        if (!processing) {
          processing = true;
          await tryClaimAndProcess(supabase, mySalesId);
          processing = false;
        }
      })
      .subscribe();

    // Polling fallback (every 30s to catch missed events)
    setInterval(async () => {
      if (!processing) {
        processing = true;
        await tryClaimAndProcess(supabase, mySalesId);
        processing = false;
      }
    }, 30000);
  }
});

async function getMySalesId(supabase): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from('sales')
    .select('id')
    .eq('user_id', user.id)
    .single();
  return data.id;
}

async function tryClaimAndProcess(supabase, mySalesId: number) {
  // Priority 1: My work
  let activity = await claimMyWork(supabase, mySalesId);

  // Priority 2: Stale work
  if (!activity) {
    activity = await claimStaleWork(supabase);
  }

  if (activity) {
    await processActivity(activity);
  }
}

async function claimMyWork(supabase, salesId: number) {
  const { data } = await supabase.rpc('claim_next_pending_activity', {
    p_agent_sales_id: salesId
  });
  return data?.[0] || null;
}

async function claimStaleWork(supabase) {
  const { data } = await supabase.rpc('claim_stale_activity');
  return data?.[0] || null;
}
```

### Benefits of Realtime Approach

**Compared to polling every 5 seconds:**

| Metric | Polling (5s) | Realtime + Fallback (30s) |
|--------|--------------|---------------------------|
| **Processing delay** | 0-5 seconds | ~Instant (100-500ms) |
| **Database queries/min** | 12 per agent | 2 per agent |
| **Network overhead** | High | Low |
| **Scalability** | Limited | Excellent |

**Additional benefits:**
- ✅ Instant processing (no polling delay)
- ✅ 83% fewer database queries
- ✅ Lower network usage
- ✅ Polling fallback ensures resilience
- ✅ Multi-app ready (each app sends its own config)

### postMessage API Specification

**Message: `SUPABASE_CONFIG`**

Sent from CRM (iframe) to RealTimeX App (parent) on mount.

```typescript
{
  type: 'SUPABASE_CONFIG',
  payload: {
    appName: string,        // 'atomic-crm'
    url: string,            // Supabase project URL
    anonKey: string,        // Supabase anon key
    tables: string[],       // Tables to monitor
    filters: {              // Optional filters per table
      [tableName: string]: string  // Supabase filter syntax
    }
  }
}
```

**Example:**
```typescript
{
  type: 'SUPABASE_CONFIG',
  payload: {
    appName: 'atomic-crm',
    url: 'https://xxxxx.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    tables: ['activities'],
    filters: {
      activities: 'processing_status=eq.raw'
    }
  }
}
```

## Multi-User Scenarios

### Scenario 1: User A Online, User B Offline

```
T=0:  User A receives inbound call → activity created
T=1s: User A's agent claims & processes → completed ✓

T=60s: User B receives inbound call → activity created
T=65s: User A's agent tries to claim → finds nothing (User B's work is fresh)
...
T=5m: User B's activity becomes stale (>5 min old)
T=5m+1s: User A's agent claims stale work → processes User B's activity ✓
```

### Scenario 2: Both Users Online

```
T=0: User A receives call → activity created
T=1s: User A's agent claims & processes ✓

T=10s: User B receives call → activity created
T=11s: User B's agent claims & processes ✓

Result: Each agent prioritizes their own work, no stealing needed
```

### Scenario 3: Agent Crashes Mid-Processing

```
T=0: User A's agent claims activity → locked_by='agent', processing_status='processing'
T=30s: Agent crashes (power outage)
...
T=5m: unlock_stale_locks() runs → unlocks the activity
T=5m+1s: Another agent claims and completes the work ✓
```

## Maintenance

### Periodic Cleanup (Optional)

Run `unlock_stale_locks()` periodically to handle crashed agents:

**Option A: Application-level (in agent code):**
```typescript
setInterval(async () => {
  const { data } = await supabase.rpc('unlock_stale_locks');
  if (data > 0) {
    console.log(`Unlocked ${data} stale activities`);
  }
}, 60000); // Every minute
```

**Option B: Database-level (pg_cron extension):**
```sql
SELECT cron.schedule(
  'unlock-stale-activities',
  '* * * * *',  -- Every minute
  'SELECT unlock_stale_locks()'
);
```

## Summary

✅ **No coordination table** - simpler architecture
✅ **No heartbeat** - fewer database writes
✅ **Time-based prioritization** - self-healing
✅ **Work stealing with fallback** - resilient to offline agents
✅ **Handles edge cases** - crashed agents, stale locks

This architecture achieves distributed processing without coordination overhead by using activity age as the natural coordination signal.
