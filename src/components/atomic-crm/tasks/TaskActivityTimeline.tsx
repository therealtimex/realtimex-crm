import { formatDistance } from "date-fns";
import { useGetList, useRecordContext } from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import type { TaskActivity, Sale } from "../types";

export const TaskActivityTimeline = ({
  taskId,
}: {
  taskId: string | number;
}) => {
  const { data: activities, isPending } = useGetList<TaskActivity>(
    "task_activity",
    {
      filter: { task_id: taskId },
      pagination: { page: 1, perPage: 100 },
      sort: { field: "created_at", order: "DESC" },
    },
  );

  if (isPending)
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Loading activity...
      </div>
    );
  if (!activities || activities.length === 0)
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No activity recorded.
      </div>
    );

  return (
    <div className="space-y-6 relative pl-4 border-l border-border ml-2 my-4">
      {activities.map((activity) => (
        <div key={activity.id} className="relative">
          <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
          <div className="text-sm">
            <ReferenceField
              source="sales_id"
              record={activity}
              reference="sales"
              link={false}
            >
              <SaleName />
            </ReferenceField>{" "}
            {formatActivityMessage(activity)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDistance(new Date(activity.created_at), new Date(), {
              addSuffix: true,
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const SaleName = () => {
  const record = useRecordContext<Sale>();
  if (!record) return null;
  return (
    <span className="font-semibold">
      {record.first_name} {record.last_name}
    </span>
  );
};

const formatActivityMessage = (activity: TaskActivity) => {
  switch (activity.action) {
    case "created":
      return "created this task";
    case "updated":
      if (!activity.field_name) return "updated this task";
      return `changed ${activity.field_name}`;
    // Simplified because old/new values might be IDs or technical values
    case "assigned":
      return "assigned this task";
    case "completed":
      return "completed this task";
    case "reopened":
      return "reopened this task";
    case "duplicated":
      return "duplicated this task";
    case "archived":
      return "archived this task";
    default:
      return activity.action;
  }
};