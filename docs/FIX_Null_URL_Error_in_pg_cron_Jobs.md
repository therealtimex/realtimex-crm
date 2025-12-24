# Troubleshooting: Null URL Error in pg_cron Jobs

## Symptom
When scheduling a Cron job in Supabase to invoke an Edge Function or HTTP endpoint, the job fails to execute, and the following error appears in the database logs:

```text
null value in column "url" of relation "http_request_queue" violates not-null constraint
```

## Cause
This error occurs when using dynamic configuration variables (GUCs) inside a `pg_cron` job definition, specifically:

```sql
-- ❌ CAUSE: Using dynamic settings inside a background worker
url := 'https://' || current_setting('app.settings.supabase_url') ...
headers := ... || current_setting('app.settings.service_role_key') ...
```

`pg_cron` runs as a background process, not within the context of an API request. Therefore, Supabase-injected configuration settings like `app.settings.supabase_url` and `app.settings.service_role_key` are **not available** (they resolve to `NULL`).

In PostgreSQL, concatenating a string with `NULL` results in `NULL`, causing the mandatory `url` column to be empty.

## Resolution

To fix this, you must provide the actual Project URL and Service Role Key explicitly. You can do this via the Dashboard UI or via SQL.

### Option 1: Using the Dashboard (Supabase Edge Function)

This is the preferred method as it allows you to select your function from a list, preventing URL typo errors.

1.  Navigate to **Project Settings** > **Integrations** > **Cron Jobs**.
2.  Click **webhook-dispatcher** > **Edit**.
3.  **Type:** Select **Supabase Edge Function**.
4.  **Method:** Select `POST`.
5.  **Edge Function:** Select `webhook-dispatcher` from the dropdown menu.
    *   *Note: This automatically handles the URL generation for you.*
6.  **HTTP Headers:**
    *   Click **Add new header**.
    *   **Name:** `Content-Type`
    *   **Value:** `application/json`
    *   Click **Add new header** again.
    *   **Name:** `Authorization`
    *   **Value:** `Bearer <YOUR_SERVICE_ROLE_KEY>`
7.  **Body:** `{}` (or your required JSON payload).

> **⚠️ CRITICAL WARNING:**
> When entering the **Value** for the `Authorization` header, you must paste the **actual literal key string** (starting with `eyJ...`).
> 
> **Do not** type SQL syntax like `Bearer || service_role_key` or `current_setting(...)` into the Dashboard fields. The Dashboard text boxes do not execute SQL; they treat input as raw text.

### Option 2: Using SQL
If you prefer to define cron jobs in your migrations or SQL editor, you must hardcode the URL and Authorization token.

```sql
select cron.schedule(
  'invoke-edge-function',
  '* * * * *', -- Every minute
  $$
  select
    net.http_post(
        -- ✅ Replace with your actual project URL
        url:='https://abc123xyz.supabase.co/functions/v1/webhook-dispatcher', 
        headers:=jsonb_build_object(
            'Content-Type','application/json',
            -- ✅ Replace with your actual Service Role Key (from Settings > API)
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' 
        ),
        body:='{}'::jsonb
    ) as request_id;
  $$
);
```

