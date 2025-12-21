-- Check if the latest activity has a contact_id (contact matching worked)
SELECT
  a.id,
  a.type,
  a.contact_id,
  a.metadata->>'from' as from_email,
  c.first_name,
  c.last_name,
  c.email_jsonb
FROM activities a
LEFT JOIN contacts c ON a.contact_id = c.id
WHERE a.metadata->>'from' = 'Dolores79@gmail.com'
ORDER BY a.created_at DESC
LIMIT 1;

-- Also check if this email exists in contacts table
SELECT
  id,
  first_name,
  last_name,
  email_jsonb
FROM contacts
WHERE email_jsonb::text LIKE '%Dolores79@gmail.com%'
LIMIT 5;
