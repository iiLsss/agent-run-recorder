# Repository Guidelines

## Project Structure & Module Organization

This repository is currently an empty scaffold: there are no source files, tests, assets, or build configuration yet. Keep the root focused on project-wide files such as `README.md`, dependency manifests, and tool configuration. As implementation is added, use a predictable layout:

- `src/` for application and library code.
- `tests/` for automated tests that mirror the structure under `src/`.
- `assets/` for non-code resources such as fixtures or sample recordings.
- `scripts/` for repeatable development and maintenance tasks.

Avoid committing generated output. Add build artifacts, local caches, and secrets to `.gitignore`.

## Build, Test, and Development Commands

No build, test, or local-run commands are configured yet. When introducing a toolchain, expose its common workflows through one documented interface (for example, package-manager scripts or a `Makefile`) and update this section and `README.md`.

Expected command roles should remain clear:

- `npm run dev` starts the project locally.
- `npm test` runs the complete automated test suite.
- `npm run lint` checks formatting and static-analysis rules.
- `npm run build` creates production-ready output.

Do not assume these examples work until the corresponding configuration is committed.

## Coding Style & Naming Conventions

Follow the formatter and linter selected with the first implementation. Commit their configuration so results are reproducible. Until then, use two-space indentation for JSON, YAML, and Markdown; keep Markdown lines readable; and end files with a newline.

Use `kebab-case` for directories and general filenames, `camelCase` for variables and functions, and `PascalCase` for types or classes where the chosen language supports them.

## Testing Guidelines

Add tests with every behavior change or bug fix. Name tests after observable behavior, such as `records failed agent run`. Keep test files near matching modules or mirror them under `tests/`, using the framework’s standard suffix (for example, `.test.ts`). Document any coverage threshold when a test framework is introduced.

## Commit & Pull Request Guidelines

There is no existing commit history to establish a local convention. Use short, imperative commit subjects, optionally following Conventional Commits, such as `feat: add run recorder` or `fix: preserve event order`.

Pull requests should include a concise summary, verification steps, and linked issues when applicable. Include screenshots or sample output for user-visible changes, and call out configuration changes or follow-up work explicitly.
