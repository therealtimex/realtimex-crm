import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ds/ui/select";
import { useTranslate } from "ra-core";
import { translateChoice } from "@/i18n/utils";

import { Status } from "../misc/Status";
import { useConfigurationContext } from "../root/ConfigurationContext";

export const StatusSelector = ({ status, setStatus }: any) => {
  const { noteStatuses } = useConfigurationContext();
  const translate = useTranslate();

  const currentStatus = noteStatuses.find((s) => s.value === status);
  const currentLabel = currentStatus
    ? translateChoice(
        translate,
        "crm.note.status",
        currentStatus.value,
        currentStatus.label,
      )
    : null;

  return (
    <Select value={status} onValueChange={setStatus}>
      <SelectTrigger className="w-32">
        <SelectValue>
          {currentStatus && (
            <div className="flex items-center gap-2">
              {currentLabel} <Status status={currentStatus.value} />
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {noteStatuses.map((statusOption) => (
          <SelectItem key={statusOption.value} value={statusOption.value}>
            <div className="flex items-center gap-2">
              {translateChoice(
                translate,
                "crm.note.status",
                statusOption.value,
                statusOption.label,
              )}{" "}
              <Status status={statusOption.value} />
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
