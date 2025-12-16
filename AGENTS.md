# AGENTS.md

## Project Overview

Atomic CRM is a full-featured CRM built with React, shadcn-admin-kit, and Supabase. It provides contact management, task tracking, notes, email capture, and deal management with a Kanban board.

## Development Commands

### Setup
```bash
make install          # Install dependencies (frontend, backend, local Supabase)
make start            # Start full stack with real API (Supabase + Vite dev server)
make stop             # Stop the stack
make start-demo       # Start full-stack with FakeRest data provider
```

### Testing and Code Quality

```bash
make test             # Run unit tests (vitest)
make typecheck        # Run TypeScript type checking
make lint             # Run ESLint and Prettier checks
```

### Building

```bash
make build            # Build production bundle (runs tsc + vite build)
```

### Database Management

```bash
npx supabase migration new <name>  # Create new migration
npx supabase migration up          # Apply migrations locally
npx supabase db push               # Push migrations to remote
npx supabase db reset              # Reset local database (destructive)
```

### Registry (Shadcn Components)

```bash
make registry-gen     # Generate registry.json (runs automatically on pre-commit)
make registry-build   # Build Shadcn registry
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

### Authentication & Authorization Architecture

#### User Management System

Atomic CRM uses a two-table system for user management:

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

**Option 2: RealTimeX App SDK Integration**

To integrate Atomic CRM as a Local App within RealTimeX.ai:

The RealTimeX App SDK (`@realtimex/app-sdk`) provides postMessage-based authentication for apps embedded in RealTimeX. This requires replacing Supabase Auth with RealTimeX's authentication system.

**Authentication Flow:**
```
User → RealTimeX Platform (authenticates) → postMessage → Local App (Atomic CRM)
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
         appName="Atomic CRM"
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
│   │   ├── misc/           # Shared utilities
│   │   ├── notes/          # Note management
│   │   ├── providers/      # Data providers (Supabase + FakeRest)
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

#### Data Providers

Two data providers are available:
1. **Supabase** (default): Production backend using PostgreSQL
2. **FakeRest**: In-browser fake API for development/demos, resets on page reload

When using FakeRest, database views are emulated in the frontend. Test data generators are in `src/components/atomic-crm/providers/fakerest/dataGenerator/`.

#### Filter Syntax

List filters follow the `ra-data-postgrest` convention with operator concatenation: `field_name@operator` (e.g., `first_name@eq`). The FakeRest adapter maps these to FakeRest syntax at runtime.

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
4. If using FakeRest, update data generators in `src/components/atomic-crm/providers/fakerest/dataGenerator/`
5. Don't forget to update the views
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

### Git Hooks

- Pre-commit: Automatically runs `make registry-gen` to update `registry.json`

### Accessing Local Services During Development

- Frontend: http://localhost:5173/
- Supabase Dashboard: http://localhost:54323/
- REST API: http://127.0.0.1:54321
- Storage (attachments): http://localhost:54323/project/default/storage/buckets/attachments
- Inbucket (email testing): http://localhost:54324/

## Important Notes

- The codebase is intentionally small (~15,000 LOC in `src/components/atomic-crm`) for easy customization
- Modify files in `src/components/admin` and `src/components/ui` directly - they are meant to be customized
- Unit tests can be added in the `src/` directory (test files are named `*.test.ts` or `*.test.tsx`)
- User deletion is not supported to avoid data loss; use account disabling instead
- Filter operators must be supported by the `supabaseAdapter` when using FakeRest
