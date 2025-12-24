# Supabase Realtime Channels Configuration

## Currently Enabled Tables

Based on migration `20251221000005_realtime_functions.sql`:

### ✅ Activities Table
**Status:** Realtime enabled
**Use Cases:**
- Real-time ingestion notifications
- Activity feed updates
- New email/call/SMS alerts
- Local agent activity stealing

**Example subscription:**
```typescript
const subscription = supabase
  .channel('activities-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'activities',
    filter: 'sales_id=eq.123'  // Only my activities (RLS enforced)
  }, (payload) => {
    console.log('New activity:', payload);
  })
  .subscribe();
```

### ✅ Tasks Table
**Status:** Realtime enabled
**Use Cases:**
- Task assignment notifications
- Status change alerts
- Due date reminders
- Team collaboration

**Example subscription:**
```typescript
const subscription = supabase
  .channel('task-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'tasks',
    filter: 'sales_id=eq.123'
  }, (payload) => {
    console.log('Task updated:', payload);
  })
  .subscribe();
```

## Tables NOT Currently Enabled

The following CRM tables do **NOT** have realtime enabled by default:

### ❌ Contacts
**Potential use cases:**
- Contact profile updates
- New contact creation
- Contact merge notifications

### ❌ Companies
**Potential use cases:**
- Company data changes
- New company creation

### ❌ Deals
**Potential use cases:**
- Deal stage changes (pipeline movement)
- Deal value updates
- Won/lost notifications

### ❌ Sales (Users/Team)
**Potential use cases:**
- Team member status changes
- Permission updates
- User preferences

### ❌ Ingestion Providers
**Potential use cases:**
- New channel creation
- Channel status changes

## How Realtime Works with RLS

**Important:** Realtime respects Row Level Security (RLS) policies automatically.

```
User subscribes → Supabase checks RLS → Only sends rows user can SELECT
```

**Example:**
```sql
-- RLS policy on activities
CREATE POLICY "Users see own activities" ON activities
FOR SELECT USING (sales_id = (SELECT id FROM sales WHERE user_id = auth.uid()));

-- User subscribes to activities channel
-- ✅ Receives: Activities where sales_id matches their user
-- ❌ Blocked: Activities belonging to other users
```

**This means:**
- No data leakage risk
- Users only see what they're allowed to see
- Same security as regular queries

## Enabling Realtime for Additional Tables

### Option 1: Via Migration (Recommended for Production)

Create a new migration:
```bash
npx supabase migration new enable_realtime_contacts
```

Add to migration file:
```sql
-- Enable realtime for contacts table
SELECT enable_realtime_for_table('contacts');

-- Enable realtime for companies table
SELECT enable_realtime_for_table('companies');

-- Enable realtime for deals table
SELECT enable_realtime_for_table('deals');
```

Apply:
```bash
npx supabase db push
```

### Option 2: Via SQL Editor (Quick Testing)

Run in Supabase Dashboard > SQL Editor:
```sql
-- Enable one or more tables
SELECT enable_realtime_for_table('contacts');
SELECT enable_realtime_for_table('companies');
SELECT enable_realtime_for_table('deals');
```

### Verification

Run `check_realtime_channels.sql` to see all enabled tables.

## Performance Considerations

**Realtime has minimal overhead:**
- Uses PostgreSQL's logical replication
- Only sends changes, not full table scans
- Filtered by RLS before transmission
- Scales well with multiple subscribers

**Best practices:**
1. **Filter subscriptions** - Use `filter` parameter to reduce traffic
2. **Subscribe to specific events** - Use `event: 'INSERT'` instead of `event: '*'`
3. **Unsubscribe when done** - Call `subscription.unsubscribe()`
4. **Batch updates** - Avoid rapid-fire updates that trigger many events

## Common Use Cases

### Real-time Activity Feed
```typescript
// Subscribe to new activities
supabase
  .channel('activity-feed')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'activities',
    filter: 'sales_id=eq.' + currentUserId
  }, (payload) => {
    addToFeed(payload.new);
  })
  .subscribe();
```

### Deal Pipeline Live Updates
```typescript
// Watch for deal stage changes
supabase
  .channel('pipeline-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'deals',
    filter: 'stage=neq.won'  // Only active deals
  }, (payload) => {
    updatePipelineUI(payload.new);
  })
  .subscribe();
```

### Team Collaboration (Tasks)
```typescript
// Multiple team members see task assignments
supabase
  .channel('team-tasks')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks'
    // No filter = see all tasks allowed by RLS
  }, (payload) => {
    if (payload.eventType === 'INSERT') {
      showNotification('New task assigned');
    }
  })
  .subscribe();
```

## Troubleshooting

### No events received

**Check 1: Is table in publication?**
```sql
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'your_table';
```

**Check 2: Does RLS allow SELECT?**
```sql
-- Test if you can query the table
SELECT * FROM your_table LIMIT 1;
-- If this fails, realtime won't work either
```

**Check 3: Is subscription configured correctly?**
```typescript
.on('postgres_changes', {
  event: '*',  // Try '*' first, then narrow down
  schema: 'public',
  table: 'your_table'
  // Remove filter to test
})
```

### Too many events

**Solution: Add filters**
```typescript
// Instead of:
.on('postgres_changes', { event: '*', table: 'activities' })

// Use:
.on('postgres_changes', {
  event: 'INSERT',  // Only new records
  table: 'activities',
  filter: 'type=eq.email'  // Only emails
})
```

## Security Notes

✅ **Safe to enable realtime:**
- RLS policies are enforced automatically
- No additional security risk
- Users only see their authorized data

❌ **Don't bypass RLS:**
- Never use `service_role` key on client side
- Never disable RLS to "fix" realtime issues
- Always test with regular user credentials

## Migration History

- `20251221000005_realtime_functions.sql` - Helper function + enabled activities & tasks

## Next Steps

1. Run `check_realtime_channels.sql` to see current status
2. Decide which tables need realtime based on your use cases
3. Create migration to enable additional tables
4. Update frontend to subscribe to relevant channels
5. Test with RLS to ensure proper data isolation
