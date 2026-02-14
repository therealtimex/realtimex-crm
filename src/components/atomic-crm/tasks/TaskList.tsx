import { AutocompleteInput } from "@/components/ds/admin/autocomplete-input";
import { BooleanInput } from "@/components/ds/admin/boolean-input";
import { CreateButton } from "@/components/ds/admin/create-button";
import { ExportButton } from "@/components/ds/admin/export-button";
import { FilterButton } from "@/components/ds/admin/filter-form";
import { List, ListView } from "@/components/ds/admin/list";
import { ReferenceInput } from "@/components/ds/admin/reference-input";
import { SearchInput } from "@/components/ds/admin/search-input";
import { SelectInput } from "@/components/ds/admin/select-input";

import { useEffect, useMemo, useState } from "react";
import {
  InfiniteListBase,
  useGetIdentity,
  useLocaleState,
  useTranslate,
} from "ra-core";
import { LayoutList, Kanban } from "lucide-react";
import { Button } from "@/components/ds/ui/button";
import { cn } from "@/lib/utils";
import { translateChoice } from "@/i18n/utils";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { TopToolbar } from "../layout/TopToolbar";
import { MyTasksInput } from "./MyTasksInput";
import { TaskListTable } from "./TaskListTable";
import { ActiveFilterBar } from "./ActiveFilterBar";
import { TaskKanbanView } from "./TaskKanbanView";

const TASKS_TABLE_PAGE_SIZE = 25;
const TASKS_KANBAN_PAGE_SIZE = 100;
const DEFAULT_VIEW = "table";

const TaskList = () => {
  const { taskStatuses, taskPriorities } = useConfigurationContext();
  const { identity } = useGetIdentity();
  const translate = useTranslate();
  const [locale] = useLocaleState();
  const [view, setView] = useState<"table" | "kanban">(DEFAULT_VIEW);
  const [isViewHydrated, setIsViewHydrated] = useState(false);

  const viewStorageKey = useMemo(
    () => `realtimex_crm_tasks_view_${identity?.id ?? "anonymous"}`,
    [identity?.id],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsViewHydrated(false);
    const stored = window.localStorage.getItem(viewStorageKey);
    if (stored === "table" || stored === "kanban") {
      setView(stored);
    } else {
      setView(DEFAULT_VIEW);
    }
    setIsViewHydrated(true);
  }, [viewStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isViewHydrated) return;

    window.localStorage.setItem(viewStorageKey, view);
  }, [viewStorageKey, view, isViewHydrated]);

  const translatedTaskStatuses = useMemo(
    () =>
      taskStatuses.map((status) => ({
        ...status,
        name: translateChoice(
          translate,
          "crm.task.status",
          status.id,
          status.name,
        ),
      })),
    [taskStatuses, translate, locale],
  );

  const translatedTaskPriorities = useMemo(
    () =>
      taskPriorities.map((priority) => ({
        ...priority,
        name: translateChoice(
          translate,
          "crm.task.priority",
          priority.id,
          priority.name,
        ),
      })),
    [taskPriorities, translate, locale],
  );

  const taskFilters = [
    <SearchInput source="q" alwaysOn />,
    <SelectInput
      source="status"
      choices={translatedTaskStatuses}
      alwaysOn
      label={translate("crm.task.field.status")}
    />,
    <ReferenceInput source="contact_id" reference="contacts">
      <AutocompleteInput
        label={false}
        placeholder={translate("crm.filter.contact")}
      />
    </ReferenceInput>,
    <ReferenceInput source="company_id" reference="companies">
      <AutocompleteInput
        label={false}
        placeholder={translate("crm.filter.company")}
        optionText="name"
      />
    </ReferenceInput>,
    <ReferenceInput source="deal_id" reference="deals">
      <AutocompleteInput
        label={false}
        placeholder={translate("crm.filter.deal")}
        optionText="name"
      />
    </ReferenceInput>,
    <SelectInput
      source="priority"
      choices={translatedTaskPriorities}
      label={translate("crm.task.field.priority")}
    />,
    <MyTasksInput
      source="assigned_to"
      label={translate("crm.filter.my_tasks")}
      alwaysOn
    />,
    <BooleanInput source="archived" label={translate("crm.filter.archived")} />,
  ];

  if (view === "table") {
    return (
      <List
        perPage={TASKS_TABLE_PAGE_SIZE}
        sort={{ field: "due_date", order: "ASC" }}
        filters={taskFilters}
        filterDefaultValues={{ archived: false }}
        actions={<TaskActions view={view} setView={setView} />}
        title={translate("crm.nav.tasks")}
        stickyHeader
        stickyHeaderOffset={80}
      >
        <ActiveFilterBar />
        <TaskListTable />
      </List>
    );
  }

  return (
    <InfiniteListBase
      perPage={TASKS_KANBAN_PAGE_SIZE}
      sort={{ field: "index", order: "ASC" }}
      filterDefaultValues={{ archived: false }}
    >
      <ListView
        filters={taskFilters}
        actions={<TaskActions view={view} setView={setView} />}
        title={translate("crm.nav.tasks")}
        pagination={null}
      >
        <ActiveFilterBar />
        <TaskKanbanView />
      </ListView>
    </InfiniteListBase>
  );
};

const TaskActions = ({
  view,
  setView,
}: {
  view: "table" | "kanban";
  setView: (view: "table" | "kanban") => void;
}) => {
  const translate = useTranslate();

  return (
    <TopToolbar className="items-center">
      <div className="flex items-center bg-muted rounded-md p-1 mr-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 text-muted-foreground",
            view === "table" &&
              "bg-background text-foreground shadow-sm border border-border",
          )}
          aria-pressed={view === "table"}
          onClick={() => setView("table")}
        >
          <LayoutList className="h-4 w-4 mr-2" />
          {translate("crm.view.table")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 text-muted-foreground",
            view === "kanban" &&
              "bg-background text-foreground shadow-sm border border-border",
          )}
          aria-pressed={view === "kanban"}
          onClick={() => setView("kanban")}
        >
          <Kanban className="h-4 w-4 mr-2" />
          {translate("crm.view.kanban")}
        </Button>
      </div>
      <FilterButton />
      <ExportButton />
      <CreateButton 
        resource="tasks" 
        variant="default" 
        label={translate("crm.action.new_task")} 
      />
    </TopToolbar>
  );
};

export default TaskList;
