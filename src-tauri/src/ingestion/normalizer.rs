use std::collections::{HashMap, HashSet};

use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use hmac::{Hmac, Mac};
use sha2::Sha256;

use crate::{
    domain::{
        AgentConfiguration, CommandCategory, ErrorType, EventIdentityMethod, EventStatus,
        EventType, ExitCodeClass, Metadata, NormalizedRunEvent, ToolCategory,
    },
    error::{RecorderError, RecorderResult},
};

use super::otlp_json::{RawOtlpEvent, ScalarValue};

#[derive(Clone)]
pub struct EventNormalizer {
    identity_key: [u8; 32],
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ConnectorKind {
    Codex,
    ClaudeCode,
    GeminiCli,
    OpenCode,
}

impl EventNormalizer {
    pub fn new(identity_key: [u8; 32]) -> Self {
        Self { identity_key }
    }

    pub fn normalize_batch(
        &self,
        events: Vec<RawOtlpEvent>,
    ) -> RecorderResult<Vec<NormalizedRunEvent>> {
        events
            .into_iter()
            .enumerate()
            .map(|(ordinal, event)| self.normalize(event, ordinal as u64))
            .collect()
    }

    fn normalize(&self, raw: RawOtlpEvent, ordinal: u64) -> RecorderResult<NormalizedRunEvent> {
        let kind = ConnectorKind::from_service_name(&raw.service_name)?;
        let session_key = source_value(&raw.attributes, kind.session_keys())
            .map(|value| self.tokenize("source-session", &[value]));
        let run_key = source_value(&raw.attributes, kind.run_keys())
            .map(|value| self.tokenize("source-run", &[value]));
        let native_event_key = source_value(
            &raw.attributes,
            &["event.id", "event_id", "request_id", "tool_use_id"],
        );
        let identity_basis = event_identity_basis(&raw, native_event_key);
        let connector_instance_id = self.tokenize("connector", &[kind.agent_id()]);
        let event_id = self.tokenize("event", &[&connector_instance_id, &identity_basis]);
        let event_type = kind.event_type(&raw.event_name, &raw.attributes);
        let status = event_status(&raw.attributes, event_type);
        let model_id = model_id(&raw.attributes);

        Ok(NormalizedRunEvent {
            schema_version: 1,
            metadata_schema_version: 1,
            connector_version: bounded_identifier(&raw.service_version, 64, "unknown"),
            connector_instance_id,
            event_id,
            event_identity_method: identity_method(&raw, native_event_key),
            source_event_id: native_event_key.map(|value| self.tokenize("source-event", &[value])),
            source_session_key: session_key,
            source_run_key: run_key,
            source_offset_or_ordinal: Some(ordinal),
            timestamp: raw.timestamp,
            event_type,
            status,
            agent_configuration: AgentConfiguration {
                agent_id: kind.agent_id().into(),
                agent_version_group: bounded_identifier(&raw.service_version, 64, "unknown"),
                model_id,
                model_version: "source-reported".into(),
                source_tier: "experimental".into(),
            },
            duration_ms: duration_ms(&raw.attributes),
            metadata: normalize_metadata(&raw.attributes),
        })
    }

    fn tokenize(&self, namespace: &str, parts: &[&str]) -> String {
        let mut mac =
            Hmac::<Sha256>::new_from_slice(&self.identity_key).expect("HMAC accepts a 32-byte key");
        mac.update(namespace.as_bytes());
        for part in parts {
            mac.update(&[0]);
            mac.update(part.as_bytes());
        }
        URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes())
    }
}

impl ConnectorKind {
    fn from_service_name(service_name: &str) -> RecorderResult<Self> {
        let normalized = service_name.to_ascii_lowercase();
        if normalized.contains("codex") {
            return Ok(Self::Codex);
        }
        if normalized.contains("claude") {
            return Ok(Self::ClaudeCode);
        }
        if normalized.contains("gemini") {
            return Ok(Self::GeminiCli);
        }
        if normalized.contains("opencode") {
            return Ok(Self::OpenCode);
        }
        Err(RecorderError::InvalidInput(
            "unsupported OTLP service".into(),
        ))
    }

    fn agent_id(self) -> &'static str {
        match self {
            Self::Codex => "codex",
            Self::ClaudeCode => "claude-code",
            Self::GeminiCli => "gemini-cli",
            Self::OpenCode => "opencode",
        }
    }

    fn session_keys(self) -> &'static [&'static str] {
        match self {
            Self::Codex => &["conversation.id", "conversation_id", "session.id"],
            Self::ClaudeCode => &["session.id"],
            Self::GeminiCli => &["session.id", "sessionId"],
            Self::OpenCode => &["session.id"],
        }
    }

    fn run_keys(self) -> &'static [&'static str] {
        match self {
            Self::Codex => &["prompt.id", "turn.id"],
            Self::ClaudeCode => &["prompt.id"],
            Self::GeminiCli => &["prompt_id", "prompt.id"],
            Self::OpenCode => &["session.id"],
        }
    }

    fn event_type(self, name: &str, attributes: &HashMap<String, ScalarValue>) -> EventType {
        if matches!(self, Self::OpenCode) {
            return opencode_event_type(name);
        }
        let suffix = name.rsplit('.').next().unwrap_or(name);
        match suffix {
            "conversation_starts" | "session_start" | "config" => EventType::SessionStart,
            "user_prompt" => EventType::RunStart,
            "api_request" => EventType::ModelRequest,
            "api_response" => EventType::RunEnd,
            "sse_event" if is_response_completed(attributes) => EventType::RunEnd,
            "sse_event" => EventType::ModelResponse,
            "tool_result" | "tool_call" => EventType::ToolCall,
            "file_operation" => EventType::FileOperation,
            "session_end" | "session_idle" => EventType::SessionEnd,
            "api_error" | "session_error" => EventType::Error,
            _ => EventType::Other,
        }
    }
}

fn opencode_event_type(name: &str) -> EventType {
    match name.strip_prefix("opencode.").unwrap_or(name) {
        "session.created" => EventType::RunStart,
        "session.idle" | "session.deleted" => EventType::RunEnd,
        "session.error" => EventType::Error,
        "tool.execute.before" | "tool.execute.after" => EventType::ToolCall,
        "file.edited" => EventType::FileOperation,
        _ => EventType::Other,
    }
}

fn event_identity_basis(raw: &RawOtlpEvent, native_event_key: Option<&str>) -> String {
    if let Some(native) = native_event_key {
        return format!("native:{}:{native}", raw.event_name);
    }
    match (&raw.trace_id, &raw.span_id) {
        (Some(trace), Some(span)) => format!(
            "{trace}:{span}:{}",
            raw.timestamp.timestamp_nanos_opt().unwrap_or_default()
        ),
        _ => format!(
            "{}:{}",
            raw.event_name,
            raw.timestamp.timestamp_nanos_opt().unwrap_or_default()
        ),
    }
}

fn identity_method(raw: &RawOtlpEvent, native_event_key: Option<&str>) -> EventIdentityMethod {
    if native_event_key.is_some() {
        EventIdentityMethod::Native
    } else if raw.trace_id.is_some() && raw.span_id.is_some() {
        EventIdentityMethod::TraceSpan
    } else {
        EventIdentityMethod::DeterministicFallback
    }
}

fn normalize_metadata(attributes: &HashMap<String, ScalarValue>) -> Metadata {
    let recognized = recognized_keys();
    Metadata {
        tool_category: source_value(attributes, &["tool_name", "function_name"]).map(tool_category),
        token_input: unsigned_value(
            attributes,
            &[
                "input_token_count",
                "input_tokens",
                "gen_ai.usage.input_tokens",
            ],
        ),
        token_output: unsigned_value(
            attributes,
            &[
                "output_token_count",
                "output_tokens",
                "gen_ai.usage.output_tokens",
            ],
        ),
        cost_amount: decimal_value(attributes, &["cost_usd", "cost.amount"]),
        cost_currency: currency_value(attributes),
        error_type: source_value(attributes, &["error_type", "error.type"]).map(error_type),
        command_category: source_value(attributes, &["command_category"]).map(command_category),
        exit_code_class: source_value(attributes, &["exit_code_class"]).map(exit_code_class),
        artifact_count: unsigned_value(attributes, &["artifact_count"])
            .and_then(|value| u32::try_from(value).ok()),
        dropped_metadata_field_count: attributes
            .keys()
            .filter(|key| !recognized.contains(key.as_str()))
            .count()
            .try_into()
            .unwrap_or(u32::MAX),
        ..Metadata::default()
    }
}

fn recognized_keys() -> HashSet<&'static str> {
    [
        "event.name",
        "name",
        "event.id",
        "event_id",
        "request_id",
        "tool_use_id",
        "conversation.id",
        "conversation_id",
        "session.id",
        "sessionId",
        "prompt.id",
        "prompt_id",
        "turn.id",
        "model",
        "gen_ai.request.model",
        "gen_ai.response.model",
        "tool_name",
        "function_name",
        "input_token_count",
        "input_tokens",
        "gen_ai.usage.input_tokens",
        "output_token_count",
        "output_tokens",
        "gen_ai.usage.output_tokens",
        "cost_usd",
        "cost.amount",
        "cost.currency",
        "error_type",
        "error.type",
        "command_category",
        "exit_code_class",
        "artifact_count",
        "duration_ms",
        "success",
        "status",
        "event.kind",
        "event_kind",
    ]
    .into_iter()
    .collect()
}

fn source_value<'a>(
    attributes: &'a HashMap<String, ScalarValue>,
    keys: &[&str],
) -> Option<&'a str> {
    keys.iter().find_map(|key| match attributes.get(*key) {
        Some(ScalarValue::String(value)) if value.len() <= 256 => Some(value.as_str()),
        _ => None,
    })
}

fn unsigned_value(attributes: &HashMap<String, ScalarValue>, keys: &[&str]) -> Option<u64> {
    keys.iter().find_map(|key| match attributes.get(*key) {
        Some(ScalarValue::Integer(value)) => Some(*value),
        _ => None,
    })
}

fn decimal_value(attributes: &HashMap<String, ScalarValue>, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| match attributes.get(*key) {
        Some(ScalarValue::Double(value)) if value.is_finite() && *value >= 0.0 => {
            Some(format!("{value:.6}"))
        }
        Some(ScalarValue::Integer(value)) => Some(format!("{value}.000000")),
        _ => None,
    })
}

fn currency_value(attributes: &HashMap<String, ScalarValue>) -> Option<String> {
    source_value(attributes, &["cost.currency"]).and_then(|value| {
        let currency = value.to_ascii_uppercase();
        (currency.len() == 3 && currency.bytes().all(|byte| byte.is_ascii_uppercase()))
            .then_some(currency)
    })
}

fn model_id(attributes: &HashMap<String, ScalarValue>) -> String {
    source_value(
        attributes,
        &["model", "gen_ai.response.model", "gen_ai.request.model"],
    )
    .map(|value| bounded_identifier(value, 128, "unknown"))
    .unwrap_or_else(|| "unknown".into())
}

fn bounded_identifier(value: &str, limit: usize, fallback: &str) -> String {
    let valid = !value.is_empty()
        && value.len() <= limit
        && value.bytes().all(|byte| {
            byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':' | b'/')
        });
    if valid {
        value.to_owned()
    } else {
        fallback.to_owned()
    }
}

fn duration_ms(attributes: &HashMap<String, ScalarValue>) -> Option<u64> {
    unsigned_value(attributes, &["duration_ms"]).filter(|value| *value <= 86_400_000)
}

fn is_response_completed(attributes: &HashMap<String, ScalarValue>) -> bool {
    source_value(attributes, &["event.kind", "event_kind"])
        .is_some_and(|value| value == "response.completed")
}

fn event_status(attributes: &HashMap<String, ScalarValue>, event_type: EventType) -> EventStatus {
    if matches!(attributes.get("success"), Some(ScalarValue::Boolean(true))) {
        return EventStatus::Succeeded;
    }
    if matches!(attributes.get("success"), Some(ScalarValue::Boolean(false))) {
        return EventStatus::Failed;
    }
    match source_value(attributes, &["status"]) {
        Some("success" | "succeeded" | "ok") => EventStatus::Succeeded,
        Some("failed" | "error") => EventStatus::Failed,
        Some("cancelled" | "canceled") => EventStatus::Cancelled,
        Some("started" | "running") => EventStatus::Started,
        _ if event_type.is_run_start() => EventStatus::Started,
        _ => EventStatus::Unknown,
    }
}

fn tool_category(value: &str) -> ToolCategory {
    let normalized = value.to_ascii_lowercase();
    if normalized.contains("read") {
        ToolCategory::Read
    } else if normalized.contains("write") {
        ToolCategory::Write
    } else if normalized.contains("edit") {
        ToolCategory::Edit
    } else if normalized.contains("search") || normalized.contains("grep") {
        ToolCategory::Search
    } else if normalized.contains("shell") || normalized.contains("bash") {
        ToolCategory::Shell
    } else if normalized.contains("browser") {
        ToolCategory::Browser
    } else {
        ToolCategory::Other
    }
}

fn error_type(value: &str) -> ErrorType {
    match value.to_ascii_lowercase().as_str() {
        "auth" | "authentication" => ErrorType::Auth,
        "permission" | "forbidden" => ErrorType::Permission,
        "not_found" | "notfound" => ErrorType::NotFound,
        "timeout" => ErrorType::Timeout,
        "rate_limit" | "ratelimit" => ErrorType::RateLimit,
        "validation" => ErrorType::Validation,
        "tool_failure" => ErrorType::ToolFailure,
        "network" => ErrorType::Network,
        "cancelled" | "canceled" => ErrorType::Cancelled,
        _ => ErrorType::Unknown,
    }
}

fn command_category(value: &str) -> CommandCategory {
    match value {
        "build" => CommandCategory::Build,
        "test" => CommandCategory::Test,
        "lint" => CommandCategory::Lint,
        "format" => CommandCategory::Format,
        "package" => CommandCategory::Package,
        "git" => CommandCategory::Git,
        "file" => CommandCategory::File,
        "network" => CommandCategory::Network,
        "process" => CommandCategory::Process,
        _ => CommandCategory::Other,
    }
}

fn exit_code_class(value: &str) -> ExitCodeClass {
    match value {
        "success" => ExitCodeClass::Success,
        "nonzero" => ExitCodeClass::Nonzero,
        "signal" => ExitCodeClass::Signal,
        _ => ExitCodeClass::Unknown,
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use chrono::Utc;

    use super::{EventNormalizer, RawOtlpEvent, ScalarValue};
    use crate::domain::{EventType, ToolCategory};
    use crate::ingestion::otlp_json::parse_otlp_logs;

    #[test]
    fn drops_raw_content_and_tokenizes_source_identity() {
        let mut attributes = HashMap::new();
        attributes.insert(
            "conversation.id".into(),
            ScalarValue::String("/Users/alice/private".into()),
        );
        attributes.insert(
            "prompt".into(),
            ScalarValue::String("do not persist me".into()),
        );
        attributes.insert("tool_name".into(), ScalarValue::String("ReadFile".into()));
        let raw = RawOtlpEvent {
            service_name: "codex".into(),
            service_version: "0.146.0".into(),
            event_name: "codex.user_prompt".into(),
            timestamp: Utc::now(),
            trace_id: None,
            span_id: None,
            attributes,
        };
        let normalized = EventNormalizer::new([2_u8; 32])
            .normalize_batch(vec![raw])
            .expect("normalize")
            .remove(0);
        let serialized = serde_json::to_string(&normalized).expect("serialize");

        assert_eq!(normalized.event_type, EventType::RunStart);
        assert!(matches!(
            normalized.metadata.tool_category,
            Some(ToolCategory::Read)
        ));
        assert!(!serialized.contains("do not persist"));
        assert!(!serialized.contains("/Users/alice"));
    }

    #[test]
    fn frozen_connector_fixtures_normalize_without_raw_content() {
        let fixtures = [
            include_bytes!("../../tests/fixtures/codex-otlp.json").as_slice(),
            include_bytes!("../../tests/fixtures/claude-code-otlp.json").as_slice(),
            include_bytes!("../../tests/fixtures/gemini-cli-otlp.json").as_slice(),
            include_bytes!("../../tests/fixtures/opencode-otlp.json").as_slice(),
        ];
        let normalizer = EventNormalizer::new([8_u8; 32]);

        for fixture in fixtures {
            let raw = parse_otlp_logs(fixture).expect("fixture parses");
            let normalized = normalizer.normalize_batch(raw).expect("fixture normalizes");
            let encoded = serde_json::to_string(&normalized).expect("serialize");
            assert_eq!(normalized.len(), 2);
            assert!(!encoded.contains("FORBIDDEN_"));
            assert!(!encoded.contains("session-fixture"));
        }
    }

    #[test]
    fn native_event_identity_is_stable_across_batch_positions() {
        let fixture = include_bytes!("../../tests/fixtures/codex-otlp.json");
        let raw = parse_otlp_logs(fixture).expect("fixture parses");
        let normalizer = EventNormalizer::new([7_u8; 32]);
        let first = normalizer
            .normalize_batch(vec![raw[0].clone()])
            .expect("single")[0]
            .event_id
            .clone();
        let second = normalizer.normalize_batch(raw).expect("batch")[0]
            .event_id
            .clone();
        assert_eq!(first, second);
    }
}
