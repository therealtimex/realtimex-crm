import { RealtimeXSDK } from "@realtimex/sdk";

/**
 * SDKService (Backend Singleton)
 *
 * Optimized connectivity management for RealTimeX CRM.
 * Handles caching of providers and implements robust timeouts.
 */
export class SDKService {
  static instance = null;
  static initAttempted = false;

  // Default provider/model configuration
  static DEFAULT_LLM_PROVIDER = "realtimexai";
  static DEFAULT_LLM_MODEL = "gpt-4o-mini";
  static DEFAULT_EMBED_PROVIDER = "realtimexai";
  static DEFAULT_EMBED_MODEL = "text-embedding-3-small";

  // Request deduplication
  static chatProvidersPromise = null;
  static embedProvidersPromise = null;
  static ttsProvidersPromise = null;

  // Cache for default providers
  static defaultChatProvider = null;
  static defaultEmbedProvider = null;
  static defaultTTSProvider = null;

  /**
   * Initialize SDK with required permissions
   */
  static initialize() {
    if (!this.instance && !this.initAttempted) {
      this.initAttempted = true;

      try {
        this.instance = new RealtimeXSDK({
          realtimex: {
            apiKey:
              process.env.REALTTIMEX_API_KEY ||
              "SXKX93J-QSWMB04-K9E0GRE-J5DA8J0",
          },
          permissions: [
            "api.agents", // List agents
            "api.workspaces", // List workspaces
            "api.threads", // For AI Tab history
            "webhook.trigger", // Trigger agents
            "activities.read", // For Smart Ingestion
            "activities.write",
            "llm.chat", // For Assistant/Agent
            "llm.embed", // For Semantic Search
            "llm.providers", // For dynamic model resolution
            "vectors.read", // For RAG
            "vectors.write",
            "audio.transcribe", // For STT
            "tts.generate", // Standard TTS
            "tts.providers", // Standard TTS Providers
          ],
        });

        console.log("[SDKService] RealTimeX SDK initialized successfully");

        // Verify connection (ping) - with fallback
        this.instance
          .ping()
          .then(() =>
            console.log("[SDKService] ✅ Connected to RealTimeX Desktop"),
          )
          .catch((err) =>
            console.warn(
              "[SDKService] Desktop App Connection failed (this is OK if providers work):",
              err.message,
            ),
          );
      } catch (error) {
        console.error("[SDKService] Failed to initialize SDK:", error);
        this.instance = null;
      }
    }

    return this.instance;
  }

  /**
   * Get SDK instance (singleton)
   */
  static getSDK() {
    if (!this.instance && !this.initAttempted) {
      this.initialize();
    }
    return this.instance;
  }

  /**
   * Check if SDK is available and working
   * Uses fallback strategy: try ping first, then providers
   */
  static async isAvailable() {
    try {
      const sdk = this.getSDK();
      if (!sdk) return false;

      // Try to ping first (faster)
      try {
        await sdk.ping();
        return true;
      } catch (e) {
        // Fallback to providers check if ping not available/fails
        await sdk.llm.chatProviders();
        return true;
      }
    } catch (error) {
      console.warn("[SDKService] SDK not available:", error.message);
      return false;
    }
  }

  /**
   * Check SDK status detailed
   */
  static async getStatus() {
    try {
      const sdk = this.getSDK();
      if (!sdk) return { available: false };
      await sdk.ping();
      return { available: true };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  /**
   * Helper to wrap promise with a timeout
   */
  static async withTimeout(
    promise,
    timeoutMs = 30000,
    errorMsg = "SDK request timed out",
  ) {
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  /**
   * Resolve LLM Chat Provider
   */
  static async resolveChatProvider(settings = {}) {
    if (settings.llm_provider && settings.llm_model) {
      return { provider: settings.llm_provider, model: settings.llm_model };
    }

    if (this.defaultChatProvider) return this.defaultChatProvider;

    try {
      const { providers } = await this.getChatProviders();
      const preferred = providers.find(
        (p) => p.provider === this.DEFAULT_LLM_PROVIDER,
      );

      if (preferred && preferred.models?.length > 0) {
        const model =
          preferred.models.find((m) => m.id === this.DEFAULT_LLM_MODEL) ||
          preferred.models[0];
        this.defaultChatProvider = {
          provider: preferred.provider,
          model: model.id,
        };
      } else if (providers.length > 0 && providers[0].models?.length > 0) {
        this.defaultChatProvider = {
          provider: providers[0].provider,
          model: providers[0].models[0].id,
        };
      }

      return (
        this.defaultChatProvider || {
          provider: this.DEFAULT_LLM_PROVIDER,
          model: this.DEFAULT_LLM_MODEL,
        }
      );
    } catch (err) {
      console.warn("[SDKService] Using fallback chat provider:", err.message);
      return {
        provider: this.DEFAULT_LLM_PROVIDER,
        model: this.DEFAULT_LLM_MODEL,
      };
    }
  }

  /**
   * Resolve Embedding Provider
   */
  static async resolveEmbedProvider(settings = {}) {
    if (settings.embedding_provider && settings.embedding_model) {
      return {
        provider: settings.embedding_provider,
        model: settings.embedding_model,
      };
    }

    if (this.defaultEmbedProvider) return this.defaultEmbedProvider;

    try {
      const { providers } = await this.getEmbedProviders();
      const preferred = providers.find(
        (p) => p.provider === this.DEFAULT_EMBED_PROVIDER,
      );

      if (preferred && preferred.models?.length > 0) {
        const model =
          preferred.models.find((m) => m.id === this.DEFAULT_EMBED_MODEL) ||
          preferred.models[0];
        this.defaultEmbedProvider = {
          provider: preferred.provider,
          model: model.id,
        };
      } else if (providers.length > 0 && providers[0].models?.length > 0) {
        this.defaultEmbedProvider = {
          provider: providers[0].provider,
          model: providers[0].models[0].id,
        };
      }

      return (
        this.defaultEmbedProvider || {
          provider: this.DEFAULT_EMBED_PROVIDER,
          model: this.DEFAULT_EMBED_MODEL,
        }
      );
    } catch (err) {
      console.warn("[SDKService] Using fallback embed provider:", err.message);
      return {
        provider: this.DEFAULT_EMBED_PROVIDER,
        model: this.DEFAULT_EMBED_MODEL,
      };
    }
  }

  /**
   * Resolve TTS Provider
   */
  static async resolveTTSProvider(settings = {}) {
    if (settings.provider) return settings;

    if (this.defaultTTSProvider) return this.defaultTTSProvider;

    try {
      const { providers } = await this.getTTSProviders();
      if (providers.length > 0) {
        const provider = providers[0];
        this.defaultTTSProvider = {
          provider: provider.id,
          voice: provider.config?.voices?.[0] || "",
        };
        return this.defaultTTSProvider;
      }
    } catch (err) {
      console.warn("[SDKService] Failed to resolve default TTS:", err.message);
    }

    return null;
  }

  /**
   * Transcribe audio buffer
   */
  static async transcribeAudio(audioBuffer, settings = {}) {
    const sdk = this.getSDK();
    if (!sdk) throw new Error("SDK not initialized");
    return this.withTimeout(sdk.audio.transcribe(audioBuffer, { ...settings }));
  }

  /**
   * Get available chat providers (with deduplication)
   */
  static async getChatProviders() {
    if (this.chatProvidersPromise) return this.chatProvidersPromise;

    const sdk = this.getSDK();
    if (!sdk) return { success: false, providers: [] };

    this.chatProvidersPromise = (async () => {
      try {
        console.log("[SDKService] Fetching chat providers...");
        const result = await this.withTimeout(sdk.llm.chatProviders(), 10000);
        return result;
      } catch (err) {
        console.warn("[SDKService] Failed to get chat providers:", err.message);
        return { success: false, providers: [] };
      } finally {
        this.chatProvidersPromise = null;
      }
    })();

    return this.chatProvidersPromise;
  }

  /**
   * Get available embedding providers (with deduplication)
   */
  static async getEmbedProviders() {
    if (this.embedProvidersPromise) return this.embedProvidersPromise;

    const sdk = this.getSDK();
    if (!sdk) return { success: false, providers: [] };

    this.embedProvidersPromise = (async () => {
      try {
        console.log("[SDKService] Fetching embed providers...");
        const result = await this.withTimeout(sdk.llm.embedProviders(), 10000);
        return result;
      } catch (err) {
        console.warn(
          "[SDKService] Failed to get embed providers:",
          err.message,
        );
        return { success: false, providers: [] };
      } finally {
        this.embedProvidersPromise = null;
      }
    })();

    return this.embedProvidersPromise;
  }

  /**
   * Get available TTS providers (with deduplication)
   */
  static async getTTSProviders() {
    if (this.ttsProvidersPromise) return this.ttsProvidersPromise;

    const sdk = this.getSDK();
    if (!sdk) return { success: false, providers: [] };

    this.ttsProvidersPromise = (async () => {
      try {
        console.log("[SDKService] Fetching TTS providers...");
        let providers = [];
        if (sdk.tts && typeof sdk.tts.listProviders === "function") {
          providers = await this.withTimeout(sdk.tts.listProviders(), 10000);
        } else if (sdk.audio && typeof sdk.audio.providers === "function") {
          providers = await this.withTimeout(sdk.audio.providers(), 10000);
        }
        return { success: true, providers: providers || [] };
      } catch (err) {
        console.warn("[SDKService] Failed to get TTS providers:", err.message);
        return { success: false, providers: [] };
      } finally {
        this.ttsProvidersPromise = null;
      }
    })();

    return this.ttsProvidersPromise;
  }

  /**
   * Reset SDK instance
   */
  static async reset() {
    this.instance = null;
    this.initAttempted = false;
    this.clearCache();
    return this.initialize();
  }

  /**
   * Generate speech from text (Standard Method)
   */
  static async generateSpeech(text, settings = {}) {
    const sdk = this.getSDK();
    if (!sdk) throw new Error("SDK not initialized");

    const resolvedSettings = await this.resolveTTSProvider(settings);
    if (!resolvedSettings) {
      throw new Error(
        "TTS Provider not specified and no default found. Please configure AI settings.",
      );
    }

    if (sdk.tts && typeof sdk.tts.speak === "function") {
      console.log(
        `[SDKService] Generating speech using ${resolvedSettings.provider} (${resolvedSettings.voice || "default voice"})...`,
      );
      const audioBuffer = await this.withTimeout(
        sdk.tts.speak(text, resolvedSettings),
        30000,
      );
      const buffer = Buffer.from(audioBuffer);
      console.log(
        `[SDKService] Speech generated, buffer size: ${buffer.length} bytes`,
      );
      return buffer;
    }

    // Fallback for legacy SDK
    if (sdk.audio && typeof sdk.audio.speech === "function") {
      return this.withTimeout(sdk.audio.speech(text, settings), 30000);
    }

    throw new Error("TTS not supported by this SDK version");
  }

  /**
   * Generate speech stream from text (Golden Standard Method)
   */
  static async *generateSpeechStream(text, settings = {}) {
    const sdk = this.getSDK();
    if (!sdk) throw new Error("SDK not initialized");

    if (sdk.tts && typeof sdk.tts.speakStream === "function") {
      for await (const chunk of sdk.tts.speakStream(text, settings)) {
        yield chunk;
      }
    } else {
      throw new Error("TTS streaming not supported by this SDK version");
    }
  }

  static clearCache() {
    this.defaultChatProvider = null;
    this.defaultEmbedProvider = null;
    this.chatProvidersPromise = null;
    this.embedProvidersPromise = null;
    this.ttsProvidersPromise = null;
  }
}

export default SDKService;
