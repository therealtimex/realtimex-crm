import { useState } from "react";
import {
  useUpdate,
  useNotify,
  useCreate,
  useGetIdentity,
  useLocaleState,
  useTranslate,
} from "ra-core";
import { Check, Pencil, Clock } from "lucide-react";
import { DataTable } from "@/components/ds/admin/data-table";
import { ReferenceField } from "@/components/ds/admin/reference-field";
import { TextField } from "@/components/ds/admin/text-field";
import { Button } from "@/components/ds/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ds/ui/tooltip";
import { getRelativeDueDate, parseLocalDate } from "@/lib/date-utils";

import type { Task, TaskSummary } from "../types";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskEdit } from "./TaskEdit";
import { TaskTypeIcon } from "./TaskTypeIcon";

const RelatedEntityField = ({ record }: { record: Task | TaskSummary }) => {
  const translate = useTranslate();
  const getEntityName = () => {
    if (record.contact_id) {
      // For contacts, the ReferenceField will show first_name + last_name
      return (
        <ReferenceField
          record={record}
          source="contact_id"
          reference="contacts"
          link="show"
        />
      );
    }

    if (record.company_id) {
      return (
        <ReferenceField
          record={record}
          source="company_id"
          reference="companies"
          link="show"
        >
          <TextField source="name" />
        </ReferenceField>
      );
    }

    if (record.deal_id) {
      return (
        <ReferenceField
          record={record}
          source="deal_id"
          reference="deals"
          link="show"
        >
          <TextField source="name" />
        </ReferenceField>
      );
    }

    return <span className="text-muted-foreground">—</span>;
  };

  const title = record.contact_id
    ? translate("crm.filter.contact")
    : record.company_id
      ? translate("crm.filter.company")
      : record.deal_id
        ? translate("crm.filter.deal")
        : "";

  return (
    <div className="truncate max-w-[200px]" title={title}>
      {getEntityName()}
    </div>
  );
};

const DueDateField = ({
  record,
  translate,
  locale,
}: {
  record: Task | TaskSummary;
  translate: ReturnType<typeof useTranslate>;
  locale?: string;
}) => {
  const isCompleted = record.status === "done" || record.status === "cancelled";
  const { text, isOverdue } = getRelativeDueDate(record.due_date, isCompleted, {
    translate,
    locale,
  });

  // Parse date as local date to avoid timezone shift (same logic as getRelativeDueDate)
  const dueDate = record.due_date ? parseLocalDate(record.due_date) : null;
  const formattedDate = dueDate ? dueDate.toLocaleDateString(locale) : "";

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={
          isOverdue
            ? "text-destructive font-medium"
            : isCompleted
              ? "text-muted-foreground"
              : ""
        }
      >
        {text}
      </span>
      {dueDate && !isCompleted && (
        <span className="text-xs text-muted-foreground">{formattedDate}</span>
      )}
    </div>
  );
};

const TaskActions = ({
  record,
  onEdit,
}: {
  record: Task;
  onEdit: (taskId: number) => void;
}) => {
  const [update] = useUpdate();
  const [create] = useCreate();
  const notify = useNotify();
  const { identity } = useGetIdentity();
  const translate = useTranslate();
  const [locale] = useLocaleState();

  // Create a task note for audit trail
  const createTaskNote = (text: string) => {
    if (!identity?.id) return;

    // Use server-based UTC timestamp (single source of truth)
    // Avoids client-side time issues (wrong machine time, timezone errors)
    const date = new Date().toISOString();

    create(
      "taskNotes",
      {
        data: {
          task_id: record.id,
          text,
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

  const handleMarkComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    update(
      "tasks",
      {
        id: record.id,
        data: {
          status: "done",
          done_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        previousData: record,
      },
      {
        onSuccess: () => {
          notify(translate("crm.task.notification.marked_complete"), {
            type: "success",
          });
          createTaskNote(translate("crm.task.note.marked_complete_quick"));
        },
      },
    );
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(record.id as number);
  };

  const handleSnooze = (e: React.MouseEvent) => {
    e.stopPropagation();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let newDueDateString: string;
    let noteText: string;
    let notificationText: string;

    if (!record.due_date) {
      // No due date, set to tomorrow
      newDueDateString = tomorrow.toISOString().slice(0, 10);
      noteText = translate("crm.task.note.snoozed_to_date", {
        date: tomorrow.toLocaleDateString(locale),
      });
      notificationText = translate("crm.task.notification.snoozed_tomorrow");
    } else {
      const dueDate = parseLocalDate(record.due_date);

      if (!dueDate) {
        newDueDateString = tomorrow.toISOString().slice(0, 10);
        noteText = translate("crm.task.note.snoozed_to_date", {
          date: tomorrow.toLocaleDateString(locale),
        });
        notificationText = translate("crm.task.notification.snoozed_tomorrow");
      } else {
        const isOverdueOrDueToday = dueDate <= today;

        if (isOverdueOrDueToday) {
          newDueDateString = tomorrow.toISOString().slice(0, 10);
          noteText = translate("crm.task.note.snoozed_to_date", {
            date: tomorrow.toLocaleDateString(locale),
          });
          notificationText = translate(
            "crm.task.notification.snoozed_tomorrow",
          );
        } else {
          // Add 1 day to the due date
          const newDueDate = new Date(dueDate);
          newDueDate.setDate(newDueDate.getDate() + 1);
          newDueDateString = newDueDate.toISOString().slice(0, 10);
          noteText = translate("crm.task.note.postponed_to_date", {
            date: newDueDate.toLocaleDateString(locale),
          });
          notificationText = translate("crm.task.notification.postponed_day");
        }
      }
    }

    update(
      "tasks",
      {
        id: record.id,
        data: {
          due_date: newDueDateString,
          updated_at: new Date().toISOString(),
        },
        previousData: record,
      },
      {
        onSuccess: () => {
          notify(notificationText, { type: "success" });
          createTaskNote(noteText);
        },
      },
    );
  };

  const isCompleted = record.status === "done" || record.status === "cancelled";

  // Determine smart button label
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let isOverdueOrDueToday = true;
  if (record.due_date) {
    const labelDueDate = parseLocalDate(record.due_date);
    if (labelDueDate) {
      isOverdueOrDueToday = labelDueDate <= today;
    }
  }
  const snoozeLabel = isOverdueOrDueToday
    ? translate("crm.task.action.snooze_tomorrow")
    : translate("crm.task.action.postpone_day");

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <TooltipProvider>
        {!isCompleted && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleMarkComplete}
              >
                <Check className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{translate("crm.task.action.mark_complete")}</p>
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{translate("crm.task.action.edit")}</p>
          </TooltipContent>
        </Tooltip>
        {!isCompleted && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleSnooze}
              >
                <Clock className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{snoozeLabel}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
};

export const TaskListTable = () => {
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const translate = useTranslate();
  const [locale] = useLocaleState();

  const getRowClassName = (record: Task) => {
    const isCompleted =
      record.status === "done" || record.status === "cancelled";
    const { isOverdue } = getRelativeDueDate(record.due_date, isCompleted, {
      translate,
      locale,
    });

    // Add 'group' class for hover actions, plus overdue styling
    const baseClass = "group";
    if (isCompleted) return baseClass;
    return isOverdue
      ? `${baseClass} bg-destructive/10 hover:bg-destructive/20`
      : baseClass;
  };

  return (
    <>
      <DataTable rowClick="show" rowClassName={getRowClassName}>
        <DataTable.Col
          source="text"
          label={translate("crm.task.field.task")}
          className="w-[35%]"
          cellClassName="max-w-md overflow-hidden"
          render={(record: Task) => (
            <div className="flex items-center gap-2">
              <TaskTypeIcon taskType={record.type} />
              <div className="line-clamp-2 flex-1" title={record.text}>
                {record.text}
              </div>
            </div>
          )}
        />
        <DataTable.Col
          label={translate("crm.task.field.related_to")}
          className="w-[16%]"
          cellClassName="overflow-hidden"
          sortable={false}
          render={(record: Task) => <RelatedEntityField record={record} />}
        />
        <DataTable.Col
          source="due_date"
          label={translate("crm.task.field.due_date")}
          className="w-[14%]"
          cellClassName="overflow-hidden"
          render={(record: Task) => (
            <DueDateField
              record={record}
              translate={translate}
              locale={locale}
            />
          )}
        />
        <DataTable.Col
          label={translate("crm.task.field.priority")}
          className="w-[8%]"
          render={(record: Task) => (
            <TaskPriorityBadge priority={record.priority} />
          )}
        />
        <DataTable.Col
          label={translate("crm.task.field.status")}
          className="w-[8%]"
          render={(record: Task) => <TaskStatusBadge status={record.status} />}
        />
        <DataTable.Col
          label={translate("crm.task.field.assigned_to")}
          className="w-[8%]"
          cellClassName="truncate"
        >
          <ReferenceField source="assigned_to" reference="sales" link={false} />
        </DataTable.Col>
        <DataTable.Col
          label={translate("crm.task.field.actions")}
          className="w-[11%]"
          sortable={false}
          cellClassName="text-right pr-2"
          render={(record: Task) => (
            <TaskActions record={record} onEdit={setEditingTaskId} />
          )}
        />
      </DataTable>

      {editingTaskId && (
        <TaskEdit
          taskId={editingTaskId}
          open={!!editingTaskId}
          close={() => setEditingTaskId(null)}
        />
      )}
    </>
  );
};
