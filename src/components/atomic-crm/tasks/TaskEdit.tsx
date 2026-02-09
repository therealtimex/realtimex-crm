import {
  EditBase,
  Form,
  required,
  useNotify,
  useRecordContext,
  useCreate,
  useGetIdentity,
  useTranslate,
  type Identifier,
} from "ra-core";
import { DeleteButton } from "@/components/ds/admin/delete-button";
import { TextInput } from "@/components/ds/admin/text-input";
import { DateInput } from "@/components/ds/admin/date-input";
import { SelectInput } from "@/components/ds/admin/select-input";
import { ReferenceInput } from "@/components/ds/admin/reference-input";
import { SaveButton } from "@/components/ds/admin/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ds/ui/dialog";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Task } from "../types";
import { EntityTypePillSelector } from "./EntityTypePillSelector";
import { EntityAutocomplete } from "./EntityAutocomplete";
import { getEntityType, transformTaskEntityData } from "./taskEntityUtils";
import { translateChoice } from "@/i18n/utils";

export const TaskEdit = ({
  open,
  close,
  taskId,
}: {
  taskId: Identifier;
  open: boolean;
  close: () => void;
}) => {
  const { taskTypes, taskPriorities, taskStatuses } = useConfigurationContext();
  const notify = useNotify();
  const [create] = useCreate();
  const { identity } = useGetIdentity();
  const translate = useTranslate();

  // Create audit trail note
  const createTaskNote = () => {
    if (!identity?.id || !taskId) return;

    // Use server-based UTC timestamp (single source of truth)
    // Avoids client-side time issues (wrong machine time, timezone errors)
    const date = new Date().toISOString();

    create(
      "taskNotes",
      {
        data: {
          task_id: taskId,
          text: translate("crm.task.note.quick_edit"),
          date,
          sales_id: identity.id,
          status: "cold",
        },
      },
      {
        onError: (error) => {
          console.error("Failed to create task note:", error);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      {taskId && (
        <EditBase
          id={taskId}
          resource="tasks"
          className="mt-0"
          mutationOptions={{
            onSuccess: () => {
              close();
              notify(translate("crm.task.notification.updated"), {
                type: "info",
                undoable: true,
              });
              createTaskNote();
            },
          }}
          redirect={false}
          transform={(data) => {
            const transformed = {
              ...transformTaskEntityData(data),
              updated_at: new Date().toISOString(),
            };
            return transformed;
          }}
        >
          <TaskEditForm
            taskTypes={taskTypes}
            taskPriorities={taskPriorities}
            taskStatuses={taskStatuses}
            onClose={close}
          />
        </EditBase>
      )}
    </Dialog>
  );
};

const TaskEditForm = ({
  taskTypes,
  taskPriorities,
  taskStatuses,
  onClose,
}: {
  taskTypes: string[];
  taskPriorities: { id: string; name: string }[];
  taskStatuses: { id: string; name: string }[];
  onClose: () => void;
}) => {
  const record = useRecordContext<Task>();
  const notify = useNotify();
  const translate = useTranslate();

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

  return (
    <DialogContent className="lg:max-w-xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
      <Form
        className="flex flex-col gap-4"
        defaultValues={{
          entity_type: record ? getEntityType(record) : "none",
          contact_id: record?.contact_id ?? null,
          company_id: record?.company_id ?? null,
          deal_id: record?.deal_id ?? null,
        }}
      >
        <DialogHeader>
          <DialogTitle>{translate("crm.task.dialog.edit.title")}</DialogTitle>
          <DialogDescription>
            {translate("crm.task.dialog.edit.description")}
          </DialogDescription>
        </DialogHeader>
        <TextInput
          autoFocus
          source="text"
          label={translate("crm.task.field.description")}
          validate={required()}
          multiline
          helperText={false}
        />

        {/* Pill selector in grid */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <EntityTypePillSelector />
        </div>

        {/* Entity autocomplete on separate full-width row */}
        <div className="mt-4">
          <EntityAutocomplete helperText={false} />
        </div>

        {/* Rest of form fields in grid */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <DateInput
            source="due_date"
            helperText={false}
            validate={required()}
          />
          <SelectInput
            source="type"
            choices={translatedTaskTypes}
            helperText={false}
            validate={required()}
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
          <ReferenceInput source="assigned_to" reference="sales">
            <SelectInput
              optionText={(record) =>
                `${record.first_name} ${record.last_name}`
              }
              label={translate("crm.task.field.assigned_to")}
              helperText={false}
            />
          </ReferenceInput>
        </div>
        <DialogFooter className="w-full sm:justify-between gap-4">
          <DeleteButton
            mutationOptions={{
              onSuccess: () => {
                onClose();
                notify(translate("crm.task.notification.deleted"), {
                  type: "info",
                  undoable: true,
                });
              },
            }}
            redirect={false}
          />
          <SaveButton />
        </DialogFooter>
      </Form>
    </DialogContent>
  );
};
