# Phase 3 Desktop Collection Plan

## Scope

Add the local desktop collection path required for automatic recording while
keeping the five Phase 2 product surfaces intact.

## File-level plan

| Area             | Files                                                                        | Responsibility                                                                   |
| ---------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Desktop shell    | `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs`, `src-tauri/src/tray.rs` | Tauri window, background-on-close behavior, tray controls, IPC registration      |
| Key management   | `src-tauri/src/security/keys.rs`                                             | Root key in the OS secret store and purpose-separated derived keys               |
| Local database   | `src-tauri/src/database/`                                                    | SQLCipher initialization, migrations, idempotent events, Run queries             |
| Ingestion        | `src-tauri/src/ingestion/`                                                   | Loopback OTLP JSON/Protobuf receiver, limits, normalization, identity            |
| Durable handoff  | `src-tauri/src/security/spool.rs`                                            | AES-256-GCM append-only frames, recovery, tail quarantine, capacity              |
| Connectors       | `src-tauri/src/connectors/`                                                  | Detection, capability status, conflict-safe install/uninstall, encrypted backups |
| Commands         | `src-tauri/src/commands.rs`, `src-tauri/src/recorder.rs`                     | Stable frontend command boundary and runtime composition                         |
| Frontend runtime | `src/app/runtime/`                                                           | Tauri detection, typed IPC client, capture status polling                        |
| Run timeline     | `src/modules/runs/data/run-repository.ts`                                    | Desktop SQLCipher-backed Run view models with browser fixture fallback           |
| Connector UI     | `src/modules/connectors/`                                                    | Real capability health and confirmed connector configuration changes             |
| Contracts        | `src-tauri/tests/fixtures/`, Rust unit tests                                 | Frozen representative payloads, privacy, dedupe, spool, receiver tests           |

## Delivery status

- Implemented: Tauri shell, tray, SQLCipher, OS-keystore-derived keys, OTLP
  JSON/Protobuf receiver, encrypted spool, four connector adapters, typed IPC,
  Run timeline and connector health integration.
- Verification required before release: signed packaging, Windows validation,
  independent connector matrix review, 20-Run detection trials, and 72-hour
  load/fault testing.
