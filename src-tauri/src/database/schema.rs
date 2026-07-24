use rusqlite::Connection;

use crate::error::RecorderResult;

pub fn migrate(connection: &Connection) -> RecorderResult<()> {
    connection.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS agent_configurations (
            config_id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            agent_version_group TEXT NOT NULL,
            model_id TEXT NOT NULL,
            model_version TEXT NOT NULL,
            UNIQUE(agent_id, agent_version_group, model_id, model_version)
        );

        CREATE TABLE IF NOT EXISTS tasks (
            task_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            comparison_category_l1 TEXT,
            comparison_category_l2 TEXT,
            category_source TEXT NOT NULL,
            pre_run_difficulty INTEGER,
            pre_run_difficulty_source TEXT NOT NULL,
            post_hoc_confirmed_difficulty INTEGER,
            project_ref TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS task_overall_results (
            task_id TEXT PRIMARY KEY REFERENCES tasks(task_id) ON DELETE CASCADE,
            outcome TEXT NOT NULL,
            human_intervention TEXT NOT NULL,
            source TEXT NOT NULL CHECK(source = 'user'),
            confirmed_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            connector_instance_id TEXT NOT NULL,
            source_session_key TEXT,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            identity_method TEXT NOT NULL,
            UNIQUE(connector_instance_id, source_session_key)
        );

        CREATE TABLE IF NOT EXISTS runs (
            run_id TEXT PRIMARY KEY,
            task_id TEXT REFERENCES tasks(task_id),
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            agent_config_id TEXT NOT NULL REFERENCES agent_configurations(config_id),
            source_tier TEXT NOT NULL,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            lifecycle_status TEXT NOT NULL CHECK(lifecycle_status IN ('open', 'closed')),
            source_execution_status TEXT NOT NULL,
            retry_of TEXT REFERENCES runs(run_id),
            boundary_source TEXT NOT NULL,
            identity_method TEXT NOT NULL,
            connector_version TEXT NOT NULL,
            source_run_key TEXT,
            UNIQUE(session_id, source_run_key)
        );

        CREATE TABLE IF NOT EXISTS run_evaluations (
            run_id TEXT PRIMARY KEY REFERENCES runs(run_id) ON DELETE CASCADE,
            outcome TEXT NOT NULL,
            human_intervention TEXT NOT NULL,
            source TEXT NOT NULL,
            evaluated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS events (
            event_id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
            event_type TEXT NOT NULL,
            status TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            duration_ms INTEGER,
            metadata_schema_version INTEGER NOT NULL,
            metadata_json TEXT NOT NULL,
            identity_method TEXT NOT NULL,
            token_input INTEGER,
            token_output INTEGER
        );

        CREATE TABLE IF NOT EXISTS task_agent_observations (
            observation_id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
            agent_config_id TEXT NOT NULL REFERENCES agent_configurations(config_id),
            first_run_id TEXT NOT NULL REFERENCES runs(run_id),
            terminal_run_id TEXT NOT NULL REFERENCES runs(run_id),
            run_count INTEGER NOT NULL,
            retry_count INTEGER NOT NULL,
            first_attempt_outcome TEXT NOT NULL,
            final_outcome TEXT NOT NULL,
            final_run_intervention TEXT NOT NULL,
            max_intervention TEXT NOT NULL,
            status TEXT NOT NULL,
            settled_at TEXT,
            settlement_source TEXT,
            aggregation_version INTEGER NOT NULL,
            UNIQUE(task_id, agent_config_id)
        );

        CREATE TABLE IF NOT EXISTS boundary_revisions (
            revision_id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
            previous_ended_at TEXT NOT NULL,
            new_ended_at TEXT NOT NULL,
            previous_boundary_source TEXT NOT NULL,
            new_boundary_source TEXT NOT NULL,
            trigger_event_id TEXT NOT NULL REFERENCES events(event_id),
            reason TEXT NOT NULL,
            revision_version INTEGER NOT NULL,
            UNIQUE(run_id, revision_version)
        );

        CREATE TABLE IF NOT EXISTS import_ledger (
            connector_instance_id TEXT NOT NULL,
            source_artifact_token TEXT NOT NULL,
            connector_version TEXT NOT NULL,
            schema_version INTEGER NOT NULL,
            cursor TEXT,
            last_committed_identity TEXT,
            status TEXT NOT NULL,
            started_at TEXT NOT NULL,
            completed_at TEXT,
            PRIMARY KEY(connector_instance_id, source_artifact_token)
        );

        CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);
        CREATE INDEX IF NOT EXISTS idx_runs_task_config ON runs(task_id, agent_config_id);
        CREATE INDEX IF NOT EXISTS idx_events_run_timestamp ON events(run_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_sessions_connector ON sessions(connector_instance_id);

        INSERT OR IGNORE INTO schema_migrations(version, applied_at)
        VALUES (1, datetime('now'));
        ",
    )?;
    Ok(())
}
