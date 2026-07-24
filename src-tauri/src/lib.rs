mod commands;
mod connectors;
mod database;
mod domain;
mod error;
mod ingestion;
mod recorder;
mod security;
mod tray;

use recorder::RecorderCore;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let recorder = tauri::async_runtime::block_on(RecorderCore::initialize(app_data_dir))?;
            app.manage(recorder);
            tray::install(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main"
                && let tauri::WindowEvent::CloseRequested { api, .. } = event
            {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_runtime_status,
            commands::list_recorded_runs,
            commands::list_connector_statuses,
            commands::set_capture_paused,
            commands::plan_connector_install,
            commands::install_connector,
            commands::uninstall_connector,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Agent Run Recorder");
}
