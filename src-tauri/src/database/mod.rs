mod schema;

use std::{
    path::Path,
    sync::{Arc, Mutex, MutexGuard},
};

use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use hmac::{Hmac, Mac};
use rusqlite::{Connection, OptionalExtension, params};
use serde::Serialize;
use sha2::Sha256;

use crate::{
    domain::{EventStatus, NormalizedRunEvent},
    error::{RecorderError, RecorderResult},
};

#[derive(Clone)]
pub struct Database {
    connection: Arc<Mutex<Connection>>,
    identity_key: [u8; 32],
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordedRun {
    pub run_id: String,
    pub agent_id: String,
    pub model_id: String,
    pub source_tier: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub lifecycle_status: String,
    pub source_execution_status: String,
    pub event_count: u64,
    pub token_input: Option<u64>,
    pub token_output: Option<u64>,
}

impl Database {
    pub fn open(
        path: &Path,
        database_key: &[u8; 32],
        identity_key: [u8; 32],
    ) -> RecorderResult<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let connection = Connection::open(path)?;
        apply_database_key(&connection, database_key)?;
        verify_sqlcipher(&connection)?;
        schema::migrate(&connection)?;
        Ok(Self {
            connection: Arc::new(Mutex::new(connection)),
            identity_key,
        })
    }

    pub fn ingest_event(&self, event: &NormalizedRunEvent) -> RecorderResult<bool> {
        let mut connection = self.lock()?;
        let transaction = connection.transaction()?;
        let config_id = self.configuration_id(event)?;
        let session_id = self.session_id(event)?;
        upsert_configuration(&transaction, &config_id, event)?;
        upsert_session(&transaction, &session_id, event)?;
        let run_id = self.resolve_run_id(&transaction, &session_id, event)?;
        upsert_run(&transaction, &run_id, &session_id, &config_id, event)?;
        let inserted = insert_event(&transaction, &run_id, event)?;
        if event.event_type.is_run_end() {
            close_run(&transaction, &run_id, event)?;
        }
        transaction.commit()?;
        Ok(inserted)
    }

    pub fn list_runs(&self, limit: u32) -> RecorderResult<Vec<RecordedRun>> {
        let connection = self.lock()?;
        let mut statement = connection.prepare(
            "SELECT r.run_id, c.agent_id, c.model_id, r.source_tier,
                    r.started_at, r.ended_at, r.lifecycle_status,
                    r.source_execution_status, COUNT(e.event_id),
                    SUM(e.token_input), SUM(e.token_output)
             FROM runs r
             JOIN agent_configurations c ON c.config_id = r.agent_config_id
             LEFT JOIN events e ON e.run_id = r.run_id
             GROUP BY r.run_id
             ORDER BY r.started_at DESC, r.run_id DESC
             LIMIT ?1",
        )?;
        let rows = statement.query_map([limit], |row| {
            Ok(RecordedRun {
                run_id: row.get(0)?,
                agent_id: row.get(1)?,
                model_id: row.get(2)?,
                source_tier: row.get(3)?,
                started_at: row.get(4)?,
                ended_at: row.get(5)?,
                lifecycle_status: row.get(6)?,
                source_execution_status: row.get(7)?,
                event_count: row.get::<_, i64>(8)? as u64,
                token_input: row.get::<_, Option<i64>>(9)?.map(|value| value as u64),
                token_output: row.get::<_, Option<i64>>(10)?.map(|value| value as u64),
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn event_count(&self) -> RecorderResult<u64> {
        let connection = self.lock()?;
        let count: i64 =
            connection.query_row("SELECT COUNT(*) FROM events", [], |row| row.get(0))?;
        Ok(count as u64)
    }

    fn resolve_run_id(
        &self,
        transaction: &rusqlite::Transaction<'_>,
        session_id: &str,
        event: &NormalizedRunEvent,
    ) -> RecorderResult<String> {
        if let Some(source_run_key) = &event.source_run_key {
            return self.stable_id("run", &[&event.connector_instance_id, source_run_key]);
        }
        if !event.event_type.is_run_start() {
            let open_run = transaction
                .query_row(
                    "SELECT run_id FROM runs
                     WHERE session_id = ?1 AND lifecycle_status = 'open'
                     ORDER BY started_at DESC LIMIT 1",
                    [session_id],
                    |row| row.get(0),
                )
                .optional()?;
            if let Some(run_id) = open_run {
                return Ok(run_id);
            }
        }
        self.stable_id("run", &[session_id, &event.event_id])
    }

    fn configuration_id(&self, event: &NormalizedRunEvent) -> RecorderResult<String> {
        let config = &event.agent_configuration;
        self.stable_id(
            "config",
            &[
                &config.agent_id,
                &config.agent_version_group,
                &config.model_id,
                &config.model_version,
            ],
        )
    }

    fn session_id(&self, event: &NormalizedRunEvent) -> RecorderResult<String> {
        let source_key = event
            .source_session_key
            .as_deref()
            .unwrap_or(&event.event_id);
        self.stable_id("session", &[&event.connector_instance_id, source_key])
    }

    fn stable_id(&self, namespace: &str, parts: &[&str]) -> RecorderResult<String> {
        let mut mac = Hmac::<Sha256>::new_from_slice(&self.identity_key)
            .map_err(|_| RecorderError::Crypto)?;
        mac.update(namespace.as_bytes());
        for part in parts {
            mac.update(&[0]);
            mac.update(part.as_bytes());
        }
        Ok(format!(
            "{namespace}_{}",
            URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes())
        ))
    }

    fn lock(&self) -> RecorderResult<MutexGuard<'_, Connection>> {
        self.connection
            .lock()
            .map_err(|_| RecorderError::Database(rusqlite::Error::InvalidQuery))
    }
}

fn apply_database_key(connection: &Connection, key: &[u8; 32]) -> RecorderResult<()> {
    connection.pragma_update(None, "key", format!("x'{}'", hex::encode(key)))?;
    connection.pragma_update(None, "cipher_memory_security", "ON")?;
    connection.pragma_update(None, "foreign_keys", "ON")?;
    connection.pragma_update(None, "journal_mode", "WAL")?;
    connection.pragma_update(None, "synchronous", "FULL")?;
    Ok(())
}

fn verify_sqlcipher(connection: &Connection) -> RecorderResult<()> {
    let version: Option<String> = connection
        .query_row("PRAGMA cipher_version", [], |row| row.get(0))
        .optional()?;
    if version.as_deref().is_some_and(|value| !value.is_empty()) {
        Ok(())
    } else {
        Err(RecorderError::InvalidInput(
            "SQLCipher is unavailable in this build".into(),
        ))
    }
}

fn upsert_configuration(
    transaction: &rusqlite::Transaction<'_>,
    config_id: &str,
    event: &NormalizedRunEvent,
) -> RecorderResult<()> {
    let config = &event.agent_configuration;
    transaction.execute(
        "INSERT INTO agent_configurations (
            config_id, agent_id, agent_version_group, model_id, model_version
         ) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(config_id) DO NOTHING",
        params![
            config_id,
            config.agent_id,
            config.agent_version_group,
            config.model_id,
            config.model_version
        ],
    )?;
    Ok(())
}

fn upsert_session(
    transaction: &rusqlite::Transaction<'_>,
    session_id: &str,
    event: &NormalizedRunEvent,
) -> RecorderResult<()> {
    transaction.execute(
        "INSERT INTO sessions (
            session_id, connector_instance_id, source_session_key,
            started_at, identity_method
         ) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(session_id) DO UPDATE SET
            started_at = MIN(started_at, excluded.started_at)",
        params![
            session_id,
            event.connector_instance_id,
            event.source_session_key,
            event.timestamp.to_rfc3339(),
            enum_string(&event.event_identity_method)?
        ],
    )?;
    Ok(())
}

fn upsert_run(
    transaction: &rusqlite::Transaction<'_>,
    run_id: &str,
    session_id: &str,
    config_id: &str,
    event: &NormalizedRunEvent,
) -> RecorderResult<()> {
    transaction.execute(
        "INSERT INTO runs (
            run_id, session_id, agent_config_id, source_tier, started_at,
            lifecycle_status, source_execution_status, boundary_source,
            identity_method, connector_version, source_run_key
         ) VALUES (?1, ?2, ?3, ?4, ?5, 'open', 'unknown', 'timeout', ?6, ?7, ?8)
         ON CONFLICT(run_id) DO NOTHING",
        params![
            run_id,
            session_id,
            config_id,
            event.agent_configuration.source_tier,
            event.timestamp.to_rfc3339(),
            enum_string(&event.event_identity_method)?,
            event.connector_version,
            event.source_run_key
        ],
    )?;
    Ok(())
}

fn insert_event(
    transaction: &rusqlite::Transaction<'_>,
    run_id: &str,
    event: &NormalizedRunEvent,
) -> RecorderResult<bool> {
    let metadata = serde_json::to_string(&event.metadata)?;
    let inserted = transaction.execute(
        "INSERT INTO events (
            event_id, run_id, event_type, status, timestamp, duration_ms,
            metadata_schema_version, metadata_json, identity_method,
            token_input, token_output
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
         ON CONFLICT(event_id) DO NOTHING",
        params![
            event.event_id,
            run_id,
            enum_string(&event.event_type)?,
            enum_string(&event.status)?,
            event.timestamp.to_rfc3339(),
            optional_i64(event.duration_ms)?,
            event.metadata_schema_version,
            metadata,
            enum_string(&event.event_identity_method)?,
            optional_i64(event.metadata.token_input)?,
            optional_i64(event.metadata.token_output)?
        ],
    )?;
    Ok(inserted == 1)
}

fn close_run(
    transaction: &rusqlite::Transaction<'_>,
    run_id: &str,
    event: &NormalizedRunEvent,
) -> RecorderResult<()> {
    transaction.execute(
        "UPDATE runs SET
            ended_at = ?2,
            lifecycle_status = 'closed',
            source_execution_status = ?3,
            boundary_source = 'explicit'
         WHERE run_id = ?1 AND lifecycle_status = 'open'",
        params![
            run_id,
            event.timestamp.to_rfc3339(),
            source_execution_status(event.status)
        ],
    )?;
    Ok(())
}

fn source_execution_status(status: EventStatus) -> &'static str {
    match status {
        EventStatus::Succeeded => "succeeded",
        EventStatus::Failed => "failed",
        EventStatus::Cancelled => "cancelled",
        EventStatus::Started | EventStatus::Unknown => "unknown",
    }
}

fn enum_string<T: Serialize>(value: &T) -> RecorderResult<String> {
    serde_json::to_value(value)?
        .as_str()
        .map(ToOwned::to_owned)
        .ok_or_else(|| RecorderError::InvalidInput("enum serialization failed".into()))
}

fn optional_i64(value: Option<u64>) -> RecorderResult<Option<i64>> {
    value
        .map(|number| {
            i64::try_from(number)
                .map_err(|_| RecorderError::InvalidInput("numeric value exceeds SQLite".into()))
        })
        .transpose()
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use tempfile::tempdir;

    use crate::{
        domain::{
            AgentConfiguration, EventIdentityMethod, EventStatus, EventType, Metadata,
            NormalizedRunEvent,
        },
        security::KeyManager,
    };

    use super::Database;

    #[test]
    fn stores_events_idempotently_and_closes_runs() {
        let directory = tempdir().expect("tempdir");
        let keys = KeyManager::derive(&[4_u8; 32]).expect("keys");
        let database = Database::open(
            &directory.path().join("recorder.db"),
            &keys.database,
            keys.tokenization,
        )
        .expect("database");
        let mut event = fixture_event(EventType::RunStart, EventStatus::Started);
        assert!(database.ingest_event(&event).expect("insert"));
        assert!(!database.ingest_event(&event).expect("deduplicate"));
        event.event_id = "event-2".into();
        event.event_type = EventType::RunEnd;
        event.status = EventStatus::Succeeded;
        assert!(database.ingest_event(&event).expect("close"));

        let runs = database.list_runs(10).expect("list runs");
        assert_eq!(runs.len(), 1);
        assert_eq!(runs[0].event_count, 2);
        assert_eq!(runs[0].lifecycle_status, "closed");
        assert_eq!(runs[0].source_execution_status, "succeeded");
    }

    fn fixture_event(event_type: EventType, status: EventStatus) -> NormalizedRunEvent {
        NormalizedRunEvent {
            schema_version: 1,
            metadata_schema_version: 1,
            connector_version: "test-1".into(),
            connector_instance_id: "connector-test".into(),
            event_id: "event-1".into(),
            event_identity_method: EventIdentityMethod::Native,
            source_event_id: Some("source-event-1".into()),
            source_session_key: Some("session-1".into()),
            source_run_key: Some("run-1".into()),
            source_offset_or_ordinal: Some(1),
            timestamp: Utc::now(),
            event_type,
            status,
            agent_configuration: AgentConfiguration {
                agent_id: "test-agent".into(),
                agent_version_group: "1".into(),
                model_id: "test-model".into(),
                model_version: "1".into(),
                source_tier: "complete".into(),
            },
            duration_ms: Some(10),
            metadata: Metadata {
                token_input: Some(20),
                token_output: Some(10),
                ..Metadata::default()
            },
        }
    }
}
