import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle, Database, ExternalLink } from "lucide-react";

interface DatabaseSetupGuideProps {
  missingTables: string[];
  supabaseUrl: string;
}

export function DatabaseSetupGuide({
  missingTables,
  supabaseUrl,
}: DatabaseSetupGuideProps) {
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Setup Instructions</CardTitle>
          </div>
          <CardDescription>
            Follow these steps to set up your database schema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </div>
              <h3 className="font-semibold">Using Supabase CLI (Recommended)</h3>
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

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Clone the RealTimeX CRM repository to get migrations:
                </p>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                  git clone https://github.com/therealtimex/realtimex-crm.git
                  {"\n"}cd realtimex-crm
                </pre>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Link to your Supabase project:
                </p>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                  supabase link --project-ref {projectRef || "YOUR_PROJECT_REF"}
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

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Reload this page after migrations are complete.
                </p>
              </div>
            </div>
          </div>

          {/* Option 2: SQL Editor */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
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
                <li>
                  Reload this page after all migrations are complete
                </li>
              </ol>

              {projectRef && (
                <Button asChild variant="outline" className="w-full">
                  <a
                    href={`https://supabase.com/dashboard/project/${projectRef}/sql/new`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open SQL Editor
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Verification */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold">After Setup</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
                <span>
                  All tables will be created with proper schemas and
                  relationships
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
                <span>Row Level Security (RLS) policies will be configured</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
                <span>Database triggers and functions will be set up</span>
              </div>
            </div>

            <Button
              onClick={() => window.location.reload()}
              className="w-full mt-4"
            >
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>

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
          <a
            href="https://supabase.com/docs/guides/cli"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Supabase CLI Documentation
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
