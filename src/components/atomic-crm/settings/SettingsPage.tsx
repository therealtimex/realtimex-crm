import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleX,
  Copy,
  Pencil,
  Save,
  Building2,
  UserCircle,
  Mail,
  FileText,
} from "lucide-react";
import {
  Form,
  useDataProvider,
  useGetIdentity,
  useGetOne,
  useNotify,
  useTranslate,
} from "ra-core";
import { useState } from "react";
import { useFormState } from "react-hook-form";
import { useNavigate } from "react-router";
import { RecordField } from "@/components/ds/admin/record-field";
import { TextInput } from "@/components/ds/admin/text-input";
import { Button } from "@/components/ds/ui/button";
import { Card, CardContent } from "@/components/ds/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ds/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ds/ui/tooltip";

import ImageEditorField from "../misc/ImageEditorField";
import type { CrmDataProvider } from "../providers/types";
import type { SalesFormData } from "../types";
import { TemplatesList } from "../invoices/TemplatesList";
import { isDemoMode } from "@/lib/demo-utils";
import { Alert, AlertDescription } from "@/components/ds/ui/alert";
import { Info, Brain } from "lucide-react";
import { AgentToggle } from "./AgentToggle";

export const SettingsPage = () => {
  const translate = useTranslate();

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4">
      <h1 className="text-2xl font-bold mb-6">
        {translate("crm.nav.settings")}
      </h1>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            {translate("crm.settings.section.profile") || "Profile"}
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {translate("crm.settings.section.organization") || "Organization"}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {translate("resources.invoice_templates.name", {
              smart_count: 2,
            }) || "Templates"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="organization">
          <OrganizationSettings />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ProfileSettings = () => {
  const [isEditMode, setEditMode] = useState(false);
  const { identity, refetch: refetchIdentity } = useGetIdentity();
  const { data, refetch: refetchUser } = useGetOne("sales", {
    id: identity?.id,
  });
  const notify = useNotify();
  const translate = useTranslate();
  const dataProvider = useDataProvider<CrmDataProvider>();

  const { mutate } = useMutation({
    mutationKey: ["profile-update"],
    mutationFn: async (data: SalesFormData) => {
      if (!identity) throw new Error("Identity not found");
      return dataProvider.salesUpdate(identity.id, data);
    },
    onSuccess: () => {
      refetchIdentity();
      refetchUser();
      setEditMode(false);
      notify(translate("crm.settings.notification.profile_updated"));
    },
    onError: () => {
      notify(translate("crm.settings.notification.error"), { type: "error" });
    },
  });

  if (!identity) return null;

  return (
    <Form onSubmit={(values: any) => mutate(values)} record={data}>
      <Card>
        <CardContent className="pt-6">
          {isDemoMode() && (
            <Alert className="mb-6 border-info/30 bg-info/10">
              <Info className="h-4 w-4 text-info" />
              <AlertDescription className="text-info">
                You are in Demo Mode. Personal settings can be viewed but not
                all actions (like password changes) are available.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-4 mb-6">
            <ImageEditorField
              source="avatar"
              type="avatar"
              onSave={(values: any) => mutate(values)}
              linkPosition="right"
            />
            <TextRender
              source="first_name"
              label={translate("crm.contact.field.first_name")}
              isEditMode={isEditMode}
            />
            <TextRender
              source="last_name"
              label={translate("crm.contact.field.last_name")}
              isEditMode={isEditMode}
            />
            <TextRender
              source="email"
              label={translate("ra.auth.email")}
              isEditMode={isEditMode}
            />
          </div>

          <div className="flex flex-row justify-end gap-2">
            {!isEditMode && <PasswordChangeButton />}

            <Button
              type="button"
              variant={isEditMode ? "ghost" : "outline"}
              onClick={() => setEditMode(!isEditMode)}
            >
              {isEditMode ? (
                <CircleX className="mr-2 h-4 w-4" />
              ) : (
                <Pencil className="mr-2 h-4 w-4" />
              )}
              {isEditMode
                ? translate("crm.activity.cancel")
                : translate("crm.task.action.edit")}
            </Button>

            {isEditMode && <SaveButton />}
          </div>
        </CardContent>
      </Card>

      {import.meta.env.VITE_INBOUND_EMAIL && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-2">
              {translate("crm.settings.inbound_email.title")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {translate("crm.settings.inbound_email.description")}
            </p>
            <CopyPaste value={import.meta.env.VITE_INBOUND_EMAIL} />
          </CardContent>
        </Card>
      )}
    </Form>
  );
};

const OrganizationSettings = () => {
  const [isEditMode, setEditMode] = useState(false);
  const notify = useNotify();
  const translate = useTranslate();
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  const {
    data: businessProfile,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["business_profile"],
    queryFn: async () => {
      const { data } = await dataProvider.getOne("business_profile", { id: 1 });
      return data;
    },
  });

  const { mutate } = useMutation({
    mutationFn: async (values: any) => {
      return dataProvider.update("business_profile", {
        id: 1,
        data: values,
        previousData: businessProfile,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business_profile"] });
      refetch();
      setEditMode(false);
      notify(
        translate("resources.business_profile.notification.updated") ||
          "Organization profile updated",
      );
    },
    onError: (error: any) => {
      notify(error.message || "Error updating organization profile", {
        type: "error",
      });
    },
  });

  if (isLoading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <Form onSubmit={(values: any) => mutate(values)} record={businessProfile}>
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <ImageEditorField
                source="logo"
                type="avatar"
                width={80}
                height={80}
                onSave={(values: any) => mutate(values)}
                linkPosition="bottom"
              />
              <div className="flex-1 space-y-4">
                <TextRender
                  source="name"
                  label={
                    translate("resources.business_profile.fields.name") ||
                    "Organization Name"
                  }
                  isEditMode={isEditMode}
                />
                <TextRender
                  source="tax_id"
                  label={
                    translate("resources.business_profile.fields.tax_id") ||
                    "Tax ID / EIN"
                  }
                  isEditMode={isEditMode}
                />
                <div className="pt-6 border-t font-sans">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    AI & Automation
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-dashed">
                    <AgentToggle />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <TextRender
                source="address"
                label={
                  translate("resources.business_profile.fields.address") ||
                  "Official Address"
                }
                isEditMode={isEditMode}
                multiline
              />
              <TextRender
                source="bank_details"
                label={
                  translate("resources.business_profile.fields.bank_details") ||
                  "Bank Details (Payment Instructions)"
                }
                isEditMode={isEditMode}
                multiline
                rows={3}
              />
              <TextRender
                source="default_payment_terms"
                label={
                  translate(
                    "resources.business_profile.fields.default_payment_terms",
                  ) || "Default Payment Terms"
                }
                isEditMode={isEditMode}
                helperText="e.g. Net 30, Due on Receipt"
              />
              <TextRender
                source="default_terms_and_conditions"
                label={
                  translate(
                    "resources.business_profile.fields.default_terms_and_conditions",
                  ) || "Default Terms & Conditions"
                }
                isEditMode={isEditMode}
                multiline
                rows={4}
              />
            </div>
          </div>

          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {translate("crm.settings.section.email") || "Email Settings"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextRender
                source="email_from_name"
                label={
                  translate(
                    "resources.business_profile.fields.email_from_name",
                  ) || "Email Sender Name"
                }
                isEditMode={isEditMode}
                helperText="Name shown as the sender (e.g. Acme Invoices)"
              />
              <TextRender
                source="email_from_email"
                label={
                  translate(
                    "resources.business_profile.fields.email_from_email",
                  ) || "Email Sender Address"
                }
                isEditMode={isEditMode}
                helperText="Email shown as the sender (e.g. billing@acme.com)"
              />
              <TextRender
                source="resend_api_key"
                label={
                  translate(
                    "resources.business_profile.fields.resend_api_key",
                  ) || "Resend API Key"
                }
                isEditMode={isEditMode}
                type="password"
                helperText="Your Resend API key (re_...). Leave empty to use environment variable."
                disabled={isDemoMode()}
              />
            </div>
          </div>

          <div className="flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant={isEditMode ? "ghost" : "outline"}
              onClick={() => setEditMode(!isEditMode)}
            >
              {isEditMode ? (
                <CircleX className="mr-2 h-4 w-4" />
              ) : (
                <Pencil className="mr-2 h-4 w-4" />
              )}
              {isEditMode
                ? translate("crm.activity.cancel")
                : translate("crm.task.action.edit")}
            </Button>

            {isEditMode && <SaveButton />}
          </div>
        </CardContent>
      </Card>
    </Form>
  );
};

// Sub-components
const PasswordChangeButton = () => {
  const translate = useTranslate();
  const navigate = useNavigate();
  const isDemo = isDemoMode();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate("/change-password")}
              disabled={isDemo}
            >
              {translate("crm.settings.action.change_password")}
            </Button>
          </span>
        </TooltipTrigger>
        {isDemo && (
          <TooltipContent>
            <p>Password changes are disabled in demo mode</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

const SaveButton = () => {
  const translate = useTranslate();
  const { isDirty } = useFormState();
  return (
    <Button type="submit" disabled={!isDirty} variant="default">
      <Save className="mr-2 h-4 w-4" />
      {translate("ra.action.save")}
    </Button>
  );
};

const TextRender = ({
  source,
  label,
  isEditMode,
  multiline = false,
  rows = 1,
  helperText,
  type = "text",
  disabled = false,
}: {
  source: string;
  label: string;
  isEditMode: boolean;
  multiline?: boolean;
  rows?: number;
  helperText?: string;
  type?: "text" | "password";
  disabled?: boolean;
}) => {
  if (isEditMode) {
    return (
      <TextInput
        source={source}
        label={label}
        helperText={helperText || false}
        multiline={multiline}
        rows={rows}
        type={type}
        disabled={disabled}
      />
    );
  }
  return (
    <div className="py-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
        {label}
      </p>
      <div className="text-sm border-l-2 border-muted pl-3 py-1 bg-muted/10 rounded-r">
        <RecordField
          source={source}
          label={false}
          className="whitespace-pre-line"
        />
      </div>
    </div>
  );
};

const CopyPaste = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  const translate = useTranslate();
  const handleCopy = () => {
    setCopied(true);
    navigator.clipboard.writeText(value);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={handleCopy}
            variant="secondary"
            className="w-full justify-between font-mono text-xs"
          >
            <span className="truncate">{value}</span>
            <Copy className="h-3 w-3 ml-2 shrink-0" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {copied
              ? "Copied!"
              : translate("crm.integrations.api_keys.action.copy")}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

SettingsPage.path = "/settings";
