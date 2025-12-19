#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { input, confirm } from "@inquirer/prompts";
import { tmpdir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the pre-built dist folder in the npm package
const DIST_PATH = join(__dirname, "..", "dist");

async function main() {
  console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║   RealTimeX CRM Production Server     ║
║                                       ║
╘═══════════════════════════════════════╝
`);

  // Parse command line arguments for port
  const args = process.argv.slice(2);
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

  // Prompt for Supabase configuration
  console.log("\n📝 Supabase Configuration\n");
  console.log(
    "You can configure Supabase now or later via Settings → Database in the app.\n",
  );

  const configureNow = await confirm({
    message: "Configure Supabase now?",
    default: false,
  });

  if (configureNow) {
    const supabaseUrl = await input({
      message: "Supabase URL:",
      validate: (value) => {
        if (!value.trim()) return "Supabase URL is required";
        if (!value.includes("supabase.co") && !value.includes("localhost"))
          return "URL should be a valid Supabase project URL";
        return true;
      },
    });

    const supabaseAnonKey = await input({
      message: "Supabase Anon Key:",
      validate: (value) => {
        if (!value.trim()) return "Supabase Anon Key is required";
        return true;
      },
    });

    // Create a temporary .env file in the dist directory
    // Note: This is a workaround since the built app expects env vars at build time
    // The app will fall back to localStorage configuration if these aren't available
    console.log("\n✅ Configuration saved!");
    console.log(
      "Note: You can update configuration anytime via Settings → Database in the app.\n",
    );

    // Save config to a temp location that the user can reference
    const configPath = join(tmpdir(), "realtimex-crm-config.txt");
    const configContent = `Supabase Configuration:
URL: ${supabaseUrl}
Anon Key: ${supabaseAnonKey}

To configure the app:
1. Open the app in your browser
2. Go to Settings → Database
3. Enter these credentials
`;
    await writeFile(configPath, configContent);
    console.log(`Configuration details saved to: ${configPath}\n`);

    // Helper to run supabase commands
    const runSupabaseCommand = async (command, message) => {
      console.log(`\n${message}`);
      const proc = spawn("npx", ["supabase", ...command], {
        stdio: "inherit",
        shell: true,
      });

      return new Promise((resolve, reject) => {
        proc.on("close", (code) => {
          if (code === 0) {
            console.log(`✅ Supabase command 'supabase ${command.join(' ')}' completed successfully.`);
            resolve();
          } else {
            console.error(`❌ Supabase command 'supabase ${command.join(' ')}' failed with code ${code}.`);
            reject(new Error(`Supabase command failed with code ${code}`));
          }
        });
        proc.on("error", (err) => {
          console.error(`❌ Failed to start Supabase command 'supabase ${command.join(' ')}': ${err.message}`);
          reject(err);
        });
      });
    };

    const runDbPush = await confirm({
      message: "Run `npx supabase db push` to apply migrations?",
      default: false,
    });

    if (runDbPush) {
      try {
        await runSupabaseCommand(["db", "push"], "🚀 Running `npx supabase db push`...");
      } catch (error) {
        console.error("Continuing without successful db push.");
      }
    }

    const runFunctionsDeploy = await confirm({
      message: "Run `npx supabase functions deploy` to deploy functions?",
      default: false,
    });

    if (runFunctionsDeploy) {
      try {
        await runSupabaseCommand(["functions", "deploy"], "🚀 Running `npx supabase functions deploy`...");
      } catch (error) {
        console.error("Continuing without successful functions deploy.");
      }
    }
  }

  console.log("\n🚀 Starting production server...\n");
  console.log(`   Local:   http://localhost:${port}`);
  console.log(`   Network: http://127.0.0.1:${port}\n`);

  if (!configureNow) {
    console.log(
      "💡 Configure Supabase via Settings → Database in the app after it loads.\n",
    );
  }

  console.log("Press Ctrl+C to stop the server.\n");

  // Start the server using the serve package
  const serveProcess = spawn(
    "npx",
    ["serve", "-s", DIST_PATH, "-l", `tcp://127.0.0.1:${port}`, "--no-clipboard"],
    {
      stdio: "inherit",
      shell: true,
    },
  );

  // Handle process termination
  process.on("SIGINT", () => {
    console.log("\n\n👋 Stopping server...");
    serveProcess.kill();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    serveProcess.kill();
    process.exit(0);
  });

  serveProcess.on("error", (error) => {
    console.error("\n❌ Error starting server:", error.message);
    console.error(
      '\nPlease ensure "serve" is installed: npm install -g serve',
    );
    process.exit(1);
  });

  serveProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n❌ Server exited with code ${code}`);
      process.exit(code);
    }
  });
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
