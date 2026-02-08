import express from "express";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
);

const app = express();
// Use PORT environment variable (same as frontend) or fall back to 3002 to avoid conflict with RealTimeX desktop app (3001)
const PORT = process.env.PORT || 3002;

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
  const { orgId, projectName: customProjectName, region: customRegion } = req.body;
  const authHeader = req.headers["authorization"];

  if (!orgId) {
    return res.status(400).json({ error: "Missing required parameter (orgId)" });
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
    const projectName = customProjectName || `RealTimeX-CRM-${crypto.randomBytes(2).toString("hex")}`;
    const region = customRegion || "us-east-1";

    // Generate a secure DB password server-side
    const dbPass = crypto.randomBytes(16).toString("base64")
      .replace(/\+/g, "a")
      .replace(/\//g, "b")
      .replace(/=/g, "c") + "1!Aa";

    sendEvent("info", `🚀 Creating Supabase project: ${projectName} in ${region}...`);

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

    sendEvent("info", `📦 Project created! ID: ${projectRef}. Waiting for it to go live...`);
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
          }
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          const status = statusData.status;
          sendEvent("info", `⏳ Status: ${status} (Attempt ${attempts}/${maxAttempts})`);

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
        sendEvent("info", `⏳ API keys not ready yet. Retrying (Attempt ${keyAttempts}/${maxKeyAttempts})...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      try {
        const keysResponse = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
          {
            headers: { Authorization: authHeader },
          }
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

  // Validation
  if (!projectRef) {
    return res.status(400).json({ error: "projectRef is required" });
  }

  if (!accessToken && !dbPassword) {
    return res.status(400).json({
      error: "Either accessToken or dbPassword must be provided",
    });
  }

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

    // Execute migration script
    const child = spawn("bash", [scriptPath], {
      env,
      cwd: join(__dirname, ".."),
    });

    let hasError = false;

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
        child.kill();
        console.log("Migration process terminated - client disconnected");
      }
    });
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
app.listen(PORT, () => {
  console.log(
    `🚀 RealTimeX CRM v${packageJson.version} server running on http://localhost:${PORT}`,
  );
  console.log(`📦 Package: ${packageJson.name}`);
  console.log(`📁 Serving static files from: ${distPath}`);
  console.log(`📡 Migration API: POST http://localhost:${PORT}/api/migrate`);
  console.log(`🏥 Health check: GET http://localhost:${PORT}/api/health`);
});
