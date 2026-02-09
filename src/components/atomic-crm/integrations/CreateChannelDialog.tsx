import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider, useNotify, useTranslate } from "ra-core";
import { Button } from "@/components/ds/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ds/ui/dialog";
import { Input } from "@/components/ds/ui/input";
import { Label } from "@/components/ds/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ds/ui/select";
import { Loader2 } from "lucide-react";

interface CreateChannelDialogProps {
  open: boolean;
  onClose: () => void;
}

export const CreateChannelDialog = ({
  open,
  onClose,
}: CreateChannelDialogProps) => {
  const [providerCode, setProviderCode] = useState<string>("twilio");
  const [name, setName] = useState("");
  const [authToken, setAuthToken] = useState("");
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const translate = useTranslate();

  const createMutation = useMutation({
    mutationFn: async () => {
      // Generate a cryptographically secure random ingestion key
      const ingestionKey = "ik_live_" + crypto.randomUUID().replace(/-/g, "");

      const config: any = {};
      if (authToken) {
        config.auth_token = authToken;
      }

      await dataProvider.create("ingestion_providers", {
        data: {
          name,
          provider_code: providerCode,
          is_active: true,
          config,
          ingestion_key: ingestionKey,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingestion_providers"] });
      notify(translate("crm.integrations.ingestion.notification.created"));
      onClose();
      // Reset form
      setName("");
      setAuthToken("");
      setProviderCode("twilio");
    },
    onError: (error: Error) => {
      notify(
        translate("crm.integrations.ingestion.notification.error_creating", {
          message: error.message,
        }),
        { type: "error" },
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {translate("crm.integrations.ingestion.action.add")}
          </DialogTitle>
          <DialogDescription>
            {translate("crm.integrations.ingestion.dialog.create_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              {translate("crm.integrations.ingestion.dialog.name_label")}
            </Label>
            <Input
              id="name"
              placeholder={translate(
                "crm.integrations.ingestion.dialog.placeholder_name",
              )}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider">
              {translate("crm.integrations.ingestion.dialog.provider_label")}
            </Label>
            <Select value={providerCode} onValueChange={setProviderCode}>
              <SelectTrigger>
                <SelectValue
                  placeholder={translate(
                    "crm.integrations.ingestion.dialog.select_provider",
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">
                  {translate("crm.integrations.ingestion.providers.twilio")}
                </SelectItem>
                <SelectItem value="postmark">
                  {translate("crm.integrations.ingestion.providers.postmark")}
                </SelectItem>
                <SelectItem value="generic">
                  {translate("crm.integrations.ingestion.providers.generic")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {providerCode === "twilio" && (
            <div className="grid gap-2">
              <Label htmlFor="token">
                {translate("crm.integrations.ingestion.dialog.token_label")}
              </Label>
              <Input
                id="token"
                type="password"
                placeholder={translate(
                  "crm.integrations.ingestion.dialog.placeholder_token",
                )}
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {translate("crm.integrations.ingestion.dialog.token_hint")}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate("crm.activity.cancel")}
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name || createMutation.isPending}
          >
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {translate("crm.integrations.ingestion.action.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
