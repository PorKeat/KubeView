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

  // Fallback for non-Tauri browser preview
  console.warn(`[IPC] Browser preview mode: mocked RPC for '${method}'`);
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

  if (method === "clusters.importKubeconfig") {
    return {
      success: true,
      importedContexts: [],
      activeContext: "",
      savedPath: "",
      totalContexts: 0,
    } as T;
  }

  return {} as T;
}
