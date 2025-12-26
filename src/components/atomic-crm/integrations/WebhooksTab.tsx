import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider, useNotify, useGetIdentity } from "ra-core";
import { useForm } from "react-hook-form";
import { generateApiKey } from "@/lib/api-key-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Power, PowerOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

const AVAILABLE_EVENTS = [
  { value: "contact.created", label: "Contact Created", category: "Contacts" },
  { value: "contact.updated", label: "Contact Updated", category: "Contacts" },
  { value: "contact.deleted", label: "Contact Deleted", category: "Contacts" },
  { value: "company.created", label: "Company Created", category: "Companies" },
  { value: "company.updated", label: "Company Updated", category: "Companies" },
  { value: "company.deleted", label: "Company Deleted", category: "Companies" },
  { value: "deal.created", label: "Deal Created", category: "Deals" },
  { value: "deal.updated", label: "Deal Updated", category: "Deals" },
  { value: "deal.deleted", label: "Deal Deleted", category: "Deals" },
  {
    value: "deal.stage_changed",
    label: "Deal Stage Changed",
    category: "Deals",
  },
  { value: "deal.won", label: "Deal Won", category: "Deals" },
  { value: "deal.lost", label: "Deal Lost", category: "Deals" },
  { value: "task.created", label: "Task Created", category: "Tasks" },
  { value: "task.updated", label: "Task Updated", category: "Tasks" },
  { value: "task.assigned", label: "Task Assigned", category: "Tasks" },
  { value: "task.completed", label: "Task Completed", category: "Tasks" },
  {
    value: "task.priority_changed",
    label: "Task Priority Changed",
    category: "Tasks",
  },
  { value: "task.archived", label: "Task Archived", category: "Tasks" },
  { value: "task.deleted", label: "Task Deleted", category: "Tasks" },
];

export const WebhooksTab = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<number | null>(null);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const queryClient = useQueryClient();

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const { data } = await dataProvider.getList("webhooks", {
        pagination: { page: 1, perPage: 100 },
        sort: { field: "created_at", order: "DESC" },
        filter: {},
      });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await dataProvider.delete("webhooks", { id, previousData: {} });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      notify("Webhook deleted successfully");
      setWebhookToDelete(null);
    },
    onError: () => {
      notify("Failed to delete webhook", { type: "error" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      await dataProvider.update("webhooks", {
        id,
        data: { is_active },
        previousData: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      notify("Webhook updated successfully");
    },
    onError: () => {
      notify("Failed to update webhook", { type: "error" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Webhooks notify external systems when events occur in your CRM.
        </p>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Webhook
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      ) : webhooks && webhooks.length > 0 ? (
        <div className="space-y-3">
          {webhooks.map((webhook: any) => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              onDelete={() => setWebhookToDelete(webhook.id)}
              onToggle={() =>
                toggleMutation.mutate({
                  id: webhook.id,
                  is_active: !webhook.is_active,
                })
              }
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No webhooks yet</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first webhook
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateWebhookDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      <AlertDialog
        open={webhookToDelete !== null}
        onOpenChange={() => setWebhookToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this webhook. No more events will be
              sent to this endpoint. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                webhookToDelete && deleteMutation.mutate(webhookToDelete)
              }
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

const WebhookCard = ({
  webhook,
  onDelete,
  onToggle,
}: {
  webhook: any;
  onDelete: () => void;
  onToggle: () => void;
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{webhook.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 break-all">
              {webhook.url}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {webhook.is_active ? (
                <Badge variant="default">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {webhook.events &&
                webhook.events.slice(0, 3).map((event: string) => (
                  <Badge key={event} variant="outline">
                    {event}
                  </Badge>
                ))}
              {webhook.events && webhook.events.length > 3 && (
                <Badge variant="outline">+{webhook.events.length - 3} more</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={onToggle}>
              {webhook.is_active ? (
                <PowerOff className="h-4 w-4" />
              ) : (
                <Power className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Created: {format(new Date(webhook.created_at), "PPP")}</p>
          {webhook.last_triggered_at && (
            <p>
              Last triggered:{" "}
              {format(new Date(webhook.last_triggered_at), "PPp")}
            </p>
          )}
          {webhook.failure_count > 0 && (
            <p className="text-destructive">
              Failed deliveries: {webhook.failure_count}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CreateWebhookDialog = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { identity } = useGetIdentity();

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      name: "",
      url: "",
      events: [] as string[],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      // Generate a random secret for webhook signature
      const secret = generateApiKey();

      await dataProvider.create("webhooks", {
        data: {
          name: values.name,
          url: values.url,
          events: values.events,
          is_active: true,
          secret,
          sales_id: identity?.id,
          created_by_sales_id: identity?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      notify("Webhook created successfully");
      reset();
      onClose();
    },
    onError: () => {
      notify("Failed to create webhook", { type: "error" });
    },
  });

  const toggleEvent = (event: string) => {
    const currentEvents = watch("events");
    if (currentEvents.includes(event)) {
      setValue(
        "events",
        currentEvents.filter((e) => e !== event)
      );
    } else {
      setValue("events", [...currentEvents, event]);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Group events by category
  const eventsByCategory = AVAILABLE_EVENTS.reduce((acc, event) => {
    if (!acc[event.category]) {
      acc[event.category] = [];
    }
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_EVENTS>);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
          <DialogDescription>
            Create a new webhook to receive event notifications
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Slack Notifications"
                {...register("name", { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Webhook URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/webhook"
                {...register("url", { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>Events to Subscribe</Label>
              <div className="space-y-3 max-h-60 overflow-y-auto border rounded-md p-3">
                {Object.entries(eventsByCategory).map(([category, events]) => (
                  <div key={category}>
                    <p className="text-sm font-semibold mb-2">{category}</p>
                    <div className="space-y-2 ml-2">
                      {events.map((event) => (
                        <div
                          key={event.value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={event.value}
                            checked={watch("events").includes(event.value)}
                            onCheckedChange={() => toggleEvent(event.value)}
                          />
                          <label
                            htmlFor={event.value}
                            className="text-sm cursor-pointer"
                          >
                            {event.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
      </DialogContent>
    </Dialog>
  );
};
