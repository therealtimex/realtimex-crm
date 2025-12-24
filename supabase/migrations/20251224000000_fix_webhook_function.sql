-- Function to enqueue webhook events
create or replace function enqueue_webhook_event(
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

-- Grant execute permissions on webhook functions
grant execute on function enqueue_webhook_event(text, jsonb) to authenticated;
grant execute on function enqueue_webhook_event(text, jsonb) to service_role;
grant execute on function enqueue_webhook_event(text, jsonb) to anon;
