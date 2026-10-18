use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use log::{error, info, warn};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::sync::{mpsc, oneshot, Mutex};
use tokio::time::timeout;

type PendingMap = Arc<Mutex<HashMap<String, oneshot::Sender<Result<Value, Value>>>>>;

pub struct EngineSupervisor {
    stdin_tx: mpsc::Sender<String>,
    pending: PendingMap,
    req_counter: AtomicU64,
}

impl EngineSupervisor {
    pub async fn start(app: AppHandle) -> Result<Arc<Self>, String> {
        let bin_path = find_engine_binary()?;
        info!("Spawning Go engine sidecar from: {:?}", bin_path);

        let mut child = Command::new(&bin_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn engine binary at {:?}: {}", bin_path, e))?;

        let mut stdin = child.stdin.take().ok_or("Failed to open child stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to open child stdout")?;
        let stderr = child.stderr.take().ok_or("Failed to open child stderr")?;

        let (stdin_tx, mut stdin_rx) = mpsc::channel::<String>(256);
        let pending: PendingMap = Arc::new(Mutex::new(HashMap::new()));

        // Goroutine / task to feed stdin lines
        tokio::spawn(async move {
            while let Some(line) = stdin_rx.recv().await {
                if let Err(e) = stdin.write_all(line.as_bytes()).await {
                    error!("Failed to write to engine stdin: {}", e);
                    break;
                }
                if let Err(e) = stdin.write_all(b"\n").await {
                    error!("Failed to write newline to engine stdin: {}", e);
                    break;
                }
                let _ = stdin.flush().await;
            }
        });

        // Task to read child stderr and pipe to logger
        tokio::spawn(async move {
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                info!("[go-engine] {}", line);
            }
        });

        // Task to read child stdout (JSON-RPC responses and notifications)
        let pending_clone = Arc::clone(&pending);
        let app_handle = app.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }

                match serde_json::from_str::<Value>(trimmed) {
                    Ok(val) => {
                        // Check if it's a response to a pending request (has "id")
                        if let Some(id_val) = val.get("id").filter(|v| !v.is_null()) {
                            let id_key = match id_val {
                                Value::String(s) => s.clone(),
                                Value::Number(n) => n.to_string(),
                                other => other.to_string(),
                            };

                            let mut map = pending_clone.lock().await;
                            if let Some(sender) = map.remove(&id_key) {
                                if let Some(err) = val.get("error").filter(|v| !v.is_null()) {
                                    let _ = sender.send(Err(err.clone()));
                                } else if let Some(res) = val.get("result") {
                                    let _ = sender.send(Ok(res.clone()));
                                } else {
                                    let _ = sender.send(Ok(Value::Null));
                                }
                            }
                        } else if let Some(method) = val.get("method").and_then(|m| m.as_str()) {
                            // It's a server-initiated notification (e.g., clusters.contextsChanged)
                            info!("Forwarding engine notification to UI: {}", method);
                            let _ = app_handle.emit(method, val.get("params"));
                            let _ = app_handle.emit("engine-notification", val);
                        }
                    }
                    Err(e) => {
                        warn!("Malformed JSON from engine stdout: {} | raw: {}", e, trimmed);
                    }
                }
            }
        });

        // Monitor child exit
        tokio::spawn(async move {
            let status = child.wait().await;
            warn!("Go engine process terminated with status: {:?}", status);
        });

        let supervisor = Arc::new(Self {
            stdin_tx,
            pending,
            req_counter: AtomicU64::new(1),
        });

        // Perform initial handshake
        match supervisor
            .send_request("handshake", Some(json!({
                "clientVersion": "0.1.0",
                "protocolVersion": "1.0.0",
                "capabilities": ["clusters", "diagnostics"]
            })))
            .await
        {
            Ok(res) => info!("Engine handshake succeeded: {:?}", res),
            Err(e) => warn!("Engine handshake warning: {}", e),
        }

        Ok(supervisor)
    }

    pub async fn send_request(
        &self,
        method: &str,
        params: Option<Value>,
    ) -> Result<Value, String> {
        let req_id = self.req_counter.fetch_add(1, Ordering::SeqCst);
        let id_str = req_id.to_string();

        let req = json!({
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
            "params": params.unwrap_or(Value::Null),
        });

        let line = req.to_string();
        let (tx, rx) = oneshot::channel();

        {
            let mut map = self.pending.lock().await;
            map.insert(id_str.clone(), tx);
        }

        if let Err(e) = self.stdin_tx.send(line).await {
            let mut map = self.pending.lock().await;
            map.remove(&id_str);
            return Err(format!("Failed to send request to engine: {}", e));
        }

        match timeout(Duration::from_secs(20), rx).await {
            Ok(Ok(Ok(val))) => Ok(val),
            Ok(Ok(Err(err_val))) => Err(err_val.to_string()),
            Ok(Err(_cancelled)) => Err("Engine request was cancelled".to_string()),
            Err(_elapsed) => {
                let mut map = self.pending.lock().await;
                map.remove(&id_str);
                Err(format!("Request '{}' timed out after 20s", method))
            }
        }
    }
}

fn find_engine_binary() -> Result<PathBuf, String> {
    let candidate_paths = [
        // 1. Current working directory relative
        PathBuf::from("engine/bin/kubeview-engine"),
        // 2. Parent directory relative (if running from src-tauri)
        PathBuf::from("../engine/bin/kubeview-engine"),
        // 3. Absolute path in workspace
        PathBuf::from("/Users/alexkgm/KubeView/engine/bin/kubeview-engine"),
    ];

    for path in &candidate_paths {
        if path.exists() {
            return Ok(path.clone());
        }
    }

    // Try current executable directory for production bundle
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            let sidecar = parent.join("kubeview-engine");
            if sidecar.exists() {
                return Ok(sidecar);
            }
        }
    }

    Err(format!(
        "kubeview-engine binary not found. Searched: {:?}",
        candidate_paths
    ))
}
