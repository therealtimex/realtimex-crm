# Ingestion System Deployment Checklist

Complete deployment guide for the Activity Ingestion and File Upload Storage system.

## Prerequisites

- Supabase project created and linked
- Supabase CLI installed: `npm install -g supabase`

## 1. Database Migrations (Fresh Deployment)

Apply all migrations in order:

```bash
npx supabase db push
```

**Key migrations:**
- `20251220120000_realtime_ingestion.sql` - Activities table, ingestion providers, work-stealing
- `20251221000001_fix_ingestion_providers_rls.sql` - RLS policies for provider management
- `20251222094036_large_payload_storage.sql` - Storage bucket (no size/MIME limits ✅)
- `20251223185638_remove_large_payload_storage.sql` - Cleanup of old large payload system

## 2. Deploy Edge Functions

```bash
# Ingestion endpoint (accepts JSON and multipart uploads)
npx supabase functions deploy ingest-activity --no-verify-jwt
```

**Important:** `ingest-activity` MUST be deployed with `--no-verify-jwt` because it uses custom authentication (ingestion keys).

## 3. Storage Bucket Configuration

**For fresh deployments:** Already configured correctly in migration ✅

**For existing deployments:** Verify bucket configuration.

**Verify:**
```sql
SELECT
  id,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'activity-payloads';

-- Expected:
-- file_size_limit: NULL (unlimited)
-- allowed_mime_types: NULL (all types)
```

## 4. Create First Ingestion Channel

Via UI (recommended):
1. Navigate to `/integrations`
2. Click "Add Channel"
3. Select provider (Generic, Postmark, Twilio)
4. Copy webhook URL

Via SQL:
```sql
INSERT INTO ingestion_providers (provider_code, name, is_active, ingestion_key)
VALUES (
  'generic',
  'My Test Channel',
  true,
  'ik_live_' || substr(md5(random()::text), 1, 32)
)
RETURNING id, ingestion_key;
```

## 5. Test Ingestion

### Test 1: Small JSON Payload

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/ingest-activity?key=YOUR_INGESTION_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "raw_data": {
      "source_type": "text",
      "content": "Test message",
      "subject": "Test"
    },
    "metadata": {
      "from": "test@example.com"
    }
  }'
```

**Expected:** HTTP 202, activity created with `payload_storage_status: NULL`

### Test 2: File Upload (Multipart)

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/ingest-activity?key=YOUR_INGESTION_KEY" \
  -F "file=@/path/to/document.pdf" \
  -F "type=document"
```

**Expected:**
- HTTP 202
- File uploaded to `activity-payloads/incoming/{timestamp}_{filename}`
- Activity created with `payload_storage_status: 'in_storage'`
- `raw_data` contains storage reference with path to uploaded file

### Test 3: Multiple Files Upload

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/ingest-activity?key=YOUR_INGESTION_KEY" \
  -F "file1=@/path/to/document1.pdf" \
  -F "file2=@/path/to/document2.pdf" \
  -F "type=document"
```

**Expected:**
- HTTP 202
- Both files uploaded to storage
- `raw_data.source_type = 'storage_refs'` with array of file references

## Architecture Summary

### Ingestion Flow

**JSON Payloads:**
```
Client → ingest-activity → activities table (raw_data contains JSON)
```

**File Uploads (Multipart - Recommended):**
```
Client → ingest-activity → Upload to storage/incoming/ immediately
                         ↓
              activities table (payload_storage_status: 'in_storage')
```

### Storage Structure

```
activity-payloads/
  incoming/                          # All uploaded files
    1734912345678_document.pdf
    1734912456789_recording.mp3
    1734912567890_presentation.pptx
```

**File Naming:** `{timestamp}_{original_filename}`

### Storage Reference in `raw_data`

**Single file:**
```json
{
  "source_type": "storage_ref",
  "storage_path": "incoming/1734912345678_document.pdf",
  "filename": "document.pdf",
  "format": "application/pdf",
  "size": 14167486
}
```

**Multiple files:**
```json
{
  "source_type": "storage_refs",
  "files": [
    {
      "storage_path": "incoming/1734912345678_document1.pdf",
      "filename": "document1.pdf",
      "format": "application/pdf",
      "size": 14167486,
      "field_name": "file1"
    },
    {
      "storage_path": "incoming/1734912456789_document2.pdf",
      "filename": "document2.pdf",
      "format": "application/pdf",
      "size": 8234567,
      "field_name": "file2"
    }
  ]
}
```

## Troubleshooting

### Issue: 401 on ingestion endpoint

**Cause:** Function not deployed with `--no-verify-jwt`

**Fix:**
```bash
npx supabase functions deploy ingest-activity --no-verify-jwt
```

### Issue: File upload fails with "mime type not supported"

**Cause:** Bucket has MIME type restrictions

**Fix:** Update bucket configuration:
```sql
UPDATE storage.buckets
SET allowed_mime_types = NULL,
    file_size_limit = NULL
WHERE id = 'activity-payloads';
```

### Issue: Cannot download files

**Cause:** Bucket is private and requires authentication

**Fix:** Use Supabase client with authentication:
```typescript
const { data } = await supabase.storage
  .from('activity-payloads')
  .download(storagePath);
```

Or create a signed URL:
```typescript
const { data: signedUrl } = await supabase.storage
  .from('activity-payloads')
  .createSignedUrl(storagePath, 3600); // 1 hour expiry
```

## Security Notes

- Ingestion keys are public (safe to include in URLs)
- Service role key is private (never expose in client code)
- Storage bucket is private by default
- RLS policies control who can read activity payloads
- Twilio requests validated via signature verification

## Performance Metrics

**Multipart Upload Benefits:**
- Direct upload to storage (no database bloat)
- No encoding/decoding CPU overhead
- Files immediately available
- Simple architecture (no cron jobs needed)

## Next Steps

1. Set up webhook dispatching (for outbound events)
2. Configure activity processing (AI transcription, etc.)
3. Set up retention policies for old files
4. Monitor storage usage and costs
5. See [LARGE_PAYLOAD_HANDLING.md](docs/LARGE_PAYLOAD_HANDLING.md) for file upload details
