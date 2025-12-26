import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const priorityColors = {
  low: "bg-slate-500 hover:bg-slate-600",
  medium: "bg-blue-500 hover:bg-blue-600",
  high: "bg-orange-500 hover:bg-orange-600",
  urgent: "bg-red-500 hover:bg-red-600",
};

export const TaskPriorityBadge = ({ priority }: { priority?: string }) => {
  if (!priority) return null;
  const colorClass = priorityColors[priority as keyof typeof priorityColors] || "bg-slate-500";
  
  return (
    <Badge className={cn("capitalize", colorClass)}>
      {priority}
    </Badge>
  );
};
