import React, { useEffect, useState, useRef } from "react";
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  Brain,
  Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useSDK } from "../root/SDKProvider";
import { supabase } from "../providers/supabase";
import { cn } from "@/lib/utils";

interface ProcessingEvent {
  id: string;
  activity_id: string;
  event_type: "thinking" | "acting" | "analyzing" | "success" | "error";
  content: string;
  created_at: string;
  metadata?: any;
}

export const LiveTerminal = ({ activityId }: { activityId?: string }) => {
  const [events, setEvents] = useState<ProcessingEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isAvailable } = useSDK();

  useEffect(() => {
    if (!isAvailable) return;

    // Fetch existing events
    const fetchEvents = async () => {
      let query = supabase
        .from("processing_events")
        .select("*")
        .order("created_at", { ascending: true });

      if (activityId) {
        query = query.eq("activity_id", activityId);
      } else {
        query = query.limit(50);
      }

      const { data } = await query;
      if (data) setEvents(data);
    };

    fetchEvents();

    // Subscribe to new events
    const channel = supabase
      .channel("live-terminal")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "processing_events",
          filter: activityId ? `activity_id=eq.${activityId}` : undefined,
        },
        (payload) => {
          setEvents((prev) =>
            [...prev, payload.new as ProcessingEvent].slice(-100),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activityId, isAvailable]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "thinking":
        return <Brain className="h-3 w-3 text-purple-400" />;
      case "acting":
        return <Activity className="h-3 w-3 text-blue-400" />;
      case "analyzing":
        return <Info className="h-3 w-3 text-blue-400" />;
      case "success":
        return <Activity className="h-3 w-3 text-green-400" />;
      case "error":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Terminal className="h-3 w-3 text-slate-400" />;
    }
  };

  return (
    <Card
      className={cn(
        "bg-slate-950 text-slate-50 border-slate-800 overflow-hidden transition-all duration-300",
        isExpanded ? "h-64" : "h-12",
      )}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-slate-800 cursor-pointer hover:bg-slate-900"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider">
            AI Live Terminal
          </span>
          {events.length > 0 && (
            <span className="bg-emerald-500/20 text-emerald-500 text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
              LIVE
            </span>
          )}
        </div>
        <div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div
          ref={scrollRef}
          className="p-3 font-mono text-xs overflow-y-auto h-[calc(100%-48px)] space-y-2 scrollbar-hide"
        >
          {events.length === 0 ? (
            <div className="text-slate-600 italic">
              Waiting for AI events...
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex space-x-2 animate-in fade-in slide-in-from-left-2 duration-300"
              >
                <span className="text-slate-600 shrink-0">
                  [
                  {new Date(event.created_at).toLocaleTimeString([], {
                    hour12: false,
                  })}
                  ]
                </span>
                <span className="shrink-0 mt-0.5">
                  {getEventIcon(event.event_type)}
                </span>
                <span
                  className={cn(
                    "break-words",
                    event.event_type === "error"
                      ? "text-red-400"
                      : event.event_type === "success"
                        ? "text-emerald-400"
                        : "text-slate-300",
                  )}
                >
                  {event.content}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
};
