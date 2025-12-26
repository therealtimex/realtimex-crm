import { ShowBase, useShowContext } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { ReferenceManyField } from "@/components/admin/reference-many-field";

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
  if (isPending || !record) return null;

  return (
    <div className="mt-2 mb-2 flex gap-8">
      <div className="flex-1">
        <Card>
          <CardContent>
            {/* Task Header */}
            <div className="mb-6">
              <h5 className="text-xl font-semibold mb-3">{record.type}</h5>
              <div className="flex gap-3 mb-4">
                <TaskStatusBadge status={record.status} />
                <TaskPriorityBadge priority={record.priority} />
              </div>
              {record.text && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {record.text}
                </p>
              )}
            </div>

            {/* Activity Timeline */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Track all status changes and updates for this task
              </p>
              <TaskActivityTimeline taskId={record.id} />
            </div>

            {/* Notes */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Notes</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Add notes and updates to this task
              </p>
              <ReferenceManyField
                reference="taskNotes"
                target="task_id"
                sort={{ field: "date", order: "DESC" }}
                empty={<NoteCreate reference="tasks" showStatus className="mt-4" />}
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