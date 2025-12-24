-- Drop and recreate view with nb_notes
drop view if exists "public"."companies_summary";

create view "public"."companies_summary"
    with (security_invoker=on)
    as
select
    c.*,
    count(distinct d.id) as nb_deals,
    count(distinct co.id) as nb_contacts,
    count(distinct cn.id) as nb_notes
from "public"."companies" c
left join "public"."deals" d on c.id = d.company_id
left join "public"."contacts" co on c.id = co.company_id
left join "public"."companyNotes" cn on c.id = cn.company_id
group by c.id;
