use std::sync::Arc;
use tauri::Manager;

mod supervisor;

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

#[tauri::command]
async fn send_rpc_request(
    method: String,
    params: Option<serde_json::Value>,
    supervisor: tauri::State<'_, Arc<supervisor::EngineSupervisor>>,
) -> Result<serde_json::Value, String> {
    supervisor.send_request(&method, params).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = env_logger::try_init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            log::info!("KubeView desktop shell initialized");

            // Initialize Go Engine Supervisor
            let handle = app.handle().clone();
            let supervisor = tauri::async_runtime::block_on(async move {
                supervisor::EngineSupervisor::start(handle).await
            })
            .map_err(|e| {
                log::error!("Failed to initialize engine supervisor: {}", e);
                e
            })?;

            app.manage(supervisor);

            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_title("KubeView (Development)");
                    window.open_devtools();

                    // If Next.js dev server on :3005 is not running, fall back to bundled static assets
                    if std::net::TcpStream::connect("127.0.0.1:3005").is_err() {
                        log::info!(
                            "Dev server on :3005 not reachable, navigating to bundled frontend"
                        );
                        if let Ok(target_url) = tauri::Url::parse("tauri://localhost") {
                            let _ = window.navigate(target_url);
                        }
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![ping, send_rpc_request])
        .run(tauri::generate_context!())
        .expect("error while running KubeView desktop application");
}
