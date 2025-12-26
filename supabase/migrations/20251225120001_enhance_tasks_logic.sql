-- 1.3 Tasks Summary View
CREATE OR REPLACE VIEW public.tasks_summary AS
SELECT
    t.id,
    t.contact_id,
    t.type,
    t.text,
    t.due_date,
    t.done_date,
    t.sales_id,
    t.priority,
    t.assigned_to,
    t.status,
    t.created_at,
    t.updated_at,
    t.archived,
    t.archived_at,
    -- Contact information
    c.first_name as contact_first_name,
    c.last_name as contact_last_name,
    c.email_jsonb->0->>'email' as contact_email,
    c.company_id,
    comp.name as company_name,
    -- Assigned sales person
    s_assigned.first_name as assigned_first_name,
    s_assigned.last_name as assigned_last_name,
    -- Creator sales person
    s_creator.first_name as creator_first_name,
    s_creator.last_name as creator_last_name,
    -- Task note count
    count(DISTINCT tn.id) as nb_notes,
    -- Most recent note
    max(tn.date) as last_note_date
FROM public.tasks t
LEFT JOIN public.contacts c ON t.contact_id = c.id
LEFT JOIN public.companies comp ON c.company_id = comp.id
LEFT JOIN public.sales s_assigned ON t.assigned_to = s_assigned.id
LEFT JOIN public.sales s_creator ON t.sales_id = s_creator.id
LEFT JOIN public."taskNotes" tn ON t.id = tn.task_id
GROUP BY
    t.id,
    c.first_name, c.last_name, c.email_jsonb, c.company_id,
    comp.name,
    s_assigned.first_name, s_assigned.last_name,
    s_creator.first_name, s_creator.last_name;

GRANT SELECT ON public.tasks_summary TO authenticated;

-- 1.5 Archiving Function
CREATE OR REPLACE FUNCTION archive_completed_tasks(days_threshold integer DEFAULT 30)
RETURNS integer AS $$
DECLARE
    archived_count integer;
BEGIN
    WITH archived AS (
        UPDATE public.tasks
        SET archived = true,
            archived_at = NOW()
        WHERE status = 'done'
          AND done_date IS NOT NULL
          AND done_date < NOW() - (days_threshold || ' days')::interval
          AND archived = false
        RETURNING id
    )
    SELECT COUNT(*) INTO archived_count FROM archived;

    RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION archive_completed_tasks TO authenticated;

-- 1.6 Real-Time
-- tasks table is already enabled for realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public."taskNotes";
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_activity;

-- Sync Logic for Status and Done Date (Section 7)
CREATE OR REPLACE FUNCTION sync_task_status_and_done_date()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to 'done', set done_date
    IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done') THEN
        NEW.done_date = NOW();
    END IF;

    -- If status changed from 'done', clear done_date
    IF NEW.status != 'done' AND OLD.status = 'done' THEN
        NEW.done_date = NULL;
    END IF;

    -- If done_date set, update status to 'done'
    IF NEW.done_date IS NOT NULL AND OLD.done_date IS NULL THEN
        NEW.status = 'done';
    END IF;

    -- If done_date cleared, update status away from 'done'
    IF NEW.done_date IS NULL AND OLD.done_date IS NOT NULL THEN
        NEW.status = 'todo';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_task_status_trigger
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION sync_task_status_and_done_date();
