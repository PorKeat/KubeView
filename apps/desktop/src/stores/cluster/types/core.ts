export interface SelectedResource {
  kind: string;
  name: string;
  namespace: string;
  status: string;
  data?: Record<string, unknown>;
  initialTab?: "overview" | "edit";
}

export interface CoreSlice {
  currentContext: string;
  currentNamespace: string;
  connectionStatus: "connected" | "degraded" | "checking" | "offline";
  serverVersion: string;
  latencyMs: number;
  rbacMode: "cluster-admin" | "namespace-scoped";
  isLoading: boolean;
  selectedResource: SelectedResource | null;
  isInspectorOpen: boolean;
  isInspectorEditDirty: boolean;
  setInspectorEditDirty: (dirty: boolean) => void;
  isKubeconfigModalOpen: boolean;
  kubeconfigModalTab: "auto" | "browse" | "paste" | "manage";
  splashDismissed: boolean;

  // Auto-refresh interval (0 = off, 3000, 5000, 10000, 30000)
  autoRefreshInterval: number;
  setAutoRefreshInterval: (interval: number) => void;

  // Endpoint configuration modal
  isEndpointModalOpen: boolean;
  endpointModalContextName: string;
  endpointModalCurrentServer: string;
  openEndpointModal: (contextName: string, currentServer: string) => void;
  closeEndpointModal: () => void;

  // Namespace creation
  isCreateNamespaceOpen: boolean;
  namespaceRevision: number;
  openCreateNamespace: () => void;
  closeCreateNamespace: () => void;
  bumpNamespaceRevision: () => void;

  setCurrentContext: (context: string) => void;
  setCurrentNamespace: (namespace: string) => void;
  setConnectionStatus: (
    status: "connected" | "degraded" | "checking" | "offline",
  ) => void;
  setServerInfo: (version: string, latency: number) => void;
  openInspector: (resource: SelectedResource) => void;
  closeInspector: () => void;
  openKubeconfigModal: (tab?: "auto" | "browse" | "paste" | "manage") => void;
  closeKubeconfigModal: () => void;
  setSplashDismissed: (dismissed: boolean) => void;
}
