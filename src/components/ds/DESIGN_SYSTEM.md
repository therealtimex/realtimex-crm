# Design System Specification

This document defines the local design system conventions for RealTimeX CRM.

## Agent Quick Rules

Use these rules for coding agents (Codex, Claude, Gemini) and follow them in order:

1. Import UI/Admin primitives only from `@/components/ds/*`.
2. Never import `@/components/ui/*` or `@/components/admin/*` in feature code.
3. Prefer semantic variants (`success`, `warning`, `info`, `critical`, `neutral`) over raw color classes.
4. Prefer shared status components over inline status color maps.
5. If custom styling is needed, use token-backed utilities (`text-critical`, `bg-info/10`) not palette utilities (`text-red-600`, `bg-blue-50`).
6. Any DS primitive style change must update DS snapshots intentionally.
7. Do not bypass ownership guardrails; DS modules must not become pass-through wrappers.

Quick examples:

- Good: `import { Badge } from "@/components/ds/ui/badge";`
- Bad: `import { Badge } from "@/components/ui/badge";`
- Good: `<Badge variant="critical">Failed</Badge>`
- Bad: `<Badge className="bg-red-100 text-red-800">Failed</Badge>`

## Scope

- Source of truth for app-facing primitives: `src/components/ds/`
- Feature code must import from `@/components/ds/*`
- Upstream forked primitives under `src/components/ui` and `src/components/admin` are treated as implementation dependencies, not direct app API.

## Import Rules

- Allowed in feature code:
  - `@/components/ds/ui/*`
  - `@/components/ds/admin/*`
- Not allowed in feature code:
  - `@/components/ui/*`
  - `@/components/admin/*`

The restriction is enforced in `eslint.config.js`.

## Tokens

### Core semantic tokens

Defined in `src/index.css`:

- `--success`, `--success-foreground`
- `--warning`, `--warning-foreground`
- `--info`, `--info-foreground`
- `--critical`, `--critical-foreground`
- `--neutral`, `--neutral-foreground`

Mapped for Tailwind usage:

- `text-success`, `bg-success`, `border-success`, etc.
- `text-warning`, `bg-warning`, `border-warning`, etc.
- `text-info`, `bg-info`, `border-info`, etc.
- `text-critical`, `bg-critical`, `border-critical`, etc.
- `text-neutral`, `bg-neutral`, `border-neutral`, etc.

## Component Semantics

### Status meaning

- `success`: Completed/healthy/positive state
- `warning`: Risk/attention needed
- `info`: Processing/informational state
- `critical`: Error/failure/blocking state
- `neutral`: Inactive/default/passive state

### Variant usage

- Prefer semantic variants on DS components (`Badge`, `Button`, `Alert`) before custom utility classes.
- If a one-off class is required, prefer token-backed classes (`text-critical`) over palette classes (`text-red-600`).

## Do / Don’t

- Do:
  - Reuse shared status components (`InvoiceStatusBadge`, task status badges)
  - Keep feature-level color semantics token-based
  - Add/update DS snapshots when changing DS primitives

- Don’t:
  - Reintroduce hardcoded palette classes for status UI in features
  - Duplicate status color maps across list/show/card views
  - Import forked upstream primitives directly in feature code

## Testing

- Snapshot tests for owned DS primitives live under:
  - `src/components/ds/ui/ds-ui.snapshot.test.tsx`
- Accessibility contract tests for DS primitives live under:
  - `src/components/ds/ui/ds-ui.a11y.test.tsx`
- Ownership guard tests live under:
  - `src/components/ds/ui/ds-ui.ownership.test.ts`
- Any visual/style change to owned DS primitives should update snapshots intentionally.
