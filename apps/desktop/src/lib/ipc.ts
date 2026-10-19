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
  try {
    const res = await fetch("/api/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params: params ?? null }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.error) {
        console.warn(`[IPC] /api/rpc error for '${method}':`, data.error);
        throw new Error(data.error.message || JSON.stringify(data.error));
      }
      return data.result as T;
    }
  } catch (err: unknown) {
    console.warn(`[IPC] /api/rpc failed for '${method}', falling back to mock:`, err);
  }

  // Fallback for offline or static environments
  return mockRpcFallback<T>(method, params);
}

export async function listenNotification<T>(
  event: string,
  handler: (payload: T) => void
): Promise<() => void> {
  if (isTauri()) {
    try {
      const { listen } = await import("@tauri-apps/api/event");
      // Tauri 2 events must include only alphanumeric characters, '-', '/', ':', and '_'
      const safeEvent = event.replace(/\./g, ":");
      const unlisten = await listen<T>(safeEvent, (ev) => handler(ev.payload));
      return unlisten;
    } catch (err) {
      console.warn(`[IPC] Failed to listen for event '${event}':`, err);
    }
  }
  return () => {};
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
    return {
      yaml: "",
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
