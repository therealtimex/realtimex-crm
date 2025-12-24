# File Upload Storage (Simplified Model)

This document explains how Atomic CRM handles file uploads for activities.

## Overview

When activities contain file attachments (PDFs, images, documents, etc.), they are automatically uploaded to Supabase Storage and referenced in the activity record. This prevents database table bloat and enables efficient file management.

## Architecture (Simplified)

### Components

1. **Storage Bucket** (`activity-payloads`)
   - Private Supabase Storage bucket
   - Stores all uploaded files
   - Files are uploaded to: `incoming/{timestamp}_{filename}`
   - No size limit (handled by bucket configuration)

2. **Ingestion Edge Function** (`ingest-activity`)
   - Receives file uploads via multipart/form-data
   - Uploads files directly to storage
   - Stores file reference in `raw_data`
   - No post-processing needed

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Activity with File Uploaded (multipart/form-data)           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. ingest-activity Function Processes Upload                   │
│    - Uploads file to storage/incoming/{timestamp}_{filename}   │
│    - Creates activity record with storage reference            │
│    - Sets payload_storage_status = 'in_storage'                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Activity Record Created                                      │
│    - raw_data contains file reference                          │
│    - Files ready for immediate use                             │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Columns in `activities` Table

```sql
-- File upload tracking
payload_storage_status TEXT;  -- NULL or 'in_storage'
storage_path TEXT;             -- Path to file in storage bucket
```

**`payload_storage_status` Values:**
- `NULL` - No files attached (raw_data is pure JSON)
- `in_storage` - Files uploaded to storage, referenced in raw_data

### Storage Reference Format

For single file uploads, `raw_data` contains:

```json
{
  "source_type": "storage_ref",
  "storage_path": "incoming/1766514359388_document.pdf",
  "filename": "document.pdf",
  "format": "application/pdf",
  "size": 14167486
}
```

For multiple file uploads, `raw_data` contains:

```json
{
  "source_type": "storage_refs",
  "files": [
    {
      "storage_path": "incoming/1766514359388_document1.pdf",
      "filename": "document1.pdf",
      "format": "application/pdf",
      "size": 14167486,
      "field_name": "attachment1"
    },
    {
      "storage_path": "incoming/1766514359389_document2.pdf",
      "filename": "document2.pdf",
      "format": "application/pdf",
      "size": 8234567,
      "field_name": "attachment2"
    }
  ]
}
```

## Usage

### Uploading Files

Send a multipart/form-data request to the ingest-activity endpoint:

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/ingest-activity" \
  -H "x-ingestion-key: YOUR_INGESTION_KEY" \
  -F "file=@/path/to/document.pdf" \
  -F "type=document" \
  -F "metadata={\"source\":\"manual_upload\"}"
```

Multiple files:

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/ingest-activity" \
  -H "x-ingestion-key: YOUR_INGESTION_KEY" \
  -F "file1=@/path/to/document1.pdf" \
  -F "file2=@/path/to/document2.pdf" \
  -F "type=document"
```

### Retrieving Files

**Download from Supabase Storage:**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// Get activity record
const { data: activity } = await supabase
  .from('activities')
  .select('raw_data, payload_storage_status')
  .eq('id', activityId)
  .single();

if (activity.payload_storage_status === 'in_storage') {
  // Single file
  if (activity.raw_data.source_type === 'storage_ref') {
    const { data: file } = await supabase.storage
      .from('activity-payloads')
      .download(activity.raw_data.storage_path);

    // Use the file
    const url = URL.createObjectURL(file);
  }

  // Multiple files
  if (activity.raw_data.source_type === 'storage_refs') {
    for (const fileRef of activity.raw_data.files) {
      const { data: file } = await supabase.storage
        .from('activity-payloads')
        .download(fileRef.storage_path);

      // Use each file
    }
  }
}
```

**Get signed URL for temporary access:**

```typescript
const { data: signedUrl } = await supabase.storage
  .from('activity-payloads')
  .createSignedUrl(activity.raw_data.storage_path, 3600); // 1 hour

console.log(signedUrl.signedUrl); // Use this URL in browser
```

## Storage Management

### Check Storage Usage

```sql
-- Count activities with files
SELECT COUNT(*) as files_count
FROM activities
WHERE payload_storage_status = 'in_storage';

-- Total storage usage (estimated from metadata)
SELECT
  COUNT(*) as file_count,
  SUM((raw_data->>'size')::bigint) as total_bytes,
  pg_size_pretty(SUM((raw_data->>'size')::bigint)) as total_size
FROM activities
WHERE raw_data->>'source_type' = 'storage_ref';
```

### Clean Up Old Files

Implement a retention policy to delete old files:

```sql
-- Find storage paths for old activities
SELECT raw_data->>'storage_path' as path
FROM activities
WHERE payload_storage_status = 'in_storage'
  AND created_at < NOW() - INTERVAL '90 days'
  AND raw_data->>'source_type' = 'storage_ref';
```

Then delete from storage using the Supabase client or Edge Function.

## Best Practices

### For File Uploads

1. **Use descriptive filenames**: Original filenames are preserved in metadata
2. **Check file types**: Validate MIME types before upload
3. **Set size limits**: Configure bucket settings appropriately
4. **Use signed URLs**: For temporary access to files

### Performance Tips

1. **Download only when needed**: Don't eagerly fetch all files
2. **Use signed URLs**: Let browsers download directly from storage
3. **Implement caching**: Cache frequently accessed files
4. **Monitor storage costs**: Track usage and implement retention policies

## Migration from Old System

If you're migrating from the old large payload system:

1. **Old system** uploaded entire `raw_data` JSON to storage
2. **New system** uploads only actual files
3. **Migration path**:
   - New uploads automatically use new system
   - Old records remain unchanged
   - Both systems can coexist

## Troubleshooting

### Files Not Uploading

1. **Check bucket exists**: `activity-payloads` bucket must be created
2. **Check permissions**: Bucket must allow service role access
3. **Check MIME types**: Ensure bucket accepts file types
4. **Check Edge Function logs**: Look for upload errors

### Storage Access Issues

1. **Check bucket privacy**: Should be private
2. **Use signed URLs**: For temporary access
3. **Check RLS policies**: Ensure appropriate access rules
4. **Verify service role key**: Must have storage access

## Support

For issues or questions:
- **GitHub Issues**: https://github.com/therealtimex/atomic-crm/issues
- **Documentation**: [AGENTS.md](../AGENTS.md)
