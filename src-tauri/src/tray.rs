use tauri::{
    App, Manager,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

use crate::recorder::RecorderCore;

const SHOW_ID: &str = "show";
const PAUSE_ID: &str = "toggle-capture";
const QUIT_ID: &str = "quit";

pub fn install(app: &mut App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, SHOW_ID, "显示 Agent Run Recorder", true, None::<&str>)?;
    let pause = MenuItem::with_id(app, PAUSE_ID, "暂停采集", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, QUIT_ID, "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &pause, &separator, &quit])?;
    let pause_item = pause.clone();

    let mut builder = TrayIconBuilder::with_id("recorder")
        .menu(&menu)
        .tooltip("Agent Run Recorder · 本地采集")
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            SHOW_ID => show_main_window(app),
            PAUSE_ID => {
                let state = app.state::<RecorderCore>();
                let paused = !state.is_capture_paused();
                state.set_capture_paused(paused);
                let _ = pause_item.set_text(if paused {
                    "恢复采集"
                } else {
                    "暂停采集"
                });
            }
            QUIT_ID => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(
                event,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
            ) {
                show_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }
    builder.build(app)?;
    Ok(())
}

fn show_main_window(manager: &impl Manager<tauri::Wry>) {
    if let Some(window) = manager.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}
