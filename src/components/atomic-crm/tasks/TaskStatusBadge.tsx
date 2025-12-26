import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors = {
  todo: "bg-slate-500 hover:bg-slate-600",
  in_progress: "bg-blue-500 hover:bg-blue-600",
  blocked: "bg-red-500 hover:bg-red-600",
  done: "bg-green-500 hover:bg-green-600",
  cancelled: "bg-gray-400 hover:bg-gray-500",
};

export const TaskStatusBadge = ({ status }: { status?: string }) => {
    if (!status) return null;
    const colorClass = statusColors[status as keyof typeof statusColors] || "bg-slate-500";
    
    return (
        <Badge className={cn("capitalize", colorClass)}>
            {status.replace("_", " ")}
        </Badge>
    );
};
