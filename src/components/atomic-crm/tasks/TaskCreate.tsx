import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { DateInput } from "@/components/admin/date-input";
import { SaveButton } from "@/components/admin/form";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { TextInput } from "@/components/admin/text-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Create } from "@/components/admin/create";
import {
  Form,
  required,
  useGetIdentity,
  useNotify,
  useRedirect,
} from "ra-core";

import { FormToolbar } from "../layout/FormToolbar";
import { contactOptionText } from "../misc/ContactOption";
import { useConfigurationContext } from "../root/ConfigurationContext";

export const TaskCreate = () => {
  const { identity } = useGetIdentity();
  const { taskTypes, taskPriorities, taskStatuses } = useConfigurationContext();
  const notify = useNotify();
  const redirect = useRedirect();

  const handleSuccess = () => {
    notify("Task created");
    redirect("list", "tasks");
  };

  return (
    <div className="mt-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create Task</CardTitle>
        </CardHeader>
        <CardContent>
          <Create
            resource="tasks"
            redirect="list"
            mutationOptions={{ onSuccess: handleSuccess }}
            transform={(data) => ({
              ...data,
              sales_id: identity?.id,
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
              }}
            >
              <TextInput
                autoFocus
                source="text"
                label="Description"
                validate={required()}
                multiline
                className="w-full"
              />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <ReferenceInput
                  source="contact_id"
                  reference="contacts_summary"
                >
                  <AutocompleteInput
                    label="Contact"
                    optionText={contactOptionText}
                    validate={required()}
                  />
                </ReferenceInput>
                <DateInput
                  source="due_date"
                  validate={required()}
                />
                <SelectInput
                  source="type"
                  validate={required()}
                  choices={taskTypes.map((type) => ({
                    id: type,
                    name: type,
                  }))}
                />
                <SelectInput
                  source="priority"
                  choices={taskPriorities}
                />
                <SelectInput
                  source="status"
                  choices={taskStatuses}
                />
                <ReferenceInput source="assigned_to" reference="sales">
                  <SelectInput
                    optionText={(record) =>
                      `${record.first_name} ${record.last_name}`
                    }
                    label="Assigned To"
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
