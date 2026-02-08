import { cn } from '@/lib/utils';
import { WizardStep } from '../types';

interface StatusBadgeProps {
    step: WizardStep | WizardStep[];
    currentStep: WizardStep;
    label: string;
}

export function StatusBadge({ step, currentStep, label }: StatusBadgeProps) {
    const isActive = Array.isArray(step) ? step.includes(currentStep) : currentStep === step;

    return (
        <div
            className={cn(
                'px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500',
                isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground opacity-40'
            )}
            role="status"
            aria-current={isActive}
        >
            {label}
        </div>
    );
}
