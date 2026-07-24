# Connector Capability Matrix

Matrix date: 2026-07-24. All four adapters remain `experimental` until the PRD
G3 gate receives independent review and the required execution trials pass.

| Connector   | Adapter | Target source version | Device evidence              | Transport                       | Authentication              | Offline guarantee | Fixture                                          | Gate                                                    |
| ----------- | ------- | --------------------- | ---------------------------- | ------------------------------- | --------------------------- | ----------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Codex       | 0.1.0   | `0.146.0-alpha.3.1`   | Detected on macOS arm64      | OTLP/HTTP JSON logs             | Custom header token         | Online only       | `src-tauri/tests/fixtures/codex-otlp.json`       | Contract test passed; 20-Run trial pending              |
| Claude Code | 0.1.0   | `2.1.179`             | Detected on macOS arm64      | OTLP/HTTP JSON logs             | Standard OTLP header        | Online only       | `src-tauri/tests/fixtures/claude-code-otlp.json` | Contract test passed; 20-Run trial pending              |
| Gemini CLI  | 0.1.0   | Unfrozen              | Not installed on test device | OTLP/HTTP Protobuf or JSON      | Loopback compatibility mode | Online only       | `src-tauri/tests/fixtures/gemini-cli-otlp.json`  | Parser contract passed; device trial pending            |
| OpenCode    | 0.1.0   | Unfrozen              | Not installed on test device | Global event plugin → OTLP JSON | Custom header token         | Online only       | `src-tauri/tests/fixtures/opencode-otlp.json`    | Plugin/normalizer contract passed; device trial pending |

## Managed configuration

- Codex: structured merge into user-level `~/.codex/config.toml`; user-prompt
  logging remains disabled.
- Claude Code: structured merge into `~/.claude/settings.json`; prompt,
  assistant response, tool detail, tool content, and raw API body logging remain
  disabled. Metrics export is disabled.
- Gemini CLI: structured merge into `~/.gemini/settings.json`; prompt logging
  and detailed traces remain disabled. The UI labels the authentication
  downgrade.
- OpenCode: managed global plugin at
  `~/.config/opencode/plugins/agent-run-recorder.ts`; only event type and a
  validated session identifier are transmitted.

Installation refuses to overwrite a conflicting exporter. Every write requires
an explicit UI confirmation and creates an encrypted backup first. Uninstall
removes only managed keys or the managed plugin.

## Unverified release dimensions

- Windows install, pause/resume, uninstall, and executable discovery.
- Version ranges beyond the two exact versions detected above.
- Detection-rate targets and boundary accuracy across 20 known Runs per
  connector.
- Third-party behavior during recorder downtime.
- Independent fixture review and named reviewer approval.
