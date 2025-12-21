# Deployment Guide: API & Webhooks Setup

This guide walks you through deploying the database tables and Edge Functions for the RealTimeX CRM API and webhooks system on a new Supabase instance.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: Database Migration](#step-1-database-migration)
- [Step 2: Deploy Edge Functions](#step-2-deploy-edge-functions)
- [Step 3: Verify Deployment](#step-3-verify-deployment)
- [Step 4: Create Your First API Key](#step-4-create-your-first-api-key)
- [Step 5: Test the API](#step-5-test-the-api)
- [Troubleshooting](#troubleshooting)
- [Updating Existing Deployments](#updating-existing-deployments)

---

## Prerequisites

Before you begin, ensure you have:

1. **Supabase CLI installed**:
   ```bash
   npm install -g supabase
   ```

2. **Supabase project created**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project or use an existing one
   - Note your project's URL and keys

3. **Local Supabase project linked**:
   ```bash
   # Initialize Supabase in your project (if not already done)
   npx supabase init

   # Link to your remote project
   npx supabase link --project-ref your-project-ref
   ```

   Replace `your-project-ref` with your actual project reference (found in your Supabase dashboard URL).

4. **Environment variables configured**:
   Create `.env.production.local` with:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## Step 1: Database Migration

The API and webhooks system requires three database migrations that create tables, triggers, and functions.

### 1.1 Check Migration Status

First, verify which migrations are already applied:

```bash
npx supabase migration list
```

You should see these three migrations (if not already applied):
- `20251219120000_api_integrations.sql` - Creates API keys, webhooks, logs, and queue tables
- `20251219120100_webhook_triggers.sql` - Creates webhook trigger functions
- `20251219120200_webhook_cron.sql` - Sets up webhook dispatcher cron job

### 1.2 Apply Migrations to Remote Database

Push all pending migrations to your remote database:

```bash
npx supabase db push
```

**Expected output:**
```
Initialising login role...
Connecting to remote database...
Applying migration 20251219120000_api_integrations.sql...
Applying migration 20251219120100_webhook_triggers.sql...
Applying migration 20251219120200_webhook_cron.sql...
Finished supabase db push.
```

### 1.3 Verify Tables Were Created

Check that the tables exist in your Supabase dashboard:

1. Go to **Table Editor** in your Supabase dashboard
2. Verify these tables are present:
   - `api_keys`
   - `webhooks`
   - `api_logs`
   - `webhook_queue`

Or verify via SQL:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('api_keys', 'webhooks', 'api_logs', 'webhook_queue');
```

---

## Step 2: Deploy Edge Functions

The API consists of five Edge Functions that need to be deployed.

### 2.1 Edge Functions Overview

| Function | Purpose | Endpoint |
|----------|---------|----------|
| `api-v1-contacts` | Contact CRUD operations | `/functions/v1/api-v1-contacts/{id}` |
| `api-v1-companies` | Company CRUD operations | `/functions/v1/api-v1-companies/{id}` |
| `api-v1-deals` | Deal CRUD operations | `/functions/v1/api-v1-deals/{id}` |
| `api-v1-activities` | Create notes and tasks | `/functions/v1/api-v1-activities` |
| `webhook-dispatcher` | Async webhook delivery | `/functions/v1/webhook-dispatcher` |

### 2.2 Deploy All Functions

**Important:** Use the `--no-verify-jwt` flag to disable Supabase's default JWT authentication, since the API uses custom API key authentication.

Deploy all functions in one command:

```bash
npx supabase functions deploy api-v1-contacts --no-verify-jwt && \
npx supabase functions deploy api-v1-companies --no-verify-jwt && \
npx supabase functions deploy api-v1-deals --no-verify-jwt && \
npx supabase functions deploy api-v1-activities --no-verify-jwt && \
npx supabase functions deploy webhook-dispatcher --no-verify-jwt
```

**Expected output for each function:**
```
Uploading asset (api-v1-contacts): supabase/functions/api-v1-contacts/index.ts
Uploading asset (api-v1-contacts): supabase/functions/_shared/apiKeyAuth.ts
Uploading asset (api-v1-contacts): supabase/functions/_shared/utils.ts
Uploading asset (api-v1-contacts): supabase/functions/_shared/supabaseAdmin.ts
Deployed Functions on project your-project-ref: api-v1-contacts
```

### 2.3 Verify Function Deployment

List all deployed functions:

```bash
npx supabase functions list
```

**Expected output:**
```
NAME               | SLUG               | STATUS | VERSION | UPDATED_AT (UTC)
-------------------|--------------------|---------|---------|-----------------
api-v1-contacts    | api-v1-contacts    | ACTIVE  | 1       | 2025-12-19 ...
api-v1-companies   | api-v1-companies   | ACTIVE  | 1       | 2025-12-19 ...
api-v1-deals       | api-v1-deals       | ACTIVE  | 1       | 2025-12-19 ...
api-v1-activities  | api-v1-activities  | ACTIVE  | 1       | 2025-12-19 ...
webhook-dispatcher | webhook-dispatcher | ACTIVE  | 1       | 2025-12-19 ...
```

All functions should show `STATUS: ACTIVE`.

---

## Step 3: Verify Deployment

### 3.1 Test Database Access

Verify the API keys table is accessible:

```sql
-- Run this in Supabase SQL Editor
SELECT COUNT(*) FROM api_keys;
```

Should return `0` (no API keys created yet).

### 3.2 Test Edge Function (Without API Key)

Try calling an endpoint without authentication (should return an error):

```bash
curl "https://your-project-ref.supabase.co/functions/v1/api-v1-contacts/1"
```

**Expected response:**
```json
{
  "status": 401,
  "message": "Missing or invalid Authorization header"
}
```

This confirms the function is deployed and authentication is working.

---

## Step 4: Create Your First API Key

You can create an API key via the UI or directly in the database.

### Option A: Via UI (Recommended)

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Integrations page:**
   - Open http://localhost:5174/integrations
   - Click the **"API Keys"** tab

3. **Create an API key:**
   - Click **"Create API Key"**
   - Enter a name (e.g., "Production API Key")
   - Select scopes (at minimum: `contacts:read`, `contacts:write`)
   - Optionally set an expiration date
   - Click **"Create"**

4. **Copy the API key:**
   - The key will be shown ONLY ONCE
   - Copy it immediately and store it securely
   - Format: `ak_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Option B: Via SQL (For Testing)

```sql
-- Insert a test API key
INSERT INTO api_keys (
  name,
  key_hash,
  key_prefix,
  scopes,
  is_active,
  sales_id,
  created_by_sales_id
) VALUES (
  'Test API Key',
  -- This is the SHA-256 hash of 'ak_live_test12345678901234567890123456'
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'ak_live_test',
  ARRAY['contacts:read', 'contacts:write', 'companies:read', 'companies:write', 'deals:read', 'deals:write'],
  true,
  1, -- Replace with your sales_id
  1  -- Replace with your sales_id
);
```

**Note:** For production, always create API keys through the UI, which properly hashes them.

---

## Step 5: Test the API

### 5.1 Test GET Request

Fetch a contact by ID:

```bash
curl "https://your-project-ref.supabase.co/functions/v1/api-v1-contacts/1" \
  -H "Authorization: Bearer ak_live_your_api_key_here"
```

**Expected response:**
```json
{
  "data": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email_jsonb": [{"email": "john@example.com", "type": "Work"}],
    ...
  }
}
```

Or, if contact doesn't exist:
```json
{
  "status": 404,
  "message": "Contact not found"
}
```

### 5.2 Test POST Request

Create a new contact:

```bash
curl -X POST "https://your-project-ref.supabase.co/functions/v1/api-v1-contacts" \
  -H "Authorization: Bearer ak_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith"
  }'
```

**Expected response (201 Created):**
```json
{
  "data": {
    "id": 2,
    "first_name": "Jane",
    "last_name": "Smith",
    "sales_id": 1,
    ...
  }
}
```

### 5.3 Test Rate Limiting

Make 101 requests within 60 seconds to test rate limiting:

```bash
for i in {1..101}; do
  curl -s "https://your-project-ref.supabase.co/functions/v1/api-v1-contacts/1" \
    -H "Authorization: Bearer ak_live_your_api_key_here" \
    -w "\nRequest $i: HTTP %{http_code}\n"
done
```

After 100 requests, you should receive:
```json
{
  "status": 429,
  "message": "Rate limit exceeded",
  "retry_after": 45
}
```

### 5.4 Test Webhook Creation

Create a webhook via the UI:

1. Navigate to http://localhost:5174/integrations
2. Click the **"Webhooks"** tab
3. Click **"Create Webhook"**
4. Enter:
   - **Name:** "Test Webhook"
   - **URL:** "https://webhook.site/your-unique-url" (get one from webhook.site)
   - **Events:** Select `contact.created`, `contact.updated`
5. Click **"Create"**

Now create a contact via the API and check webhook.site to see if the event was delivered.

---

## Troubleshooting

### Issue: "Invalid JWT" Error

**Problem:** Getting `{"code":401,"message":"Invalid JWT"}` when calling the API.

**Solution:** Edge Functions need to be deployed with `--no-verify-jwt` flag:
```bash
npx supabase functions deploy api-v1-contacts --no-verify-jwt
```

### Issue: "Invalid API key" Error

**Problem:** Getting `{"status":401,"message":"Invalid API key"}`.

**Causes:**
1. **API key not in database** - Create an API key via the UI
2. **Wrong API key format** - Must start with `ak_live_`
3. **API key expired** - Check `expires_at` field in database
4. **API key inactive** - Check `is_active` field is `true`

**Debug:**
```sql
-- Check if API key exists
SELECT id, name, key_prefix, is_active, expires_at
FROM api_keys
WHERE key_prefix = 'ak_live_xxx'; -- Replace with your key prefix
```

### Issue: "Contact not found" for Existing Contact

**Problem:** Getting 404 for a contact that exists.

**Solution:** Ensure the ID is correct and the contact exists:
```sql
SELECT id, first_name, last_name FROM contacts WHERE id = 1;
```

### Issue: Webhooks Not Firing

**Problem:** Creating contacts but webhooks aren't being triggered.

**Debug:**
1. Check webhook is active:
   ```sql
   SELECT id, name, url, is_active, events FROM webhooks;
   ```

2. Check webhook queue:
   ```sql
   SELECT * FROM webhook_queue ORDER BY created_at DESC LIMIT 10;
   ```

3. Check for errors:
   ```sql
   SELECT id, event_type, status, error_message
   FROM webhook_queue
   WHERE status = 'failed';
   ```

### Issue: "function enqueue_webhook_event does not exist"

**Problem:** Webhook trigger function not created.

**Solution:** Re-apply the webhook triggers migration:
```bash
npx supabase db push
```

Or manually create the function:
```sql
-- See supabase/migrations/20251219120100_webhook_triggers.sql
```

---

## Updating Existing Deployments

### Update Edge Functions Only

If you've made code changes to Edge Functions:

```bash
# Deploy specific function
npx supabase functions deploy api-v1-contacts --no-verify-jwt

# Or deploy all at once
npx supabase functions deploy api-v1-contacts --no-verify-jwt && \
npx supabase functions deploy api-v1-companies --no-verify-jwt && \
npx supabase functions deploy api-v1-deals --no-verify-jwt && \
npx supabase functions deploy api-v1-activities --no-verify-jwt && \
npx supabase functions deploy webhook-dispatcher --no-verify-jwt
```

### Update Database Schema Only

If you've added new migrations:

```bash
npx supabase db push
```

### Reset Database (Destructive)

**⚠️ WARNING: This will delete all data!**

```bash
# Reset local database
npx supabase db reset

# For remote, you'll need to manually drop and recreate tables
```

---

## Production Checklist

Before going live, ensure:

- [ ] All migrations applied successfully (`npx supabase migration list`)
- [ ] All Edge Functions deployed with `--no-verify-jwt` flag
- [ ] Test API key created with appropriate scopes
- [ ] API tested with GET, POST, PATCH, DELETE operations
- [ ] Rate limiting verified (100 req/min)
- [ ] Webhooks tested with real endpoint
- [ ] API documentation reviewed (docs/API.md)
- [ ] Environment variables configured in production
- [ ] API keys stored securely (never in version control)
- [ ] Webhook secrets recorded for signature verification

---

## Quick Reference Commands

```bash
# Link to Supabase project
npx supabase link --project-ref your-project-ref

# Apply migrations
npx supabase db push

# Check migration status
npx supabase migration list

# Deploy all API functions
npx supabase functions deploy api-v1-contacts --no-verify-jwt && \
npx supabase functions deploy api-v1-companies --no-verify-jwt && \
npx supabase functions deploy api-v1-deals --no-verify-jwt && \
npx supabase functions deploy api-v1-activities --no-verify-jwt && \
npx supabase functions deploy webhook-dispatcher --no-verify-jwt

# List deployed functions
npx supabase functions list

# Test API endpoint
curl "https://your-project-ref.supabase.co/functions/v1/api-v1-contacts/1" \
  -H "Authorization: Bearer ak_live_your_api_key_here"
```

---

## Next Steps

- Review the [API Documentation](./API.md) for complete endpoint reference
- Set up webhooks for your integrations
- Implement webhook signature verification in your webhook receivers
- Monitor API logs via the Supabase dashboard
- Set up monitoring and alerts for webhook failures

---

## Support

For issues or questions:
- **GitHub Issues:** https://github.com/therealtimex/realtimex-crm/issues
- **API Documentation:** [docs/API.md](./API.md)
- **Architecture Guide:** [AGENTS.md](../AGENTS.md)
