import {
  Mail,
  Presentation,
  Utensils,
  Users,
  RefreshCw,
  Heart,
  Package,
  Phone,
  Circle,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ds/ui/tooltip";
import { useTranslate } from "ra-core";
import { translateChoice } from "@/i18n/utils";

/**
 * Task type icon mapping
 * Maps task type names to their corresponding Lucide icons
 */
const TASK_TYPE_ICONS: Record<string, LucideIcon> = {
  Email: Mail,
  Demo: Presentation,
  Lunch: Utensils,
  Meeting: Users,
  "Follow-up": RefreshCw,
  "Thank you": Heart,
  Ship: Package,
  Call: Phone,
  None: Circle,
};

/**
 * Get icon component for a task type
 * Falls back to Circle icon for unknown types
 */
const getTaskTypeIcon = (taskType: string): LucideIcon => {
  return TASK_TYPE_ICONS[taskType] || Circle;
};

/**
 * TaskTypeIcon component
 * Renders a small icon representing the task type with optional text label
 *
 * @param taskType - The task type string (e.g., "Email", "Call", "Meeting")
 * @param showLabel - Whether to show the text label next to the icon (default: false)
 * @param size - Icon size in pixels (default: 16)
 */
export const TaskTypeIcon = ({
  taskType,
  showLabel = false,
  size = 16,
}: {
  taskType: string | null | undefined;
  showLabel?: boolean;
  size?: number;
}) => {
  const translate = useTranslate();
  // Don't render anything for None or missing task type
  if (!taskType || taskType === "None") {
    return null;
  }

  const Icon = getTaskTypeIcon(taskType);
  const label = translateChoice(translate, "crm.task.type", taskType, taskType);

  const iconElement = (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted/50">
        <Icon size={size} className="text-muted-foreground" />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );

  // If showing label, no need for tooltip
  if (showLabel) {
    return iconElement;
  }

  // Otherwise, show tooltip on hover
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{iconElement}</TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
