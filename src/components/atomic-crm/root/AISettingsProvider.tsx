import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNotify } from 'ra-core';
import { supabase } from '../providers/supabase';

export interface AISettings {
    llm_provider: string;
    llm_model: string;
    embedding_provider: string;
    embedding_model: string;
    tts_provider: string;
    tts_voice: string;
    tts_speed: number;
    tts_quality: number;
    tts_auto_play: boolean;
}

const DEFAULT_SETTINGS: AISettings = {
    llm_provider: 'realtimexai',
    llm_model: 'gpt-4o-mini',
    embedding_provider: 'realtimexai',
    embedding_model: 'text-embedding-3-small',
    tts_provider: '',
    tts_voice: '',
    tts_speed: 1.0,
    tts_quality: 10,
    tts_auto_play: true,
};

interface AISettingsContextType {
    settings: AISettings;
    loading: boolean;
    updateSettings: (newSettings: Partial<AISettings>) => Promise<void>;
    refreshSettings: () => Promise<void>;
}

const AISettingsContext = createContext<AISettingsContextType | undefined>(undefined);

export const AISettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const notify = useNotify();

    const fetchSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('ai_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setSettings({
                    llm_provider: data.llm_provider || DEFAULT_SETTINGS.llm_provider,
                    llm_model: data.llm_model || DEFAULT_SETTINGS.llm_model,
                    embedding_provider: data.embedding_provider || DEFAULT_SETTINGS.embedding_provider,
                    embedding_model: data.embedding_model || DEFAULT_SETTINGS.embedding_model,
                    tts_provider: data.tts_provider || DEFAULT_SETTINGS.tts_provider,
                    tts_voice: data.tts_voice || DEFAULT_SETTINGS.tts_voice,
                    tts_speed: data.tts_speed || DEFAULT_SETTINGS.tts_speed,
                    tts_quality: data.tts_quality || DEFAULT_SETTINGS.tts_quality,
                    tts_auto_play: data.tts_auto_play !== undefined ? data.tts_auto_play : DEFAULT_SETTINGS.tts_auto_play,
                });
            }
        } catch (error: any) {
            console.error('[AISettingsProvider] Failed to fetch settings:', error);
            // Don't notify here to avoid spamming on every mount, use defaults
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (newSettings: Partial<AISettings>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('ai_settings')
                .upsert({
                    user_id: user.id,
                    ...newSettings,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });

            if (error) throw error;

            setSettings(prev => ({ ...prev, ...newSettings }));
            notify('AI settings updated', { type: 'success' });
        } catch (error: any) {
            console.error('[AISettingsProvider] Failed to update settings:', error);
            notify(`Failed to update AI settings: ${error.message}`, { type: 'error' });
            throw error;
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return (
        <AISettingsContext.Provider value={{ settings, loading, updateSettings, refreshSettings: fetchSettings }}>
            {children}
        </AISettingsContext.Provider>
    );
};

export const useAISettings = () => {
    const context = useContext(AISettingsContext);
    if (context === undefined) {
        throw new Error('useAISettings must be used within an AISettingsProvider');
    }
    return context;
};
