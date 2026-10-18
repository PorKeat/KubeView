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
                    window.open_devtools();

                    // If Next.js dev server on :3000 is not running, fall back to bundled static assets
                    if std::net::TcpStream::connect("127.0.0.1:3000").is_err() {
                        log::info!("Dev server on :3000 not reachable, navigating to bundled frontend");
                        if let Ok(target_url) = tauri::Url::parse("tauri://localhost") {
                            let _ = window.navigate(target_url);
                        }
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running KubeView desktop application");
}
