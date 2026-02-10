/**
 * MigrationModal Component
 *
 * Displays detailed migration instructions in a modal dialog.
 * Shows step-by-step guide for users to run the migration command.
 */

import { useMemo, useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  ExternalLink,
  Info,
  Loader2,
  Terminal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ds/ui/dialog";
import { Button } from "@/components/ds/ui/button";
import { Alert, AlertDescription } from "@/components/ds/ui/alert";
import { Input } from "@/components/ds/ui/input";
import { Label } from "@/components/ds/ui/label";
import { toast } from "sonner";
import { useTranslate } from "ra-core";
import { getSupabaseConfig } from "@/lib/supabase-config";
import type { MigrationStatus } from "@/lib/migration-check";

interface MigrationModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal is closed */
  onOpenChange: (open: boolean) => void;
  /** Migration status */
  status: MigrationStatus;
}

export function MigrationModal({
  open,
  onOpenChange,
  status,
}: MigrationModalProps) {
  const config = getSupabaseConfig();
  const translate = useTranslate();

  // Auto-migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [accessToken, setAccessToken] = useState("");
  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const projectId = useMemo(() => {
    const url = config?.url;
    if (!url) return "";
    try {
      const host = new URL(url).hostname;
      return host.split(".")[0] || "";
    } catch {
      return "";
    }
  }, [config?.url]);

  // Scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [migrationLogs]);

  // Cleanup: abort migration if component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const handleAutoMigrate = async () => {
    if (!projectId) {
      toast.error(translate("crm.migration.modal.auto.missing_project_id"));
      return;
    }

    setIsMigrating(true);
    setMigrationLogs([translate("crm.migration.modal.auto.init_log")]);

    // Create AbortController for proper cleanup
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectRef: projectId,
          accessToken,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`,
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream received.");

      const decoder = new TextDecoder();
      let migrationSucceeded = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Use stream: true for proper multi-byte character handling
          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n").filter(Boolean);
          setMigrationLogs((prev) => [...prev, ...lines]);

          // Check if migration succeeded
          if (
            text.includes("Migration completed successfully") ||
            text.includes("✅")
          ) {
            migrationSucceeded = true;
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Auto-reload on success
      if (migrationSucceeded) {
        setMigrationLogs((prev) => [
          ...prev,
          translate("crm.migration.modal.auto.reload_message"),
        ]);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      // Don't show error if request was aborted (user closed modal)
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Migration request aborted");
        return;
      }

      console.error(err);
      setMigrationLogs((prev) => [
        ...prev,
        `${translate("crm.migration.modal.auto.error_prefix")}${err instanceof Error ? err.message : String(err)}`,
      ]);
      toast.error(translate("crm.migration.modal.auto.failure_toast"));
    } finally {
      setIsMigrating(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => !isMigrating && onOpenChange(val)}
    >
      <DialogContent className="max-h-[90vh] sm:max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-critical" />
            {translate("crm.migration.modal.title")}
          </DialogTitle>
          <DialogDescription>
            {translate("crm.migration.modal.description", {
              version: status.appVersion,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{translate("crm.migration.modal.overview.title")}</strong>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                <li>
                  {translate("crm.migration.modal.overview.update_schema", {
                    version: status.appVersion,
                  })}
                </li>
                <li>
                  {translate("crm.migration.modal.overview.enable_features")}
                </li>
                <li>{translate("crm.migration.modal.overview.data_safe")}</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Auto-Migration Interface */}
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-2">
                {translate("crm.migration.modal.auto.title")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {translate("crm.migration.modal.auto.description")}
              </p>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="project-id">
                    {translate("crm.migration.modal.auto.project_id")}
                  </Label>
                  <Input
                    id="project-id"
                    value={projectId}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="access-token">
                      {translate("crm.migration.modal.auto.access_token")}
                    </Label>
                    <a
                      href="https://supabase.com/dashboard/account/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      {translate("crm.migration.modal.auto.generate_token")}{" "}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <Input
                    id="access-token"
                    type="password"
                    placeholder="sbp_..."
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    disabled={isMigrating}
                  />
                  <p className="text-xs text-muted-foreground">
                    {translate("crm.migration.modal.auto.access_token_hint")}
                  </p>
                </div>

                <Button
                  onClick={handleAutoMigrate}
                  disabled={isMigrating}
                  className="w-full"
                >
                  {isMigrating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {translate("crm.migration.modal.auto.migrating")}
                    </>
                  ) : (
                    <>
                      <Terminal className="mr-2 h-4 w-4" />
                      {translate("crm.migration.modal.auto.start")}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Logs Terminal */}
            <div className="rounded-lg border bg-black text-white font-mono text-xs p-4 h-64 overflow-y-auto">
              {migrationLogs.length === 0 ? (
                <div className="text-muted-foreground italic">
                  {translate("crm.migration.modal.auto.logs_placeholder")}
                </div>
              ) : (
                migrationLogs.map((log, i) => (
                  <div key={i} className="mb-1 whitespace-pre-wrap">
                    {log}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Troubleshooting */}
          <Alert className="border-critical/30 bg-critical/10">
            <AlertTriangle className="h-4 w-4 text-critical" />
            <AlertDescription>
              <strong>
                {translate("crm.migration.modal.troubleshooting.title")}
              </strong>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                <li>
                  {translate("crm.migration.modal.troubleshooting.report")}{" "}
                  <a
                    href="https://github.com/therealtimex/realtimex-crm/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {translate(
                      "crm.migration.modal.troubleshooting.report_link",
                    )}
                  </a>
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMigrating}
          >
            {translate("crm.migration.modal.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
