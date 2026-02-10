import path from "node:path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import createHtmlPlugin from "vite-plugin-simple-html";
import { execSync } from "child_process";
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
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          mainScript: `demo/main.tsx`,
        },
      },
    }),
  ],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageJson.version),
    "import.meta.env.VITE_LATEST_MIGRATION_TIMESTAMP": JSON.stringify(
      getLatestMigrationTimestamp(),
    ),
    "import.meta.env.VITE_IS_DEMO": JSON.stringify("true"),
    "import.meta.env.VITE_DEMO_MODE": JSON.stringify("true"),
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      process.env.VITE_SUPABASE_URL ?? "https://demo.example.org",
    ),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY ?? "https://demo.example.org",
    ),
  },
  base: "/",
  esbuild: {
    keepNames: true,
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom", "react-router"],
          mui: [
            "@mui/material",
            "@mui/icons-material",
            "@emotion/react",
            "@emotion/styled",
          ],
          ra: ["ra-core", "ra-i18n-polyglot"],
          supabase: ["@supabase/supabase-js", "ra-supabase-core"],
          tanstack: ["@tanstack/react-query"],
          utils: ["lodash", "lucide-react"],
        },
      },
    },
    minify: "esbuild",
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
