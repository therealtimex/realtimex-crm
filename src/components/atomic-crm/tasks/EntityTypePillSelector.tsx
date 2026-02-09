import { useWatch, useFormContext } from "react-hook-form";
import { Label } from "@/components/ds/ui/label";
import { cn } from "@/lib/utils";
import { useTranslate } from "ra-core";

export const ENTITY_TYPES = [
  { value: "none", key: "none" },
  { value: "contact", key: "contact" },
  { value: "company", key: "company" },
  { value: "deal", key: "deal" },
] as const;

export const EntityTypePillSelector = () => {
  const translate = useTranslate();
  const entityType = useWatch({ name: "entity_type" });
  const { setValue } = useFormContext();

  const handleEntityTypeChange = (newType: string) => {
    // Clear all entity ID fields when changing type
    setValue("contact_id", null);
    setValue("company_id", null);
    setValue("deal_id", null);
    setValue("entity_type", newType);
  };

  return (
    <div className="col-span-2 flex items-center gap-3">
      <Label className="text-sm font-medium shrink-0">
        {translate("crm.task.field.related_to")}
      </Label>
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            role="radio"
            aria-checked={entityType === type.value}
            aria-label={translate("crm.task.entity_type.link_to", {
              type: translate(`crm.task.entity_type.${type.key}`),
            })}
            onClick={() => handleEntityTypeChange(type.value)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-full border transition-colors",
              entityType === type.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent border-input",
            )}
          >
            {translate(`crm.task.entity_type.${type.key}`)}
          </button>
        ))}
      </div>
    </div>
  );
};
