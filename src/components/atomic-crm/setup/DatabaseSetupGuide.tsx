import { useState, useRef, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ds/ui/alert";
import { Button } from "@/components/ds/ui/button";
import { Input } from "@/components/ds/ui/input";
import { Label } from "@/components/ds/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ds/ui/card";
import {
  AlertCircle,
  Database,
  ExternalLink,
  Loader2,
  Terminal,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ds/ui/collapsible";

interface DatabaseSetupGuideProps {
  missingTables: string[];
  supabaseUrl: string;
}

export function DatabaseSetupGuide({
  missingTables,
  supabaseUrl,
}: DatabaseSetupGuideProps) {
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  // Auto-Migration State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [dbPassword, setDbPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [manualOpen, setManualOpen] = useState(false);

  // Scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [migrationLogs]);

  const handleAutoMigrate = async () => {
    if (!projectRef) {
      toast.error("Could not determine Project ID from Supabase URL.");
      return;
    }

    setIsMigrating(true);
    setMigrationLogs(["🚀 Initializing migration process..."]);

    try {
      const response = await fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectRef,
          dbPassword,
          accessToken,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`,
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream received.");

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter(Boolean);
        setMigrationLogs((prev) => [...prev, ...lines]);
      }

      // Auto-reload on success (simple check for "success" in logs or just finish)
      toast.success("Migration process completed. Reloading...");
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      console.error(err);
      setMigrationLogs((prev) => [
        ...prev,
        `❌ Error: ${err instanceof Error ? err.message : String(err)}`,
      ]);
      toast.error("Migration failed. See logs for details.");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Database Schema Not Configured</AlertTitle>
        <AlertDescription>
          Your Supabase database is connected, but the CRM schema hasn't been
          set up yet.
        </AlertDescription>
      </Alert>

      {/* Auto-Migration Card */}
      <Card className="border-primary/20 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <CardTitle>Automatic Setup (Recommended)</CardTitle>
          </div>
          <CardDescription>
            We can automatically set up the database tables and policies for
            you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="project-id">Project ID</Label>
              <Input
                id="project-id"
                value={projectRef || ""}
                disabled
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="access-token">Supabase Access Token</Label>
                <a
                  href="https://supabase.com/dashboard/account/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Generate Token <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Input
                id="access-token"
                type="password"
                placeholder="sbp_... (Recommended for reliable setup)"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                disabled={isMigrating}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="db-password">Database Password (Optional)</Label>
              <Input
                id="db-password"
                type="password"
                placeholder="Only required if CLI login is used instead of token"
                value={dbPassword}
                onChange={(e) => setDbPassword(e.target.value)}
                disabled={isMigrating}
              />
            </div>

            <Button
              onClick={handleAutoMigrate}
              disabled={isMigrating}
              className="w-full"
              size="lg"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up Database...
                </>
              ) : (
                <>
                  <Terminal className="mr-2 h-4 w-4" />
                  Start Automatic Setup
                </>
              )}
            </Button>
          </div>

          {/* Logs Terminal */}
          <div className="rounded-lg border bg-black text-white font-mono text-xs p-4 h-64 overflow-y-auto shadow-inner">
            {migrationLogs.length === 0 ? (
              <div className="text-muted-foreground italic">
                Logs will appear here...
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
        </CardContent>
      </Card>

      {/* Manual Setup (Collapsed by default) */}
      <Collapsible open={manualOpen} onOpenChange={setManualOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-muted-foreground">
                    Manual Setup Instructions
                  </CardTitle>
                </div>
                {manualOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </div>
              <CardDescription>
                Advanced: Run commands manually if automatic setup fails
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-0">
              {/* Missing Tables */}
              <div>
                <h3 className="font-semibold mb-2">Missing Tables:</h3>
                <div className="flex flex-wrap gap-2">
                  {missingTables.map((table) => (
                    <span
                      key={table}
                      className="px-2 py-1 bg-destructive/10 text-destructive text-sm rounded"
                    >
                      {table}
                    </span>
                  ))}
                </div>
              </div>

              {/* Option 1: Supabase CLI */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-bold">
                    1
                  </div>
                  <h3 className="font-semibold">Using Supabase CLI</h3>
                </div>
                <div className="ml-8 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Install Supabase CLI:
                    </p>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                      npm install -g supabase
                    </pre>
                  </div>
                  {/* ... rest of CLI steps ... */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Link to your Supabase project:
                    </p>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                      supabase link --project-ref{" "}
                      {projectRef || "YOUR_PROJECT_REF"}
                    </pre>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Push the migrations:
                    </p>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                      supabase db push
                    </pre>
                  </div>
                </div>
              </div>

              {/* Option 2: SQL Editor */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-bold">
                    2
                  </div>
                  <h3 className="font-semibold">Using Supabase SQL Editor</h3>
                </div>
                <div className="ml-8 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Manually run the SQL migrations in your Supabase SQL Editor:
                  </p>

                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>
                      Download migrations from{" "}
                      <a
                        href="https://github.com/therealtimex/realtimex-crm/tree/main/supabase/migrations"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        GitHub
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>
                      Open your{" "}
                      <a
                        href={`https://supabase.com/dashboard/project/${projectRef}/sql/new`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Supabase SQL Editor
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>
                      Run each migration file in order (by date in filename)
                    </li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Additional Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <a
            href="https://github.com/therealtimex/realtimex-crm#installation"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View Full Setup Guide
          </a>
          <a
            href="https://github.com/therealtimex/realtimex-crm/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Report an Issue
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
