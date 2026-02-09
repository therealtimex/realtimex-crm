/**
 * MigrationBanner Component
 *
 * Displays a compact floating notification in top-right corner when migration is required.
 * Non-blocking: allows users to continue using the app while showing the reminder.
 */

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ds/ui/button";
import { toast } from "sonner";
import { useTranslate } from "ra-core";
import {
  dismissMigrationReminder,
  type MigrationStatus,
} from "@/lib/migration-check";

interface MigrationBannerProps {
  /** Migration status from checkMigrationStatus */
  status: MigrationStatus;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
  /** Callback when user clicks to open modal */
  onLearnMore?: () => void;
}

export function MigrationBanner({
  status,
  onDismiss,
  onLearnMore,
}: MigrationBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const translate = useTranslate();

  if (!isVisible) return null;

  const handleDismiss = () => {
    dismissMigrationReminder();
    setIsVisible(false);
    onDismiss?.();
  };

  const handleClick = () => {
    if (onLearnMore) {
      onLearnMore();
    } else {
      // Fallback: copy command
      navigator.clipboard.writeText("npx realtimex-crm migrate");
      toast.success(translate("crm.migration.banner.command_copied"));
    }
  };

  return (
    <div className="fixed right-4 top-16 z-50 max-w-sm animate-in slide-in-from-top-5">
      <div className="rounded-lg border border-warning/40 bg-warning/15 p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-warning-foreground">
                {translate("crm.migration.banner.title")}
              </p>
              <Button
                size="icon"
                variant="ghost"
                className=" -mr-1 -mt-1 h-5 w-5 text-warning-foreground hover:bg-warning/20"
                onClick={handleDismiss}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">
                  {translate("crm.migration.banner.dismiss")}
                </span>
              </Button>
            </div>
            <p className="text-xs text-warning-foreground/80">
              {translate("crm.migration.banner.subtitle", {
                version: status.appVersion,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="warning"
                className="h-7 text-xs"
                onClick={handleClick}
              >
                {translate("crm.migration.banner.view_details")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-warning-foreground hover:bg-warning/20"
                onClick={handleDismiss}
              >
                {translate("crm.migration.banner.later")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
