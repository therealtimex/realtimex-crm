import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider, useNotify, useGetIdentity } from "ra-core";
import { generateApiKey, hashApiKey } from "@/lib/api-key-utils";
import { encryptValue } from "@/lib/encryption-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle } from "lucide-react";

interface CreateApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
}

const AVAILABLE_SCOPES = [
  { value: "contacts:read", label: "Contacts: Read" },
  { value: "contacts:write", label: "Contacts: Write" },
  { value: "companies:read", label: "Companies: Read" },
  { value: "companies:write", label: "Companies: Write" },
  { value: "deals:read", label: "Deals: Read" },
  { value: "deals:write", label: "Deals: Write" },
  { value: "activities:write", label: "Activities: Write" },
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
      notify("API key created successfully");
    },
    onError: () => {
      notify("Failed to create API key", { type: "error" });
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
        currentScopes.filter((s) => s !== scope)
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
            {createdKey ? "API Key Created" : "Create API Key"}
          </DialogTitle>
          <DialogDescription>
            {createdKey
              ? "Copy this key now - it won't be shown again!"
              : "Create a new API key to access the CRM API"}
          </DialogDescription>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Make sure to copy your API key now. You won't be able to see it
                again!
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Your API Key</Label>
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
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production API Key"
                  {...register("name", { required: true })}
                />
              </div>

              <div className="space-y-2">
                <Label>Scopes</Label>
                <div className="space-y-2">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <div key={scope.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={scope.value}
                        checked={watch("scopes").includes(scope.value)}
                        onCheckedChange={() => toggleScope(scope.value)}
                      />
                      <label htmlFor={scope.value} className="text-sm cursor-pointer">
                        {scope.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires_at">Expiration (optional)</Label>
                <Input
                  id="expires_at"
                  type="date"
                  {...register("expires_at")}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  Create
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
