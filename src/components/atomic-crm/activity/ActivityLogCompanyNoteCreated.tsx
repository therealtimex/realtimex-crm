import { ReferenceField } from "@/components/admin/reference-field";

import { CompanyAvatar } from "../companies/CompanyAvatar";
import { RelativeDate } from "../misc/RelativeDate";
import { SaleName } from "../sales/SaleName";
import type { ActivityCompanyNoteCreated } from "../types";
import { useActivityLogContext } from "./ActivityLogContext";
import { ActivityLogNote } from "./ActivityLogNote";

type ActivityLogCompanyNoteCreatedProps = {
  activity: ActivityCompanyNoteCreated;
};

export function ActivityLogCompanyNoteCreated({
  activity,
}: ActivityLogCompanyNoteCreatedProps) {
  const context = useActivityLogContext();
  const { companyNote } = activity;
  return (
    <ActivityLogNote
      header={
        <div className="flex flex-row items-center gap-2 flex-grow">
          <ReferenceField
            source="company_id"
            reference="companies"
            record={companyNote}
            link={false}
          >
            <CompanyAvatar width={20} height={20} />
          </ReferenceField>

          <span className="text-sm text-muted-foreground flex-grow inline-flex">
            <ReferenceField
              source="sales_id"
              reference="sales"
              record={activity}
              link={false}
            >
              <SaleName />
            </ReferenceField>
            &nbsp;added a note about&nbsp;
            <ReferenceField
              source="company_id"
              reference="companies"
              record={companyNote}
              link="show"
            />
          </span>

          {context === "company" && (
            <span className="text-muted-foreground text-sm">
              <RelativeDate date={activity.date} />
            </span>
          )}
        </div>
      }
      text={companyNote.text}
    />
  );
}
