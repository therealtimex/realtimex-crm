import { CircleX, Edit, Save, Trash2 } from "lucide-react";
import {
  Form,
  useDelete,
  useNotify,
  useResourceContext,
  useUpdate,
  WithRecord,
  useTranslate,
} from "ra-core";
import { useState } from "react";
import type { FieldValues, SubmitHandler } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ReferenceField } from "@/components/ds/admin/reference-field";
import { Button } from "@/components/ds/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ds/ui/tooltip";

import { CompanyAvatar } from "../companies/CompanyAvatar";
import { Avatar } from "../contacts/Avatar";
import { RelativeDate } from "../misc/RelativeDate";
import { Status } from "../misc/Status";
import { SaleName } from "../sales/SaleName";
import type { ContactNote, DealNote } from "../types";
import { NoteAttachments } from "./NoteAttachments";
import { NoteInputs } from "./NoteInputs";

export const Note = ({
  showStatus,
  note,
}: {
  showStatus?: boolean;
  note: DealNote | ContactNote;
  isLast: boolean;
}) => {
  const [isHover, setHover] = useState(false);
  const [isEditing, setEditing] = useState(false);
  const resource = useResourceContext();
  const notify = useNotify();
  const translate = useTranslate();

  const [update, { isPending }] = useUpdate();

  const [deleteNote] = useDelete(
    resource,
    { id: note.id, previousData: note },
    {
      mutationMode: "undoable",
      onSuccess: () => {
        notify(translate("crm.activity.note_deleted"), {
          type: "info",
          undoable: true,
        });
      },
    },
  );

  const handleDelete = () => {
    deleteNote();
  };

  const handleEnterEditMode = () => {
    setEditing(!isEditing);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setHover(false);
  };

  const handleNoteUpdate: SubmitHandler<FieldValues> = (values) => {
    update(
      resource,
      { id: note.id, data: values, previousData: note },
      {
        onSuccess: () => {
          setEditing(false);
          setHover(false);
        },
      },
    );
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-center space-x-4 w-full">
        {resource === "contactNote" ? (
          <Avatar width={20} height={20} />
        ) : (
          <ReferenceField source="company_id" reference="companies" link="show">
            <CompanyAvatar width={20} height={20} />
          </ReferenceField>
        )}
        <div className="inline-flex h-full items-center text-sm text-muted-foreground">
          <ReferenceField
            record={note}
            resource={resource}
            source="sales_id"
            reference="sales"
            link={false}
          >
            <WithRecord render={(record) => <SaleName sale={record} />} />
          </ReferenceField>{" "}
          {translate("crm.activity.added_note")}{" "}
          {showStatus && note.status && (
            <Status className="ml-2" status={note.status} />
          )}
        </div>
        <span className={`${isHover ? "visible" : "invisible"}`}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEnterEditMode}
                  className="p-1 h-auto cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{translate("crm.activity.edit_note")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="p-1 h-auto cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{translate("crm.activity.delete_note")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
        <div className="flex-1"></div>
        <span className="text-sm text-muted-foreground">
          <RelativeDate date={note.date} />
        </span>
      </div>
      {isEditing ? (
        <Form onSubmit={handleNoteUpdate} record={note} className="mt-1">
          <NoteInputs showStatus={showStatus} />
          <div className="flex justify-end mt-2 space-x-4">
            <Button
              variant="ghost"
              onClick={handleCancelEdit}
              type="button"
              className="cursor-pointer"
            >
              <CircleX className="w-4 h-4" />
              {translate("crm.activity.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {translate("crm.activity.update_note")}
            </Button>
          </div>
        </Form>
      ) : (
        <div className="pt-2 prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {note.text || ""}
          </ReactMarkdown>

          {note.attachments && <NoteAttachments note={note} />}
        </div>
      )}
    </div>
  );
};
