import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider, useNotify, useGetIdentity } from "ra-core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Copy } from "lucide-react";
import { CreateApiKeyDialog } from "./CreateApiKeyDialog";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";

export const ApiKeysTab = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<number | null>(null);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { identity: _identity } = useGetIdentity();

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
      await dataProvider.delete("api_keys", { id, previousData: {} });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_keys"] });
      notify("API key deleted successfully");
      setKeyToDelete(null);
    },
    onError: () => {
      notify("Failed to delete API key", { type: "error" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          API keys allow external applications to access your CRM data
          programmatically.
        </p>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading...
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
            <p className="text-muted-foreground mb-4">No API keys yet</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first API key
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
            <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this API key. Any applications using
              this key will stop working immediately. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => keyToDelete && deleteMutation.mutate(keyToDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
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

  const copyFullKey = async () => {
    try {
      if (apiKey.encrypted_key) {
        const fullKey = await decryptValue(apiKey.encrypted_key);
        await navigator.clipboard.writeText(fullKey);
        notify("Full API key copied to clipboard");
      } else {
        notify("API key not available for copying", { type: "warning" });
      }
    } catch (_error) {
      notify("Failed to copy API key", { type: "error" });
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
                <Badge variant="default">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {apiKey.scopes && apiKey.scopes.length > 0 && (
                <Badge variant="outline">{apiKey.scopes.join(", ")}</Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <div className="flex items-center gap-2 font-mono text-sm bg-muted p-2 rounded">
            <span className="flex-1">{apiKey.key_prefix}••••••••••••••••••••</span>
            <Button variant="ghost" size="icon" onClick={copyFullKey}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Click copy to get the full unmasked key
          </p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Created: {format(new Date(apiKey.created_at), "PPP")}</p>
          {apiKey.last_used_at && (
            <p>Last used: {format(new Date(apiKey.last_used_at), "PPp")}</p>
          )}
          {apiKey.expires_at && (
            <p>Expires: {format(new Date(apiKey.expires_at), "PPP")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
