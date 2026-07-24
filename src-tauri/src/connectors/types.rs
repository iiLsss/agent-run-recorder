use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ConnectorId {
    Codex,
    ClaudeCode,
    GeminiCli,
    OpenCode,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectorCapability {
    pub id: ConnectorId,
    pub display_name: &'static str,
    pub connector_version: &'static str,
    pub detected_version: Option<String>,
    pub mechanism: &'static str,
    pub source_tier: &'static str,
    pub authentication: &'static str,
    pub offline_guarantee: &'static str,
    pub verified_on_this_device: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectorRuntimeStatus {
    pub capability: ConnectorCapability,
    pub installed: bool,
    pub enabled: bool,
    pub health: &'static str,
    pub detail: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectorInstallPlan {
    pub connector: ConnectorId,
    pub supported: bool,
    pub config_path: String,
    pub changes: Vec<String>,
    pub compatibility_mode: bool,
    pub conflict: Option<String>,
    pub requires_confirmation: bool,
}

impl ConnectorId {
    pub fn display_name(self) -> &'static str {
        match self {
            Self::Codex => "Codex",
            Self::ClaudeCode => "Claude Code",
            Self::GeminiCli => "Gemini CLI",
            Self::OpenCode => "OpenCode",
        }
    }
}
