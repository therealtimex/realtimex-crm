import { formatDistance } from "date-fns";
import { FileText } from "lucide-react";
import {
  useGetIdentity,
  useGetList,
  useLocaleState,
  useTranslate,
} from "ra-core";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ReferenceField } from "@/components/ds/admin/reference-field";
import { TextField } from "@/components/ds/admin/text-field";
import { Card, CardContent } from "@/components/ds/ui/card";
import { getDateFnsLocale } from "@/i18n/date-fns";

import type { Contact, ContactNote } from "../types";

export const LatestNotes = () => {
  const { identity } = useGetIdentity();
  const translate = useTranslate();
  const [locale] = useLocaleState();
  const dateFnsLocale = getDateFnsLocale(locale);
  const { data: contactNotesData, isPending: contactNotesLoading } = useGetList(
    "contactNotes",
    {
      pagination: { page: 1, perPage: 5 },
      sort: { field: "date", order: "DESC" },
      filter: { sales_id: identity?.id },
    },
    { enabled: Number.isInteger(identity?.id) },
  );
  const { data: dealNotesData, isPending: dealNotesLoading } = useGetList(
    "dealNotes",
    {
      pagination: { page: 1, perPage: 5 },
      sort: { field: "date", order: "DESC" },
      filter: { sales_id: identity?.id },
    },
    { enabled: Number.isInteger(identity?.id) },
  );
  if (contactNotesLoading || dealNotesLoading) {
    return null;
  }
  // TypeScript guards
  if (!contactNotesData || !dealNotesData) {
    return null;
  }

  const allNotes = ([] as any[])
    .concat(
      contactNotesData.map((note) => ({
        ...note,
        type: "contactNote",
      })),
      dealNotesData.map((note) => ({ ...note, type: "dealNote" })),
    )
    .sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf())
    .slice(0, 5);

  return (
    <div>
      <div className="flex items-center mb-4">
        <div className="ml-8 mr-8 flex">
          <FileText className="text-muted-foreground w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-muted-foreground">
          {translate("crm.dashboard.latest_notes")}
        </h2>
      </div>
      <Card>
        <CardContent>
          {allNotes.map((note) => (
            <div
              id={`${note.type}_${note.id}`}
              key={`${note.type}_${note.id}`}
              className="mb-8"
            >
              <div className="text-sm text-muted-foreground">
                {translate("crm.dashboard.notes.on")}{" "}
                {note.type === "dealNote" ? (
                  <Deal
                    note={note}
                    label={translate("crm.dashboard.notes.deal")}
                  />
                ) : (
                  <Contact
                    note={note}
                    label={translate("crm.dashboard.notes.contact")}
                  />
                )}
                , {translate("crm.dashboard.notes.added")}{" "}
                {formatDistance(note.date, new Date(), {
                  addSuffix: true,
                  locale: dateFnsLocale,
                })}
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert line-clamp-3 overflow-hidden">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.text || ""}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

const Deal = ({ note, label }: { note: any; label: string }) => (
  <>
    {label}{" "}
    <ReferenceField
      record={note}
      source="deal_id"
      reference="deals"
      link="show"
    >
      <TextField source="name" />
    </ReferenceField>
  </>
);

const Contact = ({ note, label }: { note: any; label: string }) => (
  <>
    {label}{" "}
    <ReferenceField<ContactNote, Contact>
      record={note}
      source="contact_id"
      reference="contacts"
      link="show"
    />
  </>
);
