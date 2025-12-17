import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, CheckCircle, XCircle, Settings, Trash2 } from 'lucide-react';
import {
  getSupabaseConfig,
  clearSupabaseConfig,
  getConfigSource,
} from '@/lib/supabase-config';
import { SupabaseSetupWizard } from '../setup/SupabaseSetupWizard';

export function DatabaseSettings() {
  const [showWizard, setShowWizard] = useState(false);
  const config = getSupabaseConfig();
  const source = getConfigSource();

  const handleClearConfig = () => {
    if (
      confirm(
        'Are you sure you want to clear the database configuration? The app will need to be reconfigured on next launch.'
      )
    ) {
      clearSupabaseConfig();
      window.location.reload();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Database Connection</CardTitle>
            </div>
            {config && (
              <Badge variant={source === 'ui' ? 'default' : 'secondary'}>
                {source === 'ui' ? 'UI Configured' : 'Environment Variables'}
              </Badge>
            )}
          </div>
          <CardDescription>
            Manage your Supabase database connection settings
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {config ? (
            <>
              {/* Connection Status */}
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium">Connected</p>
                  <p className="text-sm text-muted-foreground">{config.url}</p>
                  {config.configuredAt && (
                    <p className="text-xs text-muted-foreground">
                      Configured on{' '}
                      {new Date(config.configuredAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Configuration Source Info */}
              {source === 'env' && (
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Using configuration from environment variables. You can override this by
                    setting up a new connection via the UI.
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowWizard(true)}
                  className="flex-1"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Change Connection
                </Button>
                {source === 'ui' && (
                  <Button
                    variant="destructive"
                    onClick={handleClearConfig}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Configuration
                  </Button>
                )}
              </div>

              {/* Anon Key Display (masked) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Anonymous Key</Label>
                <div className="font-mono text-sm p-2 bg-muted rounded">
                  {config.anonKey.substring(0, 20)}...{config.anonKey.substring(config.anonKey.length - 10)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 border border-dashed rounded-lg">
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium">Not Connected</p>
                  <p className="text-sm text-muted-foreground">
                    No Supabase database is configured
                  </p>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  Connect to a Supabase database to start using Atomic CRM. You can create a
                  free project at{' '}
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
                Connect to Supabase
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <SupabaseSetupWizard
        open={showWizard}
        onComplete={() => setShowWizard(false)}
        canClose={true}
      />
    </>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
