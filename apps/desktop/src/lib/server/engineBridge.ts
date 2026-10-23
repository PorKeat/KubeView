import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import readline from "readline";
import path from "path";
import fs from "fs";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timer: NodeJS.Timeout;
}

interface JsonRpcResponse {
  id?: unknown;
  result?: unknown;
  error?: unknown;
  method?: string;
  params?: unknown;
}

function engineError(message: string, code: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

class EngineBridge {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<number, PendingRequest>();
  private notificationListeners = new Set<
    (event: string, data: unknown) => void
  >();
  private streamPort: number | null = null;
  private seq = 1;
  private binPath: string | null = null;
  private spawnBlockedUntil = 0;

  public async getStreamPort(): Promise<number> {
    if (this.streamPort) return this.streamPort;
    const res = await this.request<{ streamPort?: number }>("handshake");
    if (!res?.streamPort) {
      throw new Error(
        "Streaming server port not available from engine handshake",
      );
    }
    this.streamPort = res.streamPort;
    return res.streamPort;
  }

  public onNotification(
    fn: (event: string, data: unknown) => void,
  ): () => void {
    this.notificationListeners.add(fn);
    return () => {
      this.notificationListeners.delete(fn);
    };
  }

  private findBinary(): string | null {
    if (this.binPath && fs.existsSync(this.binPath)) {
      return this.binPath;
    }

    const exe = process.platform === "win32" ? ".exe" : "";
    const candidates = [
      process.env.KUBEVIEW_ENGINE_BIN,
      path.resolve(process.cwd(), `../../engine/bin/kubeview-engine${exe}`),
      path.resolve(process.cwd(), `engine/bin/kubeview-engine${exe}`),
      path.resolve(
        process.cwd(),
        `../../src-tauri/target/release/kubeview-engine${exe}`,
      ),
      path.resolve(
        process.cwd(),
        `src-tauri/target/release/kubeview-engine${exe}`,
      ),
      path.resolve(
        process.cwd(),
        `../../src-tauri/target/debug/kubeview-engine${exe}`,
      ),
      path.join(path.dirname(process.execPath), `kubeview-engine${exe}`),
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidates) {
      if (!fs.existsSync(candidate)) continue;
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        this.binPath = candidate;
        return candidate;
      } catch {
        // Try the next candidate.
      }
    }

    return null;
  }

  private failPending(reason: unknown): void {
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(reason);
    }
    this.pending.clear();
  }

  private ensureProcess(): ChildProcessWithoutNullStreams | null {
    if (this.proc && !this.proc.killed && this.proc.exitCode === null) {
      return this.proc;
    }
    if (Date.now() < this.spawnBlockedUntil) {
      return null;
    }

    const bin = this.findBinary();
    if (!bin) {
      this.spawnBlockedUntil = Date.now() + 5000;
      console.warn(
        "[EngineBridge] kubeview-engine binary not found. Build it with pnpm build:engine or set KUBEVIEW_ENGINE_BIN.",
      );
      return null;
    }

    try {
      const proc = spawn(bin, [], {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });

      const handleExit = (message: string) => {
        console.warn(message);
        if (this.proc === proc) this.proc = null;
        this.streamPort = null;
        this.spawnBlockedUntil = Date.now() + 1000;
        this.failPending(engineError(message, "ENGINE_UNAVAILABLE"));
      };

      proc.on("error", (err) => {
        handleExit(`[EngineBridge] Engine process error: ${err.message}`);
      });

      proc.on("exit", (code, signal) => {
        handleExit(
          `[EngineBridge] Engine exited (code ${code}, signal ${signal})`,
        );
      });

      proc.stdin.on("error", (err) => {
        handleExit(`[EngineBridge] Engine stdin error: ${err.message}`);
      });

      if (proc.stderr) {
        const errRl = readline.createInterface({ input: proc.stderr });
        errRl.on("line", (line) => {
          if (line.trim()) {
            console.log(`[go-engine] ${line}`);
          }
        });
      }

      if (proc.stdout) {
        const outRl = readline.createInterface({ input: proc.stdout });
        outRl.on("line", (line) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith("{")) return;
          try {
            const data = JSON.parse(trimmed) as JsonRpcResponse;
            const responseId = Number(data.id);
            if (data.id !== undefined && this.pending.has(responseId)) {
              const request = this.pending.get(responseId);
              if (!request) return;
              clearTimeout(request.timer);
              this.pending.delete(responseId);
              if (data.error !== undefined && data.error !== null) {
                request.reject(data.error);
              } else {
                request.resolve(data.result);
              }
            } else if (data.method && data.id === undefined) {
              for (const listener of this.notificationListeners) {
                try {
                  listener(data.method, data.params);
                } catch (err) {
                  console.error(
                    "[EngineBridge] Notification listener error:",
                    err,
                  );
                }
              }
            }
          } catch (err) {
            console.warn("[EngineBridge] Failed to parse JSON-RPC line:", err);
          }
        });
      }

      this.proc = proc;
      return proc;
    } catch (err) {
      console.error("[EngineBridge] Failed to spawn engine:", err);
      this.spawnBlockedUntil = Date.now() + 5000;
      return null;
    }
  }

  public async request<T = unknown>(
    method: string,
    params: unknown = {},
  ): Promise<T> {
    const proc = this.ensureProcess();
    if (!proc) {
      throw engineError(
        "Go engine sidecar process could not be started. Build it with pnpm build:engine or set KUBEVIEW_ENGINE_BIN.",
        "ENGINE_UNAVAILABLE",
      );
    }

    const id = this.seq++;
    const payload =
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params: params ?? {},
      }) + "\n";

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) {
          reject(
            engineError(
              `RPC request '${method}' timed out after 20s`,
              "TIMEOUT",
            ),
          );
        }
      }, 20_000);

      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });

      try {
        proc.stdin.write(payload);
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }
}

const globalForBridge = globalThis as unknown as {
  engineBridge?: EngineBridge;
};
export const engineBridge = globalForBridge.engineBridge || new EngineBridge();
if (process.env.NODE_ENV !== "production") {
  globalForBridge.engineBridge = engineBridge;
}
