import express from "express";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, existsSync } from "fs";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { SDKService } from "./services/SDKService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
);

// Initialize SDK Service
SDKService.initialize();

const app = express();
// Use PORT environment variable (same as frontend) or fall back to 3002 to avoid conflict with RealTimeX desktop app (3001)
const PORT = process.env.PORT || 3002;

// Rate limiting for migration endpoint
let lastMigrationTime = 0;
const MIGRATION_COOLDOWN = 60 * 1000; // 1 minute between migrations

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist directory (production build)
const distPath = join(__dirname, "..", "dist");
app.use(express.static(distPath));

/**
 * GET /api/setup/organizations
 *
 * Fetches the user's Supabase organizations using their access token
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 *
 * Returns: Array of organizations with regions
 */
app.get("/api/setup/organizations", async (req, res) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const response = await fetch("https://api.supabase.com/v1/organizations", {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.message || "Failed to fetch organizations",
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch organizations",
    });
  }
});

/**
 * POST /api/setup/auto-provision
 *
 * Auto-provisions a new Supabase project and returns credentials
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 *
 * Body:
 * - orgId: Organization ID
 * - projectName: Custom project name (optional)
 * - region: AWS region (optional, defaults to us-east-1)
 *
 * Returns: Server-Sent Events stream with provisioning progress
 */
app.post("/api/setup/auto-provision", async (req, res) => {
  const {
    orgId,
    projectName: customProjectName,
    region: customRegion,
  } = req.body;
  const authHeader = req.headers["authorization"];

  if (!orgId) {
    return res
      .status(400)
      .json({ error: "Missing required parameter (orgId)" });
  }

  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  // Set up Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  try {
    const crypto = await import("crypto");
    const projectName =
      customProjectName ||
      `RealTimeX-CRM-${crypto.randomBytes(2).toString("hex")}`;
    const region = customRegion || "us-east-1";

    // Generate a secure DB password server-side
    const dbPass =
      crypto
        .randomBytes(16)
        .toString("base64")
        .replace(/\+/g, "a")
        .replace(/\//g, "b")
        .replace(/=/g, "c") + "1!Aa";

    sendEvent(
      "info",
      `🚀 Creating Supabase project: ${projectName} in ${region}...`,
    );

    // 1. Create Project
    const createResponse = await fetch("https://api.supabase.com/v1/projects", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        organization_id: orgId,
        region: region,
        db_pass: dbPass,
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to create project");
    }

    const project = await createResponse.json();
    const projectRef = project.id;

    sendEvent(
      "info",
      `📦 Project created! ID: ${projectRef}. Waiting for it to go live...`,
    );
    sendEvent("project_id", projectRef);

    // 2. Poll for Readiness
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes

    while (!isReady && attempts < maxAttempts) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 5000));

      try {
        const statusResponse = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}`,
          {
            headers: { Authorization: authHeader },
          },
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          const status = statusData.status;
          sendEvent(
            "info",
            `⏳ Status: ${status} (Attempt ${attempts}/${maxAttempts})`,
          );

          if (status === "ACTIVE_HEALTHY" || status === "ACTIVE") {
            isReady = true;
          }
        }
      } catch (pollError) {
        console.warn("Polling error during provision:", pollError.message);
      }
    }

    if (!isReady) {
      throw new Error("Project provision timed out after 5 minutes.");
    }

    // 3. Get API Keys
    sendEvent("info", "🔑 Retrieving API keys...");

    let anonKey = "";
    let keyAttempts = 0;
    const maxKeyAttempts = 10;

    while (!anonKey && keyAttempts < maxKeyAttempts) {
      keyAttempts++;
      if (keyAttempts > 1) {
        sendEvent(
          "info",
          `⏳ API keys not ready yet. Retrying (Attempt ${keyAttempts}/${maxKeyAttempts})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      try {
        const keysResponse = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
          {
            headers: { Authorization: authHeader },
          },
        );

        if (keysResponse.ok) {
          const keys = await keysResponse.json();
          if (Array.isArray(keys)) {
            const anonKeyObj = keys.find((k) => k.name === "anon");
            anonKey = anonKeyObj?.api_key;
            if (anonKey) {
              sendEvent("info", "✅ API keys retrieved successfully.");
            }
          }
        }
      } catch (err) {
        console.warn("Key retrieval attempt failed:", err.message);
      }
    }

    if (!anonKey) {
      throw new Error("Could not find anonymous API key for the new project.");
    }

    const supabaseUrl = `https://${projectRef}.supabase.co`;

    // 4. DNS Verification
    sendEvent("info", "🌐 Waiting for DNS propagation...");
    let dnsReady = false;
    let dnsAttempts = 0;
    const maxDnsAttempts = 20;

    while (!dnsReady && dnsAttempts < maxDnsAttempts) {
      dnsAttempts++;
      try {
        const pingResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: "HEAD",
        });
        if (pingResponse.status < 500) {
          dnsReady = true;
          sendEvent("info", "✨ DNS resolved! Project is fully accessible.");
        }
      } catch (pingError) {
        if (dnsAttempts % 5 === 0) {
          sendEvent("info", "⏳ DNS still propagating... standby.");
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    sendEvent("success", {
      url: supabaseUrl,
      anonKey: anonKey,
      projectId: projectRef,
      dbPass: dbPass,
    });

    sendEvent("done", "success");
  } catch (error) {
    const errorMsg = error.message || "Auto-provisioning failed";
    console.error("Auto-provision failed:", errorMsg);
    sendEvent("error", errorMsg);
    sendEvent("done", "failed");
  } finally {
    res.end();
  }
});

/**
 * POST /api/migrate
 *
 * Executes database migrations using the Supabase CLI
 *
 * Body:
 * - projectRef: Supabase project ID
 * - dbPassword: Database password (optional, used if access token not provided)
 * - accessToken: Supabase access token (recommended)
 *
 * Returns: Server-Sent Events stream with migration logs
 */
app.post("/api/migrate", async (req, res) => {
  const { projectRef, dbPassword, accessToken } = req.body;

  // Rate limiting: Prevent migration spam
  const now = Date.now();
  const timeSinceLastMigration = now - lastMigrationTime;
  if (timeSinceLastMigration < MIGRATION_COOLDOWN) {
    const waitTime = Math.ceil(
      (MIGRATION_COOLDOWN - timeSinceLastMigration) / 1000,
    );
    return res.status(429).json({
      error: "Rate limit exceeded",
      message: `Please wait ${waitTime} seconds before running another migration`,
      retryAfter: waitTime,
    });
  }

  // Validation
  if (!projectRef) {
    return res.status(400).json({ error: "projectRef is required" });
  }

  if (!accessToken && !dbPassword) {
    return res.status(400).json({
      error: "Either accessToken or dbPassword must be provided",
    });
  }

  // Update last migration time
  lastMigrationTime = now;

  // Set up Server-Sent Events
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendLog = (message) => {
    res.write(message + "\n");
  };

  try {
    sendLog("🔧 Starting database migration process...");
    sendLog("");

    // Path to migration script
    const scriptPath = join(__dirname, "..", "scripts", "migrate.sh");

    // Prepare environment variables
    const env = {
      ...process.env,
      SUPABASE_PROJECT_ID: projectRef,
    };

    // Add access token or password
    if (accessToken) {
      env.SUPABASE_ACCESS_TOKEN = accessToken;
      sendLog("✓ Using Supabase access token for authentication");
    } else {
      env.SUPABASE_DB_PASSWORD = dbPassword;
      sendLog("✓ Using database password for authentication");
    }

    sendLog("");
    sendLog("📦 Executing migration script...");
    sendLog("─".repeat(60));
    sendLog("");

    // Small delay to ensure proper event loop timing for handler attachment
    // This prevents a race condition where stdout/stderr data events fire
    // before handlers are attached
    setImmediate(() => {
      // Execute migration script
      const child = spawn("bash", [scriptPath], {
        env,
        cwd: join(__dirname, ".."),
        stdio: ["ignore", "pipe", "pipe"],
      });

      let hasError = false;
      let isCompleted = false;

      // Timeout protection: Kill migration if it takes longer than 10 minutes
      const MIGRATION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
      const timeoutId = setTimeout(() => {
        if (!isCompleted && !child.killed) {
          child.kill();
          sendLog("");
          sendLog("⏱️  Migration timed out after 10 minutes");
          sendLog("");
          sendLog("💡 This usually means:");
          sendLog("   - The migration is stuck waiting for user input");
          sendLog("   - There's a network connectivity issue");
          sendLog("   - The migration is taking unusually long");
          sendLog("");
          sendLog(
            "Try running the migration manually to see what's blocking it.",
          );
          res.end();
        }
      }, MIGRATION_TIMEOUT);

      // Stream stdout
      child.stdout.on("data", (data) => {
        const lines = data.toString().split("\n");
        lines.forEach((line) => {
          if (line.trim()) {
            sendLog(line);
          }
        });
      });

      // Stream stderr
      child.stderr.on("data", (data) => {
        const lines = data.toString().split("\n");
        lines.forEach((line) => {
          if (line.trim()) {
            // Check for common error patterns
            if (
              line.includes("error") ||
              line.includes("Error") ||
              line.includes("ERROR")
            ) {
              sendLog(`❌ ${line}`);
              hasError = true;
            } else {
              sendLog(`⚠️  ${line}`);
            }
          }
        });
      });

      // Handle process completion
      child.on("close", (code) => {
        isCompleted = true;
        clearTimeout(timeoutId);

        sendLog("");
        sendLog("─".repeat(60));

        if (code === 0 && !hasError) {
          sendLog("");
          sendLog("✅ Migration completed successfully!");
          sendLog("");
          sendLog("🎉 Your database is now ready to use.");
          sendLog("📝 The application will reload automatically...");
        } else {
          sendLog("");
          sendLog(`❌ Migration failed with exit code: ${code}`);
          sendLog("");
          sendLog("💡 Troubleshooting tips:");
          sendLog("   1. Verify your Supabase credentials are correct");
          sendLog("   2. Ensure your project has the required permissions");
          sendLog(
            "   3. Check if Supabase CLI is installed (npm install -g supabase)",
          );
          sendLog("   4. Review the error messages above for specific issues");
          sendLog("");
          sendLog(
            "📚 For more help, visit: https://github.com/therealtimex/realtimex-crm/issues",
          );
        }

        res.end();
      });

      // Handle process errors
      child.on("error", (error) => {
        isCompleted = true;
        clearTimeout(timeoutId);

        sendLog("");
        sendLog(`❌ Failed to start migration process: ${error.message}`);
        sendLog("");
        sendLog("💡 This usually means:");
        sendLog("   - Bash is not available on your system");
        sendLog("   - The migration script is not executable");
        sendLog("   - There are permission issues");
        sendLog("");
        sendLog(
          "Please try running the migration manually using the CLI instructions.",
        );
        res.end();
      });

      // Handle client disconnect
      req.on("close", () => {
        if (!child.killed) {
          isCompleted = true;
          clearTimeout(timeoutId);
          child.kill();
          console.log("Migration process terminated - client disconnected");
        }
      });
    }); // End setImmediate
  } catch (error) {
    sendLog("");
    sendLog(`❌ Unexpected error: ${error.message}`);
    sendLog("");
    sendLog("Please try again or use the manual migration instructions.");
    res.end();
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "realtimex-crm-server",
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
  });
});

/**
 * SDK Endpoints
 */

// GET /api/sdk/status - Check if RealTimeX SDK is available
app.get("/api/sdk/status", async (req, res) => {
  try {
    const available = await SDKService.isAvailable();
    res.json({
      success: true,
      available,
      environment: {
        RTX_APP_ID: process.env.RTX_APP_ID || null,
        RTX_APP_NAME: process.env.RTX_APP_NAME || null,
        RTX_PORT: process.env.RTX_PORT || null,
        REALTTIMEX_API_KEY: process.env.REALTTIMEX_API_KEY
          ? "***" + process.env.REALTTIMEX_API_KEY.slice(-4)
          : "default",
        NODE_ENV: process.env.NODE_ENV || "development",
      },
    });
  } catch (error) {
    res.json({ success: false, available: false, message: error.message });
  }
});

// GET /api/sdk/providers/chat - Get available LLM chat providers
app.get("/api/sdk/providers/chat", async (req, res) => {
  try {
    const providers = await SDKService.getChatProviders();
    res.json(providers);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/sdk/providers/embed - Get available embedding providers
app.get("/api/sdk/providers/embed", async (req, res) => {
  try {
    const providers = await SDKService.getEmbedProviders();
    res.json(providers);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/sdk/providers/tts - Get available TTS providers
app.get("/api/sdk/providers/tts", async (req, res) => {
  try {
    const providers = await SDKService.getTTSProviders();
    res.json(providers);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tts/providers - Standardized TTS providers
app.get("/api/tts/providers", async (req, res) => {
  try {
    const providers = await SDKService.getTTSProviders();
    res.json(providers);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/sdk/reset - Reset SDK instance
app.post("/api/sdk/reset", async (req, res) => {
  try {
    await SDKService.reset();
    res.json({ success: true, message: "SDK reset successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/sdk/threads - Fetch conversation threads
app.get("/api/sdk/threads", async (req, res) => {
  try {
    const sdk = SDKService.getSDK();
    if (!sdk) return res.json({ success: false, threads: [] });

    const threads = await SDKService.withTimeout(sdk.api.getThreads());
    res.json({ success: true, threads });
  } catch (error) {
    res.json({ success: false, threads: [], message: error.message });
  }
});

// POST /api/sdk/chat - LLM Chat Proxy
app.post("/api/sdk/chat", async (req, res) => {
  try {
    const sdk = SDKService.getSDK();
    if (!sdk)
      return res.json({ success: false, message: "SDK not initialized" });

    const { messages, settings = {}, threadId } = req.body;

    // Resolve provider/model
    const { provider, model } = await SDKService.resolveChatProvider(settings);

    const response = await SDKService.withTimeout(
      sdk.llm.chat(messages, {
        provider,
        model,
        threadId, // Pass threadId if available
        ...settings,
      }),
    );

    // Support both direct content and nested response.content (SDK version differences)
    let content =
      response.content ||
      response.response?.content ||
      (typeof response === "string" ? response : "");

    // Robust Content Cleaning & Extraction
    if (typeof content === "string" && content.length > 0) {
      // 1. Strip internal platform tokens (e.g. <|channel|>, <|message|>, etc.)
      content = content.replace(/<\|[\s\S]*?\|>/g, "").trim();

      // 2. Handle Markdown JSON blocks (common in long LLM outputs)
      if (content.includes("```json")) {
        content = content.split("```json")[1].split("```")[0].trim();
      } else if (content.includes("```") && content.match(/\{[\s\S]*\}/)) {
        // If it's a generic code block but contains JSON-like structure
        const block = content.split("```")[1].split("```")[0].trim();
        if (block.startsWith("{")) content = block;
      }

      // 3. Extract JSON object if the string contains one (handles preamble/postamble)
      // Only do this if it looks like the model was trying to return structured data
      if (content.includes("{") && content.includes("}")) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const potentialJson = jsonMatch[0];
            const parsed = JSON.parse(potentialJson);
            // If it has our known response fields, extract them
            if (parsed.response || parsed.content || parsed.message) {
              content = parsed.response || parsed.content || parsed.message;
            } else if (
              Object.keys(parsed).length > 0 &&
              !content.includes("\n")
            ) {
              // If it's a valid small JSON object and NOT markdown, maybe it's the whole response
              // but we stay conservative here to avoid breaking actual markdown lists
            }
          } catch (e) {
            // Not valid JSON or partial, keep original (cleaned) string
          }
        }
      }
    }

    res.json({
      success: response.success !== false,
      content,
      raw: response,
      error: response.error,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// POST /api/sdk/embed - Embedding Proxy
app.post("/api/sdk/embed", async (req, res) => {
  try {
    const sdk = SDKService.getSDK();
    if (!sdk) {
      return res.status(503).json({
        success: false,
        message: "RealTimeX SDK not initialized. Please ensure RealTimeX Desktop is running.",
      });
    }

    const { content, settings = {} } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid request: 'content' must be a non-empty string.",
      });
    }

    // Resolve provider/model
    const { provider, model } = await SDKService.resolveEmbedProvider(settings);

    console.log(
      `[SDK/Embed] Request: provider=${provider}, model=${model}, content_length=${content.length}`,
    );

    // Wrap with timeout to prevent indefinite hangs if provider/desktop bridge stops responding
    // 30 second timeout is reasonable for embeddings
    const response = await SDKService.withTimeout(
      sdk.llm.embed(content, {
        provider,
        model,
      }),
      30000,
      "Embedding request timed out",
    );

    if (response.success === false) {
      return res.status(502).json({
        success: false,
        message: response.error || response.message || "Embedding provider returned an error.",
      });
    }

    // Extract embedding - handle both plural (new SDK) and singular (old SDK) formats
    // Ensure we return a flat number array as per contract
    let embedding = null;
    if (response.embeddings && Array.isArray(response.embeddings)) {
      embedding = response.embeddings[0];
    } else if (response.embedding && Array.isArray(response.embedding)) {
      embedding = response.embedding;
    }

    if (!embedding || !Array.isArray(embedding)) {
      console.error("[SDK/Embed] Unexpected response format:", response);
      return res.status(502).json({
        success: false,
        message: "Provider returned an invalid embedding format.",
      });
    }

    console.log(
      `[SDK/Embed] Success: model=${response.model || model}, dimensions=${embedding.length}`,
    );

    res.json({
      success: true,
      embedding: embedding, // number[]
      model: response.model || model,
    });
  } catch (error) {
    console.error("[SDK/Embed] Error:", error.message);
    const status = error.message.includes("timed out") ? 504 : 500;
    res.status(status).json({
      success: false,
      message: error.message || "An unexpected error occurred during embedding.",
    });
  }
});

import multer from "multer";

const upload = multer();

// POST /api/sdk/stt - Speech-to-Text Proxy
app.post("/api/sdk/stt", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No audio file provided" });

    const text = await SDKService.transcribeAudio(
      req.file.buffer,
      req.body.settings,
    );
    res.json({ success: true, text });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// POST /api/sdk/tts - Legacy TTS Proxy
app.post("/api/sdk/tts", async (req, res) => {
  try {
    const audioBuffer = await SDKService.generateSpeech(
      req.body.text,
      req.body.settings,
    );
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
    });
    res.send(audioBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tts/speak - Standardized Speak
app.post("/api/tts/speak", async (req, res) => {
  try {
    const audioBuffer = await SDKService.generateSpeech(
      req.body.text,
      req.body.settings,
    );
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
    });
    res.send(audioBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tts/stream - Standardized Streaming
app.post("/api/tts/stream", async (req, res) => {
  try {
    const { text, settings = {} } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.write(
      `event: info\ndata: ${JSON.stringify({ message: "Starting TTS generation..." })}\n\n`,
    );

    try {
      for await (const chunk of SDKService.generateSpeechStream(
        text,
        settings,
      )) {
        // Match chunk format from email-automator
        const base64Audio = Buffer.from(chunk.audio).toString("base64");
        res.write(
          `event: chunk\ndata: ${JSON.stringify({
            index: chunk.index,
            total: chunk.total,
            audio: base64Audio,
            mimeType: chunk.mimeType,
          })}\n\n`,
        );
      }
      res.write(
        `event: done\ndata: ${JSON.stringify({ message: "TTS generation complete" })}\n\n`,
      );
    } catch (streamError) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: streamError.message })}\n\n`,
      );
    }
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// SPA fallback - serve index.html for all non-API routes (client-side routing)
app.get("*", (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith("/api/")) {
    return next();
  }
  res.sendFile(join(distPath, "index.html"));
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
// Start server only if run directly
if (process.argv[1] === __filename) {
  app.listen(PORT, () => {
    console.log(
      `🚀 RealTimeX CRM v${packageJson.version} server running on http://localhost:${PORT}`,
    );
    console.log(`📦 Package: ${packageJson.name}`);
    console.log(`📁 Serving static files from: ${distPath}`);
    console.log(`📡 Migration API: POST http://localhost:${PORT}/api/migrate`);
    console.log(`🏥 Health check: GET http://localhost:${PORT}/api/health`);
  });
}

export { app };
