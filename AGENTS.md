# AGENTS.md

## Project Overview

RealTimeX CRM is a full-featured CRM built with React, shadcn-admin-kit, and Supabase. It provides contact management, task tracking, notes with attachments, email capture, deal management with a Kanban board, and a built-in document viewer for multiple file formats.

## Development Commands

### Prerequisites

Before starting development, ensure you have:
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

**Required NPX packages** (installed automatically via package.json):
- `supabase` - Supabase CLI for database management (developers only)
- `serve` - Static file server for production preview
- `shadcn` - UI component registry builder

### Setup

**For End Users (Recommended):**
```bash
npm install          # Install dependencies
npm run dev          # Start app (configure database via setup wizard)
```

**For Developers:**
```bash
npm install          # Install dependencies
# Create a free project at supabase.com
# Configure .env.development.local with your credentials
npm run dev
```

**First-Time Setup:**
On first launch, if no Supabase configuration is found, a setup wizard will automatically appear. You can either:
1. **Enter existing credentials**: If you already have a Supabase project
2. **Configure via Settings**: Navigate to Settings → Database after closing the wizard

The app supports two configuration methods:
- **UI Configuration** (recommended for end users): Configure via the setup wizard or Settings page
- **Environment Variables** (recommended for developers): Use `.env` or `.env.production.local` files

Priority: UI configuration overrides environment variables.

### Testing and Code Quality

```bash
npm test              # Run unit tests (vitest)
npm run typecheck     # Run TypeScript type checking
npm run lint          # Run ESLint and Prettier checks
```

**IMPORTANT: Always run before committing:**
```bash
npm run typecheck && npm run lint
```

This ensures:
- No TypeScript type errors
- No ESLint violations (unused variables, incorrect imports, etc.)
- Code formatting is consistent with Prettier

**Common ESLint Rules:**
- Unused variables must be prefixed with `_` (e.g., `const { unused: _unused, ...rest } = data`)
- Imports must be used or removed
- Console.log statements should be removed before committing (except in error handlers)

### Building

```bash
npm run build         # Build production bundle (runs tsc + vite build)
npm run serve         # Serve production build locally
```

### Database Management

**For End Users:**
- Use the in-app migration tool: Settings → Database → Run Migration
- No CLI required - migrations run directly in the browser

**For Developers:**
```bash
npx supabase migration new <name>  # Create new migration
npx supabase db push                # Push migrations to remote database
```

**Automated Remote Setup:**
```bash
npm run supabase:remote:init       # Create and configure remote Supabase project
```

This script automates:
1. Supabase CLI login
2. Project creation with generated password
3. Waiting for project to be ready
4. Linking to remote project
5. Pushing migrations
6. Writing `.env.production.local` with credentials

### Automatic Migration API

The CRM includes an in-browser automatic migration feature that allows users to set up their database without using the command line.

**How it works:**
- When the app detects missing database tables, it shows a `DatabaseSetupGuide` component
- Users can provide their Supabase project ID and access token
- The migration runs automatically via the `/api/migrate` HTTP endpoint
- Progress is streamed in real-time to the browser

**Development Mode:**
```bash
npm run dev
# Migration endpoint available at http://localhost:5173/api/migrate (via Vite middleware)
```

**Production Mode:**
```bash
npm run serve
# Serves both static files AND migration API on the same port
# Default: http://localhost:3002 (configurable via PORT env variable)
# Avoids port 3001 conflict with RealTimeX desktop app
```

**Custom Port:**
```bash
# For RealTimeX desktop app integration, use the same PORT variable
PORT=5000 npm run serve
# Both frontend and /api/migrate available at http://localhost:5000
```

**Security Considerations:**
- ⚠️ The migration API should ONLY be used in trusted environments (localhost, private networks)
- Never expose the migration API to the public internet without authentication
- In production, use HTTPS, IP whitelisting, rate limiting, and authentication
- See `api/README.md` for detailed security guidelines

**Alternative Migration Methods:**
```bash
# Manual CLI migration (most secure)
npx realtimex-crm-migrate

# Direct script execution
bash scripts/migrate.sh

# Supabase CLI
npx supabase db push
```

### Registry (Shadcn Components)

```bash
npm run registry:gen    # Generate registry.json (runs automatically on pre-commit)
npm run registry:build  # Build Shadcn registry
```

## Architecture

### Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: React Router v7
- **Data Fetching**: React Query (TanStack Query)
- **Forms**: React Hook Form
- **Application Logic**: shadcn-admin-kit + ra-core (react-admin headless)
- **UI Components**: Shadcn UI + Radix UI
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + REST API + Auth + Storage + Edge Functions)
- **Testing**: Vitest

### DS Compliance Rules (Agents + Humans)

Apply these rules for any UI change:

1. Import primitives from `@/components/ds/*` only.
2. Do not import `@/components/ui/*` or `@/components/admin/*` in feature code.
3. Prefer semantic variants (`success`, `warning`, `info`, `critical`, `neutral`) over raw palette classes.
4. Prefer shared status components over repeated inline status color maps.
5. If custom styling is required, use token-backed utilities (`text-critical`, `bg-info/10`) instead of palette utilities (`text-red-600`, `bg-blue-50`).
6. Keep DS modules owned (no pass-through re-export wrappers).
7. Update DS snapshot tests intentionally when DS primitive visuals change.

Reference:
- `src/components/ds/DESIGN_SYSTEM.md`
- `src/components/ds/ui/ds-ui.snapshot.test.tsx`
- `src/components/ds/ui/ds-ui.a11y.test.tsx`
- `src/components/ds/ui/ds-ui.ownership.test.ts`

### Authentication & Authorization Architecture

#### User Management System

RealTimeX CRM uses a two-table system for user management:

1. **`auth.users`** (Supabase's built-in authentication table)
   - Stores authentication credentials and JWT tokens
   - Managed by Supabase Auth service
   - Supports multiple auth providers (email/password, OAuth, SAML, etc.)

2. **`sales`** (CRM's user table)
   - Stores CRM-specific user information (id, first_name, last_name, email, avatar, administrator, disabled)
   - Links to `auth.users` via `user_id` UUID foreign key
   - Automatically synced via database triggers when users are created/updated in `auth.users`

**Automatic Sync Triggers** (see `supabase/migrations/20240730075425_init_triggers.sql`):
- `handle_new_user()`: Creates `sales` record when user signs up
- `handle_update_user()`: Updates `sales` record when user profile changes
- First user becomes administrator automatically

#### Token-Based Database Access

All database queries use **JWT-based authentication**:

```
Login Flow (one-time):
User → Auth Provider → Supabase Auth → Supabase JWT + Refresh Token
                                     ↓
                              Stored in localStorage

Query Flow (every request):
App → Read JWT from localStorage → Attach to Authorization header → Database
```

**Key Points:**
- Token exchange happens **only once** at login (not per query)
- JWT is cached locally and auto-attached to all requests
- Supabase client handles automatic token refresh before expiry (default: 1 hour)
- All queries include user's JWT, enabling Row Level Security (RLS)

#### Data Ownership Tracking

Ownership is tracked via `sales_id` foreign key fields:
- `contacts.sales_id` → who owns the contact
- `companies.sales_id` → who owns the company
- `deals.sales_id` → who owns the deal
- `contactNotes.sales_id` → who created the note
- `dealNotes.sales_id` → who created the deal note
- `tasks.sales_id` → who is assigned the task

#### Row Level Security (RLS)

All tables have RLS enabled but currently use **permissive policies** (`using (true)`):
- Any authenticated user can read/write all data
- `sales_id` tracks ownership but doesn't enforce it at database level
- Policies can be made restrictive to implement data isolation (see migrations for examples)

#### Authentication Methods

RealTimeX CRM supports multiple authentication methods:

1. **Email/Password Login** (default)
   - Traditional username/password authentication
   - Users log in at `/` with email and password credentials

2. **Email OTP (One-Time Password) Login**
   - Passwordless authentication using 6-digit codes sent via email
   - Ideal for local-first/CLI applications where `localhost` redirects may not work
   - Users log in at `/otp-login` by entering email → receiving code → entering code
   - **Benefits over magic links:**
     - No localhost dependency
     - Users stay in the app (no browser switching)
     - Works offline (code can be entered manually)
   - **Setup required:** Update Supabase email template to show `{{ .Token }}` instead of links
   - **Documentation:** See `docs/OTP_AUTHENTICATION_SETUP.md` for detailed setup guide

3. **Password Reset via OTP**
   - Forgot password flow uses OTP instead of magic links
   - User enters email → receives 6-digit code → verifies code → sets new password
   - Accessed at `/forgot-password`

**Routes:**
- `/` - Email/password login
- `/otp-login` - OTP-based login
- `/forgot-password` - Password reset via OTP
- `/change-password` - Set new password (after OTP verification)
- `/set-password` - Set password via token (legacy magic link flow)

#### Adding External Auth Providers

**Option 1: OAuth Providers (Keycloak, Azure AD, etc.)**

To add OAuth providers:

1. **Configure provider in Supabase Dashboard** (Settings → Auth → Providers)
2. Supabase acts as auth broker:
   - External provider authenticates user
   - Supabase exchanges OAuth token for Supabase JWT
   - Triggers automatically create/update `sales` record
3. Include custom metadata in OAuth response to populate `sales` fields
4. No code changes needed - existing RLS policies work with `auth.uid()`

**Option 2: Email OTP Authentication (Recommended for Local/CLI Apps)**

Email OTP is already implemented. To enable:

1. Update Supabase email template (Authentication → Email Templates → Magic Link):
   ```html
   <h1>{{ .Token }}</h1>
   <p>Enter this code in the application to continue.</p>
   ```
2. Users can log in at `/otp-login` route
3. See `docs/OTP_QUICK_REFERENCE.md` for setup checklist

**Option 3: RealTimeX App SDK Integration**

To integrate RealTimeX CRM as a Local App within RealTimeX.ai:

The RealTimeX App SDK (`@realtimex/app-sdk`) provides postMessage-based authentication for apps embedded in RealTimeX. This requires replacing Supabase Auth with RealTimeX's authentication system.

**Authentication Flow:**
```
User → RealTimeX Platform (authenticates) → postMessage → Local App (RealTimeX CRM)
                                                           ↓
                                                    Receives user object
                                                           ↓
                                                    Custom Supabase queries with user headers
```

**Key Differences from Standard Supabase Auth:**
1. **No Supabase JWT**: User authenticates with RealTimeX platform, not Supabase
2. **User headers instead of JWT**: Queries include `X-RealTimeX-User-Id`, `X-RealTimeX-User-Email`, `X-RealTimeX-User-Role`
3. **RLS via headers**: Database policies check custom headers instead of `auth.uid()`
4. **No auth.users table**: User management handled by RealTimeX platform

**Integration Steps:**

1. **Wrap app with RealTimeXApp** (replaces current auth):
   ```tsx
   import { RealTimeXApp } from '@realtimex/app-sdk';
   import { SupabaseProvider } from '@realtimex/app-sdk/providers/supabase';

   function App() {
     return (
       <RealTimeXApp
         appId="atomic-crm"
         appName="RealTimeX CRM"
         version="1.0.0"
       >
         <SupabaseProvider
           url={import.meta.env.VITE_SUPABASE_URL}
           anonKey={import.meta.env.VITE_SUPABASE_ANON_KEY}
           autoScope={{
             enabled: true,
             userIdField: 'realtimex_user_id'
           }}
         >
           <CRM {...config} />
         </SupabaseProvider>
       </RealTimeXApp>
     );
   }
   ```

2. **Modify database schema** to use `realtimex_user_id` instead of `sales_id`:
   ```sql
   -- Add RealTimeX user ID to all tables
   ALTER TABLE contacts ADD COLUMN realtimex_user_id INTEGER;
   ALTER TABLE companies ADD COLUMN realtimex_user_id INTEGER;
   ALTER TABLE deals ADD COLUMN realtimex_user_id INTEGER;
   -- etc.

   -- Create indexes
   CREATE INDEX idx_contacts_rtx_user ON contacts(realtimex_user_id);
   -- etc.
   ```

3. **Replace RLS policies** to use header-based authentication:
   ```sql
   -- Example: Users see only their data
   CREATE POLICY "Users see own contacts" ON contacts
   FOR SELECT USING (
     realtimex_user_id = current_setting('request.headers')::json->>'x-realtimex-user-id'::INTEGER
   );
   ```

4. **Remove Supabase Auth dependencies**:
   - Remove `supabaseAuthProvider` usage
   - Remove `auth.users` table sync triggers
   - Remove `sales` table (or repurpose for RealTimeX user sync)

5. **Use RealTimeX SDK hooks** instead of Supabase auth:
   ```tsx
   // Old:
   import { useGetIdentity } from 'ra-core';
   const { data: identity } = useGetIdentity();

   // New:
   import { useRealTimeXUser } from '@realtimex/app-sdk';
   const user = useRealTimeXUser();
   ```

**Parent-Child Architecture:**

For RealTimeX.ai's parent-child user model, the RealTimeX platform handles the hierarchy. The Local App receives a flat user object and relies on RealTimeX RLS policies for data scoping:

- Child users: `realtimex_user_id` matches their own ID
- Parent users: Can see children's data via platform-level RLS (not app-level)
- The Local App doesn't need to implement parent-child logic directly

### Directory Structure

```
src/
├── components/
│   ├── admin/              # Shadcn Admin Kit components (mutable dependency)
│   ├── atomic-crm/         # Main CRM application code (~15,000 LOC)
│   │   ├── activity/       # Activity logs
│   │   ├── companies/      # Company management
│   │   ├── contacts/       # Contact management (includes CSV import/export)
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── deals/          # Deal pipeline (Kanban)
│   │   ├── filters/        # List filters
│   │   ├── layout/         # App layout components
│   │   ├── login/          # Authentication pages
│   │   ├── misc/           # Shared utilities (includes DocumentViewer and EmailViewer)
│   │   ├── notes/          # Note management with attachment support
│   │   ├── providers/      # Data providers (Supabase)
│   │   ├── root/           # Root CRM component
│   │   ├── sales/          # Sales team management
│   │   ├── settings/       # Settings page
│   │   ├── simple-list/    # List components
│   │   ├── tags/           # Tag management
│   │   └── tasks/          # Task management
│   ├── supabase/           # Supabase-specific auth components
│   └── ui/                 # Shadcn UI components (mutable dependency)
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
└── App.tsx                 # Application entry point

supabase/
├── functions/              # Edge functions (user management, inbound email)
└── migrations/             # Database migrations
```

### Key Architecture Patterns

For more details, check out the doc/src/content/docs/developers/architecture-choices.mdx document.

#### Mutable Dependencies

The codebase includes mutable dependencies that should be modified directly if needed:
- `src/components/admin/`: Shadcn Admin Kit framework code
- `src/components/ui/`: Shadcn UI components

#### Configuration via `<CRM>` Component

The `src/App.tsx` file renders the `<CRM>` component, which accepts props for domain-specific configuration:
- `contactGender`: Gender options
- `companySectors`: Company industry sectors
- `dealCategories`, `dealStages`, `dealPipelineStatuses`: Deal configuration
- `noteStatuses`: Note status options with colors
- `taskTypes`: Task type options
- `logo`, `title`: Branding
- `lightTheme`, `darkTheme`: Theme customization
- `disableTelemetry`: Opt-out of anonymous usage tracking

#### Database Views

Complex queries are handled via database views to simplify frontend code and reduce HTTP overhead. For example, `contacts_summary` provides aggregated contact data including task counts.

#### Database Triggers

User data syncs between Supabase's `auth.users` table and the CRM's `sales` table via triggers (see `supabase/migrations/20240730075425_init_triggers.sql`).

#### Edge Functions

Located in `supabase/functions/`:
- User management (creating/updating users, account disabling)
- Inbound email webhook processing

#### Document Viewer

The CRM includes a built-in document viewer (`src/components/atomic-crm/misc/DocumentViewer.tsx`) that provides in-app preview for note attachments.

**Supported Formats:**
- **Documents**: PDF, DOCX, XLSX (with multi-sheet support), PPTX, Markdown
- **Images**: PNG, JPG, GIF, WebP
- **Media**: MP4 (video), MP3/WAV/OGG (audio)
- **Email**: EML files with full email preview

**Email Viewer Features** (`src/components/atomic-crm/misc/EmailViewer.tsx`):
- Email headers display (From, To, CC, Subject, Date)
- HTML and plain text body rendering with DOMPurify sanitization
- Toggle between HTML and plain text views
- Embedded attachment listing with download functionality
- Professional email client-like interface

**Security Features:**
- XSS protection using DOMPurify for HTML sanitization (Excel and email files)
- 50MB file size limit to prevent browser crashes
- Race condition prevention with AbortController
- Memory leak prevention (DOCX buffer cleanup)

**Dependencies:**
- `@cyntler/react-doc-viewer` - Multi-format document rendering
- `docx-preview` - DOCX file rendering
- `xlsx` - Excel file parsing and rendering
- `@kandiforge/pptx-renderer` - PowerPoint file rendering
- `postal-mime` - EML email file parsing
- `dompurify` - HTML sanitization for security

#### Data Providers

The Supabase data provider handles all data access against the PostgreSQL backend.

**Singleton Table Pattern:**

For singleton tables (tables with only one row, like `business_profile`), the Supabase data provider uses direct Supabase client queries instead of the `ra-supabase-core` adapter. This is because:
- The adapter has issues with singleton tables where response formats don't match react-admin expectations
- Direct queries with `.maybeSingle()` handle edge cases more reliably
- Auto-creation of missing records ensures the app works even if migrations haven't been run

Implementation in `src/components/atomic-crm/providers/supabase/dataProvider.ts`:
```typescript
if (resource === "business_profile") {
  const { data, error } = await supabase
    .from("business_profile")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) {
    // Auto-create default record if missing
  }

  return { data };
}
```

This pattern is production-ready and is the recommended approach for singleton tables in Supabase + react-admin applications.

#### Filter Syntax

List filters follow the `ra-data-postgrest` convention with operator concatenation: `field_name@operator` (e.g., `first_name@eq`).

## Development Workflows

### Path Aliases

The project uses TypeScript path aliases configured in `tsconfig.json` and `components.json`:
- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/hooks` → `src/hooks`
- `@/components/ui` → `src/components/ui`

### Environment Variables

Environment variables are loaded by Vite's `loadEnv` function:

- **Development**: `.env` (base) and `.env.development` are loaded
- **Production**: `.env` (base) and `.env.production.local` are loaded
- Required variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

The `vite.config.ts` uses `loadEnv(mode, process.cwd(), '')` to ensure environment variables are available during builds. In production mode, env vars are baked into the bundle via the `define` option.

### Adding Custom Fields

When modifying contact or company data structures:
1. Create a migration: `npx supabase migration new <name>`
2. Update the sample CSV: `src/components/atomic-crm/contacts/contacts_export.csv`
3. Update the import function: `src/components/atomic-crm/contacts/useContactImport.tsx`
4. Don't forget to update the views
6. Don't forget the export functions
7. Don't forget the contact merge logic

### Implementing Parent-Child or Multi-Tenant Architecture

To add hierarchical user relationships (e.g., parent accounts with child users):

1. **Add parent-child fields to `sales` table**:
   ```sql
   ALTER TABLE sales ADD COLUMN parent_id bigint REFERENCES sales(id);
   ALTER TABLE sales ADD COLUMN account_type text;
   CREATE INDEX idx_sales_parent_id ON sales(parent_id);
   ```

2. **Update `handle_new_user()` trigger** to extract parent relationship from OAuth metadata

3. **Implement restrictive RLS policies** for data isolation:
   ```sql
   -- Example: Children see only their data, parents see children's data
   CREATE POLICY "Users see own data" ON contacts
   USING (sales_id = (SELECT id FROM sales WHERE user_id = auth.uid()));

   CREATE POLICY "Parents see children data" ON contacts
   USING (sales_id IN (
     SELECT id FROM sales WHERE parent_id = (
       SELECT id FROM sales WHERE user_id = auth.uid()
     )
   ));
   ```

4. **Drop existing permissive policies** (`using (true)`) before adding restrictive ones

### Running with Test Data

Import `test-data/contacts.csv` via the Contacts page → Import button.

### Updating CHANGELOG.md

The project follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format for tracking changes. **Always update CHANGELOG.md when making significant changes.**

#### When to Update

Update the CHANGELOG for:
- **Added**: New features, components, or capabilities
- **Changed**: Changes to existing functionality
- **Fixed**: Bug fixes and corrections
- **Removed**: Removed features or deprecated functionality
- **Security**: Security fixes and improvements

#### How to Update

1. **During development**: Add entries under the `[Unreleased]` section
   ```markdown
   ## [Unreleased]

   ### Added
   - **Component**: Description of new feature

   ### Fixed
   - **Area**: Description of bug fix
   ```

2. **Before release**: Move `[Unreleased]` entries to a new version section
   ```markdown
   ## [Unreleased]

   ## [X.Y.Z] - YYYY-MM-DD

   ### Added
   - **Component**: Description of new feature
   ```

3. **Version bumping**: Update `package.json` version to match the changelog version

#### Best Practices

- Use clear, user-facing language (not technical implementation details)
- Start entries with the affected component/area (e.g., "**Attachments**:", "**Security**:")
- Be concise but descriptive
- Group related changes together
- Always include the category (Added/Changed/Fixed/etc.)

#### Example

```markdown
## [Unreleased]

## [0.27.0] - 2025-12-28

### Added

- **Attachments**: Added support for viewing .eml (email) files with full email preview.
- **Email Viewer**: Professional email client-like interface with HTML/text toggle.

### Fixed

- **CI/CD**: Fixed pre-commit hook to automatically stage registry.json changes.
```

### Git Hooks

**Pre-commit hook automatically:**
1. Runs `npm run registry:gen` to update `registry.json`
2. Stages registry changes for the commit

**Note:** The pre-commit hook does NOT run linter/typecheck automatically. You must run these manually before committing:
```bash
npm run typecheck && npm run lint
```

This is intentional to keep commits fast. CI/CD will catch linting errors, but it's faster to catch them locally first.

### Accessing Services During Development

**Local App:**
- Frontend: http://localhost:5173/ (development server)

**Remote Supabase (your project):**
- Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
- REST API: https://YOUR_PROJECT_ID.supabase.co/rest/v1/
- Storage: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage/buckets

## Important Notes

- The codebase is intentionally small (~15,000 LOC in `src/components/atomic-crm`) for easy customization
- Modify files in `src/components/admin` and `src/components/ui` directly - they are meant to be customized
- Unit tests can be added in the `src/` directory (test files are named `*.test.ts` or `*.test.tsx`)
- User deletion is not supported to avoid data loss; use account disabling instead

## Supabase Configuration

### "Bring Your Own Database" UX

RealTimeX CRM supports a user-friendly "Bring Your Own API Key" experience:

**For End Users:**
1. Launch the app → Setup wizard appears automatically
2. Enter Supabase URL and Anon Key (or create new project at supabase.com)
3. App validates connection and saves configuration to localStorage
4. Configuration persists across sessions

**For Developers:**
Use environment variables in `.env` or `.env.production.local`:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Configuration Management:**
- Settings → Database: View connection status, change credentials, or clear configuration
- UI configuration is stored in `localStorage` under key `realtimex_crm_supabase_config`
- Priority: `localStorage` > environment variables

**Technical Details:**
- Config utilities: `src/lib/supabase-config.ts`
- Setup wizard: `src/components/atomic-crm/setup/SupabaseSetupWizard.tsx`
- Settings page: `src/components/atomic-crm/settings/DatabaseSettings.tsx`
- Supabase client: `src/components/atomic-crm/providers/supabase/supabase.ts` (reads from config)
