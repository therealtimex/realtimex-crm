import { Label } from '@/components/ds/ui/label';
import { Input } from '@/components/ds/ui/input';
import { Button } from '@/components/ds/ui/button';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslate } from 'ra-core';

interface CredentialsStepProps {
    url: string;
    anonKey: string;
    error: string | null;
    onUrlChange: (value: string) => void;
    onAnonKeyChange: (value: string) => void;
    onSave: () => void;
    onBack: () => void;
}

export function CredentialsStep({
    url,
    anonKey,
    error,
    onUrlChange,
    onAnonKeyChange,
    onSave,
    onBack,
}: CredentialsStepProps) {
    const translate = useTranslate();
    const canSubmit = url.trim().length > 0 && anonKey.trim().length > 0;

    // Keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && canSubmit) {
            e.preventDefault();
            onSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onBack();
        }
    };

    return (
        <div className="flex-1 flex flex-col justify-center space-y-6" onKeyDown={handleKeyDown}>
            <div className="space-y-1">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">{translate('setup.manualSync')}</h3>
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">
                    {translate('setup.injectCoordinates')}
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-1.5">
                    <Label
                        htmlFor="platform-url"
                        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1"
                    >
                        {translate('setup.platformUrl')}
                    </Label>
                    <Input
                        id="platform-url"
                        placeholder="https://xyz.supabase.co"
                        value={url}
                        onChange={(e) => onUrlChange(e.target.value)}
                        className="bg-muted/20 border-border/50 rounded-xl h-12"
                        aria-describedby="url-help"
                        aria-invalid={error ? 'true' : 'false'}
                        autoFocus
                    />
                    <p id="url-help" className="text-[9px] text-muted-foreground/60 px-1 italic">
                        {translate('setup.urlHelp')}
                    </p>
                </div>
                <div className="space-y-1.5">
                    <Label
                        htmlFor="anon-key"
                        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1"
                    >
                        {translate('setup.anonMatrixKey')}
                    </Label>
                    <Input
                        id="anon-key"
                        type="password"
                        placeholder="eyJ..."
                        value={anonKey}
                        onChange={(e) => onAnonKeyChange(e.target.value)}
                        className="bg-muted/20 border-border/50 rounded-xl h-12"
                        aria-describedby="key-help"
                        aria-invalid={error ? 'true' : 'false'}
                    />
                    <p id="key-help" className="text-[9px] text-muted-foreground/60 px-1 italic">
                        {translate('setup.keyHelp')}
                    </p>
                </div>
            </div>

            {error && (
                <motion.div
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="p-3 bg-destructive/5 border border-destructive/20 text-destructive text-[11px] font-bold rounded-xl flex items-center gap-2"
                    role="alert"
                >
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>{error}</span>
                </motion.div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                    variant="outline"
                    onClick={onBack}
                    className="h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                >
                    {translate('setup.back')}
                </Button>
                <Button
                    onClick={onSave}
                    disabled={!canSubmit}
                    className="h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-primary shadow-lg hover:shadow-primary/20"
                >
                    {translate('setup.engage')}
                </Button>
            </div>
        </div>
    );
}
