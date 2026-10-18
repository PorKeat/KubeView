import { create } from "zustand";

interface ClusterState {
  currentContext: string | null;
  currentNamespace: string;
  connectionStatus: "connected" | "checking" | "offline";
  serverVersion: string;
  latencyMs: number;
  setCurrentContext: (context: string) => void;
  setCurrentNamespace: (namespace: string) => void;
  setConnectionStatus: (status: "connected" | "checking" | "offline") => void;
  setServerInfo: (version: string, latency: number) => void;
}

export const useClusterStore = create<ClusterState>((set) => ({
  currentContext: "kind-kubeview",
  currentNamespace: "all",
  connectionStatus: "connected",
  serverVersion: "v1.34.1",
  latencyMs: 14,
  setCurrentContext: (context) => set({ currentContext: context }),
  setCurrentNamespace: (namespace) => set({ currentNamespace: namespace }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setServerInfo: (version, latency) => set({ serverVersion: version, latencyMs: latency }),
}));
