import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider, useNotify } from "ra-core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Copy, Activity } from "lucide-react";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";

export const IngestionChannelsTab = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<string | null>(null);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const queryClient = useQueryClient();

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
      await dataProvider.delete("ingestion_providers", { id, previousData: {} });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingestion_providers"] });
      notify("Channel deleted successfully");
      setChannelToDelete(null);
    },
    onError: () => {
      notify("Failed to delete channel", { type: "error" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Configure inbound channels (Email, Voice, SMS) to ingest activities into your CRM.
        </p>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Channel
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading...
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
            <p className="text-muted-foreground mb-4">No ingestion channels configured</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add your first channel
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
            <AlertDialogTitle>Delete Channel?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop all ingestion from this source. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => channelToDelete && deleteMutation.mutate(channelToDelete)}
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

const ChannelCard = ({
  channel,
  onDelete,
}: {
  channel: any;
  onDelete: () => void;
}) => {
  const notify = useNotify();

  // Get the actual Supabase URL from config (localStorage or env vars)
  const supabaseConfig = getSupabaseConfig();
  const webhookUrl = supabaseConfig
    ? `${supabaseConfig.url}/functions/v1/ingest-activity?key=${channel.ingestion_key}`
    : `https://your-project.supabase.co/functions/v1/ingest-activity?key=${channel.ingestion_key}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    notify("Webhook URL copied to clipboard");
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
                    <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                ) : (
                    <Badge variant="secondary">Inactive</Badge>
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
            <Label className="text-xs text-muted-foreground">Webhook URL</Label>
            <div className="flex items-center gap-2 font-mono text-xs bg-muted p-2 rounded overflow-hidden">
            <span className="truncate">{webhookUrl}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto flex-shrink-0" onClick={copyUrl}>
                <Copy className="h-3 w-3" />
            </Button>
            </div>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>Created: {format(new Date(channel.created_at), "PPP")}</p>
        </div>
      </CardContent>
    </Card>
  );
};
