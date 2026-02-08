import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TerminalLogs } from '../TerminalLogs';
import { LogEntry } from '../types';

interface ProvisioningStepProps {
    logs: LogEntry[];
    error: string | null;
    onRetry: () => void;
    onSwitchToManual: () => void;
}

export function ProvisioningStep({ logs, error, onRetry, onSwitchToManual }: ProvisioningStepProps) {
    return (
        <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    {error ? (
                        <div className="w-5 h-5 flex items-center justify-center">
                            <span className="text-destructive text-xl" aria-hidden="true">✕</span>
                        </div>
                    ) : (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" />
                    )}
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                        {error ? 'Provisioning Failed' : 'Provisioning'}
                    </h3>
                </div>
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">
                    {error ? 'Check logs for details' : 'Assembling infrastructure...'}
                </p>
            </div>

            <TerminalLogs logs={logs} />

            {error && (
                <div className="space-y-3">
                    <Button
                        variant="outline"
                        onClick={onRetry}
                        className="w-full h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                    >
                        Try Again
                    </Button>
                    <Button
                        variant="default"
                        onClick={onSwitchToManual}
                        className="w-full h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-primary"
                    >
                        Use Manual Connect Instead
                    </Button>
                </div>
            )}
        </div>
    );
}
