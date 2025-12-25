# Changelog

All notable changes to Atomic CRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
