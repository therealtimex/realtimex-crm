import { Plus } from "lucide-react";
import {
  CreateBase,
  Form,
  required,
  useDataProvider,
  useGetIdentity,
  useNotify,
  useRecordContext,
  useResourceContext,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useState } from "react";
import { TextInput } from "@/components/ds/admin/text-input";
import { DateInput } from "@/components/ds/admin/date-input";
import { SelectInput } from "@/components/ds/admin/select-input";
import { SaveButton } from "@/components/ds/admin/form";
import { Button } from "@/components/ds/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ds/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ds/ui/tooltip";
import { translateChoice } from "@/i18n/utils";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { EntityTypePillSelector } from "./EntityTypePillSelector";
import { EntityAutocomplete } from "./EntityAutocomplete";
import { transformTaskEntityData } from "./taskEntityUtils";

export const AddTask = ({
  selectContact,
  display = "chip",
  resource,
}: {
  selectContact?: boolean;
  display?: "chip" | "icon";
  resource?: "contacts" | "companies" | "deals";
}) => {
  const { identity } = useGetIdentity();
  const dataProvider = useDataProvider();
  const [update] = useUpdate();
  const notify = useNotify();
  const { taskTypes, taskPriorities, taskStatuses } = useConfigurationContext();
  const record = useRecordContext();
  const resourceContext = useResourceContext({ resource });
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const handleOpen = () => {
    setOpen(true);
  };

  const handleSuccess = async (data: any) => {
    setOpen(false);

    // Update last_seen for contacts
    if (data.contact_id) {
      const contact = await dataProvider.getOne("contacts", {
        id: data.contact_id,
      });
      if (contact.data) {
        await update("contacts", {
          id: contact.data.id,
          data: { last_seen: new Date().toISOString() },
          previousData: contact.data,
        });
      }
    }

    notify(translate("crm.task.notification.created"));
  };

  if (!identity) return null;

  const translatedTaskTypes = taskTypes.map((type) => ({
    id: type,
    name: translateChoice(translate, "crm.task.type", type, type),
  }));

  const translatedTaskPriorities = taskPriorities.map((priority) => ({
    ...priority,
    name: translateChoice(
      translate,
      "crm.task.priority",
      priority.id,
      priority.name,
    ),
  }));

  const translatedTaskStatuses = taskStatuses.map((status) => ({
    ...status,
    name: translateChoice(translate, "crm.task.status", status.id, status.name),
  }));

  // Determine initial entity type and ID based on context
  const getInitialEntityData = () => {
    if (!record) return { entity_type: "none" };

    if (resourceContext === "contacts") {
      return { entity_type: "contact", contact_id: record.id };
    }

    if (resourceContext === "companies") {
      return { entity_type: "company", company_id: record.id };
    }

    if (resourceContext === "deals") {
      return { entity_type: "deal", deal_id: record.id };
    }

    const inferredRecord = record as Record<string, unknown>;

    if ("first_name" in inferredRecord || "last_name" in inferredRecord) {
      return { entity_type: "contact", contact_id: record.id };
    }

    if ("category" in inferredRecord || "stage" in inferredRecord) {
      return { entity_type: "deal", deal_id: record.id };
    }

    if ("name" in inferredRecord) {
      return { entity_type: "company", company_id: record.id };
    }

    return { entity_type: "none" };
  };

  const initialEntityData = getInitialEntityData();

  const recordLabel =
    record?.first_name ||
    record?.name ||
    translate("crm.task.dialog.create.this_record");

  return (
    <>
      {display === "icon" ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="p-2 cursor-pointer"
                onClick={handleOpen}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {translate("crm.task.action.create_task")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div className="my-2">
          <Button
            variant="outline"
            className="h-6 cursor-pointer"
            onClick={handleOpen}
            size="sm"
          >
            <Plus className="w-4 h-4" />
            {translate("crm.task.action.add_task")}
          </Button>
        </div>
      )}

      <CreateBase
        resource="tasks"
        record={{
          type: taskTypes[0] || "Call",
          ...initialEntityData,
          due_date: new Date().toISOString().slice(0, 10),
          sales_id: identity.id,
        }}
        transform={(data) => ({
          ...transformTaskEntityData(data),
          sales_id: identity.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })}
        mutationOptions={{ onSuccess: handleSuccess }}
      >
        <Dialog open={open} onOpenChange={() => setOpen(false)}>
          <DialogContent className="lg:max-w-xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
            <Form
              className="flex flex-col gap-4"
              defaultValues={{
                ...initialEntityData,
                priority: "medium",
                status: "todo",
                assigned_to: identity.id,
              }}
            >
              <DialogHeader>
                <DialogTitle>
                  {record && !selectContact
                    ? translate("crm.task.dialog.create.title_for", {
                        name: recordLabel,
                      })
                    : translate("crm.task.dialog.create.title")}
                </DialogTitle>
                <DialogDescription>
                  {translate("crm.task.dialog.create.description")}
                </DialogDescription>
              </DialogHeader>
              <TextInput
                autoFocus
                source="text"
                label={translate("crm.task.field.description")}
                validate={required()}
                multiline
                className="m-0"
                helperText={false}
              />

              {/* Entity Type Selector */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <EntityTypePillSelector />
              </div>

              {/* Entity Autocomplete */}
              <div className="mt-2">
                <EntityAutocomplete helperText={false} />
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <DateInput
                  source="due_date"
                  helperText={false}
                  validate={required()}
                />
                <SelectInput
                  source="type"
                  validate={required()}
                  choices={translatedTaskTypes}
                  helperText={false}
                  label={translate("crm.task.field.type")}
                />
                <SelectInput
                  source="priority"
                  choices={translatedTaskPriorities}
                  helperText={false}
                />
                <SelectInput
                  source="status"
                  choices={translatedTaskStatuses}
                  helperText={false}
                />
              </div>

              <DialogFooter className="w-full justify-end">
                <SaveButton />
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>
      </CreateBase>
    </>
  );
};
