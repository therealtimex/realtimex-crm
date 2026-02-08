import { Button } from '@/components/ui/button';
import { Shield, Zap, ArrowLeft } from 'lucide-react';
import { useTranslate } from 'ra-core';

interface WelcomeStepProps {
    onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
    const translate = useTranslate();

    // Keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onNext();
        }
    };

    return (
        <div className="flex-1 flex flex-col justify-center space-y-8" onKeyDown={handleKeyDown}>
            <div className="space-y-2">
                <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                    {translate('setup.welcomeTitle')}
                </h2>
                <p className="text-sm text-muted-foreground font-medium max-w-sm">
                    {translate('setup.welcomeSubtitle')}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 flex flex-col gap-2 group hover:bg-primary/5 hover:border-primary/20 transition-all">
                    <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">{translate('setup.encryptedTitle')}</p>
                    <p className="text-[10px] text-muted-foreground">{translate('setup.encryptedDesc')}</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 flex flex-col gap-2 group hover:bg-primary/5 hover:border-primary/20 transition-all">
                    <Zap className="w-5 h-5 text-primary" aria-hidden="true" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">{translate('setup.turboTitle')}</p>
                    <p className="text-[10px] text-muted-foreground">{translate('setup.turboDesc')}</p>
                </div>
            </div>

            <Button
                onClick={onNext}
                size="lg"
                className="h-14 rounded-2xl text-md font-bold uppercase tracking-widest group shadow-xl hover:shadow-primary/20 transition-all active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
                autoFocus
            >
                {translate('setup.getStarted')}
                <ArrowLeft
                    className="w-5 h-5 ml-4 rotate-180 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                />
            </Button>
        </div>
    );
}
