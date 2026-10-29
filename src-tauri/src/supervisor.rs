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
use tokio::process::{Child, Command};
use tokio::sync::{mpsc, oneshot, Mutex};
use tokio::time::timeout;

type PendingMap = Arc<Mutex<HashMap<String, oneshot::Sender<Result<Value, Value>>>>>;
type StdinSlot = Arc<Mutex<Option<mpsc::Sender<String>>>>;

pub struct EngineSupervisor {
    stdin_tx: StdinSlot,
    pending: PendingMap,
    req_counter: AtomicU64,
}

impl EngineSupervisor {
    pub async fn start(app: AppHandle) -> Result<Arc<Self>, String> {
        let bin_path = find_engine_binary()?;
        info!("Spawning Go engine sidecar from: {:?}", bin_path);

        let pending: PendingMap = Arc::new(Mutex::new(HashMap::new()));
        let stdin_tx: StdinSlot = Arc::new(Mutex::new(None));

        let child =
            spawn_engine(&app, &bin_path, Arc::clone(&pending), Arc::clone(&stdin_tx)).await?;

        let supervisor = Arc::new(Self {
            stdin_tx,
            pending: Arc::clone(&pending),
            req_counter: AtomicU64::new(1),
        });

        // Do not block app startup on a slow engine handshake.
        match timeout(
            Duration::from_secs(5),
            supervisor.send_request(
                "handshake",
                Some(json!({
                    "clientVersion": "0.1.0",
                    "protocolVersion": "1.0.0",
                    "capabilities": ["clusters", "diagnostics"]
                })),
            ),
        )
        .await
        {
            Ok(Ok(res)) => info!("Engine handshake succeeded: {:?}", res),
            Ok(Err(e)) => warn!("Engine handshake warning: {}", e),
            Err(_) => warn!("Engine handshake timed out"),
        }

        let app_handle = app.clone();
        let bin_path_clone = bin_path.clone();
        let pending_clone = Arc::clone(&pending);
        let stdin_clone = Arc::clone(&supervisor.stdin_tx);

        tokio::spawn(async move {
            let mut child = child;
            let mut backoff = Duration::from_millis(500);

            loop {
                let started_at = std::time::Instant::now();
                let status = child.wait().await;
                let uptime = started_at.elapsed();
                warn!("Go engine process terminated with status: {:?}", status);
                *stdin_clone.lock().await = None;
                fail_pending(&pending_clone, "Go engine process exited").await;

                if uptime < Duration::from_secs(30) {
                    backoff = std::cmp::min(backoff * 2, Duration::from_secs(30));
                } else {
                    backoff = Duration::from_millis(500);
                }

                loop {
                    tokio::time::sleep(backoff).await;
                    match spawn_engine(
                        &app_handle,
                        &bin_path_clone,
                        Arc::clone(&pending_clone),
                        Arc::clone(&stdin_clone),
                    )
                    .await
                    {
                        Ok(new_child) => {
                            info!("Go engine sidecar restarted after {:?}", uptime);
                            child = new_child;
                            let _ =
                                app_handle.emit("engine:restarted", json!({ "status": "ready" }));
                            break;
                        }
                        Err(e) => {
                            warn!("Failed to restart Go engine: {}", e);
                            backoff = std::cmp::min(backoff * 2, Duration::from_secs(30));
                        }
                    }
                }
            }
        });

        Ok(supervisor)
    }

    pub async fn send_request(&self, method: &str, params: Option<Value>) -> Result<Value, String> {
        let sender = {
            let guard = self.stdin_tx.lock().await;
            guard.clone()
        }
        .ok_or_else(|| "Go engine is not running".to_string())?;

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

        if let Err(e) = sender.send(line).await {
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

async fn spawn_engine(
    app: &AppHandle,
    bin_path: &PathBuf,
    pending: PendingMap,
    stdin_tx: StdinSlot,
) -> Result<Child, String> {
    let mut command = Command::new(bin_path);
    command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);

    #[cfg(windows)]
    {
        // Keep the Go engine from allocating a console window.
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to spawn engine binary at {:?}: {}", bin_path, e))?;

    let mut stdin = child.stdin.take().ok_or("Failed to open child stdin")?;
    let stdout = child.stdout.take().ok_or("Failed to open child stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to open child stderr")?;

    let (tx, mut rx) = mpsc::channel::<String>(256);
    *stdin_tx.lock().await = Some(tx);

    tokio::spawn(async move {
        while let Some(line) = rx.recv().await {
            if stdin.write_all(line.as_bytes()).await.is_err() {
                error!("Failed to write to engine stdin");
                break;
            }
            if stdin.write_all(b"\n").await.is_err() {
                error!("Failed to write newline to engine stdin");
                break;
            }
            let _ = stdin.flush().await;
        }
    });

    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            info!("[go-engine] {}", line);
        }
    });

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
                        let safe_event = method.replace('.', ":");
                        info!(
                            "Forwarding engine notification to UI: {} as {}",
                            method, safe_event
                        );
                        let _ = app_handle.emit(&safe_event, val.get("params"));
                        let _ = app_handle.emit("engine-notification", val);
                    }
                }
                Err(e) => {
                    warn!(
                        "Malformed JSON from engine stdout: {} | raw: {}",
                        e, trimmed
                    );
                }
            }
        }
    });

    Ok(child)
}

async fn fail_pending(pending: &PendingMap, message: &str) {
    let mut map = pending.lock().await;
    for (_, sender) in map.drain() {
        let _ = sender.send(Err(json!({
            "code": "ENGINE_UNAVAILABLE",
            "message": message,
        })));
    }
}

fn find_engine_binary() -> Result<PathBuf, String> {
    let exe_name = if cfg!(windows) {
        "kubeview-engine.exe"
    } else {
        "kubeview-engine"
    };

    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(path) = std::env::var("KUBEVIEW_ENGINE_BIN") {
        if !path.trim().is_empty() {
            candidates.push(PathBuf::from(path));
        }
    }

    candidates.push(PathBuf::from(format!("engine/bin/{exe_name}")));
    candidates.push(PathBuf::from(format!("../engine/bin/{exe_name}")));
    candidates.push(PathBuf::from(format!("../../engine/bin/{exe_name}")));

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            candidates.push(parent.join(exe_name));
        }
    }

    for path in &candidates {
        if path.exists() {
            return Ok(path.clone());
        }
    }

    Err(format!(
        "{} not found. Searched: {:?}. Set KUBEVIEW_ENGINE_BIN to override.",
        exe_name, candidates
    ))
}
