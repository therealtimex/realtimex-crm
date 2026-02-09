import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider, useNotify, useTranslate } from "ra-core";
import { Button } from "@/components/ds/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/ui/card";
import { Plus, Trash2, Copy } from "lucide-react";
import { CreateApiKeyDialog } from "./CreateApiKeyDialog";
import { Badge } from "@/components/ds/ui/badge";
import { format } from "date-fns";
import { decryptValue } from "@/lib/encryption-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ds/ui/alert-dialog";
import { isDemoMode } from "@/lib/demo-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ds/ui/tooltip";

export const ApiKeysTab = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<number | null>(null);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const translate = useTranslate();

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["api_keys"],
    queryFn: async () => {
      const { data } = await dataProvider.getList("api_keys", {
        pagination: { page: 1, perPage: 100 },
        sort: { field: "created_at", order: "DESC" },
        filter: {},
      });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await dataProvider.delete("api_keys", {
        id,
        previousData: { id } as any,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_keys"] });
      notify(translate("crm.integrations.api_keys.notification.deleted"));
      setKeyToDelete(null);
    },
    onError: () => {
      notify(
        translate("crm.integrations.api_keys.notification.error_deleting"),
        {
          type: "error",
        },
      );
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {translate("crm.integrations.api_keys.description")}
        </p>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  disabled={isDemoMode()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {translate("crm.integrations.api_keys.action.create")}
                </Button>
              </span>
            </TooltipTrigger>
            {isDemoMode() && (
              <TooltipContent>
                <p>Creating API keys is disabled in demo mode</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {translate("crm.integrations.api_keys.loading")}
          </CardContent>
        </Card>
      ) : apiKeys && apiKeys.length > 0 ? (
        <div className="space-y-3">
          {apiKeys.map((key: any) => (
            <ApiKeyCard
              key={key.id}
              apiKey={key}
              onDelete={() => setKeyToDelete(key.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {translate("crm.integrations.api_keys.empty")}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {translate("crm.integrations.api_keys.action.create_first")}
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateApiKeyDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      <AlertDialog
        open={keyToDelete !== null}
        onOpenChange={() => setKeyToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {translate("crm.integrations.api_keys.dialog.delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {translate("crm.integrations.api_keys.dialog.delete_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {translate("crm.activity.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => keyToDelete && deleteMutation.mutate(keyToDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {translate("crm.integrations.webhooks.action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const ApiKeyCard = ({
  apiKey,
  onDelete,
}: {
  apiKey: any;
  onDelete: () => void;
}) => {
  const notify = useNotify();
  const translate = useTranslate();

  const copyFullKey = async () => {
    try {
      if (apiKey.encrypted_key) {
        const fullKey = await decryptValue(apiKey.encrypted_key);
        await navigator.clipboard.writeText(fullKey);
        notify(translate("crm.integrations.api_keys.action.copied"));
      } else {
        notify(translate("crm.integrations.api_keys.fields.not_available"), {
          type: "warning",
        });
      }
    } catch {
      notify(
        translate("crm.integrations.api_keys.notification.error_copying"),
        { type: "error" },
      );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{apiKey.name}</CardTitle>
            <div className="flex gap-2 mt-2">
              {apiKey.is_active ? (
                <Badge variant="default">
                  {translate("crm.integrations.webhooks.status.active")}
                </Badge>
              ) : (
                <Badge variant="secondary">
                  {translate("crm.integrations.webhooks.status.inactive")}
                </Badge>
              )}
              {apiKey.scopes && apiKey.scopes.length > 0 && (
                <Badge variant="outline">{apiKey.scopes.join(", ")}</Badge>
              )}
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    disabled={isDemoMode()}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </span>
              </TooltipTrigger>
              {isDemoMode() && (
                <TooltipContent>
                  <p>Deleting API keys is disabled in demo mode</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <div className="flex items-center gap-2 font-mono text-sm bg-muted p-2 rounded">
            <span className="flex-1">
              {apiKey.key_prefix}••••••••••••••••••••
            </span>
            <Button variant="ghost" size="icon" onClick={copyFullKey}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {translate("crm.integrations.api_keys.fields.key_hint")}
          </p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            {translate("crm.integrations.api_keys.fields.created", {
              date: format(new Date(apiKey.created_at), "PPP"),
            })}
          </p>
          {apiKey.last_used_at && (
            <p>
              {translate("crm.integrations.api_keys.fields.last_used", {
                date: format(new Date(apiKey.last_used_at), "PPp"),
              })}
            </p>
          )}
          {apiKey.expires_at && (
            <p>
              {translate("crm.integrations.api_keys.fields.expires", {
                date: format(new Date(apiKey.expires_at), "PPP"),
              })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
