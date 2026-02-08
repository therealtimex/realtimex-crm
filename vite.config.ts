import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import createHtmlPlugin from "vite-plugin-simple-html";
import { execSync, spawn } from "child_process";
import { copyFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import packageJson from "./package.json";


// Get latest migration timestamp at build time
function getLatestMigrationTimestamp() {
  try {
    const timestamp = execSync(
      "node ./scripts/get-latest-migration-timestamp.mjs",
      {
        encoding: "utf8",
      },
    ).trim();
    return timestamp;
  } catch {
    console.warn("Warning: Could not determine latest migration timestamp");
    return "unknown";
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const latestMigrationTimestamp = getLatestMigrationTimestamp();

  const define = {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageJson.version),
    "import.meta.env.VITE_LATEST_MIGRATION_TIMESTAMP": JSON.stringify(
      latestMigrationTimestamp,
    ),
  };

  if (mode === "production") {
    Object.assign(define, {
      "import.meta.env.VITE_IS_DEMO": JSON.stringify(env.VITE_IS_DEMO),
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        env.VITE_SUPABASE_URL,
      ),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY,
      ),
      "import.meta.env.VITE_INBOUND_EMAIL": JSON.stringify(
        env.VITE_INBOUND_EMAIL,
      ),
    });
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      visualizer({
        open: process.env.NODE_ENV !== "CI",
        filename: "./dist/stats.html",
      }),
      createHtmlPlugin({
        minify: true,
        inject: {
          data: {
            mainScript: `src/main.tsx`,
          },
        },
      }),
      {
        name: "sync-changelog",
        buildStart() {
          try {
            copyFileSync("CHANGELOG.md", "public/CHANGELOG.md");
            console.log("📝 Synced CHANGELOG.md to public/");
          } catch (e) {
            console.warn("⚠️ Failed to sync CHANGELOG.md:", e);
          }
        },
        handleHotUpdate({ file }) {
          if (file.endsWith("CHANGELOG.md")) {
            try {
              copyFileSync("CHANGELOG.md", "public/CHANGELOG.md");
              console.log("📝 Synced CHANGELOG.md to public/ (HMR)");
            } catch (e) {
              console.warn("⚠️ Failed to sync CHANGELOG.md:", e);
            }
          }
        },
      },
      {
        name: "bundle-migrations",
        closeBundle() {
          try {
            // Copy supabase/ directory to dist/
            const copyDir = (src: string, dest: string) => {
              mkdirSync(dest, { recursive: true });
              const entries = readdirSync(src, { withFileTypes: true });

              for (const entry of entries) {
                const srcPath = path.join(src, entry.name);
                const destPath = path.join(dest, entry.name);

                if (entry.isDirectory()) {
                  copyDir(srcPath, destPath);
                } else {
                  copyFileSync(srcPath, destPath);
                }
              }
            };

            // Copy migrations
            if (existsSync("supabase")) {
              copyDir("supabase", "dist/supabase");
              console.log("📦 Bundled supabase/ migrations to dist/");
            }

            // Copy migration script
            if (existsSync("scripts")) {
              mkdirSync("dist/scripts", { recursive: true });
              if (existsSync("scripts/migrate.sh")) {
                copyFileSync("scripts/migrate.sh", "dist/scripts/migrate.sh");
                console.log("📦 Bundled scripts/migrate.sh to dist/");
              }
            }
          } catch (e) {
            console.warn("⚠️ Failed to bundle migrations:", e);
          }
        },
      },
      {
        name: "api-setup",
        configureServer(server) {
          // GET /api/setup/organizations - Fetch user's Supabase organizations
          server.middlewares.use("/api/setup/organizations", async (req, res, next) => {
            if (req.method !== "GET") return next();

            try {
              const authHeader = req.headers["authorization"];

              if (!authHeader) {
                res.writeHead(401, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Authorization header required" }));
                return;
              }

              // Fetch organizations from Supabase Management API
              const response = await fetch("https://api.supabase.com/v1/organizations", {
                headers: {
                  "Authorization": authHeader,
                  "Content-Type": "application/json",
                },
              });

              const data = await response.json();

              if (!response.ok) {
                res.writeHead(response.status, { "Content-Type": "application/json" });
                res.end(JSON.stringify(data));
                return;
              }

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(data));
            } catch (error) {
              console.error("[Setup API] Error fetching organizations:", error);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                error: "Internal server error",
                message: error.message,
              }));
            }
          });

          // POST /api/setup/auto-provision - Auto-provision new Supabase project
          server.middlewares.use("/api/setup/auto-provision", async (req, res, next) => {
            if (req.method !== "POST") return next();

            try {
              // Parse request body
              const buffers = [];
              for await (const chunk of req) {
                buffers.push(chunk);
              }

              let body = {};
              try {
                body = JSON.parse(Buffer.concat(buffers).toString());
              } catch {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Invalid JSON in request body" }));
                return;
              }

              const { orgId, projectName: customProjectName, region: customRegion } = body;
              const authHeader = req.headers["authorization"];

              // Validation
              if (!authHeader) {
                res.writeHead(401, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Authorization header required" }));
                return;
              }

              if (!orgId) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "orgId is required" }));
                return;
              }

              // Set up SSE streaming response
              res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
              });

              const sendEvent = (type, data) => {
                res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
              };

              try {
                const crypto = await import("crypto");
                const projectName = customProjectName || `RealTimeX-CRM-${crypto.randomBytes(2).toString("hex")}`;
                const region = customRegion || "us-east-1";

                // Generate secure DB password
                const dbPass = crypto.randomBytes(16).toString("base64")
                  .replace(/\+/g, "a")
                  .replace(/\//g, "b")
                  .replace(/=/g, "c") + "1!Aa";

                sendEvent("info", `🚀 Creating Supabase project: ${projectName} in ${region}...`);

                // 1. Create Project
                const createResponse = await fetch("https://api.supabase.com/v1/projects", {
                  method: "POST",
                  headers: {
                    "Authorization": authHeader,
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
                      { headers: { "Authorization": authHeader } }
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
                    console.warn("Polling error:", pollError.message);
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
                    sendEvent("info", `⏳ API keys not ready yet. Retrying (${keyAttempts}/${maxKeyAttempts})...`);
                    await new Promise((resolve) => setTimeout(resolve, 3000));
                  }

                  try {
                    const keysResponse = await fetch(
                      `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
                      { headers: { "Authorization": authHeader } }
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
                    console.warn("Key retrieval failed:", err.message);
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
                console.error("[Auto-provision] Error:", errorMsg);
                sendEvent("error", errorMsg);
                sendEvent("done", "failed");
              } finally {
                res.end();
              }
            } catch (error) {
              console.error("[Setup API] Error in auto-provision:", error);
              if (!res.headersSent) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  error: "Internal server error",
                  message: error.message,
                }));
              } else {
                res.write(`data: ${JSON.stringify({ type: "error", data: error.message })}\n\n`);
                res.end();
              }
            }
          });
        },
      },
      {
        name: "api-migrate",
        configureServer(server) {
          server.middlewares.use("/api/migrate", async (req, res, next) => {
            if (req.method !== "POST") return next();

            try {
              // Parse request body
              const buffers = [];
              for await (const chunk of req) {
                buffers.push(chunk);
              }

              let body = {};
              try {
                body = JSON.parse(Buffer.concat(buffers).toString());
              } catch {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({ error: "Invalid JSON in request body" }),
                );
                return;
              }

              const { projectRef, dbPassword, accessToken } = body;

              // Validation
              if (!projectRef) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "projectRef is required" }));
                return;
              }

              // Set up SSE streaming response
              res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
              });

              const sendEvent = (type, data) => {
                res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
              };

              const log = (msg) => sendEvent("info", msg);

              log("🚀 Starting migration (Development Mode)...");
              log("");

              // Prepare environment
              const env = {
                ...process.env,
                SUPABASE_PROJECT_ID: projectRef,
              };

              if (accessToken) {
                env.SUPABASE_ACCESS_TOKEN = accessToken;
                log("🔑 Using provided access token for authentication");
              } else if (dbPassword) {
                env.SUPABASE_DB_PASSWORD = dbPassword;
                log("🔑 Using provided database password");
              } else {
                log(
                  "⚠️  No credentials provided - checking existing Supabase login...",
                );
                log("");
                log(
                  "💡 Tip: Provide an access token for more reliable authentication",
                );
                log(
                  "   Generate one at: https://supabase.com/dashboard/account/tokens",
                );
              }

              log("");
              log("─".repeat(60));
              log("");

              // Path to migration script
              const scriptPath = path.join(
                process.cwd(),
                "scripts",
                "migrate.sh",
              );

              // Execute migration script
              const migrationProcess = spawn("bash", [scriptPath], {
                env,
                cwd: process.cwd(),
                stdio: ["ignore", "pipe", "pipe"],
              });

              let hasError = false;

              // Stream stdout
              migrationProcess.stdout.on("data", (data) => {
                const lines = data.toString().split("\n");
                lines.forEach((line) => {
                  if (line.trim()) {
                    log(line);
                  }
                });
              });

              // Stream stderr
              migrationProcess.stderr.on("data", (data) => {
                const lines = data.toString().split("\n");
                lines.forEach((line) => {
                  if (line.trim()) {
                    if (
                      line.toLowerCase().includes("error") ||
                      line.toLowerCase().includes("failed")
                    ) {
                      sendEvent("error", `❌ ${line}`);
                      hasError = true;
                    } else {
                      sendEvent("info", `⚠️  ${line}`);
                    }
                  }
                });
              });

              // Handle completion
              migrationProcess.on("close", (code) => {
                log("");
                log("─".repeat(60));
                log("");

                if (code === 0 && !hasError) {
                  sendEvent("success", "✅ Migration completed successfully!");
                  log("");
                  log("🎉 Your database is now ready to use.");
                  log("📝 The application will reload automatically...");
                } else {
                  sendEvent("error", `❌ Migration failed with exit code: ${code}`);
                  log("");
                  log("💡 Troubleshooting tips:");
                  log("   1. Verify your Supabase credentials are correct");
                  log(
                    "   2. Generate an access token at: https://supabase.com/dashboard/account/tokens",
                  );
                  log(
                    "   3. Ensure Supabase CLI is installed: npm install -g supabase",
                  );
                  log("   4. Try running: npx supabase login");
                  log("");
                  log(
                    "📚 Need help? https://github.com/therealtimex/realtimex-crm/issues",
                  );
                }

                res.end();
              });

              // Handle errors
              migrationProcess.on("error", (error) => {
                log("");
                sendEvent("error", `❌ Failed to start migration: ${error.message}`);
                log("");
                log("💡 Common causes:");
                log("   - Bash shell not available");
                log("   - Migration script not found or not executable");
                log("   - Permission issues");
                log("");
                log("Try running the migration manually:");
                log("   bash scripts/migrate.sh");
                res.end();
              });

              // Handle client disconnect
              req.on("close", () => {
                if (!migrationProcess.killed) {
                  migrationProcess.kill();
                  console.log(
                    "[Migration API] Process terminated - client disconnected",
                  );
                }
              });
            } catch (error) {
              console.error("[Migration API] Error:", error);
              if (!res.headersSent) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    error: "Internal server error",
                    message: error.message,
                  }),
                );
              } else {
                res.write(`data: ${JSON.stringify({ type: "error", data: `❌ Unexpected error: ${error.message}` })}\n\n`);
                res.end();
              }
            }
          });
        },
      },
    ],
    define,
    base: "./",
    esbuild: {
      keepNames: true,
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          // Reduce code splitting - create larger, more efficient chunks
          manualChunks: {
            // Vendor chunk: Large dependencies
            vendor: [
              'react',
              'react-dom',
              'react-router',
              '@tanstack/react-query',
            ],
            // UI chunk: UI component libraries (only packages that are installed)
            ui: [
              '@radix-ui/react-accordion',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-avatar',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-collapsible',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-label',
              '@radix-ui/react-navigation-menu',
              '@radix-ui/react-popover',
              '@radix-ui/react-progress',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-select',
              '@radix-ui/react-separator',
              '@radix-ui/react-slot',
              '@radix-ui/react-switch',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
            ],
            // Data chunk: Data fetching & state
            data: [
              'ra-core',
              'ra-supabase-core',
              '@supabase/supabase-js',
            ],
          },
        },
      },
    },
    resolve: {
      preserveSymlinks: true,
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
