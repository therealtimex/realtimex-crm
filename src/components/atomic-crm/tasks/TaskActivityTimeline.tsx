import { formatDistance } from "date-fns";
import {
  useGetList,
  useLocaleState,
  useRecordContext,
  useTranslate,
} from "ra-core";
import { ReferenceField } from "@/components/ds/admin/reference-field";
import { AlertCircle } from "lucide-react";
import { getDateFnsLocale } from "@/i18n/date-fns";
import { translateChoice, type Translate } from "@/i18n/utils";
import type { TaskActivity, Sale } from "../types";

const MAX_ACTIVITIES = 100;

export const TaskActivityTimeline = ({
  taskId,
}: {
  taskId: string | number;
}) => {
  const translate = useTranslate();
  const [locale] = useLocaleState();
  const dateFnsLocale = getDateFnsLocale(locale);
  const {
    data: activities,
    isPending,
    total,
  } = useGetList<TaskActivity>("task_activity", {
    filter: { task_id: taskId },
    pagination: { page: 1, perPage: MAX_ACTIVITIES },
    sort: { field: "created_at", order: "DESC" },
  });

  if (isPending)
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {translate("crm.task.activity.loading")}
      </div>
    );
  if (!activities || activities.length === 0)
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {translate("crm.task.activity.empty")}
      </div>
    );

  const isTruncated = total !== undefined && total > MAX_ACTIVITIES;

  return (
    <>
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
              {formatActivityMessage(activity, translate)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDistance(new Date(activity.created_at), new Date(), {
                addSuffix: true,
                locale: dateFnsLocale,
              })}
            </div>
          </div>
        ))}
      </div>
      {isTruncated && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          <span>
            {translate("crm.task.activity.truncated", {
              count: MAX_ACTIVITIES,
              total,
            })}
          </span>
        </div>
      )}
    </>
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

const formatActivityMessage = (
  activity: TaskActivity,
  translate: Translate,
) => {
  switch (activity.action) {
    case "created":
      return translate("crm.task.activity.created");
    case "updated": {
      if (!activity.field_name) return translate("crm.task.activity.updated");
      const fieldLabel = translateChoice(
        translate,
        "crm.task.field",
        activity.field_name,
        activity.field_name,
      );
      return translate("crm.task.activity.updated_field", {
        field: fieldLabel,
      });
    }
    // Simplified because old/new values might be IDs or technical values
    case "assigned":
      return translate("crm.task.activity.assigned");
    case "completed":
      return translate("crm.task.activity.completed");
    case "reopened":
      return translate("crm.task.activity.reopened");
    case "duplicated":
      return translate("crm.task.activity.duplicated");
    case "archived":
      return translate("crm.task.activity.archived");
    default:
      return activity.action;
  }
};
