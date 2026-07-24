# Definition of Done

## Required for every change

- The requested scope is implemented without expanding the current phase.
- Code respects documented module ownership and size limits.
- No mock data, domain types, or utilities are embedded in page components.
- Business styles are colocated; global styles contain no module selectors.
- Keyboard and screen-reader semantics are preserved.
- User-visible copy follows PRD privacy and observation-language constraints.
- Tests cover new observable behavior or pure business transformations.
- `npm run check` succeeds in the current worktree.
- Generated output and secrets are not tracked.
- Documentation is updated when architecture, commands, or boundaries change.

## Phase 2 acceptance

- Architecture, frontend guidelines, and this DoD exist and agree.
- TypeScript, ESLint, Prettier, Stylelint, Vitest, and production build are
  configured.
- One `npm run check` command runs all required gates.
- Semantic design variables and global defaults exist.
- The application shell represents the desktop layout.
- Run timeline, Task detail, Result inbox, M1 comparison, and Connector health
  are navigable and interactive.
- Task overall results remain distinct from configuration observations.
- Unknown outcomes remain explicit in inbox and comparison views.
- M1 copy is descriptive and does not claim direction or causality.
- All five modules own their types, fixtures, transformations, components,
  tests, and styles.

## Phase 3 desktop collection delivered

- Tauri desktop shell, tray, and background collector lifecycle.
- SQLCipher persistence with OS-secret-store-derived keys.
- Loopback OTLP JSON/Protobuf receiver with authentication and limits.
- Encrypted spool recovery and connector configuration backups.
- Real connector detection and confirmed configuration changes.
- Desktop Run timeline and connector health data bridges.

## Explicitly not done

- Settings and data-management screens.
- Auto-start, updater, release signing, and Windows validation.
- Historical import, cross-device backup, and export.
- Persisted evaluations and real statistics execution.
- Production-tier connector certification; all current adapters are experimental.
