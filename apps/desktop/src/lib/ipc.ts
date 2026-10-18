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
      console.error(`[IPC] RPC Error for '${method}':`, err);
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
      const unlisten = await listen<T>(event, (ev) => handler(ev.payload));
      return unlisten;
    } catch (err) {
      console.error(`[IPC] Failed to listen for event '${event}':`, err);
    }
  }
  return () => {};
}

function mockRpcFallback<T>(method: string, _params?: unknown): T {
  if (method === "clusters.listContexts") {
    return {
      currentContext: "kind-kubeview",
      configPath: "~/.kube/config",
      contexts: [
        {
          name: "kind-kubeview",
          cluster: "kind-kubeview",
          server: "https://127.0.0.1:51443",
          user: "kind-kubeview",
          namespace: "default",
          isCurrent: true,
          provider: "kind",
          authType: "cert",
        },
        {
          name: "minikube",
          cluster: "minikube",
          server: "https://192.168.49.2:8443",
          user: "minikube",
          namespace: "default",
          isCurrent: false,
          provider: "minikube",
          authType: "cert",
        },
      ],
    } as T;
  }

  if (method === "clusters.switchContext") {
    return {
      activeContext: "kind-kubeview",
      status: "ready",
      context: {
        name: "kind-kubeview",
        cluster: "kind-kubeview",
        server: "https://127.0.0.1:51443",
        user: "kind-kubeview",
        namespace: "default",
        isCurrent: true,
        provider: "kind",
        authType: "cert",
      },
    } as T;
  }

  if (method === "clusters.diagnose") {
    return {
      clusterId: "kind-kubeview",
      status: "connected",
      serverVersion: "v1.34.1",
      latencyMs: 14,
      stages: {
        network: { name: "network", passed: true, latencyMs: 3, message: "TCP handshake successful" },
        authentication: { name: "authentication", passed: true, latencyMs: 2, message: "Certificate verified" },
        tls: { name: "tls", passed: true, latencyMs: 6, message: "TLS verified" },
        rbac: { name: "rbac", passed: true, latencyMs: 3, message: "Cluster-admin permissions verified" },
      },
    } as T;
  }

  if (method === "clusters.listNamespaces") {
    return {
      namespaces: ["default", "kube-system", "kube-public", "monitoring"],
    } as T;
  }

  return {} as T;
}
