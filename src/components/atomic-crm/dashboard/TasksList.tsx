import {
  endOfToday,
  endOfTomorrow,
  endOfWeek,
  getDay,
  startOfToday,
} from "date-fns";
import { CheckSquare } from "lucide-react";
import { Card } from "@/components/ds/ui/card";
import { useTranslate } from "ra-core";

import { AddTask } from "../tasks/AddTask";
import { TasksListEmpty } from "./TasksListEmpty";
import { TasksListFilter } from "./TasksListFilter";

const today = new Date();
const todayDayOfWeek = getDay(today);
const isBeforeFriday = todayDayOfWeek < 5; // Friday is represented by 5
const startOfTodayDateISO = startOfToday().toISOString();
const endOfTodayDateISO = endOfToday().toISOString();
const endOfTomorrowDateISO = endOfTomorrow().toISOString();
const endOfWeekDateISO = endOfWeek(today, { weekStartsOn: 0 }).toISOString();

const taskFilters = {
  overdue: { "done_date@is": null, "due_date@lt": startOfTodayDateISO },
  today: {
    "done_date@is": null,
    "due_date@gte": startOfTodayDateISO,
    "due_date@lte": endOfTodayDateISO,
  },
  tomorrow: {
    "done_date@is": null,
    "due_date@gt": endOfTodayDateISO,
    "due_date@lt": endOfTomorrowDateISO,
  },
  thisWeek: {
    "done_date@is": null,
    "due_date@gte": endOfTomorrowDateISO,
    "due_date@lte": endOfWeekDateISO,
  },
  later: { "done_date@is": null, "due_date@gt": endOfWeekDateISO },
};

export const TasksList = () => {
  const translate = useTranslate();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center">
        <div className="mr-3 flex">
          <CheckSquare className="text-muted-foreground w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-muted-foreground flex-1">
          {translate("crm.dashboard.upcoming_tasks")}
        </h2>
        <AddTask display="icon" selectContact />
      </div>
      <Card className="p-4 mb-2">
        <div className="flex flex-col gap-4">
          <TasksListEmpty />
          <TasksListFilter
            title={translate("crm.dashboard.task_filters.overdue")}
            filter={taskFilters.overdue}
          />
          <TasksListFilter
            title={translate("crm.dashboard.task_filters.today")}
            filter={taskFilters.today}
          />
          <TasksListFilter
            title={translate("crm.dashboard.task_filters.tomorrow")}
            filter={taskFilters.tomorrow}
          />
          {isBeforeFriday && (
            <TasksListFilter
              title={translate("crm.dashboard.task_filters.this_week")}
              filter={taskFilters.thisWeek}
            />
          )}
          <TasksListFilter
            title={translate("crm.dashboard.task_filters.later")}
            filter={taskFilters.later}
          />
        </div>
      </Card>
    </div>
  );
};
