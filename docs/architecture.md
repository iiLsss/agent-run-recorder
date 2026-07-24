# Frontend Architecture

## 1. Phase boundary

Phase 3 retains the five designed React surfaces and adds the Tauri desktop
runtime required for automatic local collection. Browser execution remains a
clearly labelled UI preview; Tauri owns collection, encryption, persistence,
connector configuration, and tray behavior.

## 2. Architecture decisions

| Decision            | Choice                                | Reason                                                        |
| ------------------- | ------------------------------------- | ------------------------------------------------------------- |
| Frontend runtime    | React 19 + Vite + TypeScript          | Fast isolated UI development with strict typing               |
| Module organization | Business-first vertical slices        | Keeps types, data, behavior, and styles owned by one domain   |
| Styling             | CSS Modules + global design tokens    | Prevents global style growth and preserves design consistency |
| Routing             | Typed local page registry             | Keeps desktop navigation explicit without URL routing         |
| State               | Page-local React state                | Prototype interactions do not require shared server state     |
| Data access         | Typed Tauri IPC with fixture fallback | Real desktop data without breaking isolated browser tests     |
| Testing             | Vitest + Testing Library              | Covers utilities and observable UI behavior                   |
| Quality gate        | One `npm run check` command           | Makes local and CI verification identical                     |

## 3. Business module map

```text
app
├── application shell
├── navigation registry
└── runtime composition
modules
├── runs
│   ├── timeline and filtering
│   ├── Run presentation
│   └── Run data boundary
├── tasks
│   ├── TaskOverallResult
│   └── TaskAgentObservation / Run detail
├── inbox
│   ├── Run evaluation
│   └── Task/category/difficulty confirmation
├── compare
│   ├── M1 descriptive comparison
│   └── data-quality gates
├── connectors
│   ├── capability matrix
│   └── health / spool / OTLP status
├── settings          (planned)
└── data-management   (planned)
```

## 4. Representative component tree

```text
main.tsx
└── App
    └── AppShell
        ├── AppSidebar
        │   ├── Brand
        │   ├── WorkspaceNavigation
        │   └── CaptureStatusCard
        ├── RunTimelinePage
        ├── TaskDetailPage
        ├── InboxPage
        ├── ComparePage
        ├── ConnectorsPage
        └── AppStatusBar
```

## 5. Directory structure

```text
.
├── docs/
│   ├── architecture.md
│   ├── definition-of-done.md
│   ├── frontend-guidelines.md
│   └── product-requirements.md
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── app-navigation.ts
│   │   └── layout/
│   │       ├── AppShell.module.css
│   │       ├── AppShell.test.tsx
│   │       └── AppShell.tsx
│   ├── modules/
│   │   ├── runs/
│   │   │   ├── components/
│   │   │   ├── data/
│   │   │   ├── pages/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── compare/
│   │   ├── connectors/
│   │   ├── inbox/
│   │   └── tasks/
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   ├── styles/
│   │   ├── globals.css
│   │   └── tokens.css
│   ├── main.tsx
│   ├── test-setup.ts
│   └── vite-env.d.ts
├── eslint.config.js
├── prettier.config.mjs
├── stylelint.config.mjs
├── tsconfig.*.json
└── vite.config.ts
```

Empty shared folders are documented boundaries, not invitations to add generic
helpers. They are created only when a concrete abstraction exists.

## 6. Responsibility boundaries

| Layer              | Owns                                                  | Must not own                                      |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------- |
| Page               | Composition, page-level state, use-case orchestration | Mock literals, domain parsing, complex transforms |
| Business component | One cohesive user-facing responsibility               | Unrelated module behavior                         |
| Hook               | Reusable stateful behavior and effects                | Markup or static data fixtures                    |
| Data               | Repositories, fixtures, adapters                      | Rendering                                         |
| Types              | Domain contracts and view-model types                 | Runtime state or UI                               |
| Utility            | Pure deterministic transformations                    | I/O, hooks, JSX                                   |
| CSS Module         | Styles for one component/page                         | Tokens or cross-app resets                        |
| Global styles      | Tokens, reset, body/root defaults                     | Business selectors                                |

## 7. Data flow

```text
Tauri command → module repository → view model → business component
browser preview fixture ────────────┘
```

## 8. Implemented module responsibilities

1. `runs` owns timeline filtering, model selection, export feedback, and Task
   navigation.
2. `tasks` keeps TaskOverallResult distinct from TaskAgentObservation and
   exposes Run evidence inspection.
3. `inbox` owns evaluation drafts, explicit submission, and classification
   confirmation.
4. `compare` owns M1 descriptive presentation, configuration swapping,
   unknowns, paired counts, and data-quality warnings.
5. `connectors` owns capability tiers, health state, enablement controls, and
   connector setup entry points.

## 9. Desktop integration boundaries

- Tauri window, tray, background-on-close, and typed commands.
- SQLCipher schema and migrations.
- OTLP JSON/Protobuf receiver and encrypted spool.
- Connector detection, confirmed installation, uninstall, and health.

## 10. Deferred integration boundaries

- Evaluation writes and notification scheduling.
- Persisted M1/M2 statistics and file export.
- Historical import and cross-device backup.
- Production signing, updater, and Windows validation.
