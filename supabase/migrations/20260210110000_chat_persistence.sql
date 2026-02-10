-- Create chat_threads table
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own chat threads"
    ON public.chat_threads FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat threads"
    ON public.chat_threads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat threads"
    ON public.chat_threads FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat threads"
    ON public.chat_threads FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages in their threads"
    ON public.chat_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.chat_threads 
        WHERE id = chat_messages.thread_id AND user_id = auth.uid()
    ));

CREATE POLICY "Users can insert messages into their threads"
    ON public.chat_messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.chat_threads 
        WHERE id = chat_messages.thread_id AND user_id = auth.uid()
    ));

-- Grant access to authenticated users
GRANT ALL ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_messages TO authenticated;

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;