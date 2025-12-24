-- Migration: Fix contact matching to work with email_jsonb and phone_jsonb schema

-- Drop and recreate the auto_link_contact function with correct JSONB queries
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
  IF NEW.metadata ? 'from' AND NEW.metadata->>'from' LIKE '%@%' THEN
    SELECT id INTO matched_contact_id
    FROM contacts
    WHERE email_jsonb @> jsonb_build_array(jsonb_build_object('email', NEW.metadata->>'from'))
    LIMIT 1;

    IF matched_contact_id IS NOT NULL THEN
      NEW.contact_id := matched_contact_id;
      RETURN NEW;
    END IF;
  END IF;

  -- Strategy 2: Try exact phone match (E.164 normalized)
  -- Note: phones are stored as phone_jsonb (array of phone objects)
  IF NEW.metadata ? 'from' AND NEW.metadata->>'from' LIKE '+%' THEN
    SELECT id INTO matched_contact_id
    FROM contacts
    WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements(phone_jsonb) AS phone
      WHERE normalize_phone(phone->>'number') = normalize_phone(NEW.metadata->>'from')
    )
    LIMIT 1;

    IF matched_contact_id IS NOT NULL THEN
      NEW.contact_id := matched_contact_id;
      RETURN NEW;
    END IF;
  END IF;

  -- Strategy 3: Try fuzzy phone match (last 10 digits for US numbers)
  IF NEW.metadata ? 'from' AND length(regexp_replace(NEW.metadata->>'from', '[^0-9]', '', 'g')) >= 10 THEN
    SELECT id INTO matched_contact_id
    FROM contacts
    WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements(phone_jsonb) AS phone
      WHERE right(regexp_replace(phone->>'number', '[^0-9]', '', 'g'), 10) =
            right(regexp_replace(NEW.metadata->>'from', '[^0-9]', '', 'g'), 10)
    )
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
