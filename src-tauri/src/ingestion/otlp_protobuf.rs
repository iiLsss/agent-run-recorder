use std::collections::HashMap;

use chrono::{TimeZone, Utc};
use prost::Message;

use crate::error::{RecorderError, RecorderResult};

use super::otlp_json::{RawOtlpEvent, ScalarValue};

pub fn parse_otlp_protobuf_logs(payload: &[u8]) -> RecorderResult<Vec<RawOtlpEvent>> {
    let request = ExportLogsServiceRequest::decode(payload)
        .map_err(|error| RecorderError::InvalidInput(error.to_string()))?;
    let mut events = Vec::new();
    for resource_logs in request.resource_logs {
        let resource_attributes = key_values(resource_logs.resource.map(|item| item.attributes));
        let service_name =
            string_value(&resource_attributes, "service.name").unwrap_or_else(|| "unknown".into());
        let service_version = string_value(&resource_attributes, "service.version")
            .unwrap_or_else(|| "unknown".into());
        for scope in resource_logs.scope_logs {
            for record in scope.log_records {
                events.push(to_raw_event(record, &service_name, &service_version)?);
                if events.len() > 500 {
                    return Err(RecorderError::InvalidInput(
                        "OTLP request contains too many events".into(),
                    ));
                }
            }
        }
    }
    Ok(events)
}

fn to_raw_event(
    record: LogRecord,
    service_name: &str,
    service_version: &str,
) -> RecorderResult<RawOtlpEvent> {
    let attributes = key_values(Some(record.attributes));
    let event_name = string_value(&attributes, "event.name")
        .or_else(|| string_value(&attributes, "name"))
        .or_else(|| {
            record
                .body
                .and_then(any_value)
                .and_then(|value| match value {
                    ScalarValue::String(value) => Some(value),
                    _ => None,
                })
        })
        .filter(|name| is_known_event_name(name))
        .ok_or_else(|| RecorderError::InvalidInput("missing event name".into()))?;
    let nanos = if record.time_unix_nano == 0 {
        record.observed_time_unix_nano
    } else {
        record.time_unix_nano
    };
    let nanos = i64::try_from(nanos)
        .map_err(|_| RecorderError::InvalidInput("invalid event timestamp".into()))?;
    Ok(RawOtlpEvent {
        service_name: service_name.to_owned(),
        service_version: service_version.to_owned(),
        event_name,
        timestamp: Utc.timestamp_nanos(nanos),
        trace_id: bounded_hex_bytes(record.trace_id),
        span_id: bounded_hex_bytes(record.span_id),
        attributes,
    })
}

fn key_values(values: Option<Vec<KeyValue>>) -> HashMap<String, ScalarValue> {
    values
        .into_iter()
        .flatten()
        .filter(|item| item.key.len() <= 128)
        .filter_map(|item| Some((item.key, any_value(item.value?)?)))
        .collect()
}

fn any_value(value: AnyValue) -> Option<ScalarValue> {
    match value.value? {
        any_value::Value::StringValue(value) => Some(ScalarValue::String(value)),
        any_value::Value::BoolValue(value) => Some(ScalarValue::Boolean(value)),
        any_value::Value::IntValue(value) => u64::try_from(value).ok().map(ScalarValue::Integer),
        any_value::Value::DoubleValue(value) => Some(ScalarValue::Double(value)),
        any_value::Value::ArrayValue(_)
        | any_value::Value::KvlistValue(_)
        | any_value::Value::BytesValue(_) => None,
    }
}

fn string_value(attributes: &HashMap<String, ScalarValue>, key: &str) -> Option<String> {
    match attributes.get(key) {
        Some(ScalarValue::String(value)) if value.len() <= 256 => Some(value.clone()),
        _ => None,
    }
}

fn bounded_hex_bytes(value: Vec<u8>) -> Option<String> {
    (!value.is_empty() && value.len() <= 32).then(|| hex::encode(value))
}

fn is_known_event_name(name: &str) -> bool {
    ["codex.", "claude_code.", "gemini_cli.", "opencode."]
        .iter()
        .any(|prefix| name.starts_with(prefix))
        && name.len() <= 96
}

#[derive(Clone, PartialEq, Message)]
struct ExportLogsServiceRequest {
    #[prost(message, repeated, tag = "1")]
    resource_logs: Vec<ResourceLogs>,
}

#[derive(Clone, PartialEq, Message)]
struct ResourceLogs {
    #[prost(message, optional, tag = "1")]
    resource: Option<Resource>,
    #[prost(message, repeated, tag = "2")]
    scope_logs: Vec<ScopeLogs>,
}

#[derive(Clone, PartialEq, Message)]
struct Resource {
    #[prost(message, repeated, tag = "1")]
    attributes: Vec<KeyValue>,
}

#[derive(Clone, PartialEq, Message)]
struct ScopeLogs {
    #[prost(message, repeated, tag = "2")]
    log_records: Vec<LogRecord>,
}

#[derive(Clone, PartialEq, Message)]
struct LogRecord {
    #[prost(fixed64, tag = "1")]
    time_unix_nano: u64,
    #[prost(message, optional, tag = "5")]
    body: Option<AnyValue>,
    #[prost(message, repeated, tag = "6")]
    attributes: Vec<KeyValue>,
    #[prost(bytes = "vec", tag = "9")]
    trace_id: Vec<u8>,
    #[prost(bytes = "vec", tag = "10")]
    span_id: Vec<u8>,
    #[prost(fixed64, tag = "11")]
    observed_time_unix_nano: u64,
}

#[derive(Clone, PartialEq, Message)]
struct KeyValue {
    #[prost(string, tag = "1")]
    key: String,
    #[prost(message, optional, tag = "2")]
    value: Option<AnyValue>,
}

#[derive(Clone, PartialEq, Message)]
struct AnyValue {
    #[prost(oneof = "any_value::Value", tags = "1, 2, 3, 4, 5, 6, 7")]
    value: Option<any_value::Value>,
}

mod any_value {
    use prost::Oneof;

    use super::{ArrayValue, KeyValueList};

    #[derive(Clone, PartialEq, Oneof)]
    pub enum Value {
        #[prost(string, tag = "1")]
        StringValue(String),
        #[prost(bool, tag = "2")]
        BoolValue(bool),
        #[prost(int64, tag = "3")]
        IntValue(i64),
        #[prost(double, tag = "4")]
        DoubleValue(f64),
        #[prost(message, tag = "5")]
        ArrayValue(ArrayValue),
        #[prost(message, tag = "6")]
        KvlistValue(KeyValueList),
        #[prost(bytes, tag = "7")]
        BytesValue(Vec<u8>),
    }
}

#[derive(Clone, PartialEq, Message)]
struct ArrayValue {
    #[prost(message, repeated, tag = "1")]
    values: Vec<AnyValue>,
}

#[derive(Clone, PartialEq, Message)]
struct KeyValueList {
    #[prost(message, repeated, tag = "1")]
    values: Vec<KeyValue>,
}

#[cfg(test)]
mod tests {
    use prost::Message;

    use super::{
        AnyValue, ExportLogsServiceRequest, KeyValue, LogRecord, Resource, ResourceLogs, ScopeLogs,
        any_value, parse_otlp_protobuf_logs,
    };

    #[test]
    fn parses_otlp_protobuf_logs() {
        let request = ExportLogsServiceRequest {
            resource_logs: vec![ResourceLogs {
                resource: Some(Resource {
                    attributes: vec![string_attribute("service.name", "gemini-cli")],
                }),
                scope_logs: vec![ScopeLogs {
                    log_records: vec![LogRecord {
                        time_unix_nano: 1_784_880_200_000_000_000,
                        body: Some(string_any("gemini_cli.api_request")),
                        attributes: vec![string_attribute("prompt_id", "turn-1")],
                        trace_id: vec![1; 16],
                        span_id: vec![2; 8],
                        observed_time_unix_nano: 0,
                    }],
                }],
            }],
        };
        let events = parse_otlp_protobuf_logs(&request.encode_to_vec()).expect("parse");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].service_name, "gemini-cli");
        assert_eq!(events[0].event_name, "gemini_cli.api_request");
    }

    fn string_attribute(key: &str, value: &str) -> KeyValue {
        KeyValue {
            key: key.into(),
            value: Some(string_any(value)),
        }
    }

    fn string_any(value: &str) -> AnyValue {
        AnyValue {
            value: Some(any_value::Value::StringValue(value.into())),
        }
    }
}
