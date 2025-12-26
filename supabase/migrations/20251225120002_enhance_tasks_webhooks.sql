-- 1.7 Extend Task Webhooks

CREATE OR REPLACE FUNCTION trigger_task_webhooks()
RETURNS TRIGGER AS $$
DECLARE
  specific_event_fired boolean := false;
BEGIN
  -- Task created
  IF TG_OP = 'INSERT' THEN
    PERFORM enqueue_webhook_event('task.created', to_jsonb(NEW));
    RETURN NEW;
  END IF;

  -- Task updated
  IF TG_OP = 'UPDATE' THEN
    -- Task completed (existing logic - keep for backward compatibility)
    IF OLD.done_date IS NULL AND NEW.done_date IS NOT NULL THEN
      PERFORM enqueue_webhook_event('task.completed', to_jsonb(NEW));
      specific_event_fired := true;
    END IF;

    -- Task assigned/reassigned
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      PERFORM enqueue_webhook_event('task.assigned', jsonb_build_object(
        'task', to_jsonb(NEW),
        'old_assignee', OLD.assigned_to,
        'new_assignee', NEW.assigned_to
      ));
      specific_event_fired := true;
    END IF;

    -- Task archived
    IF OLD.archived IS DISTINCT FROM NEW.archived AND NEW.archived = true THEN
      PERFORM enqueue_webhook_event('task.archived', to_jsonb(NEW));
      specific_event_fired := true;
    END IF;

    -- Task priority changed
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      PERFORM enqueue_webhook_event('task.priority_changed', jsonb_build_object(
        'task', to_jsonb(NEW),
        'old_priority', OLD.priority,
        'new_priority', NEW.priority
      ));
      specific_event_fired := true;
    END IF;

    -- Generic task.updated (only fires if no specific event matched)
    -- This reduces webhook noise while still catching other field changes
    IF NOT specific_event_fired THEN
      PERFORM enqueue_webhook_event('task.updated', jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      ));
    END IF;
  END IF;

  -- Task deleted
  IF TG_OP = 'DELETE' THEN
    PERFORM enqueue_webhook_event('task.deleted', to_jsonb(OLD));
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists in previous migrations, but we can recreate it to be safe or ensure it covers INSERT/DELETE
DROP TRIGGER IF EXISTS tasks_webhook_trigger ON public.tasks;
CREATE TRIGGER tasks_webhook_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_task_webhooks();
