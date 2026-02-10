import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Code,
  FileJson,
  Activity,
  Terminal as TerminalIcon,
} from "lucide-react";
import { supabase } from "../providers/supabase";
import { LiveTerminal } from "./LiveTerminal";

interface AITraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityId: string;
}

export const AITraceModal = ({
  isOpen,
  onClose,
  activityId,
}: AITraceModalProps) => {
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && activityId) {
      const fetchActivity = async () => {
        setLoading(true);
        const { data } = await supabase
          .from("activities")
          .select("*")
          .eq("id", activityId)
          .single();

        setActivity(data);
        setLoading(false);
      };
      fetchActivity();
    }
  }, [isOpen, activityId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <DialogTitle>AI Processing Trace</DialogTitle>
          </div>
          <DialogDescription>
            Granular breakdown of AI decisions and raw model interactions.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="terminal" className="flex-1 flex flex-col min-h-0">
          <div className="px-6">
            <TabsList className="w-full">
              <TabsTrigger
                value="terminal"
                className="flex-1 flex items-center"
              >
                <TerminalIcon className="h-4 w-4 mr-2" />
                Live Feed
              </TabsTrigger>
              <TabsTrigger value="payload" className="flex-1 flex items-center">
                <FileJson className="h-4 w-4 mr-2" />
                Raw Data
              </TabsTrigger>
              <TabsTrigger value="result" className="flex-1 flex items-center">
                <Code className="h-4 w-4 mr-2" />
                AI Result
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 p-6 pt-2">
            <TabsContent value="terminal" className="h-full mt-0">
              <LiveTerminal activityId={activityId} />
            </TabsContent>

            <TabsContent value="payload" className="h-full mt-0">
              <ScrollArea className="h-full w-full rounded-md border bg-slate-50 dark:bg-slate-900 p-4">
                <pre className="text-xs font-mono">
                  {JSON.stringify(activity?.raw_data, null, 2)}
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="result" className="h-full mt-0">
              <ScrollArea className="h-full w-full rounded-md border bg-slate-50 dark:bg-slate-900 p-4">
                <pre className="text-xs font-mono">
                  {JSON.stringify(activity?.result, null, 2)}
                </pre>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
