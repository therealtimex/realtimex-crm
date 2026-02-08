import { AlertCircle, ChevronRight, Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateAccessToken } from '../validators';

interface ManagedTokenStepProps {
    accessToken: string;
    error: string | null;
    isFetching: boolean;
    onTokenChange: (value: string) => void;
    onFetchOrgs: () => void;
    onBack: () => void;
}

export function ManagedTokenStep({
    accessToken,
    error,
    isFetching,
    onTokenChange,
    onFetchOrgs,
    onBack,
}: ManagedTokenStepProps) {
    const validation = validateAccessToken(accessToken);
    const isValid = validation.valid;

    // Keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && isValid && !isFetching) {
            e.preventDefault();
            onFetchOrgs();
        } else if (e.key === 'Escape' && !isFetching) {
            e.preventDefault();
            onBack();
        }
    };

    return (
        <div className="flex-1 flex flex-col justify-center space-y-6" onKeyDown={handleKeyDown}>
            <div className="space-y-1">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Forge Token</h3>
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">
                    Supabase API coordinates
                </p>
            </div>

            {error && (
                <Alert
                    variant="destructive"
                    className="rounded-xl bg-destructive/5 text-destructive border-destructive/20 text-[11px] font-bold"
                >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label
                        htmlFor="access-token"
                        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1"
                    >
                        Personal Access Token
                    </Label>
                    <div className="relative">
                        <Key
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30"
                            size={14}
                            aria-hidden="true"
                        />
                        <Input
                            id="access-token"
                            type="password"
                            placeholder="sbp_xxxxxxxxxxxxxxxx"
                            value={accessToken}
                            onChange={(e) => onTokenChange(e.target.value)}
                            className="pl-10 h-12 bg-muted/20 border-border/50 rounded-xl"
                            aria-describedby="token-help"
                            aria-invalid={error ? 'true' : 'false'}
                            autoFocus
                        />
                    </div>
                    <p id="token-help" className="text-[9px] text-muted-foreground/60 px-1 italic">
                        Generate at{' '}
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

                <div className="flex gap-3 pt-4">
                    <Button
                        variant="outline"
                        onClick={onBack}
                        className="flex-1 h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                        disabled={isFetching}
                    >
                        Back
                    </Button>
                    <Button
                        onClick={onFetchOrgs}
                        disabled={!isValid || isFetching}
                        className="flex-1 h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest group shadow-lg hover:shadow-primary/20"
                    >
                        {isFetching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                Scan Organizations{' '}
                                <ChevronRight
                                    size={14}
                                    className="ml-2 group-hover:translate-x-1 transition-transform"
                                />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
