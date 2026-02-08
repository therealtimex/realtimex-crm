import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import createHtmlPlugin from "vite-plugin-simple-html";
import { execSync, spawn } from "child_process";
import { copyFileSync } from "fs";
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

              // Set up streaming response
              res.writeHead(200, {
                "Content-Type": "text/plain",
                "Transfer-Encoding": "chunked",
                "Cache-Control": "no-cache",
                "X-Content-Type-Options": "nosniff",
              });

              const log = (msg) => res.write(`${msg}\n`);

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
                      log(`❌ ${line}`);
                      hasError = true;
                    } else {
                      log(`⚠️  ${line}`);
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
                  log("✅ Migration completed successfully!");
                  log("");
                  log("🎉 Your database is now ready to use.");
                  log("📝 The application will reload automatically...");
                } else {
                  log(`❌ Migration failed with exit code: ${code}`);
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
                log(`❌ Failed to start migration: ${error.message}`);
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
                res.write(`\n❌ Unexpected error: ${error.message}\n`);
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
