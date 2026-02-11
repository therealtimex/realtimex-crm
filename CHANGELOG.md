# Changelog

All notable changes to RealTimeX CRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.59.0] - 2026-02-11

### Added
- **Semantic Search**: Enhanced `entity_vectors` table to support variable dimensions (384, 768, 1024, 1536) for cross-model compatibility.
- **Semantic Search**: Implemented contextual embedding logic that enriches CRM entities with related data (tags, company names, task context) before vectorization.
- **Semantic Search**: Added multi-model support allowing multiple embeddings per entity (one per model) with unique constraints.
- **Semantic Search**: Added partial HNSW indexes for optimized similarity search across different vector dimensions.
- **Semantic Search**: New `match_entities` RPC function with dynamic dimension casting for fast, model-aware semantic search.
- **AI Infrastructure**: Added a 30-second timeout and improved logging for embedding requests to prevent backend hangs.

### Changed
- **Data Provider**: Refactored `contacts` and `companies` create/update flows to fetch enriched data from summary views, ensuring high-quality metadata for semantic search.
- **Data Provider**: Migrated embedding generation to an asynchronous fire-and-forget pattern to improve UI responsiveness.
- **Infrastructure**: Updated `entity_vectors` schema to use `BIGINT` for `entity_id`, aligning with the core CRM database schema.

### Fixed
- **AI Infrastructure**: Improved SDK response handling to correctly support both singular `embedding` and plural `embeddings` formats from various providers.

## [0.58.0] - 2026-02-10

### Fixed
- **Packaging**: Included the `api/` directory in the published npm package to ensure the `realtimex-crm` binary can correctly import the unified Express server in production environments.

## [0.57.0] - 2026-02-10

### Changed
- **Architecture**: Unified the server implementation by refactoring `api/server.js` to export the Express `app` instance.
- **CLI**: Updated the `realtimex-crm` binary to use the shared Express app from `api/server.js` instead of a custom HTTP server, ensuring consistent behavior between the CLI and the backend server.

## [0.56.0] - 2026-02-10

### Added
- **NPM Scripts**: Added `start` script to `package.json` which launches the Express backend server (`node api/server.js`), improving compatibility with deployment platforms like Vercel and Heroku.

## [0.55.0] - 2026-02-10

### Changed
- **Dependencies**: Moved `@realtimex/sdk` from `devDependencies` to `dependencies` to ensure it is available in production and when running via `npx`.

## [0.54.1] - 2026-02-10

### Fixed
- **Code Quality**: Fixed Prettier formatting issues in `SDKService.js` and AI components that were missed in the previous release.

## [0.54.0] - 2026-02-10

### Added
- **AI Infrastructure**: Implemented dynamic AI provider and model discovery via `SDKService`, allowing the CRM to automatically adapt to the user's RealTimeX Desktop configuration.
- **AI Infrastructure**: Added `withTimeout` wrapper to all SDK calls to ensure backend resilience and prevent hanging requests.
- **AI Infrastructure**: New intelligent fallback strategy for chat and embedding providers that prioritizes `realtimexai` but gracefully degrades to any available provider.

### Changed
- **AI Infrastructure**: Refactored `SDKService` to use a singleton-safe initialization pattern and improved connectivity logging.
- **AI Infrastructure**: Hardcoded the default API key to ensure out-of-the-box connectivity for local application environments.

## [0.53.0] - 2026-02-09

### Changed
- **AI Infrastructure**: Simplified `SDKService` initialization by consolidating permissions and restoring default API key support for more reliable developer-mode connectivity.

## [0.52.0] - 2026-02-09

### Added
- **AI Infrastructure**: Introduced "Production Mode" in `SDKService` which automatically handles App ID provisioning when running within RealTimeX Desktop.
- **AI Infrastructure**: Enhanced `/api/sdk/status` endpoint to report environment variables (RTX_APP_ID, RTX_PORT, etc.) for better debugging and observability.

### Changed
- **AI Infrastructure**: Refactored `SDKService` to cleanly differentiate between Developer Mode (using API Keys) and Production Mode (using Desktop App provisioning).

## [0.51.0] - 2026-02-09

### Added
- **Login**: Pre-filled demo credentials and "Demo Mode" badge in the login page for improved onboarding and easier evaluation.
- **AI Infrastructure**: Robust fallback strategy in `SDKService` for SDK availability checks, automatically falling back to provider verification if direct ping fails.

### Changed
- **Security**: Upgraded `multer` to `^2.0.2` to resolve known vulnerabilities in the 1.x branch.
- **Developer Tools**: Migrated ESLint configuration to the new flat config format (`eslint.config.js`) and unified rules between local and CI environments.
- **Maintenance**: Enhanced Makefile with conditional linting support (`--if-present`) for more resilient CI pipelines.

### Fixed
- **AI Infrastructure**: Improved connection logging in `SDKService` to provide clearer feedback on RealTimeX Desktop connectivity.
- **CI**: Resolved critical linting and formatting errors that were affecting the build and publication pipeline.

## [0.50.0] - 2026-02-09

### Added
- **AI Intelligence**: Introduced "LiveTerminal", a real-time, terminal-style feed of AI processing events (analysis, actions, errors) for increased transparency.
- **AI Intelligence**: Implemented "AI Trace" allowing users to inspect granular processing logs, including raw LLM prompts and responses for every automated action.
- **AI Assistant**: New context-aware floating AI Assistant that can answer questions about CRM data and perform natural language actions.
- **Daily Briefing**: Added an intelligent summary component to the Dashboard that highlights critical updates, pending tasks, and suggested focus areas.
- **Voice Capabilities**: Introduced a "Voice Note Button" with automatic transcription and AI-powered summarization for quick note-taking.
- **Voice Capabilities**: Added integrated Text-to-Speech (TTS) for AI Chat responses with support for multiple providers and auto-play options.
- **Database**: Added vector storage and search capabilities via `entity_vectors` for future semantic search and RAG features.
- **Infrastructure**: New `SDKService` and enhanced API server to support complex agentic workflows and real-time event streaming via Supabase.
- **Settings**: Comprehensive new AI Settings management for configuring model providers, agent personas, and feature visibility.

### Fixed
- **AI Chat**: Fixed thread switching in the AI tab so conversation history resets correctly per selected thread instead of showing stale messages.
- **AI Chat**: Fixed first-message thread initialization flow in both AI tab and floating assistant to prevent dropped messages when no thread exists yet.
- **AI Chat**: Fixed thread history ordering by recent activity and added chat table indexes to improve thread/message query performance under RLS.

## [0.49.2] - 2026-02-08

### Added
- **Performance**: Introduced comprehensive database indexing strategy with 11 new performance indexes (GIN/trgm for search, partial indexes for active records, and composite indexes for common filters).
- **Performance**: Added `scripts/create_indexes_concurrent.sql` for zero-downtime manual index creation in production environments.
- **Database**: Added search helper functions (`contacts_email_text`, `contacts_phone_text`) to optimize JSONB data extraction for indexing.

### Changed
- **Infrastructure**: Enhanced `migrate.sh` with better authentication error handling, support for `SUPABASE_ACCESS_TOKEN`, and automatic performance optimization feedback.
- **Data Provider**: Implemented robust upsert logic for `business_profile` (singleton table) to ensure consistent behavior across all environments.

### Fixed
- **UI Resilience**: Added automatic redirection and error notifications to all resource detail views (`CompanyShow`, `ContactShow`, `DealShow`, `InvoiceShow`, `SalesEdit`) when records are not found or have been deleted.
- **CLI**: Improved `migrate.sh` success messaging with clear "Next Steps" and direct application links.

## [0.49.1] - 2026-02-08

### Changed
- **Infrastructure**: Simplified Edge Function deployment in `migrate.sh` to use a single command, improving reliability and speed.
- **Data Provider**: Optimized `getOne` for the `sales` resource using a direct Supabase client query, matching the pattern used for other single-row/critical tables and improving reliability.

### Fixed
- **Sales UI**: Improved the user edit title to gracefully handle users with missing first or last names by falling back to their email address.
- **Logging**: Fixed a typo in a DataProvider error log (`salesCreate.error` -> `salesUpdate.error`).

## [0.49.0] - 2026-02-08

### Added
- **Design System**: Added a local facade layer under `src/components/ds/` (`ds/ui/*` and `ds/admin/*`) to decouple feature code from upstream forked component paths.
- **Design System**: Added `src/components/ds/DESIGN_SYSTEM.md` with token semantics, variant usage rules, and import/testing conventions.
- **Testing**: Added DS snapshot tests for owned `ds/ui` primitives in `src/components/ds/ui/ds-ui.snapshot.test.tsx`.

### Changed
- **Architecture**: Migrated Atomic CRM feature imports (and `App.tsx`) from direct `@/components/ui/*` and `@/components/admin/*` to facade imports `@/components/ds/ui/*` and `@/components/ds/admin/*`.
- **Code Quality**: Added ESLint guardrails to block new direct upstream imports in `src/components/atomic-crm/**`, enforcing design-system facade usage.
- **Design Tokens**: Added semantic color tokens (`success`, `warning`, `info`, `critical`, `neutral`) for both light and dark themes in `src/index.css`.
- **UI Components**: Implemented custom facade `Button` and `Badge` components in `src/components/ds/ui/` with semantic variants, enabling visual divergence from upstream primitives.
- **Status UI**: Consolidated invoice status styling into a shared `InvoiceStatusBadge` component and updated invoice/task/contact health status UIs to use semantic DS variants instead of hardcoded color classes.
- **Semantic Theming**: Migrated migration/setup/activity/settings/dashboard alert and progress surfaces to semantic DS colors, removing hardcoded warning/success/error utility colors in those areas.
- **Component Ownership**: Converted top-used facade components (`card`, `dialog`, `label`, `input`, `alert`, `tooltip`, `skeleton`, `separator`) from pass-through re-exports to locally owned DS implementations.
- **Component Ownership**: Further converted `tabs`, `select`, `dropdown-menu`, and `checkbox` DS facade modules to locally owned implementations.
- **Component Ownership**: Converted all remaining `src/components/ds/ui/*` pass-through wrappers (`accordion`, `alert-dialog`, `avatar`, `breadcrumb`, `collapsible`, `command`, `drawer`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `sheet`, `sidebar`, `sonner`, `spinner`, `switch`, `table`, `textarea`, `visually-hidden`) to locally owned DS modules.
- **Accessibility**: Added DS accessibility contract tests (`src/components/ds/ui/ds-ui.a11y.test.tsx`) to verify core semantic/role/label behavior.
- **Quality Gates**: Added DS ownership guard tests (`src/components/ds/ui/ds-ui.ownership.test.ts`) to prevent reintroducing upstream `@/components/ui/*` pass-through imports.

## [0.48.23] - 2026-02-08

### Added
- **Localization**: Comprehensive localization of the Setup Wizard across 6 languages (English, Vietnamese, French, Spanish, Japanese, and Korean).
- **Localization**: Added 30+ new translation keys covering connection modes, provisioning logs, and database installation status.
- **Localization**: Localized Supabase hosting regions in the project configuration step.

### Changed
- **Setup UX**: Increased setup card width to `max-w-3xl` to improve readability and accommodate longer localized strings.
- **Setup UX**: Removed redundant top-level headers in the Setup Wizard for a cleaner, step-focused interface.
- **Setup UX**: Improved layout of the organization list and welcome subtitle to better utilize the increased card width.
- **Migration UI**: Streamlined the "Database Migration Required" dialog for better UX:
  - Removed manual migration instructions tab (automatic migration is the primary flow)
  - Removed optional database password field (access token is the only required credential)
  - Simplified troubleshooting section by removing logout instructions
  - Added automatic page reload on successful migration completion
  - Modal now focuses exclusively on the one-click automatic migration experience

### Fixed
- **I18n**: Fixed a critical truncation issue in the Spanish translation file (`es.ts`) that caused missing content.
- **Setup Wizard**: Fixed migration progress not streaming to UI - `/api/migrate` endpoint now correctly sends Server-Sent Events (SSE) format instead of plain text.
- **Signup Page**: Added password visibility toggle (eye icon) in first user creation form to help prevent typos when entering passwords.
- **Migration Script**: Enhanced `migrate.sh` to bundle migrations directly into the build:
  - Migrations and script are now bundled into `dist/` during build
  - Script auto-detects bundled context and uses local migrations (no GitHub download)
  - **Fixes local development**: Uses uncommitted/unpushed migrations from local codebase
  - **Faster migrations**: No network latency from GitHub downloads
  - **Offline-capable**: Works without internet connection
  - **Version consistency**: Migrations always match the exact app version they were built with
  - **Works everywhere**: Local dev, npx, and RealTimeX Desktop all use bundled migrations

## [0.48.22] - 2026-02-07

### Added
- **Companies**: Added "Invoices" tab to the Company detail view, displaying related invoices and allowing creation of new ones directly from the company context.
- **Database**: Updated `companies_summary` view to include invoice counts (`nb_invoices`), enabling the new UI tab.
- **Setup**: Enhanced setup wizard with two connection modes - Quick Connect (auto-provision) and Manual Connect (existing credentials). Auto-provisioning creates and configures Supabase projects automatically via Management API with real-time progress streaming.
- **API**: Added `/api/setup/organizations` and `/api/setup/auto-provision` endpoints in `api/server.js` for Supabase project auto-provisioning workflow.

### Changed
- **Architecture**: Removed Docker and local Supabase dependencies to align with local app model (CRM runs via npx in RealTimeX Desktop with remote Supabase backend).
- **Documentation**: Updated Makefile, README.md, and AGENTS.md to use npm commands and remote-first workflow.
- **Data Provider**: Fixed `companies_summary` and other database views by using direct Supabase client queries instead of ra-supabase-core adapter for better reliability.
- **Setup UX**: Converted setup wizard from modal to full-page layout for better focus, accessibility, and interaction reliability.

### Fixed
- **Setup**: Fixed critical bug where setup wizard completion didn't properly reinitialize the app with new credentials, causing "Create first user" page to appear even when connecting to existing databases with users. **Root cause**: The global `supabase` singleton client is created once on module load and never refreshes, so even after saving new credentials to localStorage, the app continued using stale/placeholder credentials. **Fix**: Page now reloads after setup completes, forcing all modules to re-import and initialize with credentials from localStorage.
- **Setup**: Fixed critical bug where Manual Connect wasn't actually checking the remote database before showing "Migration required". Root cause was using the global Supabase singleton client (created on module load with stale/placeholder credentials) instead of creating a fresh client with the new user-provided credentials. Now creates a fresh client before checking migration status.
- **Setup**: Fixed unnecessary migration prompt for working databases with legacy schema. When database version matches app version and is initialized (has users), now skips migration even if it lacks timestamp tracking, preventing disruption to working databases.
- **Setup**: Implemented smart migration detection with three decision paths:
  - **Path 1**: Database not initialized (no users) → Always run migration (setup + backfill)
  - **Path 2**: Database on older version → Run migration to upgrade schema
  - **Path 3**: Database on same version with users → Skip migration (legacy schema OK, don't disrupt working DB)
  - This prevents unnecessary migration runs and properly handles existing databases with users already set up.
- **Setup**: Fixed non-clickable buttons and runtime errors in wizard steps due to prop name mismatches:
  - TypeStep: `onManaged`/`onManual` vs `onSelectManaged`/`onSelectManual`
  - CredentialsStep: `onSave` vs `onNext`
  - ManagedOrgStep: `selectedOrg`/`onOrgSelect`/`onProvision` vs `selectedOrgId`/`onOrgChange`/`onNext`
  - ProvisioningStep: `onRetry` vs `provisioning` prop
- **Setup**: Fixed translation function errors in WelcomeStep, TypeStep, and CredentialsStep (migrated from custom `t()` to React-Admin's `translate()`).
- **Setup**: Fixed app showing sign-up page when connecting to existing Supabase databases with users. Added migration to backfill existing `auth.users` to `sales` table, ensuring `init_state` correctly reflects database initialization status.
- **Setup**: Clear `init_state` cache after migrations complete to ensure fresh database state check.
- **Setup**: Fixed "SyntaxError: Unexpected token" error in Quick Connect flow by adding `/api/setup/organizations` endpoint to Vite development server middleware.

### Changed
- **Setup**: Implemented comprehensive Supabase API error handling in Quick Connect auto-provisioning with the same patterns as email-automator:
  - Project name conflicts: Auto-generates random suffix
  - Account limits: Displays Supabase API error messages in terminal logs
  - Timeout protection: 5-minute polling with progress updates
  - Retry functionality: "Try Again" button to go back to org selection
  - Escape hatch: "Use Manual Connect Instead" button when auto-provisioning fails, preventing users from getting stuck
  - Real-time feedback: SSE streaming with color-coded terminal logs
  - Visual feedback: Error state shows ✕ icon and "Provisioning Failed" title

## [0.48.21] - 2026-02-07

### Added
- **Dev Tools**: Added `/api/migrate` middleware in `vite.config.ts` to support database migrations directly from the UI during development.
- **Database**: Added migration `20260113201600_realtime_sdk_compatibility.sql` to align `activities` table schema with RealTime SDK (renamed columns, updated status values).
- **Database**: Added migration `20260207220256_fix_missing_sales_records.sql` to backfill missing sales records and improve user creation triggers.

### Changed
- **Auth**: Improved `authProvider` performance and stability by implementing request deduplication for user profile fetching (`getSaleFromCache`).
- **Auth**: Enhanced error logging for missing sales records.

## [0.48.20] - 2026-01-13

### Added

- **UX**: Added a specific notification for when a new user is created to clarify that an invitation email has been sent.

### Changed

- **I18n**: Updated translations for all supported languages to include the new user creation notification.

## [0.48.19] - 2026-01-13

### Changed

- **UI**: Increased the maximum width of the Changelog and Migration modals for better readability.

## [0.48.18] - 2026-01-13

### Added

- **Dev**: Added a Vite plugin to automatically synchronize the root `CHANGELOG.md` to the `public/` directory during development and builds.

## [0.48.17] - 2026-01-13

### Fixed

- **UI**: Added `saveContext.saving` check to the `SaveButton` component to prevent double submissions while a save operation is in progress.

## [0.48.16] - 2026-01-13

### Fixed

- **Activity Log**: Fixed "Deal Created" activity entries to display the salesperson's name instead of a raw ID.

## [0.48.15] - 2026-01-13

### Fixed

- **I18n**: Simplified pluralization strings for Japanese and Korean to improve UI naturalness.

## [0.48.14] - 2026-01-13

### Changed

- **Dashboard**: Refactored Deals Chart into a diverging bar chart showing a rolling window (3 months past to 6 months future).
- **Dashboard**: Deals Chart now visualizes "Lost" deals below the zero line for better pipeline contrast.
- **Dashboard**: Switched Deals Chart grouping from creation date to expected closing date to improve forecasting.

## [0.48.13] - 2026-01-13

### Added

- **Demo**: Enhanced demo seeding with realistic data (150+ deals, 200+ tasks, invoices) and CSV contact import.
- **UX**: Added skeleton loaders to Dashboard charts for better loading states.
- **Dev**: Added `scripts/check-schema.mjs` for schema verification.

### Fixed

- **Dashboard**: Fixed "in-negotiation" stage typo support in Deals chart.
- **Dashboard**: Standardized chart lookback period to 6 months.

## [0.48.12] - 2026-01-12

### Fixed

- **Tasks**: Restored missing `index` column in `tasks_summary` view, fixing the Kanban board crash.

## [0.48.11] - 2026-01-12

### Fixed

- **Performance**: Fixed lint error (unused `totalDeal` variable) preventing successful publication.

## [0.48.10] - 2026-01-12

### Added

- **UX**: The onboarding checklist is now dismissible and visible only to administrators.
- **Security**: Implemented demo mode restrictions to protect sensitive configurations (DB setup, password change, API keys, webhooks).
- **Seeding**: Updated seeding scripts with official demo credentials.

### Fixed

- **Performance**: Resolved MIME type errors for lazy-loaded modules in deployed environments.
- **UX**: Fixed missing translation keys and "Deal Pipeline" tab visibility on the dashboard.
- **Security**: Fixed potential leakage of sensitive data in seeding scripts.

## [0.48.9] - 2026-01-12

### Added

- **Infrastructure**: Transferred the demo site to a real Supabase backend for persistent data.
- **Seeding**: Added a robust demo data generator script (`seed-demo.mjs`).
- **Build**: Optimized Vite build splitting to resolve memory limits on Vercel.

### Fixed

- **I18n**: Added missing translations for the "Change Password" page.

## [0.48.8] - 2026-01-12

### Added

- **Integrations**: Added Invoice scopes and Webhook events to Settings UI.
- **Security**: Hardened PostgreSQL migrations with `SECURITY DEFINER SET search_path = public`.
- **Localization**: Localized all integration scopes and events in 6 languages.

### Fixed

- **API**: Correctly handle `email_jsonb` for Invoice recipients.
- **CI/CD**: Fixed linter errors in Edge Functions.

## [0.48.7] - 2026-01-11

### Added

- **API**: New `/v1/invoices` endpoints for full CRUD and email sending (`/invoices/{id}/send`).
- **Webhooks**: Outbound webhook support for Invoices (`invoice.created`, `invoice.updated`, `invoice.deleted`, `invoice.sent`, `invoice.status_changed`).
- **Refinement**: Improved `send-email` to support `service_role` calls.
- **Refinement**: Atomic invoice creation using a new PostgreSQL RPC (`create_invoice_with_items`).
- **Docs**: Updated API & Webhooks documentation.

## [0.48.6] - 2026-01-11

### Added

- **UI**: Added a Changelog Modal accessible by clicking the version number in the User Menu.
- **Build**: Automatically expose `CHANGELOG.md` to the frontend during development and build.

## [0.48.5] - 2026-01-11

### Added

- **Localization**: Localized "No results found" empty state messages in Tasks, Invoices, and admin data tables across all languages.

## [0.48.4] - 2026-01-11

### Added

- **Localization**: Fully localized the "Auto-Migrate" UI and the Dashboard chart labels ("Invoice Revenue", "Deal Pipeline") across all supported languages (EN, VI, FR, ES, JA, KO).

## [0.48.3] - 2026-01-11


### Fixed

- **Security**: Revoked anonymous execute permissions from the `enqueue_webhook_event` function to prevent unauthorized outbound event injection.

## [0.48.2] - 2026-01-11

### Fixed

- **Security**: Enabled Row Level Security (RLS) on the `validation_sessions` table to prevent unrestricted access.
- **Security**: Documented the "UNRESTRICTED" state of the `init_state` view as a necessary bootstrap requirement.

## [0.48.1] - 2026-01-11

### Fixed

- **Localization**: Fully localized the "Send by Email" modal across all 6 supported languages (en, es, fr, ja, ko, vi), including CC fields, labels, and placeholders.
- **Localization**: Added missing translation for the "Download PDF" action label in all languages.
- **Localization**: Resolved a syntax error in the English translation file (`en.ts`).
- **Documentation**: Corrected an image resolution error in the user documentation that was causing build failures.
- **Code Quality**: Fixed several ESLint errors related to unused variables in `InvoiceInputs.tsx` and `InvoiceShow.tsx`.
- **Formatting**: Applied Prettier formatting across the codebase to resolve linting failures.

## [0.48.0] - 2026-01-11

### Added

- **Invoices**: Full feature launch of the Invoices module with professional PDF generation, email sending, and template management.
- **Invoices**: Create, edit, and manage invoices directly linked to Contacts, Companies, and Deals.
- **Invoices**: "Send Email" functionality via Supabase Edge Functions with CC support, intelligent recipient detection, and transactional email logs.
- **Invoices**: High-fidelity PDF export using `html-to-image` with JPEG compression and Smart Light Mode enforcement.
- **Templates**: Reusable invoice templates with support for default items, notes, terms, and due days.
- **Business Profile**: New settings tab for managing organization branding (Logo, Tax ID, Address) and banking details.
- **Dashboard**: New "Revenue over time" chart and "Outstanding Invoices" widget for financial insights.
- **Localization**: Complete translation support for Invoices module across 6 languages (en, es, fr, ja, ko, vi).

### Changed

- **Database**: Optimized summary views (`deals_summary`, `contacts_summary`, etc.) using `LATERAL` joins for significantly improved performance on large datasets.
- **Settings**: Split settings page into "Profile" (personal) and "Organization" (business) tabs.

## [0.47.2] - 2026-01-09

### Fixed

- **Migration**: Added `--no-verify-jwt` to `scripts/migrate.sh` to ensure consistent edge function deployment.

### Changed

- **DevOps**: Enhanced `publish` workflow to check NPM registry status before deployment.

## [0.47.1] - 2026-01-09

### Fixed

- **Code Quality**: Resolved React "Rules of Hooks" violation in `App.tsx`
- **Linter**: Removed unused variables and imports in `DatabaseSetupGuide.tsx` and `vite.config.ts`
- **Formatting**: Applied Prettier formatting across the entire codebase
- **Dependencies**: Synchronized `package-lock.json` with recent changes

## [0.47.0] - 2026-01-09

### Added

- **Migration API**: Implemented automatic in-browser database migration feature with HTTP endpoint `/api/migrate`
- **Migration UI**: Enhanced DatabaseSetupGuide with automatic setup option, streaming logs, and collapsible manual instructions
- **Unified Server**: Created Express.js server (`api/server.js`) that serves both static files and migration API on the same port
- **Internationalization**: Added 47 new translation keys for setup wizard across all 6 supported languages (en, es, fr, ja, ko, vi)

### Changed

- **Production Server**: `npm run serve` now uses Express server instead of `serve` package, enabling both static file serving and migration API on same port
- **Port Configuration**: Default port changed to 3002 (avoiding conflict with RealTimeX desktop app on 3001), configurable via `PORT` environment variable
- **Setup Wizard**: Made setup wizard non-modal to allow interaction with other UI elements
- **Setup Wizard**: Added theme toggle and locale selector to setup and signup pages
- **Migration Context**: Added `suppressMigrationBanner` flag to prevent banner when showing full-page setup guide
- **Vite Config**: Simplified migration endpoint middleware, removed complex `expect`-based login flow
- **Edge Functions**: Modified `scripts/migrate.sh` to deploy edge functions individually for better reliability

### Security

- **Migration API**: Added comprehensive security documentation in `api/README.md`
- **Migration API**: Implemented request validation, error handling, and security warnings
- **Migration API**: Documented that migration API should only be used in trusted environments (localhost, private networks)

## [0.46.11] - 2026-01-06

### Changed

- **Localization**: Migrated pluralization in `CompanyShow` and all i18n files from `count` to `smart_count` for improved plural form handling and better compatibility with `ra-i18n-polyglot`.

## [0.46.10] - 2026-01-05

### Fixed

- **Core**: Resolved 401 Unauthorized errors when creating users or performing administrative actions by adding missing Edge Functions (`users`, `updatePassword`, `mergeContacts`, `mergeCompanies`, `postmark`) to `supabase/config.toml` with `verify_jwt = false`. These functions manage their own authentication internally.

## [0.46.9] - 2026-01-05

### Fixed

- **Localization**: Resolved an issue where migration banner and modal strings appeared as raw translation keys (e.g., `crm.migration.banner.title`) by moving the translation context provider to the root `App` component.

## [0.46.8] - 2026-01-05

### Fixed

- **Deployment**: Corrected relative paths for email templates in `supabase/config.toml` to be relative to the project root (adding the `supabase/` prefix). This fixes the "no such file or directory" error during migration.

## [0.46.7] - 2026-01-05

### Fixed

- **Deployment**: Corrected relative paths for email templates in `supabase/config.toml`. Previously, the paths were incorrectly nested, causing `supabase config push` to skip template synchronization.

## [0.46.6] - 2026-01-05

### Changed

- **Templates**: Optimized `invite` and `magic-link` email templates with simplified instructions and OTP-focused flows to improve user onboarding experience.

## [0.46.5] - 2026-01-05

### Fixed

- **Deployment**: Correctly configured email templates in `supabase/config.toml` to ensure they are synchronized during `supabase config push`. This fixes an issue where default Supabase templates were still being used after migration.

## [0.46.4] - 2026-01-05

### Changed

- **Deployment**: Updated `scripts/migrate.sh` to include `supabase config push`, automating the synchronization of project configuration (Auth, Storage, etc.) during deployment.

## [0.46.3] - 2026-01-05

### Added

- **Automation**: New `npm run supabase:configure:project` script to automatically set up auth settings (OTP, email templates) via Supabase Management API.
- **Templates**: Added branded email templates for `invite`, `confirmation`, `magic-link`, `recovery`, and `email-change` actions.
- **Configuration**: Added `verify_jwt = false` to `supabase/config.toml` for public edge functions, removing the need for manual deploy flags.

### Changed

- **Branding**: Comprehensive rebranding from "Atomic CRM" to "RealTimeX CRM" across all email templates, code comments, and documentation.
- **Deployment**: Simplified `scripts/migrate.sh` to leverage `supabase/config.toml` settings instead of hardcoded flags.

## [0.46.2] - 2026-01-05

### Fixed

- **Build**: Removed unused `visualizer` variable in `vite.demo.config.ts` that was preventing successful publishing.

## [0.46.1] - 2026-01-05

### Fixed

- **Localization**: Fixed an issue where the "Checking database connection..." message (crm.root.database_checking) was displayed as a raw translation key during app startup by wrapping the health check component with the i18n context provider.

## [0.46.0] - 2026-01-05

### Added

- **Search**: Implemented smart multi-word full-text search for companies and contacts. This allows order-independent matching (e.g., "Le Dang" matches "Trung Le" + "Dang Corp").

### Fixed

- **Search**: Normalized special characters (e.g., non-breaking hyphens, en-dashes) in search text to ensure consistent matching against standard ASCII characters.

## [0.45.11] - 2026-01-05

### Fixed

- **Localization**: Translated hardcoded "last activity", "at", and task count strings in the contact list and related components.
- **Localization**: Added missing pluralized task translations across all supported languages.

## [0.45.10] - 2026-01-04

### Changed

- **Branding**: Rebranded "Atomic CRM" to "RealTimeX CRM" in all translation files (English, French, Spanish, Vietnamese, Japanese, and Korean).

## [0.45.9] - 2026-01-04

### Added

- **UI**: Added a dynamic `AnimatedCircuitSVG` component to the authentication pages for a more engaging experience.
- **UI**: Integrated locale and theme switchers into the login and authentication pages.

### Changed

- **UI**: Improved authentication page layout with better responsiveness and theme-awareness.
- **Localization**: Localized the "Forgot password?" link and other remaining strings in authentication pages.

### Fixed

- **UI**: Enhanced `AnimatedCircuitSVG` visibility in dark mode and increased animation scale.

## [0.45.8] - 2026-01-04

### Added

- **Localization**: Added full translation support for authentication pages (`LoginPage`, `OtpLoginPage`, `ForgotPasswordPage`, `ChangePasswordPage`).
- **Localization**: Added missing localization for "Add tag", "Create new tag", "Create Company", and task "Type" labels.

### Changed

- **Localization**: Improved localization for Company resource field names and related action buttons.

### Fixed

- **Core**: Corrected several invalid translation keys and missing imports across the application.

## [0.45.7] - 2026-01-04

### Fixed

- **Code Quality**: Removed unused `locale` variables in `ActivityFeed` and `CompanyShow` to resolve linter warnings.

## [0.45.6] - 2026-01-04

### Added

- **Localization**: Added full translation support for the Sales module (`SalesList`, `SalesCreate`, `SalesEdit`).
- **Localization**: Added full translation support for the `ActivityFeed` component.
- **Localization**: Added common translation keys for record counts (e.g., "1 Contact", "2 Contacts") and activity labels.
- **Localization**: Added `sales` and `tasks` resource definitions to translation files for improved field name localization.

### Changed

- **Localization**: Improved localization for various UI elements including "Company" labels, "Create Company" buttons, "Context links", "Add tag" buttons, and task "Type" fields.

### Fixed

- **Core**: Resolved several `ReferenceError` crashes caused by missing `useTranslate` imports.
- **UI**: Fixed JSX syntax errors and linter warnings in multiple components.

## [0.45.5] - 2026-01-04

### Fixed

- **Attachments**: Ensured Excel/Office previews fill the document viewer viewport after the SheetJS switch.
- **Contacts**: Fixed a potential crash when exporting contacts with no tags.

## [0.45.4] - 2026-01-04

### Added

- **Localization**: Added full translation support for `ActivityFeed`, `DocumentViewer`, `EmailViewer`, `ImageEditorField`, and `AutocompleteCompanyInput`.
- **Localization**: Added resource-specific field translations for all supported languages, improving sort dropdowns and filter labels.

### Changed

- **Localization**: Improved relative date formatting (e.g., "X days ago", "last activity ... ago") by correctly applying the user's locale.
- **Localization**: Localized various UI elements including "New Company", "Create Company", "Add tag", "Context links", and "Type" labels in task forms.

### Fixed

- **Core**: Resolved `ReferenceError` crashes in `CompanyHealthCard` and `DealEmpty` components by adding missing `useTranslate` imports.
- **UI**: Fixed a JSX syntax error in the `TagsListEdit` component.

## [0.45.3] - 2026-01-04

### Fixed

- **Contacts**: Fixed vCard export button functionality by implementing missing `handleExport` logic.
- **Code Quality**: Resolved unused variable warnings in ContactInputs and ExportVCardButton.

## [0.45.2] - 2026-01-04

### Fixed

- **Localization**: Localized remaining hardcoded strings in Contacts, Companies, Deals, Dashboard, and Settings.
- **Localization**: Synced and translated all new keys across all supported languages (en, es, fr, ja, ko, vi).

## [0.45.1] - 2026-01-04

### Fixed

- **Localization**: Localized previously hardcoded strings in activity logs and notes components across all supported languages (en, es, fr, ja, ko, vi).

## [0.45.0] - 2026-01-04

### Added

- **Localization**: Added multilingual UI support (en, fr, es, vi, ja, ko) with per-user locale persistence.

### Changed

- **Tasks**: Localized task statuses, priorities, types, and task list labels.
- **Dashboard/Tasks**: Localized dashboard widgets, task details, and migration prompts.
- **Deals/Companies/Contacts**: Localized deal stages/categories, company sectors, and contact gender labels.

### Fixed

- **Localization**: Persisted locale updates via a database function to avoid `sales` update policy failures.
- **Localization**: Locale switching now updates immediately and missing admin-kit strings fall back to English.
- **Localization**: Filled missing React-Admin translations for ES/VI/JA/KO so no raw i18n keys appear.

### Security

- **Attachments**: Removed SheetJS `xlsx` parsing to address upstream security advisories; spreadsheet previews now use the document viewer renderer.

## [0.44.3] - 2026-01-04

## [0.44.2] - 2026-01-04

## [0.44.1] - 2026-01-04

## [0.44.0] - 2026-01-04

## [0.43.3] - 2026-01-04

## [0.43.2] - 2026-01-04

## [0.43.1] - 2026-01-04

## [0.43.0] - 2026-01-04

## [0.42.1] - 2026-01-04

## [0.42.0] - 2026-01-04

### Changed

- **Branding**: Updated the default light/dark logos to the new 24px bracket-and-stack mark.

## [0.41.0] - 2026-01-03

### Added

- **Tasks**: Added persisted Kanban ordering with drag-and-drop across columns, plus an "Other" column for unknown statuses.
- **Tasks**: Added infinite scroll for the Tasks Kanban view and removed pagination controls for that view.

### Changed

- **Tasks Kanban**: Made column headers sticky, added collapsible columns with per-user persistence, and removed the bottom loading bar to free up vertical space.
- **Layout**: Adjusted global side padding (responsive) and removed the max-width container for more horizontal real estate.
- **Tasks**: Persisted Tasks view toggle (Table/Kanban) per user and improved toggle alignment/visual contrast.
- **Tasks Table**: Added a stacked sticky header for title/actions, filters, and column labels.
- **Branding**: Updated the default light/dark logos to the new 24px bracket-and-stack mark.

## [0.40.7] - 2026-01-01

### Changed

- **Database**: Changed task `due_date` and `done_date` columns from `timestamp with time zone` to `date` type.
  - **ROOT CAUSE FIX**: Prevents timezone conversion issues for date-only values
  - User selects "Dec 31, 2025" → saves as "2025-12-31" (not "2026-01-01T08:00:00Z")
  - No time or timezone components stored, just the calendar date
  - Migration automatically drops and recreates dependent views (tasks_summary, contacts_summary, companies_summary)
  - Migration extracts date part from existing timestamps (safe conversion)
  - **BREAKING**: If you have custom code relying on time/timezone in these fields, it will need updating
- **Tasks**: Updated completed tasks filter logic to work with date-only values.
  - Changed from "completed in last 5 minutes" to "completed today"
  - Shows tasks completed today in the task list (previously tried to compare date with timestamp)

### Fixed

- **Tasks**: Fixed task edit dialog triggering unwanted navigation to detail page when clicking date picker in task list table.
  - Moved TaskEdit dialog rendering outside of table row context to prevent event bubbling
  - Edit dialog now renders at TaskListTable component level instead of inside TaskActions
  - Clicking on date picker or other form elements no longer triggers row click navigation
  - Issue only affected task list table; sidebar edit was unaffected
- **Tasks**: Fixed timezone bug causing due dates to display 1 day earlier than saved value.
  - Date-only strings (YYYY-MM-DD) now parsed as local dates instead of UTC to prevent timezone shift
  - Example: Setting "Jan 15, 2027" now correctly displays as "Jan 15, 2027" instead of "Jan 14, 2027"
  - Fixed in both task list table and task detail page for consistent date display
  - Affects all date parsing including relative dates, formatted dates, and date calculations
- **Tasks**: Improved due date labels for future tasks - all future dates now show "Due in X days" format.
  - Changed from showing formatted date (e.g., "Jan 15, 2027") for dates beyond 7 days
  - Consistent "Due in X days" format makes it easier to scan and prioritize tasks
  - Completed tasks still show formatted dates

## [0.40.6] - 2025-12-31

### Changed

- **Deals**: Converted deal detail view from dialog to full-page layout with sidebar.
  - Consistent UX pattern matching Contacts and Tasks detail pages
  - More horizontal space for content (no longer constrained by dialog max-width)
  - Sidebar displays metadata, actions, and relationships (company, contacts, assignment)
  - Action buttons (Edit, Archive/Unarchive, Delete) moved to sidebar
  - Improved readability with Card-based layout
  - Natural scrolling without modal overlay
  - Browser back button navigation support
  - Note: Create and Edit remain as dialogs on Kanban board for quick interactions

## [0.40.5] - 2025-12-31

### Fixed

- **Tasks**: Fixed task type icon alignment in task list - icons now vertically center with task titles even when text wraps to multiple lines.
- **UI**: Fixed checkbox vertical alignment in all data tables - checkboxes now properly center within table rows by matching cell padding and using flex container with full height.

## [0.40.4] - 2025-12-31

### Fixed

- **Notes**: Fixed error when adding notes to tasks by only updating `last_seen` column for resources that have it (contacts, companies), not for tasks or deals.
- **Notes**: Unified timestamp system - all notes (UI-created and automated) now use simple server-based UTC timestamps (`new Date().toISOString()`) instead of complex client-side timezone conversions, ensuring single source of truth and avoiding issues with incorrect client machine time.

## [0.40.3] - 2025-12-31

### Fixed

- **Tasks**: Synchronized task note timestamps by relying on server-side generation instead of client-side dates, ensuring consistency between UI and API actions.

## [0.40.2] - 2025-12-31

### Fixed

- **Tasks**: Robust parsing of `due_date` to handle both date-only strings and full ISO 8601 timestamps, preventing "Invalid Date" errors and timezone shifts during snooze/postpone actions.

## [0.40.0] - 2025-12-31

### Added

- **Tasks**: Automatic audit trail for quick actions with taskNotes integration.
  - Mark complete action creates note: "Task marked as complete via quick action"
  - Edit action creates note: "Task updated via quick edit action"
  - Snooze action creates note: "Due date postponed to [date]" with formatted date
  - All notes include acting user (sales_id) and ISO 8601 timestamp
  - Notes created automatically after successful task updates
  - Non-blocking implementation with silent error handling
  - Provides complete change history for task accountability

## [0.39.0] - 2025-12-31

### Added

- **Tasks**: Smart snooze/postpone button with context-aware behavior.
  - Single action button with adaptive label based on task due date
  - Shows "Snooze to Tomorrow" for overdue or today's tasks (sets due date to tomorrow)
  - Shows "Postpone by 1 Day" for future tasks (adds 1 day to current due date)
  - Intelligent logic prevents confusing UX (e.g., "snoozing" a task already due next week)
  - Available in both task list table and detail page sidebar
  - Audit trail notes reflect actual action taken ("snoozed" vs "postponed")
  - Tooltip labels update dynamically based on task due date context

## [0.38.0] - 2025-12-31

### Added

- **Tasks**: Active filter bar with removable chips for clear filter visibility.
  - Displays all active filters as badge chips above the task list
  - User-friendly labels (e.g., "My Tasks", "Contact: John Doe", "Status: Done")
  - One-click removal via X button on each chip
  - Automatically fetches and displays names for Contact, Company, and Deal filters
  - Hides when no filters are active (no visual clutter)
  - Excludes default filters (e.g., archived: false) from display
  - Supports all filter types: search, select, reference, boolean, custom
  - Updates list immediately when filters are removed

## [0.37.0] - 2025-12-31

### Added

- **Tasks**: Visual task type icons for improved scannability.
  - Each task type displays a distinctive icon (Email ✉️, Call 📞, Meeting 👥, Demo 📊, etc.)
  - Icons appear in 24px circular badges with muted background
  - Tooltips show task type name on hover for accessibility
  - Gracefully handles "None" and unknown task types (no icon shown or generic fallback)
  - Replaces bold "Type:" text prefix with clean icon representation
  - Supports all default task types: Email, Call, Meeting, Demo, Lunch, Follow-up, Thank you, Ship
  - Extensible icon mapping for custom task types

## [0.36.0] - 2025-12-31

### Added

- **Tasks**: Quick actions on row hover for efficient task management.
  - Mark complete button (✓) - Sets task status to "done" immediately
  - Edit button (✎) - Opens task edit dialog without navigating to detail page
  - Snooze button (⏰) - Postpones due date to tomorrow (+1 day)
  - Actions appear with smooth fade-in on row hover
  - Context-aware: Complete and Snooze buttons hidden for completed tasks
  - Each action includes tooltips and success notifications
  - All actions prevent row click propagation for smooth UX

## [0.35.0] - 2025-12-31

### Added

- **Tasks**: Relative due date display with smart time indicators (e.g., "Overdue by 2 days", "Due today", "Due in 3 days").
  - Shows relative time as primary text with actual date as secondary detail
  - Overdue tasks highlighted with red text and subtle warning background
  - Completed tasks (done/cancelled) show simple date format without overdue styling
  - Maintains sortability by due_date column
- **Tables**: Zebra striping for improved row tracking in all data tables.
  - Even rows have subtle background color (30% opacity)
  - Enhanced hover state (70% opacity) for better visual feedback
  - Works seamlessly in both light and dark themes

### Changed

- **Tasks**: Optimized column widths to eliminate horizontal scrolling.
  - Task column expanded to 40% (from 35%) for better readability
  - Added smart truncation to "Related To" column with max-width and tooltips
  - Reduced Priority, Status, and Assigned To columns to 9% each
  - Added overflow protection to all cells

### Fixed

- **Tables**: Eliminated horizontal scrolling by adding proper text truncation and optimized column widths.

## [0.34.1] - 2025-12-31

### Added

- **Email Validation**: Smart email validation edge function with adaptive looping and two-tier validation strategy.
  - Tier 1 (Premium): External API support (ZeroBounce, Hunter.io) for full SMTP validation
  - Tier 2 (Free): Edge-optimized validation using DNS MX records, disposable domain detection, and typo checking
  - Batch processing with automatic retry and session management
  - Self-triggering loops to validate all contacts without manual intervention
  - Configurable batch size (default: 20 emails) to prevent timeouts
  - Priority-based validation (recent contacts first)
  - Contact notes automatically created when validation status changes
  - Works with `email_jsonb` schema (validates primary email from array)
  - Port 25 aware: No SMTP checks in Edge Functions (blocked by Deno Deploy), uses DNS MX records instead

## [0.34.0] - 2025-12-31

### Added

- **Navigation**: Smart back button in header that appears on settings/admin pages and detail views.
  - Shows on /settings, /database, /integrations, /sales pages and routes ending with /show
  - Automatically hides when dialogs/modals are open
  - Responsive design (text on desktop, icon-only on mobile)
  - No-flash implementation using synchronous dialog detection

### Fixed

- **Deals**: Fixed "column deals.type does not exist" error when navigating to Deals page. Changed full-text search to use correct `category` column instead of non-existent `type` column.

### Changed

- **Documentation**: Added pre-commit linting instructions to AGENTS.md with common ESLint rules and best practices.

## [0.33.12] - 2025-12-31

## [0.33.11] - 2025-12-31

- **Fix**: Import `useWatch` and `useFormContext` from `react-hook-form` instead of `ra-core`.

## [0.33.10] - 2025-12-31

-  **Feat**: filter deal contacts by selected company for better UX

## [0.33.9] - 2025-12-31

## [0.33.8] - 2025-12-30

## [0.33.7] - 2025-12-30

## [0.33.6] - 2025-12-30

## [0.33.5] - 2025-12-30

## [0.33.4] - 2025-12-30

### Added

- **Migration**: Added `get_latest_migration_timestamp()` function to query Supabase's internal migration tracking.

### Changed

- **Migration**: Refactored migration detection to use Supabase's built-in tracking instead of custom table.

## [0.33.3] - 2025-12-30

## [0.33.2] - 2025-12-30

### Added

- **Tasks**: Tasks can now be linked to Contacts, Companies, or Deals (all optional).
- **Tasks**: Pill-based entity type selector with one-click selection (None, Contact, Company, Deal).
- **Tasks**: "Related To" column in task list displays the linked entity (Contact, Company, or Deal).
- **Tasks**: Filter tasks by Contact, Company, or Deal in the task list.
- **Database**: Database migration to add `company_id` and `deal_id` columns to tasks table with mutually exclusive constraint.
- **Database**: Updated `tasks_summary` view to include company and deal information with proper joins.

### Changed

- **Tasks**: `contact_id` field is now optional instead of required - tasks can exist without being linked to any entity.
- **Tasks**: Task creation form no longer requires selecting a contact.
- **Tasks**: Improved task form layout - pills inline with "Related To" label, entity autocomplete on separate full-width row for long names.
- **Tasks**: Removed duplicate "Create Task" header for cleaner UI and better space utilization.

## [0.33.1] - 2025-12-30

## [0.33.0] - 2025-12-30

## [0.32.1] - 2025-12-30

## [0.32.0] - 2025-12-30

## [0.31.5] - 2025-12-30

## [0.31.4] - 2025-12-30

### Added

- **Migration UX**: Progressive migration detection system with non-blocking top banner notification when database updates are needed.
- **Migration UX**: Interactive migration modal with step-by-step instructions for running database migrations via CLI.
- **Migration UX**: New `npx realtimex-crm migrate` command that automates the migration process (downloads code, links to Supabase, pushes migrations, deploys functions).
- **Migration UX**: Smart reminder system that dismisses for 24 hours if user defers migration.
- **Database**: New `schema_migrations` table to track database version and applied migrations.
- **Migration Detection**: Automatic schema version comparison on app startup to detect when migrations are needed.
- **Developer Tools**: Version check utility with semantic versioning support for detecting migration requirements.
- **Developer Tools**: Automatic version injection from package.json into app code via Vite (no manual version updates needed).
- **Developer Tools**: New `npm run migration:create` command to create migrations with auto-injected version tracking.

## [0.31.0] - 2025-12-29

### Added

- **Email Validation**: Self-adaptive email validation system with smart looping that validates all contacts regardless of database size.
- **Email Validation**: Priority-based validation that processes active contacts (recently seen) first for maximum value.
- **Email Validation**: Dual-tier validation strategy using free email-validator-js library with optional ZeroBounce API fallback for highest accuracy.
- **Email Validation**: Three-level rate limiting (email-to-email, batch-to-batch, max iterations) to prevent API throttling and SMTP blacklisting.
- **Email Validation**: Automatic ContactNotes creation when validation status changes, providing full audit trail of validation events.
- **Email Validation**: Session-based distributed locking using validation_sessions table to prevent concurrent validation loops.
- **Email Validation**: Self-adaptive scheduling that auto-restarts validation cycles when new contacts are added, minimizing validation lag.
- **LinkedIn Validation**: Edge function for validating LinkedIn profile URLs with heartbeat tracking.
- **Database**: New `validation_sessions` table for tracking validation progress with exclusion constraints to prevent overlapping loops.
- **Database**: Added `btree_gist` extension to support exclusion constraints on validation sessions.
- **Cron Jobs**: Daily automated email validation scheduled via pg_cron with configurable batch sizes and rate limits.
- **Documentation**: Comprehensive guides for email validation system, concurrency control, scheduling modes, and audit trails.

### Changed

- **Email Validation**: Consolidated v1 and v2 validation functions into single canonical implementation without version suffixes.
- **Email Validation**: Configuration moved from query parameters to JSON request body for better flexibility.
- **Contacts Schema**: Added `external_heartbeat_status`, `external_heartbeat_checked_at`, and `external_heartbeat_details` for validation tracking.

### Fixed

- **Email Validation**: Fixed critical distributed lock bug where advisory locks were session-scoped and didn't persist across HTTP requests.
- **Email Validation**: Removed invalid finally block that attempted to release advisory locks in edge functions.
- **Email Validation**: Fixed session tracking to properly complete sessions in all exit paths (success, failure, max iterations).

### Removed

- **Migrations**: Removed obsolete advisory_locks migration that caused SQLSTATE 42725 errors due to function name conflicts.

## [0.29.0] - 2025-12-29

### Added

- **Infrastructure**: Migrated activities table to standard distributed task queue schema with support for atomic task claiming, stale lock recovery, and retry tracking.
- **Database**: Added new RPC functions for distributed task processing: `claim_task_compatible`, `claim_next_task_standard`, `complete_task_standard`, and `fail_task_standard`.
- **Database**: Added fields to activities table: `old_data`, `completed_at`, `error_message`, `attempted_by`, `retry_count`, `result`, and `machine_id` for distributed worker coordination.

### Fixed

- **Deployment**: Fixed ingest-activity edge function deployment configuration to enable file upload functionality.

## [0.28.0] - 2025-12-28

### Changed

- **Attachments**: Made attachment filenames directly clickable to open the document viewer for improved UX.

## [0.27.0] - 2025-12-28

### Added

- **Attachments**: Added support for viewing .eml (email) files with full email preview including headers, HTML/plain text body, and embedded attachments.
- **Email Viewer**: Professional email client-like interface with toggle between HTML and plain text views.
- **Email Attachments**: Support for viewing and downloading embedded attachments within email files.

### Fixed

- **CI/CD**: Fixed pre-commit hook to automatically stage registry.json changes, preventing publish workflow failures.

## [0.26.0] - 2025-12-28

### Added

- **Attachments**: Built-in document viewer modal with support for multiple file formats including PDF, DOCX, XLSX, PPTX, Markdown, images, video, and audio files.
- **Security**: Added XSS protection for Excel file previews using DOMPurify sanitization.
- **Performance**: Added 50MB file size limit validation to prevent browser crashes from large files.

### Fixed

- **Attachments**: Fixed Company notes and Task notes to properly upload attachments to Supabase Storage instead of storing temporary blob URLs.
- **Security**: Fixed XSS vulnerability in XLSX HTML rendering that could allow malicious formulas to execute scripts.
- **Performance**: Fixed memory leak in DOCX file rendering where large ArrayBuffers persisted in memory after rendering.
- **Performance**: Fixed race condition when rapidly switching between different attachments.
- **Attachments**: Improved blob URL handling for file previews with proper fallback mechanisms.

## [0.24.0] - 2025-12-26

### Added

- **Activity Log**: Replaced 'Load more' button with proper pagination for better performance and usability.

## [0.23.0] - 2025-12-26

### Added

- **UI**: Extended markdown rendering support to dashboard components and activity logs.

## [0.22.0] - 2025-12-26

### Added

- **Notes**: Added markdown rendering support for notes across the application.

## [0.21.0] - 2025-12-26

### Changed

- **Database**: Standardized timestamp columns across all database tables for consistency.

## [0.20.1] - 2025-12-26

### Fixed

- **Release**: Internal version bump for deployment synchronization.

## [0.20.0] - 2025-12-26

### Added

- **Integrations**: Added task-related scopes to the API key creation dialog.

### Fixed

- **Attachments**: Fixed attachment upload functionality and made attachments clickable in the UI.

## [0.19.0] - 2025-12-26

### Added

- **API**: New dedicated `/api-v1-tasks` endpoint for full CRUD operations on tasks.

## [0.18.0] - 2025-12-26

### Added

- **API**: Added support for `company_note` and `task_note` in the activities API.

## [0.17.1] - 2025-12-26

### Fixed

- **Contact**: Restored missing `email_fts` and `phone_fts` columns in the `contacts_summary` view.

## [0.17.0] - 2025-12-26

### Added

- **Contact**: Enabled avatar editing for contacts.

## [0.16.0] - 2025-12-26

### Changed

- **Contact**: Made the contact `last_name` field optional.

## [0.15.0] - 2025-12-26

### Added

- **Company**: Exposed more company configuration fields and reorganized the qualification status location.

## [0.14.3] - 2025-12-26

### Fixed

- **Code Quality**: Resolved linting errors in `ApiKeysTab.tsx`.

## [0.14.2] - 2025-12-26

### Added

- **Integrations**: Enhanced integration tools with unmasked API key copying and webhook editing.

## [0.14.1] - 2025-12-26

### Fixed

- **Tasks**: Ensured dashboard tasks behave consistently with the tasks table view.

## [0.14.0] - 2025-12-26

### Added

- **Tasks**: Major enhancement of the tasks module including full CRUD, notes, activity log, and a dedicated summary view.

## [0.13.8] - 2025-12-25

### Fixed

- **Database**: Resolved ambiguous column reference in the heartbeat function migration.

### Changed

- **CI/CD**: Improved publish workflow reliability and added a release guide.


## [0.13.7] - 2025-12-25

### Fixed

- **Database**: Resolved "ambiguous column reference" error in company heartbeat computation function.

## [0.13.6] - 2025-12-25

### Fixed

- **Setup**: Fixed validation issue where `sb_publishable_` keys were incorrectly rejected during connection setup.

## [0.13.4] - 2025-12-25

### Added

- **Contact**: Added Contact Heartbeats (Engagement & Validation) to contact sidebar and list filters.

## [0.13.2] - 2025-12-25

### Added

- **Company**: Added Company Health card for company show page.

## [0.9.7] - 2025-12-24

### Fixed

- **Release**: Version bump to retry npm publishing with refreshed token.

## [0.9.5] - 2025-12-24

### Fixed

- **Release**: Version bump to resolve npm publishing mismatch.

## [0.9.3] - 2025-12-24

### Fixed

- **Webhook System**: Fixed "function enqueue_webhook_event does not exist" error by explicitly defining the function in the public schema and updating triggers to use the fully qualified name.

## [0.9.0] - 2025-12-19

### Added

- **API Endpoints**: REST API for programmatic access to CRM data
  - `GET/POST/PATCH/DELETE /v1/contacts/{id}` - Contact management
  - `GET/POST/PATCH/DELETE /v1/companies/{id}` - Company management
  - `GET/POST/PATCH/DELETE /v1/deals/{id}` - Deal management
  - `POST /v1/activities` - Create notes and tasks
- **API Key Management**: UI for creating and managing API keys with scopes
  - Secure API key generation with SHA-256 hashing
  - Scope-based authorization (contacts:read, contacts:write, etc.)
  - API key expiration and usage tracking
- **Webhook System**: Event notifications for external integrations
  - CRUD events: contact.created, company.updated, deal.deleted, etc.
  - Business events: deal.won, deal.lost, task.completed, etc.
  - Webhook management UI with event selection
  - Async webhook delivery with retry logic and exponential backoff
  - HMAC-SHA256 signature verification
- **Integrations Page**: New `/integrations` route with tabs for API Keys and Webhooks
- **Rate Limiting**: 100 requests per minute per API key with standard rate limit headers
- **API Logging**: Request logs with endpoint, method, status code, response time, and errors
- **Documentation**:
  - `docs/API.md` - Complete API reference with examples
  - `docs/DEPLOYMENT.md` - Deployment guide for new database instances

### Technical Details

- **Database Migrations**:
  - `20251219120000_api_integrations.sql` - Tables for API keys, webhooks, logs, and queue
  - `20251219120100_webhook_triggers.sql` - Database triggers for webhook events
  - `20251219120200_webhook_cron.sql` - Cron job for webhook dispatcher
- **Edge Functions**: 5 new Supabase Edge Functions for API endpoints and webhook delivery
- **Frontend Components**: IntegrationsPage, ApiKeysTab, WebhooksTab, CreateApiKeyDialog
- **Shared Utilities**: API key authentication, rate limiting, webhook signatures

## [0.8.0] - 2025-12-19

### Changed

- Improved navigation in authentication pages

## [0.7.14] - 2025-12-XX

### Added

- Navigate directly to change password page from settings

## [0.7.12] - 2025-12-XX

### Fixed

- Use fixed position for header and adjust main content padding
