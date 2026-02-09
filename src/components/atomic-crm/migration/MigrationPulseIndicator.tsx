/**
 * MigrationPulseIndicator Component
 *
 * Shows a pulsing dot indicator when migration is needed but notification is dismissed.
 * Provides a subtle, persistent reminder without being intrusive.
 */

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ds/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ds/ui/tooltip";

interface MigrationPulseIndicatorProps {
  /** Callback when user clicks the indicator */
  onClick: () => void;
}

export function MigrationPulseIndicator({
  onClick,
}: MigrationPulseIndicatorProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={onClick}
          >
            <AlertTriangle className="h-5 w-5 text-critical" />
            {/* Pulsing dot */}
            <span className="absolute right-0 top-0 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-critical/70 opacity-75 motion-safe:animate-ping motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-critical" />
            </span>
            <span className="sr-only">Database migration pending</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm font-medium">Database Update Available</p>
          <p className="text-xs text-muted-foreground">
            Click to view migration details
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
