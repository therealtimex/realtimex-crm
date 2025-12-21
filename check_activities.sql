SELECT 
  id,
  type,
  direction,
  processing_status,
  contact_id,
  sales_id,
  created_at,
  raw_data->>'content' as content,
  metadata->>'from' as from_address
FROM activities 
ORDER BY created_at DESC 
LIMIT 5;
