import { useSettingsStore } from "@/stores/settingsStore";
import type {
  ListContextsResult,
  SwitchContextResult,
  ListNamespacesResult,
  DiagnosticResult,
} from "@kubeview/contracts";

const MOCK_MODE = process.env.NEXT_PUBLIC_KUBEVIEW_MOCK === "1";
const RPC_TIMEOUT_MS = 30_000;

const MUTATING_METHODS = new Set([
  "configmaps.apply",
  "secrets.apply",
  "pods.delete",
  "pods.restart",
  "pods.exec",
  "deployments.delete",
  "deployments.restart",
  "deployments.scale",
  "replicasets.delete",
  "replicasets.scale",
  "statefulsets.delete",
  "statefulsets.restart",
  "statefulsets.scale",
  "daemonsets.delete",
  "daemonsets.restart",
  "jobs.delete",
  "cronjobs.delete",
  "cronjobs.suspend",
  "cronjobs.resume",
  "ingresses.apply",
  "ingresses.delete",
  "gatewayresources.apply",
  "gatewayresources.delete",
  "resources.apply",
  "resources.delete",
]);

function safetyError(method: string, params: unknown): Error | null {
  const settings = useSettingsStore.getState();
  const contextName =
    params && typeof params === "object" && "contextName" in params
      ? String((params as { contextName?: unknown }).contextName ?? "")
      : "";
  const mutating = MUTATING_METHODS.has(method);
  const isProtected =
    contextName.length > 0 &&
    (settings.protectedContexts.includes(contextName) ||
      (settings.protectProduction &&
        /(^|[-_@/])prod([-_@/]|$)/i.test(contextName)));

  if (mutating && settings.readOnlyMode) {
    return new Error(
      "Read-only mode is enabled in Settings. Mutation blocked.",
    );
  }
  if (method === "pods.exec" && settings.disableExec) {
    return new Error("Pod exec is disabled in Settings.");
  }
  if (mutating && isProtected) {
    return new Error(
      `Context "${contextName}" is protected. Mutation blocked.`,
    );
  }
  return null;
}

function notifyForbidden(
  method: string,
  params: unknown,
  error: unknown,
): void {
  if (typeof window === "undefined" || method.startsWith("access.")) return;
  const record = error as { code?: unknown; message?: unknown } | null;
  if (record?.code !== "K8S_FORBIDDEN") return;
  window.dispatchEvent(
    new CustomEvent("kubeview:forbidden", {
      detail: {
        method,
        params: params as Record<string, unknown> | undefined,
        code: record.code,
        message:
          typeof record.message === "string"
            ? record.message
            : "Permission denied",
      },
    }),
  );
}

export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}

export async function invokeRpc<T>(
  method: string,
  params?: unknown,
): Promise<T> {
  const blocked = safetyError(method, params);
  if (blocked) throw blocked;
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
      notifyForbidden(method, params, err);
      throw err;
    }
  }

  // Browser preview: proxy to the local Next.js route. Mock data is opt-in only.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch("/api/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params: params ?? null }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (MOCK_MODE) {
      console.warn(
        `[IPC] /api/rpc unavailable for '${method}', using mock mode.`,
      );
      return mockRpcFallback<T>(method, params);
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to reach the KubeView engine: ${message}`);
  } finally {
    clearTimeout(timeout);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) {
    const error = new Error(
      data?.error?.message ||
        `KubeView engine request failed with HTTP ${res.status}`,
    ) as Error & { code?: unknown };
    error.code = data?.error?.code;
    notifyForbidden(method, params, error);
    throw error;
  }
  if (data?.result !== undefined) {
    return data.result as T;
  }

  if (MOCK_MODE) {
    return mockRpcFallback<T>(method, params);
  }
  throw new Error("KubeView engine returned an invalid response");
}

export interface StreamCredentials {
  port: number;
  token: string;
}

let cachedStreamCredentials: StreamCredentials | null = null;
let browserEventSource: EventSource | null = null;
let browserEventReconnectTimer: ReturnType<typeof setTimeout> | null = null;
const browserEventHandlers = new Map<
  string,
  Set<(event: MessageEvent) => void>
>();

function bindBrowserEventHandlers(source: EventSource): void {
  for (const [event, handlers] of browserEventHandlers) {
    for (const handler of handlers) {
      source.addEventListener(event, handler);
    }
  }
}

function scheduleBrowserEventReconnect(): void {
  if (browserEventReconnectTimer || browserEventHandlers.size === 0) return;
  browserEventReconnectTimer = setTimeout(() => {
    browserEventReconnectTimer = null;
    void getBrowserEventSource()
      .then((source) => {
        if (source) bindBrowserEventHandlers(source);
      })
      .catch(() => {
        scheduleBrowserEventReconnect();
      });
  }, 2000);
}

export function resetStreamCredentials(): void {
  cachedStreamCredentials = null;
  if (browserEventReconnectTimer) {
    clearTimeout(browserEventReconnectTimer);
    browserEventReconnectTimer = null;
  }
  if (browserEventSource) {
    browserEventSource.close();
    browserEventSource = null;
  }
  scheduleBrowserEventReconnect();
}

export async function getStreamCredentials(): Promise<StreamCredentials> {
  if (cachedStreamCredentials) return cachedStreamCredentials;
  const res = await invokeRpc<{ streamPort?: number; streamToken?: string }>(
    "handshake",
    {
      clientVersion: "0.1.0",
      protocolVersion: "1.0.0",
      capabilities: ["stream", "exec", "logs"],
    },
  );
  if (!res?.streamPort || !res.streamToken) {
    throw new Error(
      "KubeView engine handshake did not return stream credentials",
    );
  }
  cachedStreamCredentials = { port: res.streamPort, token: res.streamToken };
  return cachedStreamCredentials;
}

export async function getStreamPort(): Promise<number> {
  return (await getStreamCredentials()).port;
}

async function getBrowserEventSource(): Promise<EventSource | null> {
  if (typeof window === "undefined") return null;
  if (browserEventSource) return browserEventSource;

  let credentials: StreamCredentials;
  try {
    credentials = await getStreamCredentials();
  } catch {
    scheduleBrowserEventReconnect();
    return null;
  }

  const source = new EventSource(
    `http://127.0.0.1:${credentials.port}/api/stream/events?token=${encodeURIComponent(credentials.token)}`,
  );
  source.onerror = () => {
    source.close();
    if (browserEventSource === source) browserEventSource = null;
    cachedStreamCredentials = null;
    scheduleBrowserEventReconnect();
  };
  browserEventSource = source;
  return source;
}

export async function listenNotification<T>(
  event: string,
  handler: (payload: T) => void,
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
  const listener = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      handler(data);
    } catch {
      handler(event.data as unknown as T);
    }
  };

  let handlers = browserEventHandlers.get(safeEvent);
  if (!handlers) {
    handlers = new Set();
    browserEventHandlers.set(safeEvent, handlers);
  }
  handlers.add(listener);

  const es = await getBrowserEventSource();
  es?.addEventListener(safeEvent, listener);

  return () => {
    handlers?.delete(listener);
    if (handlers && handlers.size === 0) {
      browserEventHandlers.delete(safeEvent);
    }
    es?.removeEventListener(safeEvent, listener);
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

  if (
    method === "clusters.importKubeconfig" ||
    method === "clusters.importDetected"
  ) {
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

  if (method === "deployments.yaml" || method === "replicasets.yaml") {
    const p = _params as
      | {
          deploymentName?: string;
          replicaSetName?: string;
          namespace?: string;
        }
      | undefined;
    const name = p?.deploymentName || p?.replicaSetName || "workload";
    const ns = p?.namespace && p.namespace !== "all" ? p.namespace : "default";
    const kind = method === "deployments.yaml" ? "Deployment" : "ReplicaSet";
    return {
      yaml: `apiVersion: apps/v1
kind: ${kind}
metadata:
  name: ${name}
  namespace: ${ns}
spec:
  replicas: 1`,
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
