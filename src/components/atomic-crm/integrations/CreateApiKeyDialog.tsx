import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useDataProvider,
  useNotify,
  useGetIdentity,
  useTranslate,
} from "ra-core";
import { generateApiKey, hashApiKey } from "@/lib/api-key-utils";
import { encryptValue } from "@/lib/encryption-utils";
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
import { Checkbox } from "@/components/ds/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ds/ui/alert";
import { Copy, CheckCircle } from "lucide-react";

interface CreateApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
}

const AVAILABLE_SCOPES = [
  "contacts:read",
  "contacts:write",
  "companies:read",
  "companies:write",
  "deals:read",
  "deals:write",
  "tasks:read",
  "tasks:write",
  "invoices:read",
  "invoices:write",
  "activities:write",
];

export const CreateApiKeyDialog = ({
  open,
  onClose,
}: CreateApiKeyDialogProps) => {
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { identity } = useGetIdentity();
  const translate = useTranslate();

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      name: "",
      scopes: [] as string[],
      expires_at: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const apiKey = generateApiKey();
      const keyHash = await hashApiKey(apiKey);
      const keyPrefix = apiKey.substring(0, 12);
      const encryptedKey = await encryptValue(apiKey);

      const { data } = await dataProvider.create("api_keys", {
        data: {
          name: values.name,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          encrypted_key: encryptedKey,
          scopes: values.scopes,
          is_active: true,
          expires_at: values.expires_at || null,
          sales_id: identity?.id,
          created_by_sales_id: identity?.id,
        },
      });

      return { data, apiKey };
    },
    onSuccess: ({ apiKey }) => {
      setCreatedKey(apiKey);
      queryClient.invalidateQueries({ queryKey: ["api_keys"] });
      notify(translate("crm.integrations.api_keys.notification.created"));
    },
    onError: () => {
      notify(
        translate("crm.integrations.api_keys.notification.error_creating"),
        {
          type: "error",
        },
      );
    },
  });

  const handleClose = () => {
    setCreatedKey(null);
    setCopied(false);
    reset();
    onClose();
  };

  const copyApiKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleScope = (scope: string) => {
    const currentScopes = watch("scopes");
    if (currentScopes.includes(scope)) {
      setValue(
        "scopes",
        currentScopes.filter((s) => s !== scope),
      );
    } else {
      setValue("scopes", [...currentScopes, scope]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {createdKey
              ? translate("crm.integrations.api_keys.dialog.created_title")
              : translate("crm.integrations.api_keys.dialog.create_title")}
          </DialogTitle>
          <DialogDescription>
            {createdKey
              ? translate(
                  "crm.integrations.api_keys.dialog.created_description",
                )
              : translate(
                  "crm.integrations.api_keys.dialog.create_description",
                )}
          </DialogDescription>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                {translate("crm.integrations.api_keys.dialog.warning_copy")}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>
                {translate("crm.integrations.api_keys.fields.your_api_key")}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={createdKey}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyApiKey}
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>
                {translate("crm.integrations.api_keys.action.done")}
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {translate("crm.integrations.api_keys.fields.name")}
                </Label>
                <Input
                  id="name"
                  placeholder={translate(
                    "crm.integrations.api_keys.placeholder.name",
                  )}
                  {...register("name", { required: true })}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  {translate("crm.integrations.api_keys.fields.scopes")}
                </Label>
                <div className="space-y-2">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <div key={scope} className="flex items-center space-x-2">
                      <Checkbox
                        id={scope}
                        checked={watch("scopes").includes(scope)}
                        onCheckedChange={() => toggleScope(scope)}
                      />
                      <label htmlFor={scope} className="text-sm cursor-pointer">
                        {translate(
                          `crm.integrations.api_keys.scopes.${scope}`,
                          {
                            _: scope,
                          },
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires_at">
                  {translate("crm.integrations.api_keys.fields.expiration")}
                </Label>
                <Input
                  id="expires_at"
                  type="date"
                  {...register("expires_at")}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  {translate("crm.activity.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {translate("crm.integrations.api_keys.action.create")}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
