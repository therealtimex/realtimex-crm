import { Calendar, Building2, UserCircle, UserCheck, Pencil } from "lucide-react";
import { useRecordContext } from "ra-core";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { DateField } from "@/components/admin/date-field";

import { AsideSection } from "../misc/AsideSection";
import type { Task } from "../types";
import { TaskEdit } from "./TaskEdit";

export const TaskAside = () => {
  const record = useRecordContext<Task>();
  const [editOpen, setEditOpen] = useState(false);

  if (!record) return null;
  return (
    <div className="hidden sm:block w-64 min-w-64 text-sm">
      <div className="mb-4 -ml-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-2"
        >
          <Pencil className="h-4 w-4" />
          Edit Task
        </Button>
      </div>

      <TaskEdit
        open={editOpen}
        close={() => setEditOpen(false)}
        taskId={record.id}
      />

      <AsideSection title="Task Info">
        <InfoRow
          icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
          label="Due Date"
          value={<DateField source="due_date" />}
        />
        {record.done_date && (
          <InfoRow
            icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
            label="Completed"
            value={<DateField source="done_date" />}
          />
        )}
      </AsideSection>

      <AsideSection title="Related">
        <InfoRow
          icon={<UserCircle className="w-4 h-4 text-muted-foreground" />}
          label="Contact"
          value={
            <ReferenceField
              source="contact_id"
              reference="contacts"
              link="show"
            />
          }
        />
        <InfoRow
          icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
          label="Company"
          value={
            <ReferenceField source="contact_id" reference="contacts" link={false}>
              <ReferenceField source="company_id" reference="companies" link="show">
                <TextField source="name" />
              </ReferenceField>
            </ReferenceField>
          }
        />
      </AsideSection>

      <AsideSection title="Assignment">
        <InfoRow
          icon={<UserCheck className="w-4 h-4 text-muted-foreground" />}
          label="Assigned To"
          value={
            <ReferenceField source="assigned_to" reference="sales" link={false} />
          }
        />
        <InfoRow
          icon={<UserCircle className="w-4 h-4 text-muted-foreground" />}
          label="Created By"
          value={
            <ReferenceField source="sales_id" reference="sales" link={false} />
          }
        />
      </AsideSection>

      <div className="mt-6 pt-6 border-t hidden sm:flex flex-col gap-2 items-start">
        <DeleteButton
          className="h-6 cursor-pointer hover:bg-destructive/10! text-destructive! border-destructive! focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
          size="sm"
        />
      </div>
    </div>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) => (
  <div className="flex flex-col gap-1 mb-3">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <div className="pl-6 text-sm">{value}</div>
  </div>
);
