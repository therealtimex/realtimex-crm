-- Migration: Fix email matching to be more robust with jsonb arrays

CREATE OR REPLACE FUNCTION auto_link_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  matched_contact_id bigint;
BEGIN
  -- Only attempt matching if contact_id is not already set
  IF NEW.contact_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Strategy 1: Try exact email match
  -- Note: email is stored as email_jsonb (array of email objects)
  -- Use jsonb_array_elements to check each email in the array
  IF NEW.metadata ? 'from' AND NEW.metadata->>'from' LIKE '%@%' THEN
    SELECT c.id INTO matched_contact_id
    FROM contacts c,
         jsonb_array_elements(c.email_jsonb) AS email
    WHERE lower(email->>'email') = lower(NEW.metadata->>'from')
    LIMIT 1;

    IF matched_contact_id IS NOT NULL THEN
      NEW.contact_id := matched_contact_id;
      RETURN NEW;
    END IF;
  END IF;

  -- Strategy 2: Try exact phone match (E.164 normalized)
  -- Note: phones are stored as phone_jsonb (array of phone objects)
  IF NEW.metadata ? 'from' AND NEW.metadata->>'from' LIKE '+%' THEN
    SELECT c.id INTO matched_contact_id
    FROM contacts c,
         jsonb_array_elements(c.phone_jsonb) AS phone
    WHERE normalize_phone(phone->>'number') = normalize_phone(NEW.metadata->>'from')
    LIMIT 1;

    IF matched_contact_id IS NOT NULL THEN
      NEW.contact_id := matched_contact_id;
      RETURN NEW;
    END IF;
  END IF;

  -- Strategy 3: Try fuzzy phone match (last 10 digits for US numbers)
  IF NEW.metadata ? 'from' AND length(regexp_replace(NEW.metadata->>'from', '[^0-9]', '', 'g')) >= 10 THEN
    SELECT c.id INTO matched_contact_id
    FROM contacts c,
         jsonb_array_elements(c.phone_jsonb) AS phone
    WHERE right(regexp_replace(phone->>'number', '[^0-9]', '', 'g'), 10) =
          right(regexp_replace(NEW.metadata->>'from', '[^0-9]', '', 'g'), 10)
    LIMIT 1;

    IF matched_contact_id IS NOT NULL THEN
      NEW.contact_id := matched_contact_id;
      RETURN NEW;
    END IF;
  END IF;

  -- No match found - activity will be created as "orphan" with contact_id = NULL
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_link_contact() IS
'Automatically links activities to contacts based on email or phone number in metadata.from field.
Uses case-insensitive email matching and handles jsonb array structures correctly.
Priority: Email match > Phone E.164 match > Fuzzy phone match (last 10 digits).
Activities without matches become orphans (contact_id = NULL).';
