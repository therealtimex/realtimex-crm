import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, CheckCircle, AlertCircle } from 'lucide-react';
import {
  saveSupabaseConfig,
  validateSupabaseConnection,
} from '@/lib/supabase-config';

type WizardStep = 'welcome' | 'credentials' | 'validating' | 'success';

interface SupabaseSetupWizardProps {
  open: boolean;
  onComplete: () => void;
  canClose?: boolean;
}

export function SupabaseSetupWizard({
  open,
  onComplete,
  canClose = false,
}: SupabaseSetupWizardProps) {
  const [step, setStep] = useState<WizardStep>('welcome');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleValidateAndSave = async () => {
    setError(null);
    setStep('validating');

    const result = await validateSupabaseConnection(url, anonKey);

    if (result.valid) {
      saveSupabaseConfig({ url, anonKey });
      setStep('success');

      // Reload after short delay to apply new config
      setTimeout(() => {
        // Force reload to ensure new config is loaded
        window.location.href = window.location.origin;
      }, 1500);
    } else {
      setError(result.error || 'Connection failed');
      setStep('credentials');
    }
  };

  const handleClose = () => {
    if (canClose) {
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={canClose ? handleClose : undefined}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => !canClose && e.preventDefault()}
        onEscapeKeyDown={(e) => !canClose && e.preventDefault()}
      >
        {step === 'welcome' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-6 w-6 text-primary" />
                <DialogTitle>Welcome to Atomic CRM</DialogTitle>
              </div>
              <DialogDescription>
                To get started, you'll need to connect to a Supabase database.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert>
                <AlertDescription>
                  <strong>Don't have a Supabase project?</strong>
                  <br />
                  Create one for free at{' '}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-primary"
                  >
                    supabase.com
                  </a>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">What you'll need:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Your Supabase project URL</li>
                  <li>Your anonymous (anon) API key</li>
                </ul>
              </div>

              <Button onClick={() => setStep('credentials')} className="w-full">
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 'credentials' && (
          <>
            <DialogHeader>
              <DialogTitle>Connect to Supabase</DialogTitle>
              <DialogDescription>
                Enter your Supabase project credentials
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="supabase-url">Supabase URL</Label>
                <Input
                  id="supabase-url"
                  placeholder="https://xxxxx.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Found in Project Settings → API
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="anon-key">Anonymous Key</Label>
                <Input
                  id="anon-key"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Found in Project Settings → API → Project API keys
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('welcome')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleValidateAndSave}
                  disabled={!url || !anonKey}
                  className="flex-1"
                >
                  Connect
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'validating' && (
          <>
            <DialogHeader>
              <DialogTitle>Validating Connection</DialogTitle>
              <DialogDescription>
                Testing your Supabase credentials...
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Please wait...</p>
            </div>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle>Connection Successful!</DialogTitle>
              <DialogDescription>
                Your Supabase database is now connected
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-sm text-muted-foreground">
                Reloading application...
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
