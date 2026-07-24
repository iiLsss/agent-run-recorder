# Repository Guidelines

## Project Structure & Module Organization

This repository contains a Vite + React + TypeScript frontend and product documentation. Keep the root focused on project-wide files such as `README.md`, dependency manifests, and tool configuration. Use a predictable layout:

- `src/` for application and library code.
- `tests/` for automated tests that mirror the structure under `src/` when tests are not colocated.
- `assets/` for non-code resources such as fixtures or sample recordings.
- `scripts/` for repeatable development and maintenance tasks.

Avoid committing generated output. Add build artifacts, local caches, and secrets to `.gitignore`.

## Build, Test, and Development Commands

Use the package scripts defined in `package.json`:

- `npm run dev` starts the project locally.
- `npm test` runs the complete automated test suite.
- `npm run lint` checks formatting and static-analysis rules.
- `npm run build` creates production-ready output.
- `npm run validate` runs lint, tests, and the production build.

Run `npm run validate` before completing a frontend behavior change. If dependencies or required files are missing, report that explicitly instead of claiming verification.

## Coding Style & Naming Conventions

Follow the formatter and linter selected with the first implementation. Commit their configuration so results are reproducible. Until then, use two-space indentation for JSON, YAML, and Markdown; keep Markdown lines readable; and end files with a newline.

Use `kebab-case` for directories and general filenames, `camelCase` for variables and functions, and `PascalCase` for types or classes where the chosen language supports them.

## Frontend Engineering Rules

### General principles

- Optimize for readable, maintainable code and clear responsibilities, not the fewest files.
- Extend the existing architecture; do not create temporary giant components to finish a screen quickly.
- Do not perform unrelated refactors while implementing a feature.
- Before implementing a large page or feature, write a short decomposition covering the page container, business modules, reusable components, state ownership, data/types, and styling.

### File and component size

- A page component should normally stay under 300 lines.
- A regular business component should normally stay under 200 lines.
- A hook should normally stay under 150 lines; a utility module under 200 lines.
- A single function should normally stay under 50 lines.
- Do not evade these limits by compressing code or removing meaningful whitespace.
- If a file exceeds its limit, analyze and split it before adding more code.

### Component boundaries

Page components should coordinate page-level state, layout composition, and route parameters. They should not contain large static datasets, reusable business components, complex data transformations, or unrelated shared state.

Extract a component when a JSX region is about 80 lines, represents an independent Header/Sidebar/Toolbar/List/Table/Panel/Modal, owns interaction state, is reused, or contains complex conditional rendering. Component boundaries must represent a business concept or interaction area; do not create meaningless wrapper components for every `div`.

Prefer a structure such as:

```text
src/
  app/
  components/
    layout/
    common/
  features/
    timeline/
    task-detail/
    inbox/
    comparison/
    connector-health/
  data/
  types/
  styles/
```

### State, data, and types

- Keep state in the nearest component that actually uses it; do not default all state to `App`.
- Extract reusable state logic into custom hooks.
- Keep mock data out of page components.
- Put shared types in `types.ts` or a feature-level types module.
- Put formatting, mapping, and selectors in utilities or selectors rather than JSX.
- Avoid `any`; define explicit component prop types.

### Styling

- Keep global styles limited to reset, design tokens, base typography, and shared layout primitives.
- Organize feature styles near their owning feature or component; do not grow one global stylesheet into a second monolith.
- Reuse variables for colors, spacing, radii, shadows, and typography.
- Use class names that express semantic or business roles; avoid names such as `box1`, `left2`, or `item-new`.

### Completion checklist

Before completing a frontend change, check:

- No page or business component has grown beyond its intended size without a clear reason.
- Independent JSX regions, mock data, types, utilities, and hooks are extracted appropriately.
- Shared state is not being passed through unrelated layers.
- Lint, typecheck, tests, and build are passing, or the exact blocker is reported.

## Testing Guidelines

Add tests with every behavior change or bug fix. Name tests after observable behavior, such as `records failed agent run`. Keep test files near matching modules or mirror them under `tests/`, using the framework’s standard suffix (for example, `.test.ts`). Document any coverage threshold when a test framework is introduced.

## Commit & Pull Request Guidelines

There is no existing commit history to establish a local convention. Use short, imperative commit subjects, optionally following Conventional Commits, such as `feat: add run recorder` or `fix: preserve event order`.

Pull requests should include a concise summary, verification steps, and linked issues when applicable. Include screenshots or sample output for user-visible changes, and call out configuration changes or follow-up work explicitly.
