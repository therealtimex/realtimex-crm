import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Organization } from '../types';

interface ManagedOrgStepProps {
    organizations: Organization[];
    selectedOrg: string;
    projectName: string;
    region: string;
    onOrgSelect: (orgId: string) => void;
    onProjectNameChange: (name: string) => void;
    onRegionChange: (region: string) => void;
    onProvision: () => void;
    onBack: () => void;
}

export function ManagedOrgStep({
    organizations,
    selectedOrg,
    projectName,
    region,
    onOrgSelect,
    onProjectNameChange,
    onRegionChange,
    onProvision,
    onBack,
}: ManagedOrgStepProps) {
    // Keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && selectedOrg) {
            e.preventDefault();
            onProvision();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onBack();
        }
    };

    return (
        <div className="flex-1 flex flex-col justify-center space-y-6" onKeyDown={handleKeyDown}>
            <div className="space-y-1">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Project Config</h3>
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">
                    Engine parameters
                </p>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="project-name"
                            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1"
                        >
                            Project Name
                        </Label>
                        <Input
                            id="project-name"
                            value={projectName}
                            onChange={(e) => onProjectNameChange(e.target.value)}
                            className="bg-muted/20 border-border/50 rounded-xl text-[11px]"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="region"
                            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1"
                        >
                            Hosting Sector
                        </Label>
                        <select
                            id="region"
                            value={region}
                            onChange={(e) => onRegionChange(e.target.value)}
                            className="w-full h-10 bg-muted/20 border border-border/50 rounded-xl px-3 text-[11px] font-sans focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                            <option value="us-east-1">US East (N. Virginia)</option>
                            <option value="us-west-1">US West (N. California)</option>
                            <option value="eu-central-1">Europe (Frankfurt)</option>
                            <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                        Vessel (Organization)
                    </Label>
                    <div
                        className="max-h-[160px] overflow-y-auto space-y-2 pr-1 custom-scrollbar"
                        role="radiogroup"
                        aria-label="Select organization"
                    >
                        {organizations.map((org) => (
                            <button
                                key={org.id}
                                onClick={() => onOrgSelect(org.id)}
                                role="radio"
                                aria-checked={selectedOrg === org.id}
                                className={cn(
                                    'w-full flex items-center justify-between p-3 rounded-xl border text-[11px] font-bold transition-all',
                                    selectedOrg === org.id
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                        : 'hover:bg-muted/30 border-border/50'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Globe
                                        className={cn(
                                            'w-3.5 h-3.5',
                                            selectedOrg === org.id ? 'text-primary' : 'text-muted-foreground/50'
                                        )}
                                        aria-hidden="true"
                                    />
                                    <span>{org.name}</span>
                                </div>
                                {selectedOrg === org.id && (
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                        variant="outline"
                        onClick={onBack}
                        className="flex-1 h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                    >
                        Back
                    </Button>
                    <Button
                        onClick={onProvision}
                        disabled={!selectedOrg}
                        className="flex-1 h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md"
                    >
                        Initialize System
                    </Button>
                </div>
            </div>
        </div>
    );
}
