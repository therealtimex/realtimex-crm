import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNotify } from 'ra-core';
import { 
    MessageSquare, 
    Plus, 
    Search,
    Trash2,
    ChevronRight,
    Sparkles,
    User,
    Bot,
    Send
} from "lucide-react";
import { 
    Sidebar, 
    SidebarContent, 
    SidebarGroup, 
    SidebarGroupContent, 
    SidebarHeader, 
    SidebarMenu, 
    SidebarMenuButton, 
    SidebarMenuItem, 
    SidebarProvider,
    SidebarInset,
    SidebarInput
} from "@/components/ds/ui/sidebar";
import { Button } from "@/components/ds/ui/button";
import { useSDK } from '../root/SDKProvider';
import { supabase } from '../providers/supabase/supabase';
import {
    ThreadPrimitive,
    MessagePrimitive,
    ComposerPrimitive,
    useLocalRuntime,
    AssistantRuntimeProvider,
    useMessage,
    type ChatModelAdapter
} from "@assistant-ui/react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { useAISettings } from '../root/AISettingsProvider';
import { cn } from "@/lib/utils";
import { TTSProvider } from './TTSContext';
import { TTSButton } from './TTSButton';

// Context to track new messages for auto-play
const NewMessageContext = React.createContext<React.MutableRefObject<string | null> | null>(null);

interface Thread {
    id: string;
    title: string;
    created_at: string;
    updated_at?: string;
    last_message?: string;
}

interface ChatMessageDB {
    id: string;
    thread_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

interface ThreadWithMessages {
    id: string;
    title: string | null;
    created_at: string;
    updated_at: string | null;
    chat_messages?: ChatMessageDB[];
}

/**
 * Message Component for Assistant UI
 */
const AssistantMessage = () => {
    const message = useMessage();
    const { role, content } = message;
    const newMessageContentRef = React.useContext(NewMessageContext);

    // Extract text content for TTS
    const textContent = content
        .filter((part) => part.type === 'text')
        .map((part) => ('text' in part ? part.text : ''))
        .join('\n');

    // Check if this is a new message (for auto-play)
    const isNewMessage = newMessageContentRef ? textContent === newMessageContentRef.current : false;

    // Clear the ref after the message is rendered
    React.useEffect(() => {
        if (isNewMessage && newMessageContentRef) {
            newMessageContentRef.current = null;
        }
    }, [isNewMessage, newMessageContentRef]);

    return (
        <MessagePrimitive.Root className={cn(
            "flex gap-4 mb-6 group animate-in fade-in slide-in-from-bottom-2 duration-300",
            role === 'user' ? 'flex-row-reverse' : 'flex-row'
        )}>
            <div className={cn(
                "flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center shadow-sm",
                role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted border border-border'
            )}>
                {role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </div>
            <div className={cn(
                "flex flex-col max-w-[85%] space-y-1",
                role === 'user' ? 'items-end' : 'items-start'
            )}>
                <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-xs",
                    role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-card border border-border rounded-tl-none'
                )}>
                    <MessagePrimitive.Content
                        components={{
                            Text: ({ text }) => (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    className="prose prose-sm dark:prose-invert max-w-none break-words
                                             prose-p:leading-relaxed prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-xl
                                             prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
                                             prose-code:before:content-none prose-code:after:content-none
                                             prose-strong:text-foreground prose-headings:text-foreground"
                                >
                                    {text}
                                </ReactMarkdown>
                            )
                        }}
                    />
                </div>
                <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">
                        {role === 'user' ? 'You' : 'Assistant'}
                    </span>
                    {role === 'assistant' && textContent && (
                        <TTSButton
                            messageId={message.id}
                            content={textContent}
                            isNewMessage={isNewMessage}
                        />
                    )}
                </div>
            </div>
        </MessagePrimitive.Root>
    );
};

const AIPageContent = () => {
    const { isAvailable } = useSDK();
    const { settings } = useAISettings();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const notify = useNotify();
    const newMessageContentRef = useRef<string | null>(null);

    const fetchThreads = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('chat_threads')
                .select(`
                    id,
                    title,
                    created_at,
                    updated_at,
                    chat_messages (
                        content,
                        created_at
                    )
                `)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            const formattedThreads = (data as ThreadWithMessages[]).map((t) => ({
                id: t.id,
                title: t.title || 'Untitled Conversation',
                created_at: t.created_at,
                updated_at: t.updated_at,
                last_message: t.chat_messages?.sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0]?.content
            }));

            setThreads(formattedThreads);
            setActiveThreadId((prev) => {
                if (prev && formattedThreads.some((thread) => thread.id === prev)) return prev;
                return formattedThreads[0]?.id ?? null;
            });
        } catch (error) {
            console.error('Failed to fetch threads:', error);
            notify('Failed to fetch AI conversations', { type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [notify]);

    const createThread = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('chat_threads')
            .insert({
                user_id: user.id,
                title: 'New Conversation'
            })
            .select()
            .single();

        if (error || !data) {
            throw error ?? new Error('Failed to create conversation');
        }

        const newThread: Thread = {
            id: data.id,
            title: data.title || 'New Conversation',
            created_at: data.created_at,
            updated_at: data.updated_at,
        };
        setThreads((prev) => [newThread, ...prev]);
        setActiveThreadId(data.id);
        return data.id as string;
    }, []);

    useEffect(() => {
        fetchThreads();
        
        // Listen for refresh events (from AIAssistant)
        const handleRefresh = () => fetchThreads();
        window.addEventListener('realtimex-refresh-threads', handleRefresh);
        return () => window.removeEventListener('realtimex-refresh-threads', handleRefresh);
    }, [fetchThreads]);

    const handleCreateThread = async () => {
        try {
            // Clear messages immediately for better UX
            setInitialMessages([]);
            setMessagesLoading(true);

            await createThread();

            // Messages will be loaded by the useEffect when activeThreadId changes
        } catch (error) {
            console.error('Failed to create thread:', error);
            notify('Failed to create new conversation', { type: 'error' });
            setMessagesLoading(false);
        }
    };

    const handleDeleteThread = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        // Confirmation dialog
        const thread = threads.find(t => t.id === id);
        const confirmMessage = `Delete "${thread?.title || 'this conversation'}"? This cannot be undone.`;
        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('chat_threads')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setThreads((prev) => {
                const filtered = prev.filter((thread) => thread.id !== id);
                setActiveThreadId((currentActive) => {
                    if (currentActive !== id) return currentActive;
                    return filtered[0]?.id ?? null;
                });
                return filtered;
            });
            notify('Conversation deleted', { type: 'success' });
        } catch (error) {
            console.error('Failed to delete thread:', error);
            notify('Failed to delete conversation', { type: 'error' });
        }
    };

    const filteredThreads = useMemo(() => {
        return threads.filter(t => 
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [threads, searchQuery]);

    const [initialMessages, setInitialMessages] = useState<Array<{
        id: string;
        role: 'user' | 'assistant';
        content: Array<{ type: 'text'; text: string }>;
    }>>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const activeThreadIdRef = useRef<string | null>(null);
    const threadsRef = useRef<Thread[]>([]);

    // Keep refs in sync with state
    useEffect(() => {
        activeThreadIdRef.current = activeThreadId;
    }, [activeThreadId]);

    useEffect(() => {
        threadsRef.current = threads;
    }, [threads]);

    useEffect(() => {
        let isCancelled = false;

        const fetchMessages = async () => {
            if (!activeThreadId) {
                setInitialMessages([]);
                setMessagesLoading(false);
                return;
            }

            setInitialMessages([]);
            setMessagesLoading(true);
            try {
                const { data, error } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('thread_id', activeThreadId)
                    .order('created_at', { ascending: true });
                
                if (error) throw error;

                if (isCancelled) return;
                setInitialMessages((data as ChatMessageDB[]).map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: [{ type: 'text', text: m.content }]
                })));
            } catch (error) {
                console.error('Failed to fetch messages:', error);
            } finally {
                if (!isCancelled) {
                    setMessagesLoading(false);
                }
            }
        };

        fetchMessages();
        return () => {
            isCancelled = true;
        };
    }, [activeThreadId]);

    const adapter: ChatModelAdapter = useMemo(() => ({
        run: async function* ({ messages, abortSignal }) {
            let effectiveThreadId = activeThreadIdRef.current;
            if (!effectiveThreadId) {
                effectiveThreadId = await createThread();
                // Ensure threads state is fresh after creation
                await fetchThreads();
            }
            if (!effectiveThreadId) {
                throw new Error('Unable to create conversation thread');
            }

            const lastMessage = messages[messages.length - 1];
            const userContent = lastMessage.content.map(part => {
                if (part.type === 'text') return part.text || '';
                return '';
            }).join('\n');

            // 1. Save user message to DB
            await supabase.from('chat_messages').insert({
                thread_id: effectiveThreadId,
                role: 'user',
                content: userContent
            });

            // 2. Get current thread from DB to check title
            const { data: currentThread } = await supabase
                .from('chat_threads')
                .select('title')
                .eq('id', effectiveThreadId)
                .single();

            let updatedTitle: string | undefined;
            if (currentThread && (currentThread.title === 'New Conversation' || currentThread.title === 'Untitled Conversation')) {
                updatedTitle = userContent.substring(0, 40) + (userContent.length > 40 ? '...' : '');
                await supabase.from('chat_threads')
                    .update({ title: updatedTitle, updated_at: new Date().toISOString() })
                    .eq('id', effectiveThreadId);
            } else {
                await supabase.from('chat_threads')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', effectiveThreadId);
            }

            try {
                const response = await axios.post('/api/sdk/chat', {
                    threadId: effectiveThreadId,
                    messages: messages.map(m => ({
                        role: m.role,
                        content: m.content.map(part => {
                            if (part.type === 'text') return part.text || '';
                            return '';
                        }).join('\n')
                    })),
                    settings: {
                        llm_provider: settings.llm_provider,
                        llm_model: settings.llm_model,
                    }
                }, { signal: abortSignal });

                if (response.data.success) {
                    const content = response.data.content || '';

                    // 3. Save assistant response to DB
                    let messageId: string | undefined;
                    if (content) {
                        const { data: insertedMessage } = await supabase
                            .from('chat_messages')
                            .insert({
                                thread_id: effectiveThreadId,
                                role: 'assistant',
                                content: content
                            })
                            .select('id')
                            .single();
                        messageId = insertedMessage?.id;
                    }

                    // 4. Update only the current thread in state (performance optimization)
                    const now = new Date().toISOString();
                    setThreads((prev) => {
                        const updated = prev.map(t =>
                            t.id === effectiveThreadId
                                ? {
                                    ...t,
                                    title: updatedTitle || t.title,
                                    updated_at: now,
                                    last_message: content
                                }
                                : t
                        );
                        // Re-sort by updated_at
                        return updated.sort((a, b) =>
                            new Date(b.updated_at || b.created_at).getTime() -
                            new Date(a.updated_at || a.created_at).getTime()
                        );
                    });

                    // Mark this as a new message for auto-play
                    newMessageContentRef.current = content;

                    yield {
                        content: [{ type: 'text', text: content }],
                    };
                } else {
                    throw new Error(response.data.message || "AI Error");
                }
            } catch (error) {
                console.error('[AIPage] Chat Error:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                yield {
                    content: [{ type: 'text', text: `Error: ${errorMessage}` }],
                };
            }
        }
    }), [settings.llm_provider, settings.llm_model, createThread, fetchThreads]);

    const runtime = useLocalRuntime(adapter, { initialMessages });

    // Reset runtime when switching threads or when messages finish loading
    const prevThreadIdRef = useRef<string | null>(null);
    useEffect(() => {
        // Only reset if we're not loading and messages have changed
        if (messagesLoading) return;

        // If thread changed or messages loaded, reset the runtime
        if (prevThreadIdRef.current !== activeThreadId) {
            prevThreadIdRef.current = activeThreadId;
            runtime.thread.reset(initialMessages);
        } else if (initialMessages.length > 0) {
            // Messages loaded for current thread
            runtime.thread.reset(initialMessages);
        }
    }, [activeThreadId, initialMessages, messagesLoading, runtime]);

    if (!isAvailable) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] text-center p-8 space-y-6 bg-muted/10 border-2 border-dashed rounded-3xl mx-4 my-2">
                <div className="p-4 bg-critical/10 rounded-full">
                    <Sparkles className="h-12 w-12 text-critical animate-pulse" />
                </div>
                <div className="space-y-2 max-w-sm">
                    <h2 className="text-xl font-bold tracking-tight">AI Assistant Offline</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        To use AI features, please ensure the RealTimeX Desktop app is running and connected.
                    </p>
                </div>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    Retry Connection
                </Button>
            </div>
        );
    }

    return (
        <SidebarProvider className="h-[calc(100dvh-5rem)] max-h-[calc(100dvh-5rem)] min-h-0 border rounded-2xl overflow-hidden bg-background shadow-sm">
            <Sidebar collapsible="none" className="w-80 border-r bg-muted/20 min-h-0">
                <SidebarHeader className="px-4 py-3 border-b bg-muted/30 sticky top-0 z-20">
                    <div className="flex items-center justify-between min-h-11">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-1.5 rounded-lg">
                                <Sparkles className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-bold text-sm">AI History</span>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={handleCreateThread}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="relative mt-3">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <SidebarInput 
                            placeholder="Search chats..." 
                            className="pl-8 h-9 text-xs bg-background/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </SidebarHeader>
                <SidebarContent className="min-h-0 overflow-y-auto">
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {loading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <SidebarMenuItem key={i} className="px-2 py-1">
                                            <div className="h-12 bg-muted/40 animate-pulse rounded-lg w-full" />
                                        </SidebarMenuItem>
                                    ))
                                ) : filteredThreads.length === 0 ? (
                                    <div className="px-4 py-8 text-center space-y-2">
                                        <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                                        <p className="text-xs text-muted-foreground">No conversations found</p>
                                    </div>
                                ) : (
                                    filteredThreads.map((thread) => (
                                        <SidebarMenuItem key={thread.id}>
                                            <SidebarMenuButton 
                                                isActive={activeThreadId === thread.id}
                                                className={cn(
                                                    "w-full h-auto py-3 px-4 flex flex-col items-start gap-1 group/item transition-all",
                                                    activeThreadId === thread.id 
                                                        ? "bg-primary/5 text-primary border-r-2 border-primary" 
                                                        : "hover:bg-muted/50"
                                                )}
                                                onClick={() => setActiveThreadId(thread.id)}
                                            >
                                                <div className="flex justify-between items-start w-full gap-2">
                                                    <span className="font-semibold text-[13px] line-clamp-1 flex-1 text-left">
                                                        {thread.title}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-5 w-5 opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={(e) => handleDeleteThread(thread.id, e)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <div className="flex items-center gap-2 w-full">
                                                    <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">
                                                        {new Date(thread.created_at).toLocaleDateString(undefined, { 
                                                            month: 'short', 
                                                            day: 'numeric' 
                                                        })}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground/40">•</span>
                                                    <span className="text-[11px] text-muted-foreground/60 line-clamp-1 italic flex-1 text-left">
                                                        {thread.last_message || 'No messages'}
                                                    </span>
                                                </div>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>

            <SidebarInset className="flex flex-col bg-card min-h-0 overflow-hidden">
                <NewMessageContext.Provider value={newMessageContentRef}>
                    <AssistantRuntimeProvider runtime={runtime}>
                        <ThreadPrimitive.Root className="flex flex-col h-full overflow-hidden min-h-0">
                        <div className="px-4 py-3 border-b flex items-center justify-between bg-background/95 backdrop-blur-sm sticky top-0 z-20">
                            <div className="flex items-center gap-3 min-h-11">
                                <div className="bg-primary/10 p-2 rounded-xl">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold">
                                        {threads.find(t => t.id === activeThreadId)?.title || 'AI Assistant'}
                                    </h2>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                                        Powered by {settings.llm_provider || 'Local LLM'} • {settings.llm_model}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-6 md:px-12 lg:px-24 min-h-0">
                            {messagesLoading ? (
                                <div className="flex flex-col items-center justify-center h-full space-y-4">
                                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs text-muted-foreground font-medium animate-pulse">Loading history...</p>
                                </div>
                            ) : (
                                <>
                                    <ThreadPrimitive.Empty>
                                        <div className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-md mx-auto py-12">
                                            <div className="relative">
                                                <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                                                <div className="relative bg-card border-2 border-primary/20 p-5 rounded-3xl shadow-xl">
                                                    <Sparkles className="h-10 w-10 text-primary" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="font-bold text-xl tracking-tight">How can I help you today?</h3>
                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                    Your private, secure CRM assistant. I can help you analyze data, draft emails, or summarize your day.
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 w-full pt-4">
                                                {[
                                                    "Summarize my recent deals",
                                                    "Who are my most active contacts?",
                                                    "Draft a follow-up email for John Doe"
                                                ].map((prompt) => (
                                                    <Button 
                                                        key={prompt}
                                                        variant="outline" 
                                                        className="justify-between text-xs font-medium h-11 px-4 hover:bg-primary/5 hover:border-primary/30 transition-all rounded-xl"
                                                        onClick={() => {
                                                            // This is a bit hacky with assistant-ui headless
                                                            const input = document.querySelector('textarea') as HTMLTextAreaElement;
                                                            if (input) {
                                                                input.value = prompt;
                                                                input.focus();
                                                            }
                                                        }}
                                                    >
                                                        {prompt}
                                                        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </ThreadPrimitive.Empty>

                                    <ThreadPrimitive.Messages components={{ Message: AssistantMessage }} />
                                </>
                            )}
                        </ThreadPrimitive.Viewport>

                        <div className="p-4 md:px-10 lg:px-20 border-t bg-background/95 backdrop-blur-sm">
                            <ComposerPrimitive.Root className="w-full max-w-4xl mx-auto">
                                <div className="relative group w-full">
                                    <div className="pointer-events-none absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-indigo-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
                                    <ComposerPrimitive.Input
                                        placeholder="Ask anything about your CRM..."
                                        className="relative w-full min-h-[52px] max-h-48 px-3.5 py-3 bg-card border-2 border-border group-focus-within:border-primary/50 rounded-2xl text-sm focus:outline-none resize-none transition-all pr-14 shadow-sm leading-relaxed"
                                    />
                                    <ComposerPrimitive.Send asChild>
                                        <Button
                                            size="icon"
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
                                        >
                                            <Send className="h-4.5 w-4.5" />
                                        </Button>
                                    </ComposerPrimitive.Send>
                                </div>
                                <p className="mt-2 text-[10px] text-muted-foreground/60 text-center font-medium">
                                    AI can make mistakes. Always verify critical information.
                                </p>
                            </ComposerPrimitive.Root>
                        </div>
                    </ThreadPrimitive.Root>
                </AssistantRuntimeProvider>
                </NewMessageContext.Provider>
            </SidebarInset>
        </SidebarProvider>
    );
};

export const AIPage = () => {
    return (
        <TTSProvider>
            <AIPageContent />
        </TTSProvider>
    );
};
