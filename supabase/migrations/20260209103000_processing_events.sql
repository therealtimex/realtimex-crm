-- Create processing_events table for AI transparency (LiveTerminal)
CREATE TABLE IF NOT EXISTS public.processing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'thinking', 'acting', 'analyzing', 'success', 'error'
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime for processing_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.processing_events;

-- RLS Policies
ALTER TABLE public.processing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own processing events"
ON public.processing_events
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.activities a
        WHERE a.id = processing_events.activity_id
        AND (a.sales_id IN (SELECT id FROM public.sales WHERE user_id = auth.uid()) OR a.sales_id IS NULL)
    )
);

CREATE POLICY "Service role can manage processing events"
ON public.processing_events
USING (auth.jwt() ->> 'role' = 'service_role');

-- Index for performance
CREATE INDEX IF NOT EXISTS processing_events_activity_id_idx ON public.processing_events(activity_id);
CREATE INDEX IF NOT EXISTS processing_events_created_at_idx ON public.processing_events(created_at DESC);
