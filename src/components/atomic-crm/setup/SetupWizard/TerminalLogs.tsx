import { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslate } from 'ra-core';
import { LogEntry } from './types';

interface TerminalLogsProps {
    logs: LogEntry[];
    className?: string;
}

export function TerminalLogs({ logs, className }: TerminalLogsProps) {
    const translate = useTranslate();
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div
            className={cn(
                'rounded-2xl border border-border/60 bg-card/60 p-4 font-mono text-[10px] h-[240px] overflow-y-auto shadow-inner custom-scrollbar relative',
                className
            )}
            role="log"
            aria-live="polite"
            aria-label="Setup progress logs"
        >
            <div className="absolute top-2 right-4 flex items-center gap-2 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest pointer-events-none">
                <Terminal size={10} aria-hidden="true" />
                <span>{translate('setup.liveFeed')}</span>
            </div>

            {logs.length === 0 ? (
                <div className="text-muted-foreground/70 italic animate-pulse" role="status">
                    {translate('setup.awaitingSignals')}
                </div>
            ) : (
                <>
                    {logs.map((log, i) => (
                        <div
                            key={`${log.timestamp}-${i}`}
                            className={cn(
                                'mb-1 break-all transition-all duration-300',
                                log.type === 'error' && 'text-critical font-bold',
                                log.type === 'success' && 'text-success font-bold',
                                log.type === 'info' && 'text-info',
                                log.type === 'stdout' && 'text-muted-foreground',
                                log.type === 'stderr' && 'text-warning'
                            )}
                        >
                            <span className="text-muted-foreground/60 mr-2 tabular-nums">
                                [{new Date(log.timestamp).toLocaleTimeString([], {
                                    hour12: false,
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                })}]
                            </span>
                            {log.message}
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </>
            )}
        </div>
    );
}
