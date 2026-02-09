import React, { useEffect, useState } from 'react';
import { useNotify } from 'ra-core';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ds/ui/card";
import { MessageSquare, Clock, ArrowUpRight } from "lucide-react";
import { useSDK } from '../root/SDKProvider';
import axios from 'axios';

interface Thread {
    id: string;
    title: string;
    createdAt: string;
    lastMessage?: string;
}

export const AIPage = () => {
    const { isAvailable } = useSDK();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [loading, setLoading] = useState(true);
    const notify = useNotify();

    useEffect(() => {
        if (!isAvailable) {
            setLoading(false);
            return;
        }

        const fetchThreads = async () => {
            try {
                const response = await axios.get('/api/sdk/threads');
                if (response.data.success) {
                    setThreads(response.data.threads || []);
                }
            } catch (error) {
                console.error('Failed to fetch threads:', error);
                notify('error.fetch_threads', { type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        fetchThreads();
    }, [isAvailable, notify]);

    if (!isAvailable) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle>SDK Not Connected</CardTitle>
                        <CardDescription>
                            Please make sure the RealTimeX Desktop app is running to use AI features.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">AI Conversation History</h1>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <div className="h-32 bg-muted rounded-lg"></div>
                        </Card>
                    ))}
                </div>
            ) : threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                    <p>No conversations yet. Start a chat by clicking the AI Assistant button.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {threads.map((thread) => (
                        <Card key={thread.id} className="hover:border-primary/50 transition-colors cursor-pointer group">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg line-clamp-1">{thread.title || 'Untitled Conversation'}</CardTitle>
                                    <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                                </div>
                                <CardDescription className="flex items-center text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {new Date(thread.createdAt).toLocaleDateString()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-2 italic">
                                    "{thread.lastMessage || 'No messages yet'}"
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
