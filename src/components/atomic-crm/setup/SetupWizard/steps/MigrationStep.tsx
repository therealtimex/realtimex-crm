import { AlertCircle, Boxes, Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ds/ui/button';
import { Input } from '@/components/ds/ui/input';
import { Label } from '@/components/ds/ui/label';
import { Alert, AlertDescription } from '@/components/ds/ui/alert';
import { useTranslate } from 'ra-core';
import { TerminalLogs } from '../TerminalLogs';
import { LogEntry } from '../types';

interface MigrationStepProps {
    logs: LogEntry[];
    error: string | null;
    migrating: boolean;
    complete: boolean;
    accessToken: string;
    onTokenChange: (value: string) => void;
    onRunMigration: () => void;
}

export function MigrationStep({
    logs,
    error,
    migrating,
    complete,
    accessToken,
    onTokenChange,
    onRunMigration,
}: MigrationStepProps) {
    const translate = useTranslate();
    const needsToken = !accessToken && !migrating && !complete;
    const canRun = accessToken.trim().length > 0;

    return (
        <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    {migrating ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" />
                    ) : complete ? (
                        <Boxes className="w-5 h-5 text-success" aria-hidden="true" />
                    ) : (
                        <Boxes className="w-5 h-5 text-primary" aria-hidden="true" />
                    )}
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                        {complete ? translate('setup.installationComplete') : translate('setup.installingDatabase')}
                    </h3>
                </div>
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">
                    {migrating ? translate('setup.applyingSchemaDna') : complete ? translate('setup.systemReady') : needsToken ? translate('setup.tokenRequired') : translate('setup.readyToInstall')}
                </p>
            </div>

            {needsToken && (
                <div className="space-y-4 p-5 bg-primary/5 rounded-2xl border border-primary/20">
                    <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                        {translate('setup.tokenDescription')}
                    </p>

                    <div className="space-y-2">
                        <Label
                            htmlFor="migration-token"
                            className="text-[10px] font-bold uppercase tracking-widest text-primary/60"
                        >
                            {translate('setup.managementToken')}
                        </Label>
                        <div className="relative">
                            <Key
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30"
                                size={12}
                                aria-hidden="true"
                            />
                            <Input
                                id="migration-token"
                                type="password"
                                placeholder="sbp_xxxxxxxxxxxxxxxx"
                                value={accessToken}
                                onChange={(e) => onTokenChange(e.target.value)}
                                className="pl-9 h-10 bg-background/50 border-primary/20 rounded-xl text-[11px]"
                                aria-describedby="migration-token-help"
                                autoFocus
                            />
                        </div>
                        <p id="migration-token-help" className="text-[9px] text-muted-foreground/60 italic px-1">
                            {translate('setup.generateAt')}{' '}
                            <a
                                href="https://supabase.com/dashboard/account/tokens"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                supabase.com/dashboard/tokens
                            </a>
                        </p>
                    </div>

                    <Button
                        onClick={onRunMigration}
                        disabled={!canRun}
                        className="w-full h-11 bg-primary text-[10px] font-bold uppercase tracking-widest shadow-lg hover:shadow-primary/30"
                    >
                        {translate('setup.installDatabaseSchema')}
                    </Button>
                </div>
            )}

            <TerminalLogs logs={logs} />

            {error && (
                <div className="space-y-3">
                    <Alert
                        variant="destructive"
                        className="rounded-xl border-destructive/20 bg-destructive/5 text-destructive font-bold text-[11px]"
                    >
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                    <Button
                        variant="outline"
                        onClick={onRunMigration}
                        disabled={!canRun}
                        className="w-full h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                    >
                        {translate('setup.retryInstallation')}
                    </Button>
                </div>
            )}
        </div>
    );
}
