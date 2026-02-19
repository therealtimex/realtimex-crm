# create-realtimex-crm CLI Guide

Quick and easy way to scaffold RealTimeX CRM projects.

## Quick Start

```bash
npx create-realtimex-crm@latest
```

## Templates

### 1. 📦 Standalone App

**Perfect for**: Deploying your own CRM instance

**What you get**:
```
my-crm/
├── src/
│   ├── App.tsx           # CRM configuration
│   └── main.tsx          # React entry point
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript config
├── package.json          # Dependencies
├── .env                  # Supabase config (if configured)
├── .gitignore
└── README.md
```

**Stack**:
- ⚛️ React 19
- 📘 TypeScript
- ⚡ Vite 7
- 🎨 RealTimeX CRM
- 🗄️ Supabase

**Commands after setup**:
```bash
cd my-crm
npm install
npm run dev      # http://localhost:5173
npm run build    # Build for production
```

**Customization**:
Edit `src/App.tsx`:
```tsx
<CRM
  title="My Custom CRM"
  darkModeLogo="./logos/dark.svg"
  lightModeLogo="./logos/light.svg"
  dealStages={[
    { value: "lead", label: "Lead" },
    { value: "won", label: "Won" },
  ]}
  taskTypes={["Email", "Call", "Meeting"]}
/>
```

---

### 2. 🔌 RealTimeX Local App

**Perfect for**: Integrating with RealTimeX.ai platform

**What you get**: Everything from Standalone + RealTimeX App SDK integration

**Additional files**:
```
my-crm/
├── src/
│   └── App.tsx           # Wrapped with RealTimeXApp
├── realtimex.config.json # Local App manifest
└── LOCAL_APP.md          # Integration guide
```

**Stack**: Standalone + `@realtimex/app-sdk`

**Key Differences**:
1. **Authentication**: Uses RealTimeX platform auth, not Supabase Auth
2. **Data Scoping**: Automatic filtering by `realtimex_user_id`
3. **Parent-Child**: Platform handles user hierarchy
4. **No JWT Tokens**: Uses platform-provided headers

**App.tsx**:
```tsx
import { RealTimeXApp } from "@realtimex/app-sdk";
import { SupabaseProvider } from "@realtimex/app-sdk/providers/supabase";
import { CRM } from "realtimex-crm";

function App() {
  return (
    <RealTimeXApp
      appId="my-crm"
      appName="CRM"
      version="1.0.0"
    >
      <SupabaseProvider
        url={import.meta.env.VITE_SUPABASE_URL}
        anonKey={import.meta.env.VITE_SUPABASE_ANON_KEY}
        autoScope={{
          enabled: true,
          userIdField: "realtimex_user_id",
        }}
      >
        <CRM />
      </SupabaseProvider>
    </RealTimeXApp>
  );
}
```

**Database Schema Changes Required**:
```sql
-- Add RealTimeX user ID to all tables
ALTER TABLE contacts ADD COLUMN realtimex_user_id INTEGER;
ALTER TABLE companies ADD COLUMN realtimex_user_id INTEGER;
ALTER TABLE deals ADD COLUMN realtimex_user_id INTEGER;
-- etc.

-- Update RLS policies
CREATE POLICY "Users see own data" ON contacts
FOR SELECT USING (
  realtimex_user_id = current_setting('request.headers')::json->>'x-realtimex-user-id'::INTEGER
);
```

**Register in RealTimeX.ai**:
1. Start dev server: `npm run dev`
2. Go to RealTimeX.ai → Settings → Local Apps
3. Add new app:
   - Name: CRM
   - URL: http://localhost:5173
   - App ID: my-crm

**Production Deployment**:
```bash
npm run build
# Deploy dist/ to Vercel, Netlify, or any static host
# Update URL in RealTimeX.ai Local Apps settings
```

---

### 3. 🧩 Component Integration

**Perfect for**: Adding CRM to existing React app

**What you get**:
```
my-crm-component/
├── examples/
│   └── react-integration.tsx  # Example code
├── package.json               # Just the dependency
└── README.md                  # Usage instructions
```

**Usage in your app**:
```bash
npm install realtimex-crm
```

```tsx
import { CRM } from "realtimex-crm";
import "realtimex-crm/dist/style.css";

function MyCRMPage() {
  return (
    <div className="h-screen">
      <CRM title="My CRM" />
    </div>
  );
}
```

**With React Router**:
```tsx
import { CRM } from "realtimex-crm";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/crm/*" element={<CRM />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**With Next.js (App Router)**:
```tsx
// app/crm/page.tsx
"use client";

import dynamic from "next/dynamic";

const CRM = dynamic(
  () => import("realtimex-crm").then((mod) => mod.CRM),
  { ssr: false }
);

export default function CRMPage() {
  return <CRM />;
}
```

---

## Interactive Prompts

The CLI will ask:

1. **Project name**: Lowercase alphanumeric with dashes/underscores
2. **Template**: Choose from 3 options above
3. **Configure Supabase now?**: Optional
   - If yes: Enter Supabase URL and Anon Key
   - If no: Configure later via `.env` or app UI

## Supabase Configuration

### Option 1: During CLI Setup
Provide URL and key when prompted → saves to `.env`

### Option 2: Environment Variables
Create `.env` file:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Option 3: UI Configuration
Launch app → Setup wizard appears → Enter credentials

**Priority**: UI config > `.env` variables

## Database Setup

All templates need Supabase migrations applied:

1. Clone migrations from source:
   ```bash
   git clone https://github.com/therealtimex/realtimex-crm.git temp
   cp -r temp/supabase/migrations ./supabase/
   rm -rf temp
   ```

2. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

3. Link to your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_ID
   ```

4. Push migrations:
   ```bash
   supabase db push
   ```

## Common Workflows

### Standalone App → Production

```bash
# 1. Create project
npx create-realtimex-crm@latest
cd my-crm
npm install

# 2. Configure Supabase
# Add credentials to .env

# 3. Apply migrations
supabase link --project-ref XXX
supabase db push

# 4. Build
npm run build

# 5. Deploy dist/ to:
# - Vercel: vercel deploy
# - Netlify: netlify deploy
# - GitHub Pages: gh-pages -d dist
```

### Local App → RealTimeX.ai

```bash
# 1. Create Local App project
npx create-realtimex-crm@latest
# Choose "RealTimeX Local App" template

# 2. Update database schema
# Run the realtimex_user_id migrations (see LOCAL_APP.md)

# 3. Start dev server
npm run dev

# 4. Register in RealTimeX.ai
# Settings → Local Apps → Add App
# URL: http://localhost:5173

# 5. For production:
npm run build
# Deploy to static host
# Update URL in RealTimeX.ai
```

### Component → Existing App

```bash
# 1. In your existing React project
npm install realtimex-crm

# 2. Import and use
# See examples/react-integration.tsx

# 3. Configure Supabase
# Via environment variables or CRM UI
```

## Troubleshooting

### "npx: command not found"
Install Node.js 18+ and npm 9+

### "Module not found: @realtimex/app-sdk"
The package hasn't been published yet. For Local App template, remove the import and use standalone mode for now.

### Build fails with TypeScript errors
Run `npm run typecheck` to see detailed errors

### Can't connect to Supabase
- Check URL format: `https://xxxxx.supabase.co`
- Verify Anon Key is correct
- Ensure project is not paused in Supabase dashboard

### Local App not appearing in RealTimeX.ai
- Check dev server is running on correct port
- Verify App ID matches in both places
- Check browser console for CORS errors

## Advanced Customization

### Custom Data Provider

```tsx
import { CRM } from "realtimex-crm";
import { myCustomDataProvider } from "./providers";

function App() {
  return <CRM dataProvider={myCustomDataProvider} />;
}
```

### Custom Auth Provider

```tsx
import { CRM } from "realtimex-crm";
import { myAuthProvider } from "./auth";

function App() {
  return <CRM authProvider={myAuthProvider} />;
}
```

### Theme Customization

```tsx
import { CRM } from "realtimex-crm";

const myTheme = {
  palette: {
    primary: { main: "#0066cc" },
    secondary: { main: "#ff6600" },
  },
};

function App() {
  return <CRM lightTheme={myTheme} />;
}
```

## Resources

- [RealTimeX CRM Docs](https://github.com/therealtimex/realtimex-crm)
- [RealTimeX App SDK](https://github.com/therealtimex/app-sdk)
- [Supabase Docs](https://supabase.com/docs)
- [React Admin Docs](https://marmelab.com/react-admin)
- [Vite Docs](https://vitejs.dev)

## Contributing

Found a bug or have a feature request? [Open an issue](https://github.com/therealtimex/realtimex-crm/issues)

## License

MIT
