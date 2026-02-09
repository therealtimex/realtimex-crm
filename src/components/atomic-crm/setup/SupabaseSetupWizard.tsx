import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ds/ui/dialog";
import { Button } from "@/components/ds/ui/button";
import { Input } from "@/components/ds/ui/input";
import { Label } from "@/components/ds/ui/label";
import { Alert, AlertDescription } from "@/components/ds/ui/alert";
import {
  Loader2,
  Database,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Check,
} from "lucide-react";
import { useTranslate } from "ra-core";
import {
  saveSupabaseConfig,
  validateSupabaseConnection,
} from "@/lib/supabase-config";

type WizardStep = "welcome" | "credentials" | "validating" | "success";

interface SupabaseSetupWizardProps {
  open: boolean;
  onComplete: () => void;
  canClose?: boolean;
}

/**
 * Normalizes Supabase URL input - accepts either full URL or just project ID
 */
function normalizeSupabaseUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // If it starts with http:// or https://, treat as full URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Otherwise, treat as project ID and construct full URL
  return `https://${trimmed}.supabase.co`;
}

/**
 * Validates if input looks like a valid Supabase URL or project ID
 */
function validateUrlFormat(input: string): {
  valid: boolean;
  messageKey?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) return { valid: false };

  // Check if it's a full URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      if (url.hostname.endsWith(".supabase.co")) {
        return {
          valid: true,
          messageKey: "crm.setup_wizard.credentials.url_valid",
        };
      }
      return {
        valid: false,
        messageKey: "crm.setup_wizard.credentials.url_must_be_supabase",
      };
    } catch {
      return {
        valid: false,
        messageKey: "crm.setup_wizard.credentials.url_invalid_format",
      };
    }
  }

  // Check if it's a project ID (alphanumeric, typically 20 chars)
  if (/^[a-z0-9]+$/.test(trimmed)) {
    return {
      valid: true,
      messageKey: "crm.setup_wizard.credentials.url_project_id",
    };
  }

  return { valid: false, messageKey: "crm.setup_wizard.credentials.url_hint" };
}

/**
 * Validates if input looks like a valid Supabase API key
 */
function validateKeyFormat(input: string): {
  valid: boolean;
  messageKey?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) return { valid: false };

  // New publishable keys start with "sb_publishable_" followed by key content
  if (trimmed.startsWith("sb_publishable_")) {
    // Check that there's actual key content after the prefix (at least 20 chars)
    if (trimmed.length > "sb_publishable_".length + 20) {
      return {
        valid: true,
        messageKey: "crm.setup_wizard.credentials.key_valid_publishable",
      };
    }
    return {
      valid: false,
      messageKey: "crm.setup_wizard.credentials.key_incomplete_publishable",
    };
  }

  // Legacy anon keys are JWT tokens starting with "eyJ"
  if (trimmed.startsWith("eyJ")) {
    if (trimmed.length > 100) {
      return {
        valid: true,
        messageKey: "crm.setup_wizard.credentials.key_valid_anon",
      };
    }
    return {
      valid: false,
      messageKey: "crm.setup_wizard.credentials.key_incomplete_anon",
    };
  }

  return {
    valid: false,
    messageKey: "crm.setup_wizard.credentials.key_invalid",
  };
}

export function SupabaseSetupWizard({
  open,
  onComplete,
  canClose = false,
}: SupabaseSetupWizardProps) {
  const [step, setStep] = useState<WizardStep>("welcome");
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [urlTouched, setUrlTouched] = useState(false);
  const [keyTouched, setKeyTouched] = useState(false);
  const translate = useTranslate();

  const handleValidateAndSave = async () => {
    setError(null);
    setStep("validating");

    // Normalize the URL before validation
    const normalizedUrl = normalizeSupabaseUrl(url);
    const trimmedKey = anonKey.trim();

    const result = await validateSupabaseConnection(normalizedUrl, trimmedKey);

    if (result.valid) {
      saveSupabaseConfig({ url: normalizedUrl, anonKey: trimmedKey });
      setStep("success");

      // Reload after short delay to apply new config
      setTimeout(() => {
        // Force reload to ensure new config is loaded
        window.location.href = window.location.origin;
      }, 1500);
    } else {
      setError(
        result.error || translate("crm.setup_wizard.credentials.error_failed"),
      );
      setStep("credentials");
    }
  };

  // Get validation states
  const urlValidation = url ? validateUrlFormat(url) : { valid: false };
  const keyValidation = anonKey ? validateKeyFormat(anonKey) : { valid: false };
  const normalizedUrl = url ? normalizeSupabaseUrl(url) : "";
  const showUrlExpansion =
    url && !url.startsWith("http") && urlValidation.valid;

  const handleClose = () => {
    if (canClose) {
      onComplete();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={canClose ? handleClose : undefined}
      modal={false}
    >
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => !canClose && e.preventDefault()}
        onEscapeKeyDown={(e) => !canClose && e.preventDefault()}
      >
        {step === "welcome" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-6 w-6 text-primary" />
                <DialogTitle>
                  {translate("crm.setup_wizard.welcome.title", {
                    title: "CRM",
                  })}
                </DialogTitle>
              </div>
              <DialogDescription>
                {translate("crm.setup_wizard.welcome.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert>
                <AlertDescription>
                  <strong>
                    {translate("crm.setup_wizard.welcome.no_project")}
                  </strong>
                  <br />
                  {translate("crm.setup_wizard.welcome.create_free")}{" "}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-primary inline-flex items-center gap-1"
                  >
                    supabase.com
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  {translate("crm.setup_wizard.welcome.need_title")}
                </h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>{translate("crm.setup_wizard.welcome.need_url")}</li>
                  <li>{translate("crm.setup_wizard.welcome.need_key")}</li>
                </ul>
              </div>

              <div className="space-y-2">
                <a
                  href="https://supabase.com/docs/guides/api#api-url-and-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  {translate("crm.setup_wizard.welcome.find_hint")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <Button onClick={() => setStep("credentials")} className="w-full">
                {translate("crm.setup_wizard.welcome.continue")}
              </Button>
            </div>
          </>
        )}

        {step === "credentials" && (
          <>
            <DialogHeader>
              <DialogTitle>
                {translate("crm.setup_wizard.credentials.title")}
              </DialogTitle>
              <DialogDescription>
                {translate("crm.setup_wizard.credentials.description")}
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
                <Label htmlFor="supabase-url">
                  {translate("crm.setup_wizard.credentials.url_label")}
                </Label>
                <div className="relative">
                  <Input
                    id="supabase-url"
                    placeholder={translate(
                      "crm.setup_wizard.credentials.url_placeholder",
                    )}
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setUrlTouched(true);
                    }}
                    onBlur={() => setUrlTouched(true)}
                    className={
                      urlTouched && url
                        ? urlValidation.valid
                          ? "pr-8 border-success"
                          : "pr-8 border-destructive"
                        : ""
                    }
                  />
                  {urlTouched && url && urlValidation.valid && (
                    <Check className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
                  )}
                </div>
                {showUrlExpansion && (
                  <div className="flex items-start gap-1.5 text-xs text-success">
                    <Check className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>
                      {translate("crm.setup_wizard.credentials.url_expansion", {
                        url: normalizedUrl,
                      })}
                    </span>
                  </div>
                )}
                {urlTouched &&
                  url &&
                  urlValidation.messageKey &&
                  !urlValidation.valid && (
                    <p className="text-xs text-destructive">
                      {translate(urlValidation.messageKey)}
                    </p>
                  )}
                {(!urlTouched || !url) && (
                  <p className="text-xs text-muted-foreground">
                    {translate("crm.setup_wizard.credentials.url_default_hint")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="anon-key">
                  {translate("crm.setup_wizard.credentials.key_label")}
                </Label>
                <div className="relative">
                  <Input
                    id="anon-key"
                    type="password"
                    placeholder={translate(
                      "crm.setup_wizard.credentials.key_placeholder",
                    )}
                    value={anonKey}
                    onChange={(e) => {
                      setAnonKey(e.target.value);
                      setKeyTouched(true);
                    }}
                    onBlur={() => setKeyTouched(true)}
                    className={
                      keyTouched && anonKey
                        ? keyValidation.valid
                          ? "pr-8 border-success"
                          : "pr-8 border-destructive"
                        : ""
                    }
                  />
                  {keyTouched && anonKey && keyValidation.valid && (
                    <Check className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
                  )}
                </div>
                {keyTouched && anonKey && keyValidation.messageKey && (
                  <p
                    className={`text-xs ${keyValidation.valid ? "text-success" : "text-destructive"}`}
                  >
                    {translate(keyValidation.messageKey)}
                  </p>
                )}
                {(!keyTouched || !anonKey) && (
                  <p className="text-xs text-muted-foreground">
                    {translate("crm.setup_wizard.credentials.key_default_hint")}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("welcome")}
                  className="flex-1"
                >
                  {translate("crm.setup_wizard.credentials.back")}
                </Button>
                <Button
                  onClick={handleValidateAndSave}
                  disabled={!urlValidation.valid || !keyValidation.valid}
                  className="flex-1"
                >
                  {translate("crm.setup_wizard.credentials.connect")}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "validating" && (
          <>
            <DialogHeader>
              <DialogTitle>
                {translate("crm.setup_wizard.validating.title")}
              </DialogTitle>
              <DialogDescription>
                {translate("crm.setup_wizard.validating.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                {translate("crm.setup_wizard.validating.wait")}
              </p>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle>
                {translate("crm.setup_wizard.success.title")}
              </DialogTitle>
              <DialogDescription>
                {translate("crm.setup_wizard.success.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="mb-4 h-12 w-12 text-success" />
              <p className="text-sm text-muted-foreground">
                {translate("crm.setup_wizard.success.reloading")}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
