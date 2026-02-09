import {
  ShowBase,
  useLocaleState,
  useShowContext,
  useTranslate,
} from "ra-core";
import { Card, CardContent } from "@/components/ds/ui/card";
import { ReferenceManyField } from "@/components/ds/admin/reference-many-field";
import { Calendar } from "lucide-react";
import { formatDistance } from "date-fns";
import { getDateFnsLocale } from "@/i18n/date-fns";
import { translateChoice } from "@/i18n/utils";
import { parseLocalDate } from "@/lib/date-utils";

import { NoteCreate, NotesIterator } from "../notes";
import type { Task } from "../types";
import { TaskAside } from "./TaskAside";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskActivityTimeline } from "./TaskActivityTimeline";

export const TaskShow = () => (
  <ShowBase>
    <TaskShowContent />
  </ShowBase>
);

const TaskShowContent = () => {
  const { record, isPending } = useShowContext<Task>();
  const translate = useTranslate();
  const [locale] = useLocaleState();
  const dateFnsLocale = getDateFnsLocale(locale);
  if (isPending || !record) return null;

  const typeLabel = record.type
    ? translateChoice(translate, "crm.task.type", record.type, record.type)
    : "";

  return (
    <div className="mt-2 mb-2 flex gap-8">
      <div className="flex-1">
        <Card>
          <CardContent>
            {/* Task Header */}
            <div className="mb-6">
              <h5 className="text-xl font-semibold mb-3">
                {typeLabel || record.type}
              </h5>
              <div className="flex gap-3 mb-4">
                <TaskStatusBadge status={record.status} />
                <TaskPriorityBadge priority={record.priority} />
              </div>
              {record.due_date &&
                (() => {
                  const dueDate = parseLocalDate(record.due_date);
                  if (!dueDate) return null;
                  const relativeDue = formatDistance(dueDate, new Date(), {
                    addSuffix: true,
                    locale: dateFnsLocale,
                  });

                  return (
                    <div className="flex items-center gap-2 mb-3 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {translate("crm.task.due.relative", {
                          time: relativeDue,
                        })}
                      </span>
                      <span className="text-muted-foreground">
                        ({dueDate.toLocaleDateString(locale ?? undefined)})
                      </span>
                    </div>
                  );
                })()}
              {record.text && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {record.text}
                </p>
              )}
            </div>

            {/* Activity Timeline */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                {translate("crm.task.section.activity_timeline")}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {translate("crm.task.section.activity_description")}
              </p>
              <TaskActivityTimeline taskId={record.id} />
            </div>

            {/* Notes */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                {translate("crm.task.section.notes")}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {translate("crm.task.section.notes_description")}
              </p>
              <ReferenceManyField
                reference="taskNotes"
                target="task_id"
                sort={{ field: "date", order: "DESC" }}
                empty={
                  <NoteCreate reference="tasks" showStatus className="mt-4" />
                }
              >
                <NotesIterator reference="tasks" showStatus />
              </ReferenceManyField>
            </div>
          </CardContent>
        </Card>
      </div>
      <TaskAside />
    </div>
  );
};
