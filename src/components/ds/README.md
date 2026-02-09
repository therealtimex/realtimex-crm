# Design System Facade

This folder is the local design-system facade for app feature code.

- `ds/ui/*` wraps upstream `components/ui/*`
- `ds/admin/*` wraps upstream `components/admin/*`

Feature code should import from `@/components/ds/*` instead of importing upstream paths directly.

See `src/components/ds/DESIGN_SYSTEM.md` for conventions, token semantics, and testing expectations.
