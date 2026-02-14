-- Enrich deals_summary with company_name for better semantic search and UI
DROP VIEW IF EXISTS public.deals_summary CASCADE;

CREATE VIEW public.deals_summary 
  WITH (security_invoker=on)
  AS
SELECT
  d.*,
  c.name as company_name,
  (SELECT count(*) FROM invoices i WHERE i.deal_id = d.id) as nb_invoices,
  (SELECT count(*) FROM "dealNotes" dn WHERE dn.deal_id = d.id) as nb_notes
FROM deals d
LEFT JOIN companies c ON d.company_id = c.id;

COMMENT ON VIEW public.deals_summary IS 'Enriched deals view with company name and aggregation counts';
