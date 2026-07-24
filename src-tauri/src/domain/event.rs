use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::Metadata;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedRunEvent {
    pub schema_version: u16,
    pub metadata_schema_version: u16,
    pub connector_version: String,
    pub connector_instance_id: String,
    pub event_id: String,
    pub event_identity_method: EventIdentityMethod,
    pub source_event_id: Option<String>,
    pub source_session_key: Option<String>,
    pub source_run_key: Option<String>,
    pub source_offset_or_ordinal: Option<u64>,
    pub timestamp: DateTime<Utc>,
    pub event_type: EventType,
    pub status: EventStatus,
    pub agent_configuration: AgentConfiguration,
    pub duration_ms: Option<u64>,
    pub metadata: Metadata,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfiguration {
    pub agent_id: String,
    pub agent_version_group: String,
    pub model_id: String,
    pub model_version: String,
    pub source_tier: String,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum EventIdentityMethod {
    Native,
    TraceSpan,
    SourceOrdinal,
    DeterministicFallback,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum EventType {
    SessionStart,
    SessionEnd,
    RunStart,
    RunEnd,
    ModelRequest,
    ModelResponse,
    ToolCall,
    FileOperation,
    Artifact,
    Error,
    Other,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum EventStatus {
    Started,
    Succeeded,
    Failed,
    Cancelled,
    Unknown,
}

impl EventType {
    pub fn is_run_start(self) -> bool {
        matches!(self, Self::RunStart)
    }

    pub fn is_run_end(self) -> bool {
        matches!(self, Self::RunEnd)
    }
}
