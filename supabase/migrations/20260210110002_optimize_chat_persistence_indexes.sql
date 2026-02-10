-- Optimize chat persistence query patterns and RLS checks
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_id
    ON public.chat_threads(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_updated_at
    ON public.chat_threads(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id_created_at
    ON public.chat_messages(thread_id, created_at);
