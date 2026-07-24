use std::{
    path::{Path, PathBuf},
    process::Command,
};

use serde_json::{Map, Value};
use toml_edit::{DocumentMut, Item, Table, value};

use crate::error::{RecorderError, RecorderResult};

use super::{
    backup::{ConfigBackupStore, restrict_file},
    types::{ConnectorCapability, ConnectorId, ConnectorInstallPlan, ConnectorRuntimeStatus},
};

const OTLP_ENDPOINT: &str = "http://127.0.0.1:4318/v1/logs";
const OTLP_BASE_ENDPOINT: &str = "http://127.0.0.1:4318";

#[derive(Clone)]
pub struct ConnectorManager {
    paths: ConnectorPaths,
    backups: ConfigBackupStore,
    connector_token: String,
}

#[derive(Clone)]
struct ConnectorPaths {
    codex_config: PathBuf,
    claude_settings: PathBuf,
    gemini_settings: PathBuf,
    opencode_plugin: PathBuf,
}

impl ConnectorManager {
    pub fn new(
        app_data_dir: &Path,
        backup_key: [u8; 32],
        connector_token: String,
    ) -> RecorderResult<Self> {
        let home = dirs::home_dir()
            .ok_or_else(|| RecorderError::Connector("home directory unavailable".into()))?;
        Ok(Self {
            paths: ConnectorPaths::for_home(&home),
            backups: ConfigBackupStore::new(
                app_data_dir.join("connector-config-backups"),
                backup_key,
            )?,
            connector_token,
        })
    }

    pub fn statuses(&self) -> Vec<ConnectorRuntimeStatus> {
        [
            ConnectorId::Codex,
            ConnectorId::ClaudeCode,
            ConnectorId::GeminiCli,
            ConnectorId::OpenCode,
        ]
        .into_iter()
        .map(|id| self.status(id))
        .collect()
    }

    pub fn plan(&self, connector: ConnectorId) -> ConnectorInstallPlan {
        let path = self.paths.path(connector);
        let detected = detect_version(connector);
        let conflict = self
            .detect_conflict(connector)
            .err()
            .map(|error| error.to_string());
        ConnectorInstallPlan {
            connector,
            supported: detected.is_some() && conflict.is_none(),
            config_path: display_path(path),
            changes: planned_changes(connector),
            compatibility_mode: matches!(connector, ConnectorId::GeminiCli),
            conflict,
            requires_confirmation: true,
        }
    }

    pub fn install(&self, connector: ConnectorId, confirmed: bool) -> RecorderResult<()> {
        if !confirmed {
            return Err(RecorderError::Connector(
                "connector installation requires confirmation".into(),
            ));
        }
        if detect_version(connector).is_none() {
            return Err(RecorderError::Connector(format!(
                "{} is not installed",
                connector.display_name()
            )));
        }
        self.detect_conflict(connector)?;
        match connector {
            ConnectorId::Codex => self.install_codex(),
            ConnectorId::ClaudeCode => self.install_claude(),
            ConnectorId::GeminiCli => self.install_gemini(),
            ConnectorId::OpenCode => self.install_opencode(),
        }
    }

    pub fn uninstall(&self, connector: ConnectorId, confirmed: bool) -> RecorderResult<()> {
        if !confirmed {
            return Err(RecorderError::Connector(
                "connector uninstall requires confirmation".into(),
            ));
        }
        match connector {
            ConnectorId::Codex => self.uninstall_codex(),
            ConnectorId::ClaudeCode => self.uninstall_claude(),
            ConnectorId::GeminiCli => self.uninstall_gemini(),
            ConnectorId::OpenCode => self.uninstall_opencode(),
        }
    }

    fn status(&self, id: ConnectorId) -> ConnectorRuntimeStatus {
        let detected_version = detect_version(id);
        let installed = self.is_installed(id);
        ConnectorRuntimeStatus {
            capability: capability(id, detected_version.clone()),
            installed,
            enabled: installed,
            health: if detected_version.is_none() {
                "not-detected"
            } else if installed {
                "configured"
            } else {
                "available"
            },
            detail: detected_version
                .map(|version| format!("detected {version}"))
                .unwrap_or_else(|| "executable not detected".into()),
        }
    }

    fn is_installed(&self, id: ConnectorId) -> bool {
        let Ok(content) = std::fs::read_to_string(self.paths.path(id)) else {
            return false;
        };
        match id {
            ConnectorId::Codex => content.contains(OTLP_ENDPOINT),
            ConnectorId::ClaudeCode => content.contains(OTLP_ENDPOINT),
            ConnectorId::GeminiCli => content.contains(OTLP_BASE_ENDPOINT),
            ConnectorId::OpenCode => content.contains("x-agent-run-recorder-token"),
        }
    }

    fn detect_conflict(&self, id: ConnectorId) -> RecorderResult<()> {
        let path = self.paths.path(id);
        if !path.exists() || matches!(id, ConnectorId::OpenCode) {
            return Ok(());
        }
        let content = std::fs::read_to_string(path)?;
        match id {
            ConnectorId::Codex => detect_codex_conflict(&content),
            ConnectorId::ClaudeCode => detect_json_endpoint_conflict(&content, OTLP_ENDPOINT),
            ConnectorId::GeminiCli => detect_json_endpoint_conflict(&content, OTLP_BASE_ENDPOINT),
            ConnectorId::OpenCode => Ok(()),
        }
    }

    fn install_codex(&self) -> RecorderResult<()> {
        let path = &self.paths.codex_config;
        let content = read_or_empty(path)?;
        backup_existing(&self.backups, "codex", path, content.as_bytes())?;
        let mut document = content
            .parse::<DocumentMut>()
            .map_err(|error| RecorderError::Connector(error.to_string()))?;
        let otel = document
            .entry("otel")
            .or_insert_with(|| Item::Table(Table::new()))
            .as_table_like_mut()
            .ok_or_else(|| RecorderError::Connector("[otel] must be a table".into()))?;
        otel.insert("log_user_prompt", value(false));
        otel.insert("environment", value("agent-run-recorder"));
        let exporter = codex_exporter_item(&self.connector_token)?;
        otel.insert("exporter", exporter);
        atomic_write(path, document.to_string().as_bytes())
    }

    fn install_claude(&self) -> RecorderResult<()> {
        let path = &self.paths.claude_settings;
        let content = read_or_json_object(path)?;
        backup_existing(&self.backups, "claude-code", path, content.as_bytes())?;
        let mut root = parse_json_object(&content)?;
        let env = object_field(&mut root, "env")?;
        env.insert("CLAUDE_CODE_ENABLE_TELEMETRY".into(), "1".into());
        env.insert("OTEL_METRICS_EXPORTER".into(), "none".into());
        env.insert("OTEL_LOGS_EXPORTER".into(), "otlp".into());
        env.insert(
            "OTEL_EXPORTER_OTLP_LOGS_PROTOCOL".into(),
            "http/json".into(),
        );
        env.insert(
            "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT".into(),
            OTLP_ENDPOINT.into(),
        );
        env.insert(
            "OTEL_EXPORTER_OTLP_HEADERS".into(),
            format!("x-agent-run-recorder-token={}", self.connector_token).into(),
        );
        env.insert("OTEL_LOG_USER_PROMPTS".into(), "0".into());
        env.insert("OTEL_LOG_ASSISTANT_RESPONSES".into(), "0".into());
        env.insert("OTEL_LOG_TOOL_DETAILS".into(), "0".into());
        env.insert("OTEL_LOG_TOOL_CONTENT".into(), "0".into());
        env.insert("OTEL_LOG_RAW_API_BODIES".into(), "0".into());
        atomic_write(path, serde_json::to_vec_pretty(&root)?.as_slice())
    }

    fn install_gemini(&self) -> RecorderResult<()> {
        let path = &self.paths.gemini_settings;
        let content = read_or_json_object(path)?;
        backup_existing(&self.backups, "gemini-cli", path, content.as_bytes())?;
        let mut root = parse_json_object(&content)?;
        let telemetry = object_field(&mut root, "telemetry")?;
        telemetry.insert("enabled".into(), true.into());
        telemetry.insert("target".into(), "local".into());
        telemetry.insert("otlpEndpoint".into(), OTLP_BASE_ENDPOINT.into());
        telemetry.insert("otlpProtocol".into(), "http".into());
        telemetry.insert("logPrompts".into(), false.into());
        telemetry.insert("traces".into(), false.into());
        telemetry.insert("useCollector".into(), true.into());
        atomic_write(path, serde_json::to_vec_pretty(&root)?.as_slice())
    }

    fn install_opencode(&self) -> RecorderResult<()> {
        let path = &self.paths.opencode_plugin;
        let content = std::fs::read(path).unwrap_or_default();
        backup_existing(&self.backups, "opencode", path, &content)?;
        let plugin = opencode_plugin_source(&self.connector_token);
        atomic_write(path, plugin.as_bytes())
    }

    fn uninstall_codex(&self) -> RecorderResult<()> {
        let path = &self.paths.codex_config;
        let content = read_or_empty(path)?;
        let mut document = content
            .parse::<DocumentMut>()
            .map_err(|error| RecorderError::Connector(error.to_string()))?;
        let managed = document
            .get("otel")
            .and_then(Item::as_table_like)
            .and_then(|otel| otel.get("environment"))
            .and_then(Item::as_str)
            == Some("agent-run-recorder");
        if managed {
            document.remove("otel");
            atomic_write(path, document.to_string().as_bytes())?;
        }
        Ok(())
    }

    fn uninstall_claude(&self) -> RecorderResult<()> {
        remove_managed_json_keys(
            &self.paths.claude_settings,
            "env",
            &[
                "CLAUDE_CODE_ENABLE_TELEMETRY",
                "OTEL_METRICS_EXPORTER",
                "OTEL_LOGS_EXPORTER",
                "OTEL_EXPORTER_OTLP_LOGS_PROTOCOL",
                "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
                "OTEL_EXPORTER_OTLP_HEADERS",
                "OTEL_LOG_USER_PROMPTS",
                "OTEL_LOG_ASSISTANT_RESPONSES",
                "OTEL_LOG_TOOL_DETAILS",
                "OTEL_LOG_TOOL_CONTENT",
                "OTEL_LOG_RAW_API_BODIES",
            ],
        )
    }

    fn uninstall_gemini(&self) -> RecorderResult<()> {
        remove_managed_json_keys(
            &self.paths.gemini_settings,
            "telemetry",
            &[
                "enabled",
                "target",
                "otlpEndpoint",
                "otlpProtocol",
                "logPrompts",
                "traces",
                "useCollector",
            ],
        )
    }

    fn uninstall_opencode(&self) -> RecorderResult<()> {
        let path = &self.paths.opencode_plugin;
        if path.exists()
            && std::fs::read_to_string(path)?.contains("managed-by: agent-run-recorder")
        {
            std::fs::remove_file(path)?;
        }
        Ok(())
    }
}

impl ConnectorPaths {
    fn for_home(home: &Path) -> Self {
        Self {
            codex_config: home.join(".codex/config.toml"),
            claude_settings: home.join(".claude/settings.json"),
            gemini_settings: home.join(".gemini/settings.json"),
            opencode_plugin: home.join(".config/opencode/plugins/agent-run-recorder.ts"),
        }
    }

    fn path(&self, connector: ConnectorId) -> &Path {
        match connector {
            ConnectorId::Codex => &self.codex_config,
            ConnectorId::ClaudeCode => &self.claude_settings,
            ConnectorId::GeminiCli => &self.gemini_settings,
            ConnectorId::OpenCode => &self.opencode_plugin,
        }
    }
}

fn capability(id: ConnectorId, detected_version: Option<String>) -> ConnectorCapability {
    let (mechanism, authentication, offline_guarantee) = match id {
        ConnectorId::Codex => ("OTLP/HTTP JSON logs", "custom OTLP header", "online only"),
        ConnectorId::ClaudeCode => (
            "OTLP/HTTP JSON logs",
            "standard OTLP headers",
            "online only",
        ),
        ConnectorId::GeminiCli => (
            "OTLP/HTTP compatibility endpoint",
            "loopback compatibility mode",
            "online only",
        ),
        ConnectorId::OpenCode => ("global event plugin", "custom HTTP header", "online only"),
    };
    ConnectorCapability {
        id,
        display_name: id.display_name(),
        connector_version: "0.1.0",
        detected_version: detected_version.clone(),
        mechanism,
        source_tier: "experimental",
        authentication,
        offline_guarantee,
        verified_on_this_device: detected_version.is_some(),
    }
}

fn planned_changes(connector: ConnectorId) -> Vec<String> {
    match connector {
        ConnectorId::Codex => vec![
            "Merge user-level [otel] configuration".into(),
            "Keep log_user_prompt disabled".into(),
            "Export JSON logs to loopback with authentication".into(),
        ],
        ConnectorId::ClaudeCode => vec![
            "Merge telemetry environment settings".into(),
            "Keep prompt, tool detail, tool content and raw bodies disabled".into(),
            "Export logs and metrics to authenticated loopback OTLP".into(),
        ],
        ConnectorId::GeminiCli => vec![
            "Merge local telemetry settings".into(),
            "Keep logPrompts disabled".into(),
            "Use explicit unauthenticated loopback compatibility mode".into(),
        ],
        ConnectorId::OpenCode => vec![
            "Install one global event plugin".into(),
            "Transmit event types and tokenized session identity only".into(),
            "Never transmit prompts, messages, tool arguments or outputs".into(),
        ],
    }
}

fn detect_version(id: ConnectorId) -> Option<String> {
    for executable in executable_candidates(id) {
        let Ok(output) = Command::new(executable).arg("--version").output() else {
            continue;
        };
        if !output.status.success() {
            continue;
        }
        let version = String::from_utf8_lossy(&output.stdout).trim().to_owned();
        if !version.is_empty() && version.len() <= 128 {
            return Some(version);
        }
    }
    None
}

fn executable_candidates(id: ConnectorId) -> Vec<PathBuf> {
    let executable = match id {
        ConnectorId::Codex => "codex",
        ConnectorId::ClaudeCode => "claude",
        ConnectorId::GeminiCli => "gemini",
        ConnectorId::OpenCode => "opencode",
    };
    let mut candidates = vec![PathBuf::from(executable)];
    if let Some(home) = dirs::home_dir() {
        candidates.push(home.join(".local/bin").join(executable));
        candidates.push(home.join(".npm-global/bin").join(executable));
        if matches!(id, ConnectorId::ClaudeCode) {
            append_nvm_candidates(&mut candidates, &home, executable);
        }
    }
    candidates.push(PathBuf::from("/opt/homebrew/bin").join(executable));
    candidates.push(PathBuf::from("/usr/local/bin").join(executable));
    if matches!(id, ConnectorId::Codex) {
        candidates.push(PathBuf::from(
            "/Applications/ChatGPT.app/Contents/Resources/codex",
        ));
    }
    candidates
}

fn append_nvm_candidates(candidates: &mut Vec<PathBuf>, home: &Path, executable: &str) {
    let versions = home.join(".nvm/versions/node");
    let Ok(entries) = std::fs::read_dir(versions) else {
        return;
    };
    let mut paths = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path().join("bin").join(executable))
        .filter(|path| path.is_file())
        .collect::<Vec<_>>();
    paths.sort();
    paths.reverse();
    candidates.extend(paths);
}

fn detect_codex_conflict(content: &str) -> RecorderResult<()> {
    let document = content
        .parse::<DocumentMut>()
        .map_err(|error| RecorderError::Connector(error.to_string()))?;
    let exporter = document
        .get("otel")
        .and_then(Item::as_table_like)
        .and_then(|otel| otel.get("exporter"));
    if exporter.is_none()
        || exporter.and_then(Item::as_str) == Some("none")
        || exporter.is_some_and(|item| item.to_string().contains(OTLP_ENDPOINT))
    {
        Ok(())
    } else {
        Err(RecorderError::Connector(
            "an existing Codex OTLP exporter is configured".into(),
        ))
    }
}

fn detect_json_endpoint_conflict(content: &str, endpoint: &str) -> RecorderResult<()> {
    if (content.contains("OTEL_EXPORTER_OTLP_ENDPOINT")
        || content.contains("OTEL_EXPORTER_OTLP_LOGS_ENDPOINT")
        || content.contains("otlpEndpoint"))
        && !content.contains(endpoint)
    {
        Err(RecorderError::Connector(
            "an existing OTLP endpoint is configured".into(),
        ))
    } else {
        Ok(())
    }
}

fn codex_exporter_item(token: &str) -> RecorderResult<Item> {
    let source = format!(
        "[otel]\nexporter = {{ otlp-http = {{ endpoint = \"{OTLP_ENDPOINT}\", protocol = \"json\", headers = {{ x-agent-run-recorder-token = \"{token}\" }} }} }}\n"
    );
    let document = source
        .parse::<DocumentMut>()
        .map_err(|error| RecorderError::Connector(error.to_string()))?;
    document
        .get("otel")
        .and_then(Item::as_table_like)
        .and_then(|otel| otel.get("exporter"))
        .cloned()
        .ok_or_else(|| RecorderError::Connector("failed to build Codex exporter".into()))
}

fn object_field<'a>(
    root: &'a mut Map<String, Value>,
    field: &str,
) -> RecorderResult<&'a mut Map<String, Value>> {
    let value = root
        .entry(field.to_owned())
        .or_insert_with(|| Value::Object(Map::new()));
    value
        .as_object_mut()
        .ok_or_else(|| RecorderError::Connector(format!("{field} must be an object")))
}

fn parse_json_object(content: &str) -> RecorderResult<Map<String, Value>> {
    serde_json::from_str::<Value>(content)?
        .as_object()
        .cloned()
        .ok_or_else(|| RecorderError::Connector("settings root must be an object".into()))
}

fn backup_existing(
    backups: &ConfigBackupStore,
    connector: &str,
    path: &Path,
    content: &[u8],
) -> RecorderResult<()> {
    if path.exists() {
        backups.save(connector, content)?;
    }
    Ok(())
}

fn atomic_write(path: &Path, content: &[u8]) -> RecorderResult<()> {
    let parent = path
        .parent()
        .ok_or_else(|| RecorderError::Connector("config path has no parent".into()))?;
    std::fs::create_dir_all(parent)?;
    let temporary = parent.join(format!(
        ".{}.agent-run-recorder.tmp",
        path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("config")
    ));
    std::fs::write(&temporary, content)?;
    restrict_file(&temporary)?;
    std::fs::rename(&temporary, path)?;
    restrict_file(path)?;
    Ok(())
}

fn read_or_empty(path: &Path) -> RecorderResult<String> {
    if path.exists() {
        Ok(std::fs::read_to_string(path)?)
    } else {
        Ok(String::new())
    }
}

fn read_or_json_object(path: &Path) -> RecorderResult<String> {
    if path.exists() {
        Ok(std::fs::read_to_string(path)?)
    } else {
        Ok("{}".into())
    }
}

fn remove_managed_json_keys(path: &Path, object_name: &str, keys: &[&str]) -> RecorderResult<()> {
    if !path.exists() {
        return Ok(());
    }
    let content = std::fs::read_to_string(path)?;
    let mut root = parse_json_object(&content)?;
    if let Some(object) = root.get_mut(object_name).and_then(Value::as_object_mut) {
        for key in keys {
            object.remove(*key);
        }
    }
    atomic_write(path, serde_json::to_vec_pretty(&root)?.as_slice())
}

fn display_path(path: &Path) -> String {
    let Some(home) = dirs::home_dir() else {
        return path.display().to_string();
    };
    path.strip_prefix(home)
        .map(|relative| format!("~/{}", relative.display()))
        .unwrap_or_else(|_| path.display().to_string())
}

fn opencode_plugin_source(token: &str) -> String {
    format!(
        r#"// managed-by: agent-run-recorder
const endpoint = "http://127.0.0.1:4318/v1/logs"
const token = "{token}"
const safeId = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{{1,128}}$/.test(value)
    ? value
    : undefined

export const AgentRunRecorder = async () => ({{
  event: async ({{ event }}) => {{
    const type = typeof event?.type === "string" ? event.type : "unknown"
    const sessionId = safeId(event?.properties?.sessionID)
    const attributes = sessionId
      ? [{{ key: "session.id", value: {{ stringValue: sessionId }} }}]
      : []
    const payload = {{
      resourceLogs: [{{
        resource: {{ attributes: [
          {{ key: "service.name", value: {{ stringValue: "opencode" }} }},
          {{ key: "service.version", value: {{ stringValue: "plugin-0.1.0" }} }}
        ] }},
        scopeLogs: [{{ logRecords: [{{
          timeUnixNano: String(Date.now() * 1_000_000),
          body: {{ stringValue: `opencode.${{type}}` }},
          attributes
        }}] }}]
      }}]
    }}
    await fetch(endpoint, {{
      method: "POST",
      headers: {{
        "content-type": "application/json",
        "x-agent-run-recorder-token": token
      }},
      body: JSON.stringify(payload)
    }}).catch(() => undefined)
  }}
}})
"#
    )
}

#[cfg(test)]
mod tests {
    use super::{
        ConnectorId, ConnectorPaths, detect_codex_conflict, detect_json_endpoint_conflict,
        opencode_plugin_source,
    };

    #[test]
    fn refuses_to_overwrite_existing_exporters() {
        assert!(detect_codex_conflict("").is_ok());
        assert!(detect_codex_conflict("model = \"gpt-5\"\n").is_ok());
        assert!(detect_codex_conflict("[otel]\n").is_ok());
        assert!(detect_codex_conflict("[otel]\nexporter = \"none\"\n").is_ok());
        assert!(
            detect_codex_conflict(
                "[otel]\nexporter = { otlp-http = { endpoint = \"https://example.test\" } }\n"
            )
            .is_err()
        );
        assert!(
            detect_json_endpoint_conflict(
                r#"{"env":{"OTEL_EXPORTER_OTLP_ENDPOINT":"https://example.test"}}"#,
                "http://127.0.0.1:4318/v1/logs"
            )
            .is_err()
        );
    }

    #[test]
    fn generated_opencode_plugin_does_not_reference_raw_content() {
        let plugin = opencode_plugin_source("safe-token");
        for forbidden in ["prompt", "message.content", "tool.args", "tool.output"] {
            assert!(!plugin.contains(forbidden));
        }
        assert!(plugin.contains("session.id"));
    }

    #[test]
    fn connector_paths_are_user_scoped() {
        let paths = ConnectorPaths::for_home(std::path::Path::new("/users/test"));
        assert_eq!(
            paths.path(ConnectorId::Codex),
            std::path::Path::new("/users/test/.codex/config.toml")
        );
    }
}
