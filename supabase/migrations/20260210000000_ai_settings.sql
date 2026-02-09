-- Create AI Settings table for persistent user configurations
CREATE TABLE IF NOT EXISTS public.ai_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    llm_provider text DEFAULT 'realtimexai',
    llm_model text DEFAULT 'gpt-4o-mini',
    embedding_provider text DEFAULT 'realtimexai',
    embedding_model text DEFAULT 'text-embedding-3-small',
    tts_provider text DEFAULT '',
    tts_voice text DEFAULT '',
    tts_speed float DEFAULT 1.0,
    tts_quality int DEFAULT 10,
    tts_auto_play boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Policies for AI Settings (User-isolated)
CREATE POLICY "Users can view their own AI settings"
    ON public.ai_settings FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI settings"
    ON public.ai_settings FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI settings"
    ON public.ai_settings FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_settings_updated_at
    BEFORE UPDATE ON public.ai_settings
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Grant access to authenticated users
GRANT ALL ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;
