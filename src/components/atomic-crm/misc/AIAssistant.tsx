import React, { useState, useMemo } from 'react';
import {
    ThreadPrimitive,
    MessagePrimitive,
    ComposerPrimitive,
    useLocalRuntime,
    AssistantRuntimeProvider,
    type ChatModelAdapter
} from "@assistant-ui/react";
import { Sparkles, X, Send, User, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ds/ui/button";
import { useSDK } from '../root/SDKProvider';
import axios from 'axios';

/**
 * Custom Thread Component
 * Since @assistant-ui/react is headless, we build a simple, clean UI here.
 */
const CustomThread = () => {
    return (
        <ThreadPrimitive.Root className="flex flex-col h-full bg-background">
            <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-4 space-y-4">
                <ThreadPrimitive.Empty>
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                        <div className="p-3 bg-info/10 rounded-full">
                            <Sparkles className="h-8 w-8 text-info" />
                        </div>
                        <h3 className="font-semibold text-lg">AI Assistant</h3>
                        <p className="text-sm text-muted-foreground">
                            I can help you analyze contacts, summarize notes, and manage your CRM data.
                        </p>
                    </div>
                </ThreadPrimitive.Empty>

                <ThreadPrimitive.Messages
                    components={{
                        Message: ({ message }) => (
                            <MessagePrimitive.Root className={`flex gap-3 mb-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-1 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                    }`}>
                                    {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                </div>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted rounded-tl-none'
                                    }`}>
                                    <MessagePrimitive.Content />
                                </div>
                            </MessagePrimitive.Root>
                        )
                    }}
                />
            </ThreadPrimitive.Viewport>

            <div className="p-4 border-t bg-muted/20">
                <ComposerPrimitive.Root className="relative flex items-center gap-2">
                    <ComposerPrimitive.Input
                        placeholder="Type your message..."
                        className="flex-1 min-h-[44px] max-h-32 p-3 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all pr-12"
                    />
                    <ComposerPrimitive.Send asChild>
                        <Button size="icon" className="absolute right-1.5 h-8 w-8 rounded-lg shadow-sm">
                            <Send className="h-4 w-4" />
                        </Button>
                    </ComposerPrimitive.Send>
                </ComposerPrimitive.Root>
            </div>
        </ThreadPrimitive.Root>
    );
};

import { useAISettings } from '../root/AISettingsProvider';

// ... (CustomThread component remains same)

export const AIAssistant = () => {
    const { isAvailable } = useSDK();
    const { settings } = useAISettings();
    const [isOpen, setIsOpen] = useState(false);

    const adapter: ChatModelAdapter = useMemo(() => ({
        run: async ({ messages, abortSignal }) => {
            try {
                const response = await axios.post('/api/sdk/chat', {
                    messages: messages.map(m => ({
                        role: m.role,
                        content: m.content.map(part => {
                            if (part.type === 'text') return part.text;
                            return '';
                        }).join('\n')
                    })),
                    settings: {
                        llm_provider: settings.llm_provider,
                        llm_model: settings.llm_model,
                    }
                }, { signal: abortSignal });

                if (response.data.success) {
                    const content = response.data.content;

                    // Handle TTS Auto-play
                    if (settings.tts_auto_play && settings.tts_provider && settings.tts_voice) {
                        axios.post('/api/sdk/tts', {
                            text: content,
                            settings: {
                                provider: settings.tts_provider,
                                voice: settings.tts_voice,
                                speed: settings.tts_speed,
                            }
                        }, { responseType: 'arraybuffer' }).then(res => {
                            const blob = new Blob([res.data], { type: 'audio/mpeg' });
                            const url = URL.createObjectURL(blob);
                            new Audio(url).play();
                        }).catch(err => console.error('TTS Auto-play failed:', err));
                    }

                    return {
                        content: [{ type: 'text', text: content }],
                        status: { type: 'complete', reason: 'stop' }
                    };
                } else {
                    throw new Error(response.data.message || "AI Error");
                }
            } catch (error: any) {
                return {
                    status: { type: 'incomplete', reason: 'error', error: error.message }
                };
            }
        }
    }), [settings]); // Re-create adapter when settings change

    const runtime = useLocalRuntime(adapter);

    if (!isAvailable) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {!isOpen ? (
                <Button
                    size="icon"
                    className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground animate-in zoom-in duration-300"
                    onClick={() => setIsOpen(true)}
                >
                    <Sparkles className="h-6 w-6" />
                </Button>
            ) : (
                <div className="flex flex-col h-[600px] w-[400px] bg-background border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                        <div className="flex items-center space-x-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm">RealTimeX CRM AI</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <AssistantRuntimeProvider runtime={runtime}>
                        <div className="flex-1 overflow-hidden">
                            <CustomThread />
                        </div>
                    </AssistantRuntimeProvider>
                </div>
            )}
        </div>
    );
};
