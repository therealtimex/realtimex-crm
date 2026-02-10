import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ds/ui/dialog";
import { Button } from "@/components/ds/ui/button";
import { Label } from "@/components/ds/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ds/ui/select";
import { Switch } from "@/components/ds/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ds/ui/tabs";
import { Cpu, Database, Volume2, Save, Loader2, Play } from "lucide-react";
import { useAISettings, AISettings } from "../root/AISettingsProvider";
import axios from "axios";

interface AISettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISettingsModal({ open, onOpenChange }: AISettingsModalProps) {
  const { settings, updateSettings, loading: contextLoading } = useAISettings();
  const [localSettings, setLocalSettings] = useState<AISettings>(settings);
  const [saving, setSaving] = useState(false);
  const [testingTTS, setTestingTTS] = useState(false);

  // SDK Lists
  const [chatProviders, setChatProviders] = useState<any[]>([]);
  const [embedProviders, setEmbedProviders] = useState<any[]>([]);
  const [ttsProviders, setTtsProviders] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
      fetchProviders();
    }
  }, [open, settings]);

  const fetchProviders = async () => {
    setLoadingLists(true);
    try {
      const [chatRes, embedRes, ttsRes] = await Promise.all([
        axios.get("/api/sdk/providers/chat"),
        axios.get("/api/sdk/providers/embed"),
        axios.get("/api/tts/providers"),
      ]);

      if (chatRes.data.success) setChatProviders(chatRes.data.providers || []);
      if (embedRes.data.success)
        setEmbedProviders(embedRes.data.providers || []);
      if (ttsRes.data.success) setTtsProviders(ttsRes.data.providers || []);
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    } finally {
      setLoadingLists(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(localSettings);
      onOpenChange(false);
    } catch (error) {
      // Error handled by provider/notify
    } finally {
      setSaving(false);
    }
  };

  const testTTS = async () => {
    setTestingTTS(true);
    try {
      const response = await axios.post(
        "/api/tts/speak",
        {
          text: "This is a test of the selected AI voice.",
          settings: {
            provider: localSettings.tts_provider,
            voice: localSettings.tts_voice,
            speed: localSettings.tts_speed,
          },
        },
        { responseType: "arraybuffer" },
      );

      const blob = new Blob([response.data], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
    } catch (error) {
      console.error("TTS test failed:", error);
    } finally {
      setTestingTTS(false);
    }
  };

  const selectedChatProvider = chatProviders.find(
    (p) => p.provider === localSettings.llm_provider,
  );
  const selectedEmbedProvider = embedProviders.find(
    (p) => p.provider === localSettings.embedding_provider,
  );
  const selectedTTSProvider = ttsProviders.find(
    (p) => p.id === localSettings.tts_provider,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            AI Settings
          </DialogTitle>
          <DialogDescription>
            Configure your preferred AI models and voices for the assistant.
          </DialogDescription>
        </DialogHeader>

        {chatProviders.length === 0 && !loadingLists && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-[12px] text-amber-600 flex items-start gap-2 mb-4">
            <Loader2 className="h-4 w-4 mt-0.5 animate-spin" />
            <div>
              <p className="font-semibold">RealTimeX SDK Disconnected</p>
              <p>
                Please ensure the RealTimeX Desktop App is running and
                connected.
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="llm" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="llm" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              LLM
            </TabsTrigger>
            <TabsTrigger value="embed" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Embed
            </TabsTrigger>
            <TabsTrigger value="tts" className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              TTS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="llm" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Chat Provider</Label>
              <Select
                value={localSettings.llm_provider}
                onValueChange={(v) => {
                  const provider = chatProviders.find((p) => p.provider === v);
                  setLocalSettings((prev) => ({
                    ...prev,
                    llm_provider: v,
                    llm_model: provider?.models?.[0]?.id || prev.llm_model,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {chatProviders.map((p) => (
                    <SelectItem key={p.provider} value={p.provider}>
                      {p.provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Select
                value={localSettings.llm_model}
                onValueChange={(v) =>
                  setLocalSettings((prev) => ({ ...prev, llm_model: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {selectedChatProvider?.models?.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name || m.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="embed" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Embedding Provider</Label>
              <Select
                value={localSettings.embedding_provider}
                onValueChange={(v) => {
                  const provider = embedProviders.find((p) => p.provider === v);
                  setLocalSettings((prev) => ({
                    ...prev,
                    embedding_provider: v,
                    embedding_model:
                      provider?.models?.[0]?.id || prev.embedding_model,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {embedProviders.map((p) => (
                    <SelectItem key={p.provider} value={p.provider}>
                      {p.provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Select
                value={localSettings.embedding_model}
                onValueChange={(v) =>
                  setLocalSettings((prev) => ({ ...prev, embedding_model: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {selectedEmbedProvider?.models?.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name || m.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="tts" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>TTS Provider</Label>
              <Select
                value={localSettings.tts_provider}
                onValueChange={(v) => {
                  const provider = ttsProviders.find((p) => p.id === v);
                  setLocalSettings((prev) => ({
                    ...prev,
                    tts_provider: v,
                    tts_voice: provider?.config?.voices?.[0] || "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {ttsProviders.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name || p.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Voice</Label>
              <div className="flex gap-2">
                <Select
                  value={localSettings.tts_voice}
                  onValueChange={(v) =>
                    setLocalSettings((prev) => ({ ...prev, tts_voice: v }))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTTSProvider?.config?.voices?.map((v: string) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={testTTS}
                  disabled={testingTTS || !localSettings.tts_voice}
                >
                  {testingTTS ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label>Auto-play</Label>
                <p className="text-[12px] text-muted-foreground">
                  Automatically play AI responses
                </p>
              </div>
              <Switch
                checked={localSettings.tts_auto_play}
                onCheckedChange={(v) =>
                  setLocalSettings((prev) => ({ ...prev, tts_auto_play: v }))
                }
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
