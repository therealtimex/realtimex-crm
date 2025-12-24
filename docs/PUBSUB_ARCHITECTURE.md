# Pub/Sub Architecture in Supabase Realtime

## What is Pub/Sub?

**Publish-Subscribe (Pub/Sub)** is a messaging pattern where:
- **Publishers** emit events without knowing who will receive them
- **Subscribers** listen for events they care about
- **Broker** (Supabase) routes messages between them

```
Publisher → Broker → Subscriber(s)
             ↓
         (filtering, routing, security)
```

## How Supabase Realtime Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Application                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Client A │  │ Client B │  │ Client C │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│       │             │             │                          │
│       └─────────────┴─────────────┘                          │
│                     │                                        │
│              WebSocket Connection                            │
└─────────────────────┼────────────────────────────────────────┘
                      │
              ┌───────▼────────┐
              │  Supabase      │
              │  Realtime      │
              │  Server        │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │  PostgreSQL    │
              │  Logical       │
              │  Replication   │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │  Database      │
              │  Tables        │
              │  (activities,  │
              │   deals, etc.) │
              └────────────────┘
```

### The Flow (Step by Step)

#### 1. Subscribe (Client Sets Up Listener)

```typescript
const subscription = supabase
  .channel('deals-pipeline')  // Create/join a channel
  .on('postgres_changes', {   // Subscribe to database changes
    event: 'UPDATE',           // What type: INSERT, UPDATE, DELETE, *
    schema: 'public',          // Which schema
    table: 'deals',            // Which table
    filter: 'stage=eq.negotiation'  // Optional: only specific rows
  }, (payload) => {
    console.log('Deal updated:', payload);
  })
  .subscribe();
```

**What happens:**
- Client opens WebSocket connection to Supabase
- Supabase registers this subscription
- Client receives a subscription ID

#### 2. Publish (Database Change Occurs)

```sql
-- Someone updates a deal
UPDATE deals
SET stage = 'negotiation', value = 50000
WHERE id = '123e4567-e89b-12d3-a456-426614174000';
```

**What happens:**
- PostgreSQL's WAL (Write-Ahead Log) records the change
- Logical replication captures the change
- Supabase Realtime receives the change notification

#### 3. Route & Filter (Supabase Processes)

```
PostgreSQL → Realtime Server
              ↓
         1. Check RLS: Can this user see this row?
              ↓
         2. Apply filters: Does it match subscription?
              ↓
         3. Format payload
              ↓
         4. Send to matching subscribers
```

**Critical: RLS is enforced!**
```sql
-- If user has this RLS policy:
CREATE POLICY "Users see own deals" ON deals
FOR SELECT USING (sales_id = current_user_id());

-- They ONLY receive updates for deals where sales_id matches
-- Even if they subscribe to the entire table!
```

#### 4. Receive (Client Gets Notification)

```typescript
// Client receives this payload:
{
  schema: 'public',
  table: 'deals',
  commit_timestamp: '2025-12-22T20:30:45.123Z',
  eventType: 'UPDATE',
  new: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    stage: 'negotiation',
    value: 50000,
    updated_at: '2025-12-22T20:30:45.123Z'
  },
  old: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    stage: 'proposal',
    value: 45000,
    updated_at: '2025-12-22T20:25:12.456Z'
  }
}
```

## PostgreSQL Logical Replication

### How It Works Under the Hood

**PostgreSQL Logical Replication** is the magic behind Supabase Realtime:

1. **Publications** - Define what changes to track
   ```sql
   CREATE PUBLICATION supabase_realtime FOR TABLE deals, contacts, activities;
   ```

2. **Replication Slot** - Captures changes from WAL
   ```
   WAL → Replication Slot → Logical Decoding → Change Stream
   ```

3. **Supabase Realtime** subscribes to this stream
   ```
   PostgreSQL → Realtime Server → WebSocket → Clients
   ```

### What Gets Published

```
Every database change:
- INSERT → {new: {...}}
- UPDATE → {old: {...}, new: {...}}
- DELETE → {old: {...}}
```

## Channel Types in Supabase

### 1. Database Changes (postgres_changes)

**What we've been using:**
```typescript
supabase.channel('my-channel')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'deals'
  }, callback)
```

### 2. Broadcast (App-Level Messages)

**Send custom messages between clients:**
```typescript
// Client A sends
channel.send({
  type: 'broadcast',
  event: 'cursor-move',
  payload: { x: 100, y: 200 }
});

// Client B receives
channel.on('broadcast', { event: 'cursor-move' }, (payload) => {
  console.log('Cursor at:', payload);
});
```

**Use cases:**
- Cursor positions in collaborative editing
- Typing indicators
- Ephemeral UI state

### 3. Presence (Who's Online)

**Track connected users:**
```typescript
// Join with user info
channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    await channel.track({
      user_id: currentUser.id,
      name: currentUser.name,
      online_at: new Date().toISOString()
    });
  }
});

// Listen for presence changes
channel.on('presence', { event: 'sync' }, () => {
  const users = channel.presenceState();
  console.log('Online users:', users);
});
```

**Use cases:**
- "Who's viewing this deal?"
- Online/offline indicators
- Active collaborators list

## Real-World CRM Examples

### Example 1: Live Deal Pipeline

```typescript
// Subscribe to deal stage changes
const pipelineChannel = supabase
  .channel('pipeline-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'deals',
    filter: 'stage=neq.won'  // Exclude closed deals
  }, (payload) => {
    const { old: oldDeal, new: newDeal } = payload;

    if (oldDeal.stage !== newDeal.stage) {
      // Deal moved in pipeline!
      moveDealCard(newDeal.id, oldDeal.stage, newDeal.stage);
      showNotification(`Deal moved to ${newDeal.stage}`);
    }

    if (oldDeal.value !== newDeal.value) {
      // Deal value changed!
      updatePipelineTotal(newDeal.stage, newDeal.value - oldDeal.value);
    }
  })
  .subscribe();
```

### Example 2: Activity Feed (Real-Time Ingestion)

```typescript
// Subscribe to new activities
const activityFeed = supabase
  .channel('activity-stream')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'activities'
    // No filter = get all (RLS enforces access)
  }, (payload) => {
    const activity = payload.new;

    // Show notification
    if (activity.type === 'email') {
      showToast(`New email from ${activity.metadata.from}`);
    }

    // Add to feed
    prependToActivityFeed(activity);

    // Play sound if high priority
    if (activity.metadata.priority === 'high') {
      playNotificationSound();
    }
  })
  .subscribe();
```

### Example 3: Collaborative Note Editing

```typescript
// Combine database changes + presence + broadcast
const noteChannel = supabase
  .channel(`note-${noteId}`)

  // Track who's editing
  .on('presence', { event: 'sync' }, () => {
    const editors = noteChannel.presenceState();
    updateEditorList(editors);
  })

  // Broadcast cursor positions
  .on('broadcast', { event: 'cursor' }, ({ payload }) => {
    showRemoteCursor(payload.user_id, payload.position);
  })

  // Listen for note saves
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'contactNotes',
    filter: `id=eq.${noteId}`
  }, (payload) => {
    // Someone saved the note
    if (payload.new.updated_by !== currentUserId) {
      showConflictWarning();
      refreshNoteContent(payload.new);
    }
  })

  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      // Announce presence
      await noteChannel.track({
        user_id: currentUserId,
        name: currentUser.name,
        editing: true
      });
    }
  });

// Send cursor updates
editor.on('cursor-move', (position) => {
  noteChannel.send({
    type: 'broadcast',
    event: 'cursor',
    payload: { user_id: currentUserId, position }
  });
});
```

### Example 4: Team Notifications

```typescript
// Multiple team members watch for task assignments
const taskChannel = supabase
  .channel('team-tasks')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'tasks'
  }, (payload) => {
    const task = payload.new;

    // Only show notification if assigned to me
    if (task.sales_id === currentUserId) {
      showNotification(`New task: ${task.text}`);
      addToMyTaskList(task);
    }
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'tasks'
  }, (payload) => {
    const { old: oldTask, new: newTask } = payload;

    // Task reassigned to me?
    if (oldTask.sales_id !== currentUserId && newTask.sales_id === currentUserId) {
      showNotification(`Task reassigned to you: ${newTask.text}`);
    }

    // Task completed?
    if (oldTask.status !== 'done' && newTask.status === 'done') {
      showConfetti();
      removeFromMyTaskList(newTask.id);
    }
  })
  .subscribe();
```

## Performance & Scalability

### How Many Subscribers?

**Supabase handles it efficiently:**
- 100 clients subscribing to same table? → 1 DB query, broadcast to all
- Each client gets filtered results based on RLS
- No N+1 query problem

### Filtering Performance

**Best Practices:**

✅ **Good: Filter at subscription level**
```typescript
.on('postgres_changes', {
  table: 'deals',
  filter: 'stage=eq.negotiation'  // Supabase filters
})
```

❌ **Bad: Filter in callback**
```typescript
.on('postgres_changes', {
  table: 'deals'  // Receive ALL deals
}, (payload) => {
  if (payload.new.stage === 'negotiation') {  // Filter client-side
    // ...
  }
})
```

### Bandwidth Considerations

**Reduce traffic:**
1. Use specific events: `event: 'UPDATE'` not `event: '*'`
2. Add filters to subscriptions
3. Only subscribe to tables you need
4. Unsubscribe when components unmount

## Error Handling

```typescript
const channel = supabase
  .channel('my-channel')
  .on('postgres_changes', {
    table: 'deals'
  }, callback)
  .subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      console.log('Connected to realtime');
    }

    if (status === 'CHANNEL_ERROR') {
      console.error('Realtime error:', error);
      // Retry connection
      setTimeout(() => channel.subscribe(), 5000);
    }

    if (status === 'TIMED_OUT') {
      console.warn('Realtime timeout - check network');
    }
  });

// Clean up on unmount
return () => {
  channel.unsubscribe();
};
```

## Security Model

### RLS is Always Enforced

```
User subscribes to 'deals'
         ↓
Supabase checks: SELECT * FROM deals WHERE <RLS policy>
         ↓
User only receives changes for rows they can SELECT
```

**This means:**
- ✅ No data leaks via realtime
- ✅ Same security as regular queries
- ✅ Multi-tenant safe by default
- ✅ Zero trust architecture

### Example: Multi-Tenant CRM

```sql
-- RLS policy
CREATE POLICY "Sales see own deals" ON deals
FOR SELECT USING (sales_id = current_user_sales_id());

-- User A subscribes to deals table
-- Gets updates for: deals where sales_id = 123

-- User B subscribes to deals table
-- Gets updates for: deals where sales_id = 456

-- Same subscription, different data!
```

## Troubleshooting

### Not Receiving Events?

**Check these in order:**

1. **Is table in publication?**
   ```sql
   SELECT * FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime'
   AND tablename = 'your_table';
   ```

2. **Can you SELECT the row?**
   ```sql
   SELECT * FROM your_table WHERE id = 'test';
   -- If RLS blocks this, realtime will too
   ```

3. **Is filter syntax correct?**
   ```typescript
   filter: 'stage=eq.negotiation'  // ✅ Correct
   filter: 'stage=="negotiation"'  // ❌ Wrong
   ```

4. **Is event type correct?**
   ```typescript
   event: 'UPDATE'  // Only updates
   event: 'INSERT'  // Only inserts
   event: '*'       // All events
   ```

## Summary

**Pub/Sub in Supabase = PostgreSQL + WebSockets + RLS**

1. **Subscribe** to channels (tables/events)
2. **PostgreSQL** emits changes via logical replication
3. **Supabase** applies RLS and filters
4. **Clients** receive relevant updates via WebSocket

**Key Benefits:**
- ✅ Real-time by default
- ✅ Security built-in (RLS)
- ✅ Scalable (one DB query → many clients)
- ✅ Simple API (just .on() and .subscribe())

**Perfect for CRM:**
- Live pipeline updates
- Activity feed notifications
- Team collaboration
- Online presence
- Instant sync across devices
