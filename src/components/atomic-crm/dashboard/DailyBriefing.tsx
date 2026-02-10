import React, { useState } from "react";
import { Play, Square, Loader2, Volume2, Calendar } from "lucide-react";
import { Button } from "@/components/ds/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ds/ui/card";
import { useGetList, useNotify } from "ra-core";
import axios from "axios";

export const DailyBriefing = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const notify = useNotify();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Fetch today's agenda (overdue deals and tasks)
  const { data: tasks, isLoading: tasksLoading } = useGetList("tasks", {
    pagination: { page: 1, perPage: 5 },
    filter: { status: "todo" },
    sort: { field: "due_date", order: "ASC" },
  });

  const generateBriefing = async () => {
    setIsGenerating(true);
    try {
      // 1. Create a written briefing via LLM
      const summaryResponse = await axios.post("/api/sdk/chat", {
        messages: [
          {
            role: "system",
            content:
              "You are a CRM personal assistant. Summarize the user's agenda into a friendly, professional daily briefing (approx 2 sentences).",
          },
          {
            role: "user",
            content: `Tasks for today: ${JSON.stringify(tasks?.map((t) => t.text))}`,
          },
        ],
      });

      if (!summaryResponse.data.success)
        throw new Error("Briefing generation failed");

      const text = summaryResponse.data.content;

      // 2. Convert to speech via SDK TTS
      const ttsResponse = await axios.post(
        "/api/sdk/tts",
        { text },
        { responseType: "blob" },
      );

      const audioUrl = URL.createObjectURL(ttsResponse.data);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err: any) {
      console.error("Briefing Error:", err);
      notify("Failed to generate briefing", { type: "error" });
    } finally {
      setIsGenerating(false);
    }
  };

  const stopBriefing = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
            AI Daily Briefing
          </CardTitle>
          <Volume2 className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          Get a spoken summary of your priority tasks and deals for today.
        </p>
        {!isPlaying ? (
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
            size="sm"
            onClick={generateBriefing}
            disabled={isGenerating || tasksLoading}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-3 w-3 mr-2 fill-current" />
            )}
            {isGenerating ? "Preparing..." : "Listen to Briefing"}
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            size="sm"
            onClick={stopBriefing}
          >
            <Square className="h-3 w-3 mr-2 fill-current" />
            Stop
          </Button>
        )}
        <audio
          ref={audioRef}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
};
