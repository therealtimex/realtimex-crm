import { useState } from "react";
import { useTranslate } from "ra-core";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, CheckCircle, XCircle, Settings, Trash2 } from "lucide-react";
import {
  getSupabaseConfig,
  clearSupabaseConfig,
  getConfigSource,
} from "@/lib/supabase-config";
import { SetupWizard } from "../setup/SetupWizard";
import { isDemoMode } from "@/lib/demo-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function DatabaseSettings() {
  const [showWizard, setShowWizard] = useState(false);
  const config = getSupabaseConfig();
  const source = getConfigSource();
  const translate = useTranslate();

  const handleClearConfig = () => {
    if (confirm(translate("crm.settings.database.confirm_clear"))) {
      clearSupabaseConfig();
      window.location.reload();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>{translate("crm.settings.database.title")}</CardTitle>
          </div>
          <CardDescription>
            {translate("crm.settings.database.description")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {config ? (
            <>
              {/* Connection Status */}
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium">
                    {translate("crm.settings.database.connected")}
                  </p>
                  <p className="text-sm text-muted-foreground">{config.url}</p>
                  {config.configuredAt && (
                    <p className="text-xs text-muted-foreground">
                      {translate("crm.settings.database.configured_on", {
                        date: new Date(
                          config.configuredAt,
                        ).toLocaleDateString(),
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* Configuration Source Info */}
              {source === "env" && (
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    {translate("crm.settings.database.env_hint")}
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-1">
                        <Button
                          variant="outline"
                          onClick={() => setShowWizard(true)}
                          className="w-full"
                          disabled={isDemoMode()}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          {translate("crm.settings.database.action.change")}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {isDemoMode() && (
                      <TooltipContent>
                        <p>Changing configuration is disabled in demo mode</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                {source === "ui" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex-1">
                          <Button
                            variant="destructive"
                            onClick={handleClearConfig}
                            className="w-full"
                            disabled={isDemoMode()}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {translate("crm.settings.database.action.clear")}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {isDemoMode() && (
                        <TooltipContent>
                          <p>Clearing configuration is disabled in demo mode</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Anon Key Display (masked) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {translate("crm.settings.database.anon_key")}
                </Label>
                <div className="font-mono text-sm p-2 bg-muted rounded">
                  {config.anonKey.substring(0, 20)}...
                  {config.anonKey.substring(config.anonKey.length - 10)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 border border-dashed rounded-lg">
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium">
                    {translate("crm.settings.database.not_connected")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {translate("crm.settings.database.no_config")}
                  </p>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  {translate("crm.settings.database.setup_hint")}{" "}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    supabase.com
                  </a>
                </AlertDescription>
              </Alert>

              <Button onClick={() => setShowWizard(true)} className="w-full">
                <Database className="h-4 w-4 mr-2" />
                {translate("crm.settings.database.action.connect")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <SetupWizard
        open={showWizard}
        onComplete={() => setShowWizard(false)}
        canClose={true}
      />
    </>
  );
}

function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <label className={className}>{children}</label>;
}
