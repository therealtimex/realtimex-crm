import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { TextInput } from "@/components/ds/admin/text-input";
import { FileInput } from "@/components/ds/admin/file-input";
import { FileField } from "@/components/ds/admin/file-field";
import { SelectInput } from "@/components/ds/admin/select-input";
import { DateTimeInput } from "@/components/ds/admin/date-time-input";
import { Button } from "@/components/ds/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "ra-core";
import { translateChoice } from "@/i18n/utils";

import { Status } from "../misc/Status";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { getCurrentDate } from "./utils";
import { VoiceNoteButton } from "../misc/VoiceNoteButton";

export const NoteInputs = ({ showStatus }: { showStatus?: boolean }) => {
  const { noteStatuses } = useConfigurationContext();
  const { setValue } = useFormContext();
  const [displayMore, setDisplayMore] = useState(false);
  const translate = useTranslate();

  const translatedNoteStatuses = noteStatuses.map((status) => ({
    id: status.value,
    name: translateChoice(
      translate,
      "crm.note.status",
      status.value,
      status.label,
    ),
    value: status.value,
  }));

  return (
    <div className="space-y-2">
      <TextInput
        source="text"
        label={false}
        multiline
        helperText={false}
        placeholder={translate("crm.note.placeholder")}
        rows={6}
      />

      <div className="flex justify-between items-center">
        <VoiceNoteButton
          onTranscription={(text) => {
            const currentText = record?.text || "";
            setValue("text", currentText ? `${currentText}\n\n${text}` : text);
          }}
        />

        {!displayMore && (
          <div className="flex items-center gap-2">
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setDisplayMore(!displayMore);
                setValue("date", getCurrentDate());
              }}
              className="text-sm text-muted-foreground underline hover:no-underline p-0 h-auto cursor-pointer"
            >
              {translate("crm.note.show_options")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {translate("crm.note.options_hint")}
            </span>
          </div>
        )}
      </div>

      <div
        className={cn(
          "space-y-3 mt-3 overflow-hidden transition-transform ease-in-out duration-300 origin-top",
          !displayMore ? "scale-y-0 max-h-0 h-0" : "scale-y-100",
        )}
      >
        <div className="grid grid-cols-2 gap-4">
          {showStatus && (
            <SelectInput
              source="status"
              choices={translatedNoteStatuses}
              optionText={optionRenderer}
              defaultValue={"warm"}
              helperText={false}
            />
          )}
          <DateTimeInput
            source="date"
            label={translate("crm.note.date")}
            helperText={false}
            className="text-primary"
            defaultValue={getCurrentDate()}
          />
        </div>
        <FileInput source="attachments" multiple>
          <FileField source="src" title="title" target="_blank" />
        </FileInput>
      </div>
    </div>
  );
};

const optionRenderer = (choice: any) => {
  return (
    <div>
      <Status status={choice.value} /> {choice.name}
    </div>
  );
};
