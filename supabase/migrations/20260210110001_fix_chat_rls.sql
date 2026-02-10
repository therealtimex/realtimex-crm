-- Fix RLS policies for chat tables to be more reliable
-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Users can view their own chat threads" ON public.chat_threads;
DROP POLICY IF EXISTS "Users can insert their own chat threads" ON public.chat_threads;
DROP POLICY IF EXISTS "Users can update their own chat threads" ON public.chat_threads;
DROP POLICY IF EXISTS "Users can delete their own chat threads" ON public.chat_threads;
DROP POLICY IF EXISTS "Users can view messages in their threads" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages into their threads" ON public.chat_messages;

-- Ensure RLS is enabled
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Thread Policies
CREATE POLICY "Users can view their own chat threads"
    ON public.chat_threads FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat threads"
    ON public.chat_threads FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat threads"
    ON public.chat_threads FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat threads"
    ON public.chat_threads FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Message Policies
-- Simplified message policies using a join-less check if possible, 
-- but since messages don't have user_id, we stick to the thread check but ensure it's performant.
CREATE POLICY "Users can view messages in their threads"
    ON public.chat_messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_threads 
            WHERE id = chat_messages.thread_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages into their threads"
    ON public.chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_threads 
            WHERE id = thread_id AND user_id = auth.uid()
        )
    );

-- Grant permissions explicitly
GRANT ALL ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
GRANT ALL ON public.chat_messages TO service_role;
