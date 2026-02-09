import { Draggable } from "@hello-pangea/dnd";
import { useLocaleState, useRedirect, useTranslate } from "ra-core";
import { Card, CardContent } from "@/components/ds/ui/card";
import { ReferenceField } from "@/components/ds/admin/reference-field";
import { TextField } from "@/components/ds/admin/text-field";
import { Calendar } from "lucide-react";

import type { Task } from "../types";
import { TaskTypeIcon } from "./TaskTypeIcon";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { getRelativeDueDate } from "@/lib/date-utils";

export const TaskCard = ({ task, index }: { task: Task; index: number }) => {
  if (!task) return null;

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <TaskCardContent provided={provided} snapshot={snapshot} task={task} />
      )}
    </Draggable>
  );
};

export const TaskCardContent = ({
  provided,
  snapshot,
  task,
}: {
  provided?: any;
  snapshot?: any;
  task: Task;
}) => {
  const redirect = useRedirect();
  const translate = useTranslate();
  const [locale] = useLocaleState();
  const handleClick = () => {
    redirect(`/tasks/${task.id}/show`, undefined, undefined, undefined, {
      _scrollToTop: false,
    });
  };

  const isCompleted = task.status === "done" || task.status === "cancelled";
  const { text: relativeDueDate, isOverdue } = getRelativeDueDate(
    task.due_date || "",
    isCompleted,
    { translate, locale },
  );

  return (
    <div
      className="cursor-pointer"
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      ref={provided?.innerRef}
      onClick={handleClick}
    >
      <Card
        className={`py-3 transition-all duration-200 ${
          snapshot?.isDragging
            ? "opacity-90 transform rotate-1 shadow-lg"
            : "shadow-sm hover:shadow-md"
        } ${isOverdue && !isCompleted ? "border-destructive/50 bg-destructive/5" : ""}`}
      >
        <CardContent className="px-3 pb-0">
          <div className="flex items-start gap-2 mb-2">
            <TaskTypeIcon taskType={task.type} />
            <p
              className="text-sm font-medium line-clamp-2 flex-1"
              title={task.text}
            >
              {task.text}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            {task.priority && <TaskPriorityBadge priority={task.priority} />}
            {task.due_date && (
              <div
                className={`flex items-center gap-1 text-[10px] ${isOverdue && !isCompleted ? "text-destructive font-medium" : "text-muted-foreground"}`}
              >
                <Calendar className="w-3 h-3" />
                {relativeDueDate}
              </div>
            )}
          </div>

          <div className="flex items-center text-[10px] text-muted-foreground border-t pt-2 mt-2 truncate">
            {task.contact_id && (
              <ReferenceField
                record={task}
                source="contact_id"
                reference="contacts"
                link={false}
                className="truncate"
              >
                <div className="flex items-center gap-1">
                  <TextField source="first_name" />
                  <TextField source="last_name" />
                </div>
              </ReferenceField>
            )}
            {!task.contact_id && task.company_id && (
              <ReferenceField
                record={task}
                source="company_id"
                reference="companies"
                link={false}
                className="truncate"
              >
                <TextField source="name" />
              </ReferenceField>
            )}
            {!task.contact_id && !task.company_id && task.deal_id && (
              <ReferenceField
                record={task}
                source="deal_id"
                reference="deals"
                link={false}
                className="truncate"
              >
                <TextField source="name" />
              </ReferenceField>
            )}
            {!task.contact_id && !task.company_id && !task.deal_id && (
              <span>{translate("crm.task.related.none")}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
