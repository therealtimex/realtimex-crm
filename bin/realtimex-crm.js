#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { writeFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import http from "node:http";
import { input, confirm } from "@inquirer/prompts";
import { tmpdir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the pre-built dist folder in the npm package
const DIST_PATH = join(__dirname, "..", "dist");
const SCRIPTS_PATH = join(__dirname, "..", "scripts");

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".woff": "application/font-woff",
  ".ttf": "application/font-ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "application/font-otf",
  ".wasm": "application/wasm",
};

async function main() {
  console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║   RealTimeX CRM Production Server     ║
║                                       ║
╘═══════════════════════════════════════╝
`);

  // --- Argument and Environment Variable Parsing ---
  const args = process.argv.slice(2);
  const nonInteractiveYes = args.includes("-y");
  const nonInteractiveNo = args.includes("-n");

  const supabaseUrlFromEnv = process.env.SUPABASE_URL;
  const supabaseAnonKeyFromEnv = process.env.SUPABASE_ANON_KEY;

  // --- Port Configuration ---
  let port = 6173; // Default port
  const portIndex = args.indexOf("--port");
  if (portIndex !== -1 && args[portIndex + 1]) {
    const customPort = parseInt(args[portIndex + 1], 10);
    if (!isNaN(customPort) && customPort > 0 && customPort < 65536) {
      port = customPort;
    } else {
      console.error("❌ Invalid port number. Using default port 6173.");
    }
  }

  // Check if dist folder exists
  if (!existsSync(DIST_PATH)) {
    console.error("❌ Error: Production build not found.");
    console.error(
      "Please ensure realtimex-crm is properly installed with the dist folder.",
    );
    process.exit(1);
  }

  // --- Determine if Supabase configuration should run ---
  let configureNow;
  if (nonInteractiveNo) {
    configureNow = false;
  } else if (nonInteractiveYes || supabaseUrlFromEnv) {
    configureNow = true;
  } else {
    console.log("\n📝 Supabase Configuration\n");
    console.log(
      "You can configure Supabase now or later via Settings → Database in the app.\n",
    );
    configureNow = await confirm({
      message: "Configure Supabase now?",
      default: true,
    });
  }

  if (configureNow) {
    // --- Get Supabase Credentials ---
    let supabaseUrl = supabaseUrlFromEnv;
    let supabaseAnonKey = supabaseAnonKeyFromEnv;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.log("\n📝 Supabase Configuration\n");
      console.log("First, ensure you are logged in to the Supabase CLI.");
      console.log("Run `npx supabase login` if you haven't already.\n");
    }

    if (!supabaseUrl) {
      supabaseUrl = await input({
        message: "Supabase URL:",
        validate: (value) => {
          if (!value.trim()) return "Supabase URL is required";
          if (!value.includes("supabase.co") && !value.includes("localhost"))
            return "URL should be a valid Supabase project URL";
          return true;
        },
      });
    } else {
      console.log(`Using SUPABASE_URL from environment.`);
    }

    if (!supabaseAnonKey) {
      supabaseAnonKey = await input({
        message: "Supabase Publishable API Key (anon key):",
        validate: (value) => {
          if (!value.trim()) return "Supabase Publishable API Key is required";
          return true;
        },
      });
    } else {
      console.log(`Using SUPABASE_ANON_KEY from environment.`);
    }

    // --- Save Configuration ---
    console.log("\n✅ Configuration saved!");
    console.log(
      "Note: You can update configuration anytime via Settings → Database in the app.\n",
    );
    const configPath = join(tmpdir(), "realtimex-crm-config.txt");
    const configContent = `Supabase Configuration:
URL: ${supabaseUrl}
Publishable API Key (anon key): ${supabaseAnonKey}

To configure the app:
1. Open the app in your browser
2. Go to Settings → Database
3. Enter these credentials
`;
    await writeFile(configPath, configContent);
    console.log(`Configuration details saved to: ${configPath}\n`);

    // --- Supabase CLI Commands ---
    const runSupabaseCommand = async (command, message) => {
      const packageRoot = join(__dirname, "..");
      console.log(`\n${message} (from package root: ${packageRoot})
`);
      const proc = spawn("npx", ["supabase", ...command], {
        stdio: "inherit",
        shell: true,
        cwd: packageRoot,
      });

      return new Promise((resolve, reject) => {
        proc.on("close", (code) => {
          if (code === 0) {
            console.log(
              `✅ Supabase command 'supabase ${command.join(" ")}' completed successfully.`,
            );
            resolve();
          } else {
            console.error(
              `❌ Supabase command 'supabase ${command.join(" ")}' failed with code ${code}.`,
            );
            reject(new Error(`Supabase command failed with code ${code}`));
          }
        });
        proc.on("error", (err) => {
          console.error(
            `❌ Failed to start Supabase command 'supabase ${command.join(" ")}': ${err.message}`,
          );
          reject(err);
        });
      });
    };

    const projectRefMatch = supabaseUrl.match(
      /https:\/\/([a-zA-Z0-9_-]+)\.supabase\.co/,
    );
    if (projectRefMatch && projectRefMatch[1]) {
      const projectRef = projectRefMatch[1];
      try {
        await runSupabaseCommand(
          ["link", "--project-ref", projectRef],
          `🔗 Linking to Supabase project '${projectRef}'...`,
        );

        let runDbPush = nonInteractiveYes;
        if (!nonInteractiveYes && !nonInteractiveNo) {
          runDbPush = await confirm({
            message: "Run `npx supabase db push` to apply migrations?",
            default: true,
          });
        }

        if (runDbPush) {
          try {
            await runSupabaseCommand(
              ["db", "push"],
              "🚀 Running `npx supabase db push`...",
            );
          } catch (error) {
            console.error("Continuing without successful db push.");
          }
        }

        let runFunctionsDeploy = nonInteractiveYes;
        if (!nonInteractiveYes && !nonInteractiveNo) {
          runFunctionsDeploy = await confirm({
            message: "Run `npx supabase functions deploy` to deploy functions?",
            default: true,
          });
        }

        if (runFunctionsDeploy) {
          try {
            await runSupabaseCommand(
              ["functions", "deploy"],
              "🚀 Running `npx supabase functions deploy`...",
            );
          } catch (error) {
            console.error("Continuing without successful functions deploy.");
          }
        }
      } catch (error) {
        console.error(
          "Could not link to Supabase project. Skipping db push and functions deploy.",
        );
      }
    } else {
      console.warn(
        "Could not extract project reference from Supabase URL. Skipping link, db push, and functions deploy.",
      );
    }
  }

  // --- Start Production Server ---
  console.log("\n🚀 Starting production server...");
  console.log(`   Local:   http://localhost:${port}`);
  console.log(`   Network: http://127.0.0.1:${port}\n`);

  if (!configureNow) {
    console.log(
      "💡 Configure Supabase via Settings → Database in the app after it loads.\n",
    );
  }

  console.log("Press Ctrl+C to stop the server.\n");

  // Import the full Express app from api/server.js
  const { app } = await import("../api/server.js");

  // Determine dist path (ensure consistent with api/server.js)
  // api/server.js uses ../dist relative to itself
  // bin/realtimex-crm.js uses ../dist relative to itself
  // They are siblings in the source tree (api/server.js, bin/realtimex-crm.js)
  // so the relative path "../dist" works for both contexts.

  const server = app.listen(port, () => {
    // console.log(`Server running at http://localhost:${port}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("\n\n👋 Stopping server...");
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
