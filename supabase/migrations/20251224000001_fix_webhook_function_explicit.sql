-- Explicitly define function in public schema
create or replace function public.enqueue_webhook_event(
    p_event_type text,
    p_payload jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Find all active webhooks that listen to this event
    insert into public.webhook_queue (webhook_id, event_type, payload, next_retry_at)
    select
        id,
        p_event_type,
        p_payload,
        now()
    from public.webhooks
    where is_active = true
        and p_event_type = any(events);
end;
$$;

-- Grant execute permissions
grant execute on function public.enqueue_webhook_event(text, jsonb) to authenticated;
grant execute on function public.enqueue_webhook_event(text, jsonb) to service_role;
grant execute on function public.enqueue_webhook_event(text, jsonb) to anon;

-- Update triggers to use fully qualified name

-- Trigger function for contact CRUD events
create or replace function public.trigger_contact_webhooks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    event_type text;
    payload jsonb;
begin
    if (TG_OP = 'INSERT') then
        event_type := 'contact.created';
        payload := to_jsonb(NEW);
    elsif (TG_OP = 'UPDATE') then
        event_type := 'contact.updated';
        payload := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    elsif (TG_OP = 'DELETE') then
        event_type := 'contact.deleted';
        payload := to_jsonb(OLD);
    end if;

    perform public.enqueue_webhook_event(event_type, payload);

    if (TG_OP = 'DELETE') then
        return OLD;
    else
        return NEW;
    end if;
end;
$$;

-- Trigger function for company CRUD events
create or replace function public.trigger_company_webhooks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    event_type text;
    payload jsonb;
begin
    if (TG_OP = 'INSERT') then
        event_type := 'company.created';
        payload := to_jsonb(NEW);
    elsif (TG_OP = 'UPDATE') then
        event_type := 'company.updated';
        payload := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    elsif (TG_OP = 'DELETE') then
        event_type := 'company.deleted';
        payload := to_jsonb(OLD);
    end if;

    perform public.enqueue_webhook_event(event_type, payload);

    if (TG_OP = 'DELETE') then
        return OLD;
    else
        return NEW;
    end if;
end;
$$;

-- Trigger function for deal CRUD and stage change events
create or replace function public.trigger_deal_webhooks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    event_type text;
    payload jsonb;
begin
    if (TG_OP = 'INSERT') then
        event_type := 'deal.created';
        payload := to_jsonb(NEW);
        perform public.enqueue_webhook_event(event_type, payload);
    elsif (TG_OP = 'UPDATE') then
        -- Check for stage changes
        if (OLD.stage <> NEW.stage) then
            event_type := 'deal.stage_changed';
            payload := jsonb_build_object(
                'deal_id', NEW.id,
                'old_stage', OLD.stage,
                'new_stage', NEW.stage,
                'deal', to_jsonb(NEW)
            );
            perform public.enqueue_webhook_event(event_type, payload);

            -- Check for won/lost
            if (NEW.stage = 'won') then
                perform public.enqueue_webhook_event('deal.won', to_jsonb(NEW));
            elsif (NEW.stage = 'lost') then
                perform public.enqueue_webhook_event('deal.lost', to_jsonb(NEW));
            end if;
        end if;

        event_type := 'deal.updated';
        payload := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
        perform public.enqueue_webhook_event(event_type, payload);
    elsif (TG_OP = 'DELETE') then
        event_type := 'deal.deleted';
        payload := to_jsonb(OLD);
        perform public.enqueue_webhook_event(event_type, payload);
    end if;

    if (TG_OP = 'DELETE') then
        return OLD;
    else
        return NEW;
    end if;
end;
$$;

-- Trigger function for task completion
create or replace function public.trigger_task_webhooks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if (TG_OP = 'UPDATE' and OLD.done_date is null and NEW.done_date is not null) then
        perform public.enqueue_webhook_event('task.completed', to_jsonb(NEW));
    end if;

    return NEW;
end;
$$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
