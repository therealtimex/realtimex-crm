import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";
import axios from "axios";

type TTSState = "idle" | "loading" | "playing" | "paused";

interface TTSContextType {
  playingMessageId: string | null;
  state: TTSState;
  playMessage: (
    messageId: string,
    text: string,
    settings: TTSSettings,
  ) => Promise<void>;
  pauseMessage: () => void;
  resumeMessage: () => void;
  stopMessage: () => void;
}

interface TTSSettings {
  tts_provider: string;
  tts_voice: string;
  tts_speed: number;
  tts_quality: number;
}

const TTSContext = createContext<TTSContextType | undefined>(undefined);

export const TTSProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [state, setState] = useState<TTSState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const playMessage = useCallback(
    async (messageId: string, text: string, settings: TTSSettings) => {
      // Stop current audio if playing
      if (playingMessageId) {
        cleanup();
      }

      if (!settings.tts_provider) {
        console.warn("[TTS] No TTS provider configured");
        return;
      }

      try {
        setState("loading");
        setPlayingMessageId(messageId);

        const response = await axios.post(
          "/api/sdk/tts",
          {
            text,
            settings: {
              provider: settings.tts_provider,
              voice: settings.tts_voice,
              speed: settings.tts_speed,
              quality: settings.tts_quality,
            },
          },
          {
            responseType: "arraybuffer",
          },
        );

        const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioUrlRef.current = audioUrl;

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          cleanup();
          setState("idle");
          setPlayingMessageId(null);
        };

        audio.onerror = () => {
          cleanup();
          setState("idle");
          setPlayingMessageId(null);
          console.error("[TTS] Audio playback error");
        };

        await audio.play();
        setState("playing");
      } catch (error) {
        console.error("[TTS] Failed to play audio:", error);
        cleanup();
        setState("idle");
        setPlayingMessageId(null);
      }
    },
    [playingMessageId, cleanup],
  );

  const pauseMessage = useCallback(() => {
    if (audioRef.current && state === "playing") {
      audioRef.current.pause();
      setState("paused");
    }
  }, [state]);

  const resumeMessage = useCallback(() => {
    if (audioRef.current && state === "paused") {
      audioRef.current.play();
      setState("playing");
    }
  }, [state]);

  const stopMessage = useCallback(() => {
    cleanup();
    setState("idle");
    setPlayingMessageId(null);
  }, [cleanup]);

  return (
    <TTSContext.Provider
      value={{
        playingMessageId,
        state,
        playMessage,
        pauseMessage,
        resumeMessage,
        stopMessage,
      }}
    >
      {children}
    </TTSContext.Provider>
  );
};

export const useTTS = () => {
  const context = useContext(TTSContext);
  if (!context) {
    throw new Error("useTTS must be used within TTSProvider");
  }
  return context;
};
