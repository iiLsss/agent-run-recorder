# Desktop Collection Technical Design

## Runtime

The packaged application is a Tauri 2 desktop process. Closing the main window
hides it; the Rust process and loopback receiver continue running. The tray
provides show, pause/resume, and quit actions.

```text
Agent connector
  → 127.0.0.1:4318 OTLP/HTTP
  → bounded JSON/Protobuf parser
  → closed metadata allowlist + tokenized identities
  → encrypted append-only spool frame
  → SQLCipher transaction
  → Tauri IPC
  → React product surfaces
```

The browser Vite command remains a UI preview only. It does not start the Rust
collector and is labelled accordingly in the application shell.

## Local security

- A 256-bit root key is created once and stored through the operating-system
  secret store under `com.local.agentrunrecorder/root-key-v1`.
- HKDF-SHA256 derives independent SQLCipher, spool, connector-token,
  tokenization, and config-backup keys.
- The database is SQLCipher with `cipher_memory_security=ON`, foreign keys,
  WAL, and full synchronous writes.
- Source session, Run, and event identifiers are HMAC-tokenized before
  persistence.
- Connector config backups use AES-256-GCM, restrictive filesystem
  permissions, atomic replacement, and a five-version retention limit.
- Raw prompts, responses, reasoning, file contents, command output, and
  complete URLs are not fields in `NormalizedRunEvent` or `Metadata`.

## Ingestion contract

- Bind address is fixed to `127.0.0.1:4318`; a conflict is surfaced as a failed
  receiver instead of silently changing ports.
- `/v1/logs` accepts OTLP/HTTP JSON and Protobuf.
- Authenticated connectors use `x-agent-run-recorder-token`.
- Gemini CLI uses an explicit compatibility path on the same loopback route
  because its documented settings do not expose a custom header. Requests
  without the token are accepted only when the OTLP resource service name is
  Gemini.
- Metrics and traces are acknowledged then discarded. They are never parsed
  into product records.
- Limits are 1 MiB per request, 500 log records per request, and 100 requests
  per second.
- Unknown attributes are discarded before spool and database writes;
  `droppedMetadataFieldCount` records the count.

## Identity and durability

Event identity priority is native event ID, trace/span plus timestamp, then
event name plus timestamp. All source identifiers are tokenized. SQL primary
keys make replay idempotent.

Each normalized event is serialized to an AES-256-GCM spool frame and
`sync_data` completes before database ingestion is acknowledged. Startup
replays valid frames through idempotent database writes. An invalid tail is
copied to an encrypted quarantine artifact and the segment is truncated to the
last valid frame. Capacity is fixed at 256 MiB.

Direct OTLP sources remain online-only: the recorder spool protects the
accepted handoff and database transaction, but cannot recover telemetry that a
third-party process discarded while the recorder was not running.

## Database scope

Migration v1 creates AgentConfiguration, Task, TaskOverallResult, Session, Run,
RunEvaluation, Event, TaskAgentObservation, boundary revision, and import
ledger tables. `TaskOverallResult` and `TaskAgentObservation` remain separate.
Post-hoc difficulty has a separate column and cannot overwrite pre-run
difficulty.

Current automatic collection writes AgentConfiguration, Session, Run, and
Event. Task linking, evaluation writes, observation aggregation, historical
import, timeout boundary revision, export, and cross-device backup remain
separate delivery work.
