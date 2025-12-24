import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/components/atomic-crm/providers/supabase/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Phone, MessageSquare, StickyNote, Play, Calendar, User, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

interface ActivityFeedProps {
  contactId?: number;
  salesId?: number; // Optional: filter by agent
  className?: string;
}

export const ActivityFeed = ({ contactId, salesId, className }: ActivityFeedProps) => {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["activities", contactId, salesId], [contactId, salesId]);

  // 1. Initial Fetch
  const { data: activities, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from("activities")
        .select(`
            *,
            sales:sales_id (first_name, last_name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (contactId) {
        query = query.eq("contact_id", contactId);
      }
      if (salesId) {
        query = query.eq("sales_id", salesId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // 2. Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel("activities-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
          filter: contactId ? `contact_id=eq.${contactId}` : undefined,
        },
        (payload) => {
          console.log("Realtime update:", payload);
          // Invalidate query to refetch (simplest way to keep sync)
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId, queryClient, queryKey]);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed ${className}`}>
        No activities yet.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
        {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
        ))}
    </div>
  );
};

const ActivityCard = ({ activity }: { activity: any }) => {
  const isPending = activity.processing_status === "raw" || activity.processing_status === "processing";
  const isFailed = activity.processing_status === "failed";

  return (
    <Card className={`relative overflow-hidden transition-all ${isPending ? 'border-blue-200 bg-blue-50/30 dark:bg-blue-950/10' : ''}`}>
      {isPending && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100">
              <div className="h-full bg-blue-500 animate-progress origin-left w-full"></div>
          </div>
      )}
      
      <CardHeader className="py-3 px-4 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3">
          <ActivityIcon type={activity.type} />
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <span className="capitalize">{activity.type}</span>
              {activity.direction === "inbound" && (
                  <Badge variant="outline" className="text-[10px] h-5">Inbound</Badge>
              )}
               {activity.direction === "outbound" && (
                  <Badge variant="secondary" className="text-[10px] h-5">Outbound</Badge>
              )}
            </CardTitle>
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              {activity.sales && (
                  <>
                    <span>•</span>
                    <User className="h-3 w-3" />
                    {activity.sales.first_name} {activity.sales.last_name}
                  </>
              )}
            </div>
          </div>
        </div>
        
        <StatusBadge status={activity.processing_status} />
      </CardHeader>

      <CardContent className="pb-4 px-4 pt-0">
        {/* Content Body */}
        <div className="mt-2 text-sm">
            {isPending ? (
                <div className="flex items-center gap-2 text-muted-foreground italic">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    <span>Processing content...</span>
                </div>
            ) : isFailed ? (
                 <p className="text-destructive">Processing failed.</p>
            ) : (
                <div className="space-y-2">
                    {/* Transcript / Text */}
                    {activity.processed_data?.transcript ? (
                        <div className="bg-muted/50 p-3 rounded-md border text-foreground/90 whitespace-pre-wrap">
                            {activity.processed_data.transcript}
                        </div>
                    ) : activity.raw_data?.source_type === "text" ? (
                        <p className="whitespace-pre-wrap">{activity.raw_data.content}</p>
                    ) : null}
                    
                    {/* Audio Player */}
                    {activity.raw_data?.source_type === "url" && (
                         <div className="flex items-center gap-2 bg-secondary p-2 rounded-md w-fit">
                             <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                                 <Play className="h-4 w-4" />
                             </Button>
                             <span className="text-xs font-mono">Audio Recording</span>
                         </div>
                    )}
                    
                    {/* Atomic Facts / Summary */}
                    {activity.processed_data?.summary && (
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded border border-yellow-200 dark:border-yellow-800 text-xs">
                            <span className="font-semibold text-yellow-700 dark:text-yellow-500 block mb-1">Summary:</span>
                            {activity.processed_data.summary}
                        </div>
                    )}
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
};

const ActivityIcon = ({ type }: { type: string }) => {
  const className = "h-5 w-5 text-muted-foreground";
  switch (type) {
    case "email": return <Mail className={className} />;
    case "call": return <Phone className={className} />;
    case "sms": return <MessageSquare className={className} />;
    case "meeting": return <Calendar className={className} />;
    default: return <StickyNote className={className} />;
  }
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case "raw":
        case "processing":
            return <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50">Processing</Badge>;
        case "completed":
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case "failed":
            return <AlertCircle className="h-4 w-4 text-destructive" />;
        default:
            return null;
    }
}
