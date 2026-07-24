use std::{
    collections::HashSet,
    net::{IpAddr, Ipv4Addr, SocketAddr},
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    time::{Duration, Instant},
};

use axum::{
    Router,
    body::Bytes,
    extract::{DefaultBodyLimit, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
};
use serde::Serialize;
use tokio::net::TcpListener;

use crate::{database::Database, error::RecorderResult, security::EncryptedSpool};

use super::{normalizer::EventNormalizer, otlp_json::parse_otlp_logs};

const MAX_REQUEST_BYTES: usize = 1_048_576;
const REQUESTS_PER_SECOND: u32 = 100;

#[derive(Clone, Default)]
pub struct IngestionHealth {
    pub accepted_events: Arc<AtomicU64>,
    pub duplicate_events: Arc<AtomicU64>,
    pub rejected_auth: Arc<AtomicU64>,
    pub rejected_payloads: Arc<AtomicU64>,
    pub rate_limited: Arc<AtomicU64>,
}

pub struct IngestionServer;

#[derive(Clone)]
struct ServerState {
    database: Database,
    normalizer: EventNormalizer,
    token: String,
    paused: Arc<AtomicBool>,
    health: IngestionHealth,
    limiter: Arc<RateLimiter>,
    spool: EncryptedSpool,
    spool_ordinal: Arc<AtomicU64>,
    ingestion_gate: Arc<tokio::sync::Mutex<()>>,
}

#[derive(Default)]
struct RateLimiter {
    window: Mutex<Option<RateWindow>>,
}

struct RateWindow {
    started_at: Instant,
    request_count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HealthResponse {
    status: &'static str,
    bind: &'static str,
    accepted_events: u64,
}

impl IngestionServer {
    pub async fn start(
        port: u16,
        database: Database,
        normalizer: EventNormalizer,
        token: String,
        paused: Arc<AtomicBool>,
        health: IngestionHealth,
        spool: EncryptedSpool,
    ) -> RecorderResult<SocketAddr> {
        let address = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port);
        let listener = TcpListener::bind(address).await?;
        let bound_address = listener.local_addr()?;
        let state = ServerState {
            database,
            normalizer,
            token,
            paused,
            health,
            limiter: Arc::new(RateLimiter::default()),
            spool,
            spool_ordinal: Arc::new(AtomicU64::new(0)),
            ingestion_gate: Arc::new(tokio::sync::Mutex::new(())),
        };
        let app = Router::new()
            .route("/health", get(health_handler))
            .route("/v1/logs", post(authenticated_logs))
            .route("/v1/compat/logs", post(compatibility_logs))
            .route("/v1/metrics", post(discard_unsupported_signal))
            .route("/v1/traces", post(discard_unsupported_signal))
            .layer(DefaultBodyLimit::max(MAX_REQUEST_BYTES))
            .with_state(state);
        tokio::spawn(async move {
            if let Err(error) = axum::serve(listener, app).await {
                eprintln!("ingestion server stopped: {error}");
            }
        });
        Ok(bound_address)
    }
}

async fn health_handler(State(state): State<ServerState>) -> impl IntoResponse {
    axum::Json(HealthResponse {
        status: if state.paused.load(Ordering::Relaxed) {
            "paused"
        } else {
            "ok"
        },
        bind: "127.0.0.1",
        accepted_events: state.health.accepted_events.load(Ordering::Relaxed),
    })
}

async fn authenticated_logs(
    State(state): State<ServerState>,
    headers: HeaderMap,
    payload: Bytes,
) -> impl IntoResponse {
    if !constant_time_token_matches(&headers, &state.token) {
        return ingest_payload(&state, payload, true).await;
    }
    ingest_payload(&state, payload, false).await
}

async fn compatibility_logs(State(state): State<ServerState>, payload: Bytes) -> impl IntoResponse {
    ingest_payload(&state, payload, true).await
}

async fn discard_unsupported_signal() -> impl IntoResponse {
    StatusCode::NO_CONTENT
}

async fn ingest_payload(
    state: &ServerState,
    payload: Bytes,
    compatibility_mode: bool,
) -> StatusCode {
    let _guard = state.ingestion_gate.lock().await;
    if state.paused.load(Ordering::Relaxed) {
        return StatusCode::SERVICE_UNAVAILABLE;
    }
    if !state.limiter.allow() {
        state.health.rate_limited.fetch_add(1, Ordering::Relaxed);
        return StatusCode::TOO_MANY_REQUESTS;
    }
    let raw_events = match parse_otlp_logs(&payload) {
        Ok(events) => events,
        Err(_) => return reject_payload(state),
    };
    if compatibility_mode
        && raw_events
            .iter()
            .any(|event| !event.service_name.to_ascii_lowercase().contains("gemini"))
    {
        state.health.rejected_auth.fetch_add(1, Ordering::Relaxed);
        return StatusCode::FORBIDDEN;
    }
    let events = match state.normalizer.normalize_batch(raw_events) {
        Ok(events) => events,
        Err(_) => return reject_payload(state),
    };
    let mut producers = HashSet::new();
    for event in &events {
        let producer = event.agent_configuration.agent_id.as_str();
        let ordinal = state.spool_ordinal.fetch_add(1, Ordering::Relaxed);
        let encoded = match serde_json::to_vec(event) {
            Ok(encoded) => encoded,
            Err(_) => return StatusCode::INTERNAL_SERVER_ERROR,
        };
        if state.spool.append(producer, ordinal, &encoded).is_err() {
            return StatusCode::INSUFFICIENT_STORAGE;
        }
        producers.insert(producer.to_owned());
    }
    for event in &events {
        match state.database.ingest_event(&event) {
            Ok(true) => {
                state.health.accepted_events.fetch_add(1, Ordering::Relaxed);
            }
            Ok(false) => {
                state
                    .health
                    .duplicate_events
                    .fetch_add(1, Ordering::Relaxed);
            }
            Err(_) => return StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
    for producer in producers {
        if state.spool.clear(&producer).is_err() {
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    }
    StatusCode::OK
}

fn reject_payload(state: &ServerState) -> StatusCode {
    state
        .health
        .rejected_payloads
        .fetch_add(1, Ordering::Relaxed);
    StatusCode::BAD_REQUEST
}

fn constant_time_token_matches(headers: &HeaderMap, expected: &str) -> bool {
    let Some(actual) = headers
        .get("x-agent-run-recorder-token")
        .and_then(|value| value.to_str().ok())
    else {
        return false;
    };
    if actual.len() != expected.len() {
        return false;
    }
    actual
        .bytes()
        .zip(expected.bytes())
        .fold(0_u8, |difference, (left, right)| {
            difference | (left ^ right)
        })
        == 0
}

impl RateLimiter {
    fn allow(&self) -> bool {
        let Ok(mut guard) = self.window.lock() else {
            return false;
        };
        let now = Instant::now();
        let window = guard.get_or_insert(RateWindow {
            started_at: now,
            request_count: 0,
        });
        if now.duration_since(window.started_at) >= Duration::from_secs(1) {
            window.started_at = now;
            window.request_count = 0;
        }
        if window.request_count >= REQUESTS_PER_SECOND {
            return false;
        }
        window.request_count += 1;
        true
    }
}

#[cfg(test)]
mod tests {
    use std::sync::{Arc, atomic::AtomicBool};

    use axum::{
        body::Bytes,
        http::{HeaderMap, HeaderValue, StatusCode},
    };
    use tempfile::tempdir;

    use super::{
        IngestionHealth, RateLimiter, ServerState, constant_time_token_matches, ingest_payload,
    };
    use crate::{
        database::Database,
        ingestion::EventNormalizer,
        security::{EncryptedSpool, KeyManager},
    };

    #[test]
    fn requires_exact_connector_token() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-agent-run-recorder-token",
            HeaderValue::from_static("correct"),
        );
        assert!(constant_time_token_matches(&headers, "correct"));
        assert!(!constant_time_token_matches(&headers, "incorrect"));
    }

    #[test]
    fn rate_limiter_rejects_requests_over_budget() {
        let limiter = RateLimiter::default();
        for _ in 0..100 {
            assert!(limiter.allow());
        }
        assert!(!limiter.allow());
    }

    #[tokio::test]
    async fn authenticated_fixture_is_durably_ingested() {
        let directory = tempdir().expect("tempdir");
        let keys = KeyManager::derive(&[6_u8; 32]).expect("keys");
        let database = Database::open(
            &directory.path().join("recorder.db"),
            &keys.database,
            keys.tokenization,
        )
        .expect("database");
        let spool = EncryptedSpool::new(directory.path().join("spool"), keys.spool).expect("spool");
        let state = ServerState {
            database: database.clone(),
            normalizer: EventNormalizer::new(keys.tokenization),
            token: "fixture-token".into(),
            paused: Arc::new(AtomicBool::new(false)),
            health: IngestionHealth::default(),
            limiter: Arc::new(RateLimiter::default()),
            spool: spool.clone(),
            spool_ordinal: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            ingestion_gate: Arc::new(tokio::sync::Mutex::new(())),
        };
        let payload = include_bytes!("../../tests/fixtures/codex-otlp.json");
        let status = ingest_payload(&state, Bytes::copy_from_slice(payload), false).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(database.event_count().expect("event count"), 2);
        assert_eq!(spool.bytes_used().expect("spool bytes"), 0);
    }
}
