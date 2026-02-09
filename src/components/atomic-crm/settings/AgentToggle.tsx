import React, { useEffect, useState } from 'react';
import { AgentService } from '@/lib/agents/AgentService';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Brain, Power } from "lucide-react";
import { useSDK } from '../root/SDKProvider';

export const AgentToggle = () => {
    const [isEnabled, setIsEnabled] = useState(false);
    const { isAvailable } = useSDK();

    useEffect(() => {
        // Sync with AgentService state if needed
        const storedStatus = localStorage.getItem('crm_agent_enabled') === 'true';
        if (storedStatus && isAvailable) {
            setIsEnabled(true);
            AgentService.start();
        }
    }, [isAvailable]);

    const handleToggle = (checked: boolean) => {
        setIsEnabled(checked);
        localStorage.setItem('crm_agent_enabled', checked ? 'true' : 'false');

        if (checked) {
            AgentService.start();
        } else {
            AgentService.stop();
        }
    };

    if (!isAvailable) {
        return (
            <div className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
                <Switch disabled />
                <div className="grid gap-1.5 leading-none">
                    <Label className="text-sm font-medium">Local AI Agent (SDK Required)</Label>
                    <p className="text-xs text-muted-foreground">Run the RealTimeX Desktop app to enable.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center space-x-2">
            <Switch
                id="agent-mode"
                checked={isEnabled}
                onCheckedChange={handleToggle}
            />
            <div className="grid gap-1.5 leading-none">
                <Label htmlFor="agent-mode" className="text-sm font-medium flex items-center">
                    <Brain className="h-3 w-3 mr-1.5 text-purple-500" />
                    Autonomous Agent Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                    Automatically process pending activities using local AI.
                </p>
            </div>
        </div>
    );
};
