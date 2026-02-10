import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ThreadPrimitive,
    MessagePrimitive,
    ComposerPrimitive,
    useLocalRuntime,
    AssistantRuntimeProvider,
    useMessage,
    type ChatModelAdapter
} from "@assistant-ui/react";
import { Sparkles, X, Send, User, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ds/ui/button";
import { useLocation } from 'react-router';
import { useSDK } from '../root/SDKProvider';
import axios from 'axios';
import { useAISettings } from '../root/AISettingsProvider';
import { supabase } from '../providers/supabase/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Markdown Renderer for AI messages
 */
const MarkdownText = () => {
    return (
        <MessagePrimitive.Content 
            components={{
                Text: ({ text }) => (
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed
                                 prose-p:leading-relaxed prose-pre:bg-muted prose-pre:p-2 prose-pre:rounded-lg
                                 prose-code:bg-muted/50 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none"
                    >
                        {text}
                    </ReactMarkdown>
                )
            }}
        />
    );
};

/**
 * Custom Thread Component
 * Since @assistant-ui/react is headless, we build a simple, clean UI here.
 */
const CustomThread = ({ ready }: { ready: boolean }) => {
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
                        Message: () => {
                            const { role } = useMessage();
                            return (
                                <MessagePrimitive.Root className={`flex gap-3 mb-4 ${role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-1 ${role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                        {role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                    </div>
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted rounded-tl-none'}`}>
                                        {role === 'assistant' ? <MarkdownText /> : <MessagePrimitive.Content />}
                                    </div>
                                </MessagePrimitive.Root>
                            );
                        }
                    }}
                />
            </ThreadPrimitive.Viewport>

            <div className="p-4 border-t bg-muted/20">
                <ComposerPrimitive.Root className="relative flex items-center gap-2">
                    <ComposerPrimitive.Input
                        placeholder={ready ? "Type your message..." : "Preparing conversation..."}
                        disabled={!ready}
                        className="flex-1 min-h-[44px] max-h-32 p-3 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all pr-12"
                    />
                    <ComposerPrimitive.Send asChild>
                        <Button size="icon" disabled={!ready} className="absolute right-1.5 h-8 w-8 rounded-lg shadow-sm">
                            <Send className="h-4 w-4" />
                        </Button>
                    </ComposerPrimitive.Send>
                </ComposerPrimitive.Root>
            </div>
        </ThreadPrimitive.Root>
    );
};

export const AIAssistant = () => {
    const { isAvailable } = useSDK();
    const location = useLocation();
    const { settings } = useAISettings();
    const [isOpen, setIsOpen] = useState(false);
    
    // Manage persistent thread ID
    const [threadId, setThreadId] = useState<string | null>(null);
    const [threadInitializing, setThreadInitializing] = useState(false);
    const threadPromiseRef = useRef<Promise<string | null> | null>(null);

    const ensureThreadId = useCallback(async (): Promise<string | null> => {
        if (threadId) return threadId;
        if (threadPromiseRef.current) return threadPromiseRef.current;

        threadPromiseRef.current = (async () => {
            setThreadInitializing(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return null;

                const storageKey = `realtimex_crm_thread_id_${user.id}`;
                const storedThreadId = localStorage.getItem(storageKey);

                if (storedThreadId) {
                    const { data, error } = await supabase
                        .from('chat_threads')
                        .select('id')
                        .eq('id', storedThreadId)
                        .maybeSingle();

                    if (data && !error) {
                        setThreadId(data.id);
                        return data.id;
                    }
                    localStorage.removeItem(storageKey);
                }

                const { data, error } = await supabase
                    .from('chat_threads')
                    .insert({
                        user_id: user.id,
                        title: 'New Conversation'
                    })
                    .select()
                    .single();

                if (error || !data) {
                    console.error('[AIAssistant] Failed to create thread:', error);
                    return null;
                }

                setThreadId(data.id);
                localStorage.setItem(storageKey, data.id);
                return data.id as string;
            } finally {
                setThreadInitializing(false);
                threadPromiseRef.current = null;
            }
        })();

        return threadPromiseRef.current;
    }, [threadId]);

    // Initialize or load thread
    useEffect(() => {
        if (isOpen && isAvailable) {
            ensureThreadId().catch((error) => {
                console.error('[AIAssistant] Failed to initialize thread:', error);
            });
        }
    }, [isOpen, isAvailable, ensureThreadId]);

    const adapter: ChatModelAdapter = useMemo(() => ({
        run: async function* ({ messages, abortSignal }) {
            const activeThreadId = (await ensureThreadId()) ?? threadId;
            if (!activeThreadId) {
                throw new Error('Could not initialize conversation thread');
            }

            const lastMessage = messages[messages.length - 1];
            const userContent = lastMessage.content.map(part => {
                if (part.type === 'text') return part.text || '';
                return '';
            }).join('\n');

            // 1. Save user message to DB
            const { error: userMessageError } = await supabase.from('chat_messages').insert({
                thread_id: activeThreadId,
                role: 'user',
                content: userContent
            });
            if (userMessageError) {
                console.error('[AIAssistant] Failed to save user message:', userMessageError);
            }

            // Update thread metadata
            if (messages.length === 1) {
                const title = userContent.substring(0, 40) + (userContent.length > 40 ? '...' : '');
                await supabase.from('chat_threads')
                    .update({ title, updated_at: new Date().toISOString() })
                    .eq('id', activeThreadId);
            } else {
                await supabase.from('chat_threads')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', activeThreadId);
            }

            try {
                const response = await axios.post('/api/sdk/chat', {
                    threadId: activeThreadId,
                    messages: messages.map(m => ({
                        role: m.role,
                        content: m.content.map(part => {
                            if (part.type === 'text') return part.text || '';
                            if (part.type === 'ui') return '[UI Content]';
                            return '';
                        }).join('\n')
                    })),
                    settings: {
                        llm_provider: settings.llm_provider,
                        llm_model: settings.llm_model,
                    }
                }, { signal: abortSignal });

                if (response.data.success) {
                    let content = response.data.content;
                    
                    if (content === null || content === undefined) {
                        content = '';
                    } else if (typeof content !== 'string') {
                        content = JSON.stringify(content);
                    }

                    // 2. Save assistant response to DB
                    if (content) {
                        const { error: assistantMessageError } = await supabase.from('chat_messages').insert({
                            thread_id: activeThreadId,
                            role: 'assistant',
                            content: content
                        });
                        if (assistantMessageError) {
                            console.error('[AIAssistant] Failed to save assistant message:', assistantMessageError);
                        }
                    }

                    // Handle TTS Auto-play (only if provider is configured)
                    if (settings.tts_auto_play && settings.tts_provider && settings.tts_voice && content) {
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
                        }).catch(err => {
                            if (err.response?.status !== 500) {
                                console.error('TTS Auto-play failed:', err.response?.data?.message || err.message);
                            }
                        });
                    }

                    yield {
                        content: [{ type: 'text', text: content }],
                    };
                } else {
                    throw new Error(response.data.message || "AI Error");
                }
            } catch (error: any) {
                console.error('[AIAssistant] Chat Error:', error);
                yield {
                    content: [{ type: 'text', text: `Error: ${error.message}` }],
                };
            }
        }
    }), [settings, threadId, ensureThreadId]);

    const runtime = useLocalRuntime(adapter);
    const isAIPage = location.pathname.startsWith('/ai');

    if (!isAvailable || isAIPage) return null;

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
                            {threadInitializing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <AssistantRuntimeProvider runtime={runtime}>
                        <div className="flex-1 overflow-hidden">
                            <CustomThread ready={!threadInitializing} />
                        </div>
                    </AssistantRuntimeProvider>
                </div>
            )}
        </div>
    );
};
