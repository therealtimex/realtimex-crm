import { ArrowLeft, ChevronRight, Rocket, Cpu } from 'lucide-react';
import { useTranslate } from 'ra-core';

interface TypeStepProps {
    onManaged: () => void;
    onManual: () => void;
    onBack: () => void;
}

export function TypeStep({ onManaged, onManual, onBack }: TypeStepProps) {
    const translate = useTranslate();
    return (
        <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="space-y-1">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">{translate('setup.connectionMode')}</h3>
                <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase">
                    {translate('setup.selectVector')}
                </p>
            </div>

            <div className="grid gap-4">
                <button
                    onClick={onManaged}
                    className="group relative flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all text-left"
                    aria-label="Quick Ignition - Auto-provision via token"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary rounded-xl shadow-lg ring-4 ring-primary/10">
                            <Rocket className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="font-black uppercase italic text-sm tracking-tight">{translate('setup.quickIgnition')}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                {translate('setup.autoProvision')}
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-primary opacity-50 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                </button>

                <button
                    onClick={onManual}
                    className="group relative flex items-center justify-between p-6 rounded-2xl border border-border hover:bg-muted/50 transition-all text-left"
                    aria-label="Manual Sync - Use existing credentials"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-muted rounded-xl">
                            <Cpu className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="font-black uppercase italic text-sm tracking-tight text-foreground/80">
                                {translate('setup.manualSync')}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                {translate('setup.existingCredentials')}
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                </button>
            </div>

            <button
                onClick={onBack}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 hover:text-primary pt-4 transition-colors"
                aria-label="Go back to welcome screen"
            >
                <ArrowLeft size={12} aria-hidden="true" /> {translate('setup.abortAccess')}
            </button>
        </div>
    );
}
