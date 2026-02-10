import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider, useNotify, useTranslate } from "ra-core";
import { Button } from "@/components/ds/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ds/ui/card";
import { Label } from "@/components/ds/ui/label";
import { Plus, Trash2, Copy, Activity } from "lucide-react";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { Badge } from "@/components/ds/ui/badge";
import { format } from "date-fns";
import { getSupabaseConfig } from "@/lib/supabase-config";
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

export const IngestionChannelsTab = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<string | null>(null);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const translate = useTranslate();

  const { data: channels, isLoading } = useQuery({
    queryKey: ["ingestion_providers"],
    queryFn: async () => {
      const { data } = await dataProvider.getList("ingestion_providers", {
        pagination: { page: 1, perPage: 100 },
        sort: { field: "created_at", order: "DESC" },
        filter: {},
      });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await dataProvider.delete("ingestion_providers", {
        id,
        previousData: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingestion_providers"] });
      notify(translate("crm.integrations.ingestion.notification.deleted"));
      setChannelToDelete(null);
    },
    onError: () => {
      notify(
        translate("crm.integrations.ingestion.notification.error_deleting"),
        { type: "error" },
      );
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {translate("crm.integrations.ingestion.description")}
        </p>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {translate("crm.integrations.ingestion.action.add")}
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {translate("crm.integrations.ingestion.loading")}
          </CardContent>
        </Card>
      ) : channels && channels.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {channels.map((channel: any) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onDelete={() => setChannelToDelete(channel.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {translate("crm.integrations.ingestion.empty")}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {translate("crm.integrations.ingestion.action.add_first")}
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateChannelDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      <AlertDialog
        open={channelToDelete !== null}
        onOpenChange={() => setChannelToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {translate("crm.integrations.ingestion.dialog.delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {translate(
                "crm.integrations.ingestion.dialog.delete_description",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {translate("crm.activity.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                channelToDelete && deleteMutation.mutate(channelToDelete)
              }
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

const ChannelCard = ({
  channel,
  onDelete,
}: {
  channel: any;
  onDelete: () => void;
}) => {
  const notify = useNotify();
  const translate = useTranslate();

  // Get the actual Supabase URL from config (localStorage or env vars)
  const supabaseConfig = getSupabaseConfig();
  const webhookUrl = supabaseConfig
    ? `${supabaseConfig.url}/functions/v1/ingest-activity?key=${channel.ingestion_key}`
    : `https://your-project.supabase.co/functions/v1/ingest-activity?key=${channel.ingestion_key}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    notify(translate("crm.integrations.ingestion.action.url_copied"));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{channel.name}</CardTitle>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{channel.provider_code}</Badge>
                {channel.is_active ? (
                  <Badge className="bg-green-500 hover:bg-green-600">
                    {translate("crm.integrations.webhooks.status.active")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {translate("crm.integrations.webhooks.status.inactive")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {translate("crm.integrations.ingestion.fields.webhook_url")}
          </Label>
          <div className="flex items-center gap-2 font-mono text-xs bg-muted p-2 rounded overflow-hidden">
            <span className="truncate">{webhookUrl}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto flex-shrink-0"
              onClick={copyUrl}
              title={translate("crm.integrations.ingestion.action.copy_url")}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>
            {translate("crm.integrations.ingestion.fields.created", {
              date: format(new Date(channel.created_at), "PPP"),
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
