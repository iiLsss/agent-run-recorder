use tauri::State;

use crate::{
    connectors::{ConnectorId, ConnectorInstallPlan, ConnectorRuntimeStatus},
    database::RecordedRun,
    recorder::{RecorderCore, RuntimeStatus},
};

#[tauri::command]
pub fn get_runtime_status(state: State<'_, RecorderCore>) -> Result<RuntimeStatus, String> {
    state.runtime_status().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_recorded_runs(
    state: State<'_, RecorderCore>,
    limit: Option<u32>,
) -> Result<Vec<RecordedRun>, String> {
    state
        .list_runs(limit.unwrap_or(200))
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_connector_statuses(state: State<'_, RecorderCore>) -> Vec<ConnectorRuntimeStatus> {
    state.connector_statuses()
}

#[tauri::command]
pub fn set_capture_paused(state: State<'_, RecorderCore>, paused: bool) {
    state.set_capture_paused(paused);
}

#[tauri::command]
pub fn plan_connector_install(
    state: State<'_, RecorderCore>,
    connector: ConnectorId,
) -> ConnectorInstallPlan {
    state.connector_plan(connector)
}

#[tauri::command]
pub fn install_connector(
    state: State<'_, RecorderCore>,
    connector: ConnectorId,
    confirmed: bool,
) -> Result<(), String> {
    state
        .install_connector(connector, confirmed)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn uninstall_connector(
    state: State<'_, RecorderCore>,
    connector: ConnectorId,
    confirmed: bool,
) -> Result<(), String> {
    state
        .uninstall_connector(connector, confirmed)
        .map_err(|error| error.to_string())
}
