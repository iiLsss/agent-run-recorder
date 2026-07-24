use std::{
    path::PathBuf,
    sync::{
        Arc, RwLock,
        atomic::{AtomicBool, Ordering},
    },
};

use serde::Serialize;

use crate::{
    connectors::{ConnectorId, ConnectorInstallPlan, ConnectorManager, ConnectorRuntimeStatus},
    database::{Database, RecordedRun},
    domain::NormalizedRunEvent,
    error::{RecorderError, RecorderResult},
    ingestion::{EventNormalizer, IngestionHealth, IngestionServer},
    security::{EncryptedSpool, KeyManager},
};

const OTLP_PORT: u16 = 4318;

pub struct RecorderCore {
    database: Database,
    connectors: ConnectorManager,
    paused: Arc<AtomicBool>,
    health: IngestionHealth,
    receiver: RwLock<ReceiverState>,
    spool: EncryptedSpool,
}

#[derive(Clone, Debug)]
enum ReceiverState {
    Listening(String),
    Failed(String),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub capture_paused: bool,
    pub receiver_status: &'static str,
    pub receiver_address: Option<String>,
    pub receiver_error: Option<String>,
    pub accepted_events: u64,
    pub duplicate_events: u64,
    pub rejected_auth: u64,
    pub rejected_payloads: u64,
    pub rate_limited: u64,
    pub stored_events: u64,
    pub spool_bytes: u64,
    pub spool_capacity_bytes: u64,
    pub database_encryption: &'static str,
    pub raw_content_persisted: bool,
}

impl RecorderCore {
    pub async fn initialize(app_data_dir: PathBuf) -> RecorderResult<Self> {
        std::fs::create_dir_all(&app_data_dir)?;
        let keys = KeyManager::load_or_create()?;
        let database = Database::open(
            &app_data_dir.join("agent-run-recorder.db"),
            &keys.database,
            keys.tokenization,
        )?;
        let paused = Arc::new(AtomicBool::new(false));
        let health = IngestionHealth::default();
        let spool = EncryptedSpool::new(app_data_dir.join("spool"), keys.spool)?;
        recover_spool(&spool, &database)?;
        let receiver = start_receiver(
            database.clone(),
            EventNormalizer::new(keys.tokenization),
            keys.connector_token(),
            paused.clone(),
            health.clone(),
            spool.clone(),
        )
        .await;
        let connectors =
            ConnectorManager::new(&app_data_dir, keys.config_backup, keys.connector_token())?;
        Ok(Self {
            database,
            connectors,
            paused,
            health,
            receiver: RwLock::new(receiver),
            spool,
        })
    }

    pub fn runtime_status(&self) -> RecorderResult<RuntimeStatus> {
        let receiver = self
            .receiver
            .read()
            .map_err(|_| RecorderError::Ingestion("receiver state unavailable".into()))?;
        let (status, address, error) = match &*receiver {
            ReceiverState::Listening(address) => ("listening", Some(address.clone()), None),
            ReceiverState::Failed(error) => ("failed", None, Some(error.clone())),
        };
        Ok(RuntimeStatus {
            capture_paused: self.paused.load(Ordering::Relaxed),
            receiver_status: status,
            receiver_address: address,
            receiver_error: error,
            accepted_events: self.health.accepted_events.load(Ordering::Relaxed),
            duplicate_events: self.health.duplicate_events.load(Ordering::Relaxed),
            rejected_auth: self.health.rejected_auth.load(Ordering::Relaxed),
            rejected_payloads: self.health.rejected_payloads.load(Ordering::Relaxed),
            rate_limited: self.health.rate_limited.load(Ordering::Relaxed),
            stored_events: self.database.event_count()?,
            spool_bytes: self.spool.bytes_used()?,
            spool_capacity_bytes: self.spool.capacity_bytes(),
            database_encryption: "SQLCipher AES-256",
            raw_content_persisted: false,
        })
    }

    pub fn set_capture_paused(&self, paused: bool) {
        self.paused.store(paused, Ordering::Relaxed);
    }

    pub fn is_capture_paused(&self) -> bool {
        self.paused.load(Ordering::Relaxed)
    }

    pub fn list_runs(&self, limit: u32) -> RecorderResult<Vec<RecordedRun>> {
        self.database.list_runs(limit.min(500))
    }

    pub fn connector_statuses(&self) -> Vec<ConnectorRuntimeStatus> {
        self.connectors.statuses()
    }

    pub fn connector_plan(&self, connector: ConnectorId) -> ConnectorInstallPlan {
        self.connectors.plan(connector)
    }

    pub fn install_connector(&self, connector: ConnectorId, confirmed: bool) -> RecorderResult<()> {
        self.connectors.install(connector, confirmed)
    }

    pub fn uninstall_connector(
        &self,
        connector: ConnectorId,
        confirmed: bool,
    ) -> RecorderResult<()> {
        self.connectors.uninstall(connector, confirmed)
    }
}

async fn start_receiver(
    database: Database,
    normalizer: EventNormalizer,
    token: String,
    paused: Arc<AtomicBool>,
    health: IngestionHealth,
    spool: EncryptedSpool,
) -> ReceiverState {
    match IngestionServer::start(
        OTLP_PORT, database, normalizer, token, paused, health, spool,
    )
    .await
    {
        Ok(address) => ReceiverState::Listening(address.to_string()),
        Err(error) => ReceiverState::Failed(error.to_string()),
    }
}

fn recover_spool(spool: &EncryptedSpool, database: &Database) -> RecorderResult<()> {
    for producer in ["codex", "claude-code", "gemini-cli", "opencode"] {
        let recovery = spool.recover(producer)?;
        for record in recovery.records {
            let event: NormalizedRunEvent = serde_json::from_slice(&record)?;
            database.ingest_event(&event)?;
        }
        spool.clear(producer)?;
    }
    Ok(())
}
