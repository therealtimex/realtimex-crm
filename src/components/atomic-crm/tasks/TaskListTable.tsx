import { DataTable } from "@/components/admin/data-table";
import { DateField } from "@/components/admin/date-field";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";

import type { Task } from "../types";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { TaskStatusBadge } from "./TaskStatusBadge";

export const TaskListTable = () => {
  return (
    <DataTable rowClick="show">
      <DataTable.Col
        source="text"
        label="Task"
        className="w-[35%]"
        cellClassName="max-w-md"
        render={(record: Task) => (
          <div className="truncate" title={record.text}>
            {record.type && record.type !== "None" && (
              <span className="font-semibold">{record.type}: </span>
            )}
            {record.text}
          </div>
        )}
      />
      <DataTable.Col label="Contact" className="w-[15%]">
        <ReferenceField source="contact_id" reference="contacts" link="show" />
      </DataTable.Col>
      <DataTable.Col label="Company" className="w-[15%]">
        <ReferenceField
          source="company_id"
          reference="companies"
          link="show"
          sortable={false}
        >
          <TextField source="name" />
        </ReferenceField>
      </DataTable.Col>
      <DataTable.Col label="Due Date" className="w-[12%]">
        <DateField source="due_date" />
      </DataTable.Col>
      <DataTable.Col
        label="Priority"
        className="w-[10%]"
        render={(record: Task) => (
          <TaskPriorityBadge priority={record.priority} />
        )}
      />
      <DataTable.Col
        label="Status"
        className="w-[10%]"
        render={(record: Task) => <TaskStatusBadge status={record.status} />}
      />
      <DataTable.Col label="Assigned To" className="w-[13%]">
        <ReferenceField source="assigned_to" reference="sales" link={false} />
      </DataTable.Col>
    </DataTable>
  );
};