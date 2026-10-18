use tauri::Manager;

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![ping])
        .setup(|app| {
            log::info!("KubeView desktop shell initialized");
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_title("KubeView (Development)");
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running KubeView desktop application");
}
