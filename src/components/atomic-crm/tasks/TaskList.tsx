import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { BooleanInput } from "@/components/admin/boolean-input";
import { CreateButton } from "@/components/admin/create-button";
import { ExportButton } from "@/components/admin/export-button";
import { FilterButton } from "@/components/admin/filter-form";
import { List } from "@/components/admin/list";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SearchInput } from "@/components/admin/search-input";
import { SelectInput } from "@/components/admin/select-input";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { TopToolbar } from "../layout/TopToolbar";
import { MyTasksInput } from "./MyTasksInput";
import { TaskListTable } from "./TaskListTable";

const TaskList = () => {
  const { taskStatuses, taskPriorities } = useConfigurationContext();

  const taskFilters = [
    <SearchInput source="q" alwaysOn />,
    <SelectInput source="status" choices={taskStatuses} alwaysOn />,
    <ReferenceInput source="contact_id" reference="contacts">
      <AutocompleteInput label={false} placeholder="Contact" />
    </ReferenceInput>,
    <SelectInput source="priority" choices={taskPriorities} />,
    <MyTasksInput source="assigned_to" label="My Tasks" alwaysOn />,
    <BooleanInput source="archived" label="Archived" />,
  ];

  return (
    <List
      perPage={25}
      sort={{ field: "due_date", order: "ASC" }}
      filters={taskFilters}
      filterDefaultValues={{ archived: false }}
      actions={<TaskActions />}
      title="Tasks"
    >
      <TaskListTable />
    </List>
  );
};

const TaskActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
    <CreateButton label="New Task" />
  </TopToolbar>
);

export default TaskList;
