import { DateInput } from "@/components/ds/admin/date-input";
import { ReferenceInput } from "@/components/ds/admin/reference-input";
import { SelectInput } from "@/components/ds/admin/select-input";
import { TextInput } from "@/components/ds/admin/text-input";
import { Card, CardContent } from "@/components/ds/ui/card";
import { Create } from "@/components/ds/admin/create";
import { useQueryClient } from "@tanstack/react-query";
import {
  Form,
  required,
  useDataProvider,
  useGetIdentity,
  useNotify,
  useRedirect,
  useTranslate,
  type GetListResult,
} from "ra-core";
import { translateChoice } from "@/i18n/utils";

import { FormToolbar } from "../layout/FormToolbar";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { EntityTypePillSelector } from "./EntityTypePillSelector";
import { EntityAutocomplete } from "./EntityAutocomplete";
import { transformTaskEntityData } from "./taskEntityUtils";
import type { Task } from "../types";

export const TaskCreate = () => {
  const { identity } = useGetIdentity();
  const { taskTypes, taskPriorities, taskStatuses } = useConfigurationContext();
  const notify = useNotify();
  const redirect = useRedirect();
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();
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

  const handleSuccess = async (task: Task) => {
    const taskStatus = task.status ?? "todo";

    const { data: statusTasks } = await dataProvider.getList<Task>("tasks", {
      sort: { field: "index", order: "ASC" },
      pagination: { page: 1, perPage: 1000 },
      filter: { status: taskStatus },
    });

    const tasksToShift = statusTasks.filter((item) => item.id !== task.id);

    await Promise.all(
      tasksToShift.map((item) =>
        dataProvider.update("tasks", {
          id: item.id,
          data: { index: (item.index ?? 0) + 1 },
          previousData: item,
        }),
      ),
    );

    const tasksById = tasksToShift.reduce(
      (acc, item) => ({
        ...acc,
        [item.id]: { ...item, index: (item.index ?? 0) + 1 },
      }),
      {} as Record<string, Task>,
    );
    const now = Date.now();
    queryClient.setQueriesData<GetListResult | undefined>(
      { queryKey: ["tasks", "getList"] },
      (res) => {
        if (!res) return res;
        return {
          ...res,
          data: res.data.map((item: Task) => tasksById[item.id] || item),
        };
      },
      { updatedAt: now },
    );

    notify(translate("crm.task.notification.created"));
    redirect("list", "tasks");
  };

  return (
    <div className="mt-4 max-w-2xl mx-auto">
      <Card>
        <CardContent className="pt-6">
          <Create
            resource="tasks"
            redirect="list"
            mutationOptions={{ onSuccess: handleSuccess }}
            transform={(data) => ({
              ...transformTaskEntityData(data),
              sales_id: identity?.id,
              index: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })}
          >
            <Form
              defaultValues={{
                due_date: new Date().toISOString().slice(0, 10),
                priority: "medium",
                status: "todo",
                assigned_to: identity?.id,
                entity_type: "none",
                index: 0,
              }}
            >
              <TextInput
                autoFocus
                source="text"
                label={translate("crm.task.field.description")}
                validate={required()}
                multiline
                className="w-full"
              />

              {/* Pill selector in grid */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <EntityTypePillSelector />
              </div>

              {/* Entity autocomplete on separate full-width row */}
              <div className="mt-4">
                <EntityAutocomplete />
              </div>

              {/* Rest of form fields in grid */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <DateInput source="due_date" validate={required()} />
                <SelectInput
                  source="type"
                  validate={required()}
                  choices={translatedTaskTypes}
                  label={translate("crm.task.field.type")}
                />
                <SelectInput
                  source="priority"
                  choices={translatedTaskPriorities}
                />
                <SelectInput source="status" choices={translatedTaskStatuses} />
                <ReferenceInput source="assigned_to" reference="sales">
                  <SelectInput
                    optionText={(record) =>
                      `${record.first_name} ${record.last_name}`
                    }
                    label={translate("crm.task.field.assigned_to")}
                  />
                </ReferenceInput>
              </div>
              <FormToolbar />
            </Form>
          </Create>
        </CardContent>
      </Card>
    </div>
  );
};
