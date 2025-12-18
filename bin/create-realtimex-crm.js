#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { confirm, input, select } from "@inquirer/prompts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES = {
  standalone: "Create a standalone CRM application",
  localapp: "Create a RealTimeX Local App integration",
  component: "Use as a React component in existing app",
};

async function main() {
  console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║   RealTimeX CRM Setup                 ║
║                                       ║
╘═══════════════════════════════════════╝
`);

  // Get project name
  const projectName = await input({
    message: "Project name:",
    default: "my-crm",
    validate: (value) => {
      if (!value.trim()) return "Project name is required";
      if (!/^[a-z0-9-_]+$/.test(value))
        return "Project name must be lowercase alphanumeric with dashes/underscores only";
      return true;
    },
  });

  const projectPath = join(process.cwd(), projectName);

  // Check if directory exists
  if (existsSync(projectPath)) {
    const overwrite = await confirm({
      message: `Directory "${projectName}" already exists. Overwrite?`,
      default: false,
    });
    if (!overwrite) {
      console.log("Setup cancelled.");
      process.exit(0);
    }
  }

  // Select template
  const template = await select({
    message: "Select a template:",
    choices: Object.entries(TEMPLATES).map(([value, name]) => ({
      value,
      name,
    })),
  });

  // Get Supabase configuration
  const configureSupabase = await confirm({
    message: "Configure Supabase now?",
    default: false,
  });

  let supabaseUrl = "";
  let supabaseAnonKey = "";

  if (configureSupabase) {
    supabaseUrl = await input({
      message: "Supabase URL:",
      validate: (value) => {
        if (!value.trim()) return "Supabase URL is required";
        if (!value.includes("supabase.co"))
          return "URL should be a valid Supabase project URL";
        return true;
      },
    });

    supabaseAnonKey = await input({
      message: "Supabase Anon Key:",
      validate: (value) => {
        if (!value.trim()) return "Supabase Anon Key is required";
        return true;
      },
    });
  }

  console.log("\n📦 Creating project...\n");

  // Create project directory
  await mkdir(projectPath, { recursive: true });

  // Generate files based on template
  if (template === "standalone") {
    await createStandaloneApp(projectPath, projectName, {
      supabaseUrl,
      supabaseAnonKey,
    });
  } else if (template === "localapp") {
    await createLocalApp(projectPath, projectName, {
      supabaseUrl,
      supabaseAnonKey,
    });
  } else if (template === "component") {
    await createComponentSetup(projectPath, projectName, {
      supabaseUrl,
      supabaseAnonKey,
    });
  }

  console.log("\n✅ Project created successfully!\n");
  console.log("Next steps:\n");
  console.log(`  cd ${projectName}`);
  console.log(`  npm install`);

  if (!configureSupabase) {
    console.log(
      `  # Configure Supabase in .env or via Settings → Database in the app`,
    );
  }

  if (template === "standalone") {
    console.log(`  npm run dev      # Start development server`);
    console.log(`  npm run build    # Build for production`);
  } else if (template === "localapp") {
    console.log(
      `  npm run dev      # Start as RealTimeX Local App (localhost:5173)`,
    );
    console.log(`  npm run build    # Build for production`);
    console.log(
      `\n📖 See LOCAL_APP.md for RealTimeX.ai integration instructions`,
    );
  }

  console.log("");
}

async function createStandaloneApp(projectPath, projectName, config) {
  const packageJson = {
    name: projectName,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "vite --force",
      build: "tsc && vite build",
      preview: "vite preview",
      typecheck: "tsc --noEmit",
      lint: "eslint **/*.{mjs,ts,tsx}",
    },
    dependencies: {
      "realtimex-crm": "latest",
      react: "^19.1.0",
      "react-dom": "^19.1.0",
    },
    devDependencies: {
      "@types/react": "^19.1.8",
      "@types/react-dom": "^19.1.6",
      "@vitejs/plugin-react": "^4.6.0",
      typescript: "~5.8.3",
      vite: "^7.0.4",
    },
  };

  await writeFile(
    join(projectPath, "package.json"),
    JSON.stringify(packageJson, null, 2),
  );

  // Create src/App.tsx
  const appTsx = `import { CRM } from "realtimex-crm";
import "realtimex-crm/dist/style.css";

function App() {
  return (
    <CRM
      title="My CRM"
      // Customize your CRM here
      // darkModeLogo="./logos/dark.svg"
      // lightModeLogo="./logos/light.svg"
      // contactGender={[...]}
      // dealStages={[...]}
    />
  );
}

export default App;
`;

  await mkdir(join(projectPath, "src"), { recursive: true });
  await writeFile(join(projectPath, "src/App.tsx"), appTsx);

  // Create src/main.tsx
  const mainTsx = `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

  await writeFile(join(projectPath, "src/main.tsx"), mainTsx);

  // Create index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CRM</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

  await writeFile(join(projectPath, "index.html"), indexHtml);

  // Create vite.config.ts
  const viteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
`;

  await writeFile(join(projectPath, "vite.config.ts"), viteConfig);

  // Create tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: "ES2020",
      useDefineForClassFields: true,
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      module: "ESNext",
      skipLibCheck: true,
      moduleResolution: "bundler",
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "react-jsx",
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
    },
    include: ["src"],
  };

  await writeFile(
    join(projectPath, "tsconfig.json"),
    JSON.stringify(tsConfig, null, 2),
  );

  // Create .env file if config provided
  if (config.supabaseUrl && config.supabaseAnonKey) {
    const envContent = `VITE_SUPABASE_URL=${config.supabaseUrl}
VITE_SUPABASE_ANON_KEY=${config.supabaseAnonKey}
`;
    await writeFile(join(projectPath, ".env"), envContent);
  }

  // Create .gitignore
  const gitignore = `# Dependencies
node_modules

# Build output
dist
dist-ssr
*.local

# Environment
.env
.env.local
.env.production.local

# Editor
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`;

  await writeFile(join(projectPath, ".gitignore"), gitignore);

  // Create README.md
  const readme = `# ${projectName}

A CRM application built with RealTimeX CRM.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Configure Supabase:
   - Create a \`.env\` file with your Supabase credentials:
     \`\`\`
     VITE_SUPABASE_URL=https://xxxxx.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     \`\`\`
   - Or configure via the UI after starting the app

3. Start development server:
   \`\`\`bash
   npm run dev
   \`\`\`

4. Open [http://localhost:5173](http://localhost:5173)

## Customization

Edit \`src/App.tsx\` to customize your CRM:

- \`title\`: App title
- \`darkModeLogo\` / \`lightModeLogo\`: Custom logos
- \`contactGender\`: Gender options
- \`companySectors\`: Industry sectors
- \`dealStages\`: Deal pipeline stages
- \`dealCategories\`: Deal categories
- \`noteStatuses\`: Note status options
- \`taskTypes\`: Task type options

See [RealTimeX CRM Documentation](https://github.com/therealtimex/realtimex-crm) for more options.

## Build for Production

\`\`\`bash
npm run build
\`\`\`

The built files will be in the \`dist\` directory.
`;

  await writeFile(join(projectPath, "README.md"), readme);
}

async function createLocalApp(projectPath, projectName, config) {
  // Start with standalone setup
  await createStandaloneApp(projectPath, projectName, config);

  // Update package.json with RealTimeX App SDK
  const packageJsonPath = join(projectPath, "package.json");
  const packageJson = JSON.parse(
    await import("fs").then((fs) => fs.promises.readFile(packageJsonPath, "utf8")),
  );

  packageJson.dependencies["@realtimex/app-sdk"] = "latest";

  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Create updated App.tsx with RealTimeX integration
  const appTsx = `import { RealTimeXApp } from "@realtimex/app-sdk";
import { SupabaseProvider } from "@realtimex/app-sdk/providers/supabase";
import { CRM } from "realtimex-crm";
import "realtimex-crm/dist/style.css";

function App() {
  return (
    <RealTimeXApp
      appId="${projectName}"
      appName="CRM"
      version="1.0.0"
      description="Full-featured CRM for RealTimeX"
    >
      <SupabaseProvider
        url={import.meta.env.VITE_SUPABASE_URL}
        anonKey={import.meta.env.VITE_SUPABASE_ANON_KEY}
        autoScope={{
          enabled: true,
          userIdField: "realtimex_user_id",
        }}
      >
        <CRM
          title="CRM"
          // Customize your CRM here
        />
      </SupabaseProvider>
    </RealTimeXApp>
  );
}

export default App;
`;

  await writeFile(join(projectPath, "src/App.tsx"), appTsx);

  // Create LOCAL_APP.md documentation
  const localAppDoc = `# RealTimeX Local App Integration

This CRM is configured as a RealTimeX Local App, which allows it to integrate with the RealTimeX.ai platform.

## What is a RealTimeX Local App?

A Local App runs in the user's browser and communicates with RealTimeX.ai via the App SDK. It receives:
- User authentication context
- Parent-child user relationships
- Global state management
- Platform-level permissions

## Architecture

\`\`\`
RealTimeX Platform (realtimex.ai)
    ↓ (postMessage API)
Local App (localhost:5173 or embedded)
    ↓ (HTTP + RLS)
Supabase Database
\`\`\`

## Key Features

1. **Authentication via Platform**: Users authenticate with RealTimeX, not Supabase directly
2. **Auto-scoping**: Data is automatically filtered by \`realtimex_user_id\`
3. **Parent-child support**: Parent users can see their children's data
4. **No JWT tokens**: Uses platform-provided user headers instead

## Database Schema Changes

To use this as a Local App, your Supabase schema needs \`realtimex_user_id\` instead of \`sales_id\`:

\`\`\`sql
-- Add RealTimeX user ID to all tables
ALTER TABLE contacts ADD COLUMN realtimex_user_id INTEGER;
ALTER TABLE companies ADD COLUMN realtimex_user_id INTEGER;
ALTER TABLE deals ADD COLUMN realtimex_user_id INTEGER;
ALTER TABLE tasks ADD COLUMN realtimex_user_id INTEGER;
-- etc.

-- Create indexes
CREATE INDEX idx_contacts_rtx_user ON contacts(realtimex_user_id);
CREATE INDEX idx_companies_rtx_user ON companies(realtimex_user_id);
-- etc.

-- Update RLS policies to use realtimex_user_id
CREATE POLICY "Users see own contacts" ON contacts
FOR SELECT USING (
  realtimex_user_id = current_setting('request.headers')::json->>'x-realtimex-user-id'::INTEGER
);
\`\`\`

## Running as Local App

### Development Mode

\`\`\`bash
npm run dev
\`\`\`

Then register in RealTimeX.ai:
1. Go to RealTimeX.ai → Settings → Local Apps
2. Add new app:
   - Name: CRM
   - URL: http://localhost:5173
   - App ID: ${projectName}

### Production Mode

Build and deploy to any static host:

\`\`\`bash
npm run build
\`\`\`

Deploy \`dist/\` to:
- Vercel
- Netlify
- GitHub Pages
- Your own CDN

Then update the Local App URL in RealTimeX.ai settings.

## Configuration

Environment variables:
\`\`\`
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

## SDK Usage

The \`@realtimex/app-sdk\` provides:

### Get Current User
\`\`\`typescript
import { useRealTimeXUser } from "@realtimex/app-sdk";

function MyComponent() {
  const user = useRealTimeXUser();
  // { id: 123, email: "user@example.com", role: "user" }
}
\`\`\`

### Navigate to Platform
\`\`\`typescript
import { useRealTimeXNavigate } from "@realtimex/app-sdk";

function MyComponent() {
  const navigate = useRealTimeXNavigate();
  navigate("/contacts/123"); // Navigate within RealTimeX
}
\`\`\`

### Access Global State
\`\`\`typescript
import { useRealTimeXState } from "@realtimex/app-sdk";

function MyComponent() {
  const [value, setValue] = useRealTimeXState("my-key");
}
\`\`\`

## Resources

- [RealTimeX App SDK Docs](https://realtimex.ai/docs/app-sdk)
- [RealTimeX CRM Docs](https://github.com/therealtimex/realtimex-crm)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
`;

  await writeFile(join(projectPath, "LOCAL_APP.md"), localAppDoc);

  // Create realtimex.config.json
  const rtxConfig = {
    appId: projectName,
    name: "CRM",
    version: "1.0.0",
    description: "Full-featured CRM for RealTimeX",
    permissions: ["database.read", "database.write", "user.read"],
    settings: {
      supabase: {
        required: true,
        fields: ["url", "anonKey"],
      },
    },
  };

  await writeFile(
    join(projectPath, "realtimex.config.json"),
    JSON.stringify(rtxConfig, null, 2),
  );
}

async function createComponentSetup(projectPath, projectName, config) {
  const packageJson = {
    name: projectName,
    version: "0.1.0",
    private: true,
    type: "module",
    dependencies: {
      "realtimex-crm": "latest",
    },
  };

  await writeFile(
    join(projectPath, "package.json"),
    JSON.stringify(packageJson, null, 2),
  );

  // Create example integration files
  await mkdir(join(projectPath, "examples"), { recursive: true });

  const exampleReact = `import { CRM } from "realtimex-crm";
import "realtimex-crm/dist/style.css";

export function MyCRMPage() {
  return (
    <div className="h-screen">
      <CRM
        title="My CRM"
        // Customize as needed
      />
    </div>
  );
}
`;

  await writeFile(join(projectPath, "examples/react-integration.tsx"), exampleReact);

  const readme = `# ${projectName}

RealTimeX CRM component integration.

## Installation

\`\`\`bash
npm install realtimex-crm
\`\`\`

## Usage

\`\`\`tsx
import { CRM } from "realtimex-crm";
import "realtimex-crm/dist/style.css";

function App() {
  return <CRM title="My CRM" />;
}
\`\`\`

## Configuration

Configure Supabase via environment variables or UI:

\`\`\`
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

## Customization

See \`examples/react-integration.tsx\` for a complete example.

Available props:
- \`title\`: string
- \`darkModeLogo\` / \`lightModeLogo\`: string
- \`contactGender\`: ContactGender[]
- \`companySectors\`: string[]
- \`dealStages\`: DealStage[]
- \`dealCategories\`: string[]
- \`noteStatuses\`: NoteStatus[]
- \`taskTypes\`: string[]

See [documentation](https://github.com/therealtimex/realtimex-crm) for details.
`;

  await writeFile(join(projectPath, "README.md"), readme);
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
