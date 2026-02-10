import React, { useEffect, useRef } from 'react';
import { Volume2, VolumeX, Loader2, Pause } from 'lucide-react';
import { useTTS } from './TTSContext';
import { useAISettings } from '../root/AISettingsProvider';
import { cn } from '@/lib/utils';

interface TTSButtonProps {
    messageId: string;
    content: string;
    isNewMessage?: boolean;
}

export const TTSButton: React.FC<TTSButtonProps> = ({ messageId, content, isNewMessage = false }) => {
    const { playingMessageId, state, playMessage, pauseMessage, resumeMessage } = useTTS();
    const { settings } = useAISettings();
    const hasAutoPlayed = useRef(false);

    const isThisPlaying = playingMessageId === messageId;
    const isPlaying = isThisPlaying && state === 'playing';
    const isPaused = isThisPlaying && state === 'paused';
    const isLoading = isThisPlaying && state === 'loading';

    // Auto-play new messages if enabled
    useEffect(() => {
        if (isNewMessage && !hasAutoPlayed.current && settings.tts_auto_play && settings.tts_provider) {
            hasAutoPlayed.current = true;
            // Small delay to ensure message is rendered
            setTimeout(() => {
                playMessage(messageId, content, {
                    tts_provider: settings.tts_provider,
                    tts_voice: settings.tts_voice,
                    tts_speed: settings.tts_speed,
                    tts_quality: settings.tts_quality,
                });
            }, 100);
        }
    }, [isNewMessage, messageId, content, settings, playMessage]);

    const handleClick = () => {
        if (isLoading) return;

        if (isPlaying) {
            pauseMessage();
        } else if (isPaused) {
            resumeMessage();
        } else {
            // Play this message (will auto-stop any currently playing message)
            playMessage(messageId, content, {
                tts_provider: settings.tts_provider,
                tts_voice: settings.tts_voice,
                tts_speed: settings.tts_speed,
                tts_quality: settings.tts_quality,
            });
        }
    };

    // Don't show if no TTS provider configured
    if (!settings.tts_provider) return null;

    return (
        <button
            onClick={handleClick}
            className={cn(
                "p-1 rounded-md transition-all hover:bg-muted/50",
                isPlaying && "text-primary animate-pulse"
            )}
            title={
                isLoading ? 'Loading audio...' :
                isPlaying ? 'Pause' :
                isPaused ? 'Resume' :
                'Play audio'
            }
        >
            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            {isPlaying && <Volume2 className="h-3 w-3" />}
            {isPaused && <Pause className="h-3 w-3" />}
            {!isThisPlaying && !isLoading && <VolumeX className="h-3 w-3 opacity-50 hover:opacity-100" />}
        </button>
    );
};
