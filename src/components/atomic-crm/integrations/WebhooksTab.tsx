import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useDataProvider,
  useNotify,
  useGetIdentity,
  useTranslate,
} from "ra-core";
import { useForm } from "react-hook-form";
import { generateApiKey } from "@/lib/api-key-utils";
import { Button } from "@/components/ds/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/ui/card";
import { Plus, Trash2, Power, PowerOff, Pencil } from "lucide-react";
import { Badge } from "@/components/ds/ui/badge";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ds/ui/dialog";
import { Input } from "@/components/ds/ui/input";
import { Label } from "@/components/ds/ui/label";
import { Checkbox } from "@/components/ds/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ds/ui/tooltip";
import { isDemoMode } from "@/lib/demo-utils";
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

const AVAILABLE_EVENTS = [
  { value: "contact.created", category: "contacts" },
  { value: "contact.updated", category: "contacts" },
  { value: "contact.deleted", category: "contacts" },
  { value: "company.created", category: "companies" },
  { value: "company.updated", category: "companies" },
  { value: "company.deleted", category: "companies" },
  { value: "deal.created", category: "deals" },
  { value: "deal.updated", category: "deals" },
  { value: "deal.deleted", category: "deals" },
  { value: "deal.stage_changed", category: "deals" },
  { value: "deal.won", category: "deals" },
  { value: "deal.lost", category: "deals" },
  { value: "task.created", category: "tasks" },
  { value: "task.updated", category: "tasks" },
  { value: "task.assigned", category: "tasks" },
  { value: "task.completed", category: "tasks" },
  { value: "task.priority_changed", category: "tasks" },
  { value: "task.archived", category: "tasks" },
  { value: "task.deleted", category: "tasks" },
  { value: "invoice.created", category: "invoices" },
  { value: "invoice.updated", category: "invoices" },
  { value: "invoice.deleted", category: "invoices" },
  { value: "invoice.status_changed", category: "invoices" },
  { value: "invoice.sent", category: "invoices" },
];

export const WebhooksTab = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [webhookToEdit, setWebhookToEdit] = useState<any | null>(null);
  const [webhookToDelete, setWebhookToDelete] = useState<number | null>(null);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const translate = useTranslate();

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
      await dataProvider.delete("webhooks", {
        id,
        previousData: { id } as any,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      notify(translate("crm.integrations.webhooks.notification.deleted"));
      setWebhookToDelete(null);
    },
    onError: () => {
      notify(
        translate("crm.integrations.webhooks.notification.error_deleting"),
        {
          type: "error",
        },
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: number;
      is_active: boolean;
    }) => {
      await dataProvider.update("webhooks", {
        id,
        data: { is_active },
        previousData: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      notify(translate("crm.integrations.webhooks.notification.updated"));
    },
    onError: () => {
      notify(
        translate("crm.integrations.webhooks.notification.error_updating"),
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
          {translate("crm.integrations.webhooks.description")}
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
                  {translate("crm.integrations.webhooks.action.create")}
                </Button>
              </span>
            </TooltipTrigger>
            {isDemoMode() && (
              <TooltipContent>
                <p>Creating webhooks is disabled in demo mode</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {translate("crm.integrations.webhooks.loading")}
          </CardContent>
        </Card>
      ) : webhooks && webhooks.length > 0 ? (
        <div className="space-y-3">
          {webhooks.map((webhook: any) => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              onEdit={() => setWebhookToEdit(webhook)}
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
            <p className="text-muted-foreground mb-4">
              {translate("crm.integrations.webhooks.empty")}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {translate("crm.integrations.webhooks.action.create_first")}
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateWebhookDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      <EditWebhookDialog
        open={!!webhookToEdit}
        webhook={webhookToEdit}
        onClose={() => setWebhookToEdit(null)}
      />

      <AlertDialog
        open={webhookToDelete !== null}
        onOpenChange={() => setWebhookToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {translate("crm.integrations.webhooks.dialog.delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {translate("crm.integrations.webhooks.dialog.delete_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {translate("crm.activity.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                webhookToDelete && deleteMutation.mutate(webhookToDelete)
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

const WebhookCard = ({
  webhook,
  onEdit,
  onDelete,
  onToggle,
}: {
  webhook: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) => {
  const translate = useTranslate();
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
                <Badge variant="default">
                  {translate("crm.integrations.webhooks.status.active")}
                </Badge>
              ) : (
                <Badge variant="secondary">
                  {translate("crm.integrations.webhooks.status.inactive")}
                </Badge>
              )}
              {webhook.events &&
                webhook.events.slice(0, 3).map((event: string) => (
                  <Badge key={event} variant="outline">
                    {translate(`crm.integrations.webhooks.events.${event}`, {
                      _: event,
                    })}
                  </Badge>
                ))}
              {webhook.events && webhook.events.length > 3 && (
                <Badge variant="outline">
                  {translate("crm.integrations.webhooks.status.more", {
                    count: webhook.events.length - 3,
                  })}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onEdit}
                      disabled={isDemoMode()}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {isDemoMode() && (
                  <TooltipContent>
                    <p>Editing webhooks is disabled in demo mode</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onToggle}
                      disabled={isDemoMode()}
                    >
                      {webhook.is_active ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {isDemoMode() && (
                  <TooltipContent>
                    <p>Toggling webhooks is disabled in demo mode</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

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
                    <p>Deleting webhooks is disabled in demo mode</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            {translate("crm.integrations.webhooks.fields.created", {
              date: format(new Date(webhook.created_at), "PPP"),
            })}
          </p>
          {webhook.last_triggered_at && (
            <p>
              {translate("crm.integrations.webhooks.fields.last_triggered", {
                date: format(new Date(webhook.last_triggered_at), "PPp"),
              })}
            </p>
          )}
          {webhook.failure_count > 0 && (
            <p className="text-destructive">
              {translate("crm.integrations.webhooks.fields.failed_deliveries", {
                count: webhook.failure_count,
              })}
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
  const translate = useTranslate();

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
      notify(translate("crm.integrations.webhooks.notification.created"));
      reset();
      onClose();
    },
    onError: () => {
      notify(
        translate("crm.integrations.webhooks.notification.error_creating"),
        {
          type: "error",
        },
      );
    },
  });

  const toggleEvent = (event: string) => {
    const currentEvents = watch("events");
    if (currentEvents.includes(event)) {
      setValue(
        "events",
        currentEvents.filter((e) => e !== event),
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
  const eventsByCategory = AVAILABLE_EVENTS.reduce(
    (acc, event) => {
      if (!acc[event.category]) {
        acc[event.category] = [];
      }
      acc[event.category].push(event);
      return acc;
    },
    {} as Record<string, typeof AVAILABLE_EVENTS>,
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {translate("crm.integrations.webhooks.dialog.create_title")}
          </DialogTitle>
          <DialogDescription>
            {translate("crm.integrations.webhooks.dialog.create_description")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {translate("crm.integrations.webhooks.fields.name")}
              </Label>
              <Input
                id="name"
                placeholder={translate(
                  "crm.integrations.webhooks.placeholder.name",
                )}
                {...register("name", { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">
                {translate("crm.integrations.webhooks.fields.url")}
              </Label>
              <Input
                id="url"
                type="url"
                placeholder={translate(
                  "crm.integrations.webhooks.placeholder.url",
                )}
                {...register("url", { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>
                {translate("crm.integrations.webhooks.fields.events")}
              </Label>
              <div className="space-y-3 max-h-60 overflow-y-auto border rounded-md p-3">
                {Object.entries(eventsByCategory).map(([category, events]) => (
                  <div key={category}>
                    <p className="text-sm font-semibold mb-2">
                      {translate(
                        `crm.integrations.webhooks.categories.${category}`,
                      )}
                    </p>
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
                            {translate(
                              `crm.integrations.webhooks.events.${event.value}`,
                            )}
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
                {translate("crm.activity.cancel")}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {translate("crm.integrations.webhooks.action.create")}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const EditWebhookDialog = ({
  open,
  webhook,
  onClose,
}: {
  open: boolean;
  webhook: any | null;
  onClose: () => void;
}) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const translate = useTranslate();

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      name: webhook?.name || "",
      url: webhook?.url || "",
      events: webhook?.events || ([] as string[]),
    },
  });

  // Update form when webhook changes
  React.useEffect(() => {
    if (webhook) {
      setValue("name", webhook.name);
      setValue("url", webhook.url);
      setValue("events", webhook.events || []);
    }
  }, [webhook, setValue]);

  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      await dataProvider.update("webhooks", {
        id: webhook.id,
        data: {
          name: values.name,
          url: values.url,
          events: values.events,
        },
        previousData: webhook,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      notify(translate("crm.integrations.webhooks.notification.updated"));
      reset();
      onClose();
    },
    onError: () => {
      notify(
        translate("crm.integrations.webhooks.notification.error_updating"),
        {
          type: "error",
        },
      );
    },
  });

  const toggleEvent = (event: string) => {
    const currentEvents = watch("events");
    if (currentEvents.includes(event)) {
      setValue(
        "events",
        currentEvents.filter((e) => e !== event),
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
  const eventsByCategory = AVAILABLE_EVENTS.reduce(
    (acc, event) => {
      if (!acc[event.category]) {
        acc[event.category] = [];
      }
      acc[event.category].push(event);
      return acc;
    },
    {} as Record<string, typeof AVAILABLE_EVENTS>,
  );

  if (!webhook) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {translate("crm.integrations.webhooks.dialog.edit_title")}
          </DialogTitle>
          <DialogDescription>
            {translate("crm.integrations.webhooks.dialog.edit_description")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                {translate("crm.integrations.webhooks.fields.name")}
              </Label>
              <Input
                id="edit-name"
                placeholder={translate(
                  "crm.integrations.webhooks.placeholder.name",
                )}
                {...register("name", { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-url">
                {translate("crm.integrations.webhooks.fields.url")}
              </Label>
              <Input
                id="edit-url"
                type="url"
                placeholder={translate(
                  "crm.integrations.webhooks.placeholder.url",
                )}
                {...register("url", { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>
                {translate("crm.integrations.webhooks.fields.events")}
              </Label>
              <div className="space-y-3 max-h-60 overflow-y-auto border rounded-md p-3">
                {Object.entries(eventsByCategory).map(([category, events]) => (
                  <div key={category}>
                    <p className="text-sm font-semibold mb-2">
                      {translate(
                        `crm.integrations.webhooks.categories.${category}`,
                      )}
                    </p>
                    <div className="space-y-2 ml-2">
                      {events.map((event) => (
                        <div
                          key={event.value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`edit-${event.value}`}
                            checked={watch("events").includes(event.value)}
                            onCheckedChange={() => toggleEvent(event.value)}
                          />
                          <label
                            htmlFor={`edit-${event.value}`}
                            className="text-sm cursor-pointer"
                          >
                            {translate(
                              `crm.integrations.webhooks.events.${event.value}`,
                            )}
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
                {translate("crm.activity.cancel")}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {translate("crm.integrations.webhooks.action.update")}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
