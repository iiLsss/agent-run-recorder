use std::collections::HashMap;

use chrono::{DateTime, TimeZone, Utc};
use serde_json::Value;

use crate::error::{RecorderError, RecorderResult};

const MAX_EVENTS_PER_REQUEST: usize = 500;

#[derive(Clone, Debug)]
pub struct RawOtlpEvent {
    pub service_name: String,
    pub service_version: String,
    pub event_name: String,
    pub timestamp: DateTime<Utc>,
    pub trace_id: Option<String>,
    pub span_id: Option<String>,
    pub attributes: HashMap<String, ScalarValue>,
}

#[derive(Clone, Debug)]
pub enum ScalarValue {
    String(String),
    Integer(u64),
    Boolean(bool),
    Double(f64),
}

pub fn parse_otlp_logs(payload: &[u8]) -> RecorderResult<Vec<RawOtlpEvent>> {
    if !payload
        .iter()
        .copied()
        .find(|byte| !byte.is_ascii_whitespace())
        .is_some_and(|byte| byte == b'{')
    {
        return super::otlp_protobuf::parse_otlp_protobuf_logs(payload);
    }
    let root: Value = serde_json::from_slice(payload)?;
    let resource_logs = root
        .get("resourceLogs")
        .and_then(Value::as_array)
        .ok_or_else(|| RecorderError::InvalidInput("missing resourceLogs".into()))?;
    let mut events = Vec::new();

    for resource_log in resource_logs {
        append_resource_events(resource_log, &mut events)?;
        if events.len() > MAX_EVENTS_PER_REQUEST {
            return Err(RecorderError::InvalidInput(
                "OTLP request contains too many events".into(),
            ));
        }
    }
    Ok(events)
}

fn append_resource_events(
    resource_log: &Value,
    events: &mut Vec<RawOtlpEvent>,
) -> RecorderResult<()> {
    let resource_attributes = attribute_map(
        resource_log
            .pointer("/resource/attributes")
            .and_then(Value::as_array),
    );
    let service_name =
        string_attribute(&resource_attributes, "service.name").unwrap_or_else(|| "unknown".into());
    let service_version = string_attribute(&resource_attributes, "service.version")
        .unwrap_or_else(|| "unknown".into());
    let scope_logs = resource_log
        .get("scopeLogs")
        .and_then(Value::as_array)
        .ok_or_else(|| RecorderError::InvalidInput("missing scopeLogs".into()))?;

    for scope_log in scope_logs {
        append_scope_events(scope_log, &service_name, &service_version, events)?;
    }
    Ok(())
}

fn append_scope_events(
    scope_log: &Value,
    service_name: &str,
    service_version: &str,
    events: &mut Vec<RawOtlpEvent>,
) -> RecorderResult<()> {
    let records = scope_log
        .get("logRecords")
        .and_then(Value::as_array)
        .ok_or_else(|| RecorderError::InvalidInput("missing logRecords".into()))?;
    for record in records {
        let attributes = attribute_map(record.get("attributes").and_then(Value::as_array));
        let event_name = event_name(record, &attributes)
            .ok_or_else(|| RecorderError::InvalidInput("missing event name".into()))?;
        events.push(RawOtlpEvent {
            service_name: service_name.to_owned(),
            service_version: service_version.to_owned(),
            event_name,
            timestamp: record_timestamp(record)?,
            trace_id: bounded_hex(record.get("traceId")),
            span_id: bounded_hex(record.get("spanId")),
            attributes,
        });
    }
    Ok(())
}

fn attribute_map(values: Option<&Vec<Value>>) -> HashMap<String, ScalarValue> {
    values
        .into_iter()
        .flatten()
        .filter_map(|entry| {
            let key = entry.get("key")?.as_str()?;
            if key.len() > 128 {
                return None;
            }
            scalar_value(entry.get("value")?).map(|value| (key.to_owned(), value))
        })
        .collect()
}

fn scalar_value(value: &Value) -> Option<ScalarValue> {
    if let Some(string) = value.get("stringValue").and_then(Value::as_str) {
        return Some(ScalarValue::String(string.to_owned()));
    }
    if let Some(integer) = value.get("intValue") {
        return parse_u64(integer).map(ScalarValue::Integer);
    }
    if let Some(boolean) = value.get("boolValue").and_then(Value::as_bool) {
        return Some(ScalarValue::Boolean(boolean));
    }
    value
        .get("doubleValue")
        .and_then(Value::as_f64)
        .map(ScalarValue::Double)
}

fn event_name(record: &Value, attributes: &HashMap<String, ScalarValue>) -> Option<String> {
    ["event.name", "name"]
        .iter()
        .find_map(|key| string_attribute(attributes, key))
        .or_else(|| {
            record
                .pointer("/body/stringValue")
                .and_then(Value::as_str)
                .filter(|name| is_known_event_name(name))
                .map(ToOwned::to_owned)
        })
}

fn is_known_event_name(name: &str) -> bool {
    ["codex.", "claude_code.", "gemini_cli.", "opencode."]
        .iter()
        .any(|prefix| name.starts_with(prefix))
        && name.len() <= 96
}

fn record_timestamp(record: &Value) -> RecorderResult<DateTime<Utc>> {
    let nanos = ["timeUnixNano", "observedTimeUnixNano"]
        .iter()
        .find_map(|key| record.get(key).and_then(parse_i64))
        .ok_or_else(|| RecorderError::InvalidInput("missing event timestamp".into()))?;
    Utc.timestamp_nanos(nanos)
        .to_utc()
        .checked_add_signed(chrono::Duration::zero())
        .ok_or_else(|| RecorderError::InvalidInput("invalid event timestamp".into()))
}

fn parse_u64(value: &Value) -> Option<u64> {
    value
        .as_u64()
        .or_else(|| value.as_str().and_then(|text| text.parse().ok()))
}

fn parse_i64(value: &Value) -> Option<i64> {
    value
        .as_i64()
        .or_else(|| value.as_str().and_then(|text| text.parse().ok()))
}

fn string_attribute(attributes: &HashMap<String, ScalarValue>, key: &str) -> Option<String> {
    match attributes.get(key) {
        Some(ScalarValue::String(value)) if value.len() <= 256 => Some(value.clone()),
        _ => None,
    }
}

fn bounded_hex(value: Option<&Value>) -> Option<String> {
    value
        .and_then(Value::as_str)
        .filter(|text| text.len() <= 64 && text.bytes().all(|byte| byte.is_ascii_hexdigit()))
        .map(ToOwned::to_owned)
}

#[cfg(test)]
mod tests {
    use super::parse_otlp_logs;

    #[test]
    fn parses_only_structural_otlp_fields() {
        let payload = br#"{
          "resourceLogs":[{
            "resource":{"attributes":[
              {"key":"service.name","value":{"stringValue":"codex"}},
              {"key":"service.version","value":{"stringValue":"0.146.0"}}
            ]},
            "scopeLogs":[{"logRecords":[{
              "timeUnixNano":"1753344000000000000",
              "body":{"stringValue":"codex.user_prompt"},
              "attributes":[
                {"key":"conversation.id","value":{"stringValue":"conversation-1"}},
                {"key":"prompt","value":{"stringValue":"secret prompt"}}
              ]
            }]}]
          }]
        }"#;
        let events = parse_otlp_logs(payload).expect("parse");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event_name, "codex.user_prompt");
        assert!(events[0].attributes.contains_key("prompt"));
    }
}
