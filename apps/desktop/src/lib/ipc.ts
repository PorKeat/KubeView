import type {
  ListContextsResult,
  SwitchContextResult,
  ListNamespacesResult,
  DiagnosticResult,
} from "@kubeview/contracts";

export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}

export async function invokeRpc<T>(method: string, params?: unknown): Promise<T> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<T>("send_rpc_request", {
        method,
        params: params ?? null,
      });
      return result;
    } catch (err: unknown) {
      console.warn(`[IPC] RPC Error for '${method}':`, err);
      throw err;
    }
  }

  // When running in browser preview (Next.js dev server), proxy to /api/rpc
  let res: Response;
  try {
    res = await fetch("/api/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params: params ?? null }),
    });
  } catch (err: unknown) {
    console.warn(`[IPC] /api/rpc network error for '${method}', falling back to mock:`, err);
    return mockRpcFallback<T>(method, params);
  }

  const data = await res.json().catch(() => null);
  if (data?.error) {
    console.warn(`[IPC] /api/rpc returned error for '${method}':`, data.error);
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  if (data?.result !== undefined) {
    return data.result as T;
  }

  // Fallback for offline or static environments
  return mockRpcFallback<T>(method, params);
}

let cachedStreamPort: number | null = null;

export async function getStreamPort(): Promise<number> {
  if (cachedStreamPort) return cachedStreamPort;
  try {
    const res = await invokeRpc<{ streamPort?: number }>("handshake", {
      clientVersion: "0.1.0",
      protocolVersion: "1.0.0",
      capabilities: ["stream", "exec", "logs"],
    });
    if (res?.streamPort) {
      cachedStreamPort = res.streamPort;
      return cachedStreamPort;
    }
  } catch (err) {
    console.warn("[IPC] Failed to query stream port from handshake:", err);
  }
  return cachedStreamPort || 54428;
}

let browserEventSource: EventSource | null = null;

async function getBrowserEventSource(): Promise<EventSource | null> {
  if (typeof window === "undefined") return null;
  if (!browserEventSource) {
    const port = await getStreamPort();
    browserEventSource = new EventSource(`http://127.0.0.1:${port}/api/stream/events`);
    browserEventSource.onerror = () => {
      // Native EventSource auto-reconnects on error
    };
  }
  return browserEventSource;
}

export async function listenNotification<T>(
  event: string,
  handler: (payload: T) => void
): Promise<() => void> {
  const safeEvent = event.replace(/\./g, ":");

  if (isTauri()) {
    try {
      const { listen } = await import("@tauri-apps/api/event");
      // Tauri 2 events must include only alphanumeric characters, '-', '/', ':', and '_'
      const unlisten = await listen<T>(safeEvent, (ev) => handler(ev.payload));
      return unlisten;
    } catch (err) {
      console.warn(`[IPC] Failed to listen for event '${event}':`, err);
    }
    return () => {};
  }

  // Web / Browser mode: listen via Server-Sent Events (SSE) directly from engine
  const es = await getBrowserEventSource();
  if (!es) return () => {};

  const listener = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      handler(data);
    } catch {
      handler(e.data as unknown as T);
    }
  };

  es.addEventListener(safeEvent, listener);
  return () => {
    es.removeEventListener(safeEvent, listener);
  };
}

function mockRpcFallback<T>(method: string, _params?: unknown): T {
  if (method === "clusters.listContexts") {
    return {
      currentContext: "",
      configPath: "",
      contexts: [],
    } as T;
  }

  if (method === "clusters.switchContext") {
    return {
      activeContext: "",
      status: "ready",
      context: null,
    } as T;
  }

  if (method === "clusters.diagnose") {
    return null as T;
  }

  if (method === "clusters.listNamespaces") {
    return {
      namespaces: [],
    } as T;
  }

  if (method === "clusters.importKubeconfig" || method === "clusters.importDetected") {
    return {
      success: true,
      importedContexts: [],
      activeContext: "",
      savedPath: "",
      totalContexts: 0,
    } as T;
  }

  if (method === "clusters.detectSystemConfigs") {
    return {
      discoveredFiles: [],
      contexts: [],
    } as T;
  }

  if (method === "replicasets.list") {
    return {
      items: [],
      totalCount: 0,
    } as T;
  }

  if (method === "deployments.list") {
    return {
      items: [],
      totalCount: 0,
    } as T;
  }

  if (method === "pods.list") {
    return {
      items: [],
      totalCount: 0,
    } as T;
  }

  if (method === "pods.logs") {
    return {
      logs: "No logs available. Connect to a Kubernetes cluster.",
      container: "",
      containers: [],
    } as T;
  }

  if (method === "pods.delete" || method === "pods.restart") {
    return {
      success: true,
    } as T;
  }

  if (method === "pods.exec") {
    return {
      stdout: "",
      stderr: "",
      exitCode: 0,
    } as T;
  }

  if (method === "pods.yaml") {
    const p = _params as { podName?: string; namespace?: string } | undefined;
    const name = p?.podName || "workload-pod";
    const ns = p?.namespace && p.namespace !== "all" ? p.namespace : "default";
    return {
      yaml: `apiVersion: v1
kind: Pod
metadata:
  name: ${name}
  namespace: ${ns}
  creationTimestamp: "${new Date().toISOString()}"
  labels:
    app.kubernetes.io/name: ${name}
spec:
  containers:
  - name: app
    image: nginx:alpine
    ports:
    - containerPort: 80
      name: http
status:
  phase: Running`,
    } as T;
  }

  if (method === "pods.events") {
    return {
      events: [],
    } as T;
  }

  if (method === "clusters.overview") {
    return null as T;
  }

  return {} as T;
}
