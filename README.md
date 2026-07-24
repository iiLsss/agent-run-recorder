# Agent Run Recorder

Privacy-first Tauri desktop application for recording observable AI Agent runs
locally.

## Commands

```bash
npm install
npm run dev
npm run desktop:dev
npm run desktop:build
npm run check
```

`npm run dev` starts only the browser UI preview and does not collect events.
Use `npm run desktop:dev` to start the React UI together with the Rust collector.

`npm run check` verifies formatting, scripts, styles, types, frontend tests,
production web build, and Rust tests.

## Current scope

- React + TypeScript application shell.
- Semantic design tokens and global defaults.
- Run timeline with functional filters, export feedback, and task navigation.
- Task detail with separate overall result and per-configuration observations.
- Result inbox with run/task evaluation and classification confirmation.
- M1 descriptive comparison with unknown and data-quality reporting.
- Connector capability and health monitoring UI.
- Tauri desktop window and background tray process.
- Rust OTLP/HTTP JSON and Protobuf receiver bound to loopback.
- SQLCipher local database and OS-secret-store-derived keys.
- AES-256-GCM durable spool and encrypted connector config backups.
- Confirmed connector installers for Codex, Claude Code, Gemini CLI, and
  OpenCode.

The four connectors remain experimental pending the frozen capability-matrix
release gates. Settings, data management, historical import, signing, and
cross-device backup remain deferred.

See [desktop technical design](docs/desktop-technical-design.md),
[connector capability matrix](docs/connector-capability-matrix.md), and
[definition of done](docs/definition-of-done.md).
