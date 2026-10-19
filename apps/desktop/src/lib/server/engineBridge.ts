import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import readline from "readline";
import path from "path";
import fs from "fs";
import os from "os";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timer: NodeJS.Timeout;
}

class EngineBridge {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<number, PendingRequest>();
  private seq = 1;
  private binPath: string | null = null;
  private isStarting = false;

  private findBinary(): string | null {
    if (this.binPath && fs.existsSync(this.binPath)) {
      return this.binPath;
    }

    const candidates = [
      // Running from apps/desktop
      path.resolve(process.cwd(), "../../engine/bin/kubeview-engine"),
      // Running from root
      path.resolve(process.cwd(), "engine/bin/kubeview-engine"),
      // Pre-compiled release / debug locations in src-tauri
      path.resolve(process.cwd(), "../../src-tauri/target/release/kubeview-engine"),
      path.resolve(process.cwd(), "src-tauri/target/release/kubeview-engine"),
      path.resolve(process.cwd(), "../../src-tauri/target/debug/kubeview-engine"),
      // Absolute fallback
      "/Users/alexkgm/KubeView/engine/bin/kubeview-engine",
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          fs.accessSync(cand, fs.constants.X_OK);
          this.binPath = cand;
          return cand;
        } catch {}
      }
    }

    return null;
  }

  private ensureProcess(): ChildProcessWithoutNullStreams | null {
    if (this.proc && !this.proc.killed && this.proc.exitCode === null) {
      return this.proc;
    }

    const bin = this.findBinary();
    if (!bin) {
      console.warn("[EngineBridge] kubeview-engine binary not found among candidate paths.");
      return null;
    }

    try {
      this.isStarting = true;
      const proc = spawn(bin, [], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      proc.on("error", (err) => {
        console.error("[EngineBridge] Process error:", err);
        this.proc = null;
      });

      proc.on("exit", (code, signal) => {
        console.warn(`[EngineBridge] Process exited with code ${code}, signal ${signal}`);
        this.proc = null;
        for (const [id, req] of this.pending.entries()) {
          clearTimeout(req.timer);
          req.reject(new Error(`Engine process exited prematurely (code: ${code})`));
        }
        this.pending.clear();
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
            const data = JSON.parse(trimmed);
            if (data.id && this.pending.has(data.id)) {
              const req = this.pending.get(data.id)!;
              clearTimeout(req.timer);
              this.pending.delete(data.id);
              if (data.error) {
                req.reject(data.error);
              } else {
                req.resolve(data.result);
              }
            }
          } catch (e) {
            console.warn("[EngineBridge] Failed to parse JSON-RPC line:", e);
          }
        });
      }

      this.proc = proc;
      this.isStarting = false;
      return proc;
    } catch (err) {
      console.error("[EngineBridge] Failed to spawn engine:", err);
      this.isStarting = false;
      return null;
    }
  }

  public async request<T = any>(method: string, params: any = {}): Promise<T> {
    const proc = this.ensureProcess();
    if (!proc) {
      // If binary is unavailable, try native fallback for system detection
      if (method === "clusters.detectSystemConfigs") {
        return this.nativeFallbackDetect() as unknown as T;
      }
      throw new Error("Go engine sidecar process could not be started");
    }

    const id = this.seq++;
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params: params ?? {},
    }) + "\n";

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`RPC request '${method}' timed out after 20s`));
        }
      }, 20000);

      this.pending.set(id, { resolve, reject, timer });

      try {
        proc.stdin.write(payload);
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  // Pure Node.js fallback scanner in case engine is offline
  private nativeFallbackDetect(): any {
    const home = os.homedir();
    const kubeDir = path.join(home, ".kube");
    const discoveredFiles: string[] = [];
    const contexts: any[] = [];

    const candidates = [
      path.join(kubeDir, "config"),
      path.join(kubeDir, "kubeconfig"),
    ];

    if (process.env.KUBECONFIG) {
      const sep = process.platform === "win32" ? ";" : ":";
      for (const p of process.env.KUBECONFIG.split(sep)) {
        if (p.trim()) candidates.push(p.trim());
      }
    }

    if (fs.existsSync(kubeDir)) {
      try {
        const files = fs.readdirSync(kubeDir);
        for (const f of files) {
          const full = path.join(kubeDir, f);
          try {
            const stat = fs.statSync(full);
            if (stat.isFile() && !candidates.includes(full)) {
              candidates.push(full);
            }
          } catch {}
        }
      } catch {}
    }

    for (const file of candidates) {
      if (!fs.existsSync(file)) continue;
      try {
        const content = fs.readFileSync(file, "utf-8");
        // Lightweight regex parse for context names and clusters
        const ctxRegex = /-\s*name:\s*([^\s\n\r]+)/g;
        let match;
        let hasContexts = false;
        while ((match = ctxRegex.exec(content)) !== null) {
          const name = match[1].replace(/['"]/g, "").trim();
          if (name && !contexts.some((c) => c.contextName === name)) {
            hasContexts = true;
            contexts.push({
              contextName: name,
              clusterName: name,
              server: "kubernetes.cluster.local",
              user: "admin",
              provider: "generic",
              authType: "cert",
              filePath: file,
              fileName: path.basename(file),
              isImported: false,
            });
          }
        }
        if (hasContexts && !discoveredFiles.includes(file)) {
          discoveredFiles.push(file);
        }
      } catch {}
    }

    return { discoveredFiles, contexts };
  }
}

// Global singleton for Next.js dev server lifecycle
const globalForBridge = globalThis as unknown as { engineBridge?: EngineBridge };
export const engineBridge = globalForBridge.engineBridge || new EngineBridge();
if (process.env.NODE_ENV !== "production") {
  globalForBridge.engineBridge = engineBridge;
}
