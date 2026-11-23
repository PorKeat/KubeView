const RPC_TIMEOUT_MS = 30_000;
const LONG_RPC_TIMEOUT_MS = 60_000;
const HELM_LIFECYCLE_TIMEOUT_MS = 35 * 60_000;
const DRAIN_TIMEOUT_MS = 20 * 60_000;
const POD_MOVE_TIMEOUT_MS = 2 * 60_000;

/**
 * Keep browser-mode fetch timeouts aligned with the Tauri supervisor and the
 * long-running engine operations. The Node engine bridge adds a small buffer
 * so the client aborts before the bridge does.
 */
export function rpcTimeoutMs(method: string): number {
  if (
    method === "helm.install" ||
    method === "helm.upgrade" ||
    method === "helm.rollback" ||
    method === "helm.uninstall"
  ) {
    return HELM_LIFECYCLE_TIMEOUT_MS;
  }
  if (method === "nodes.drain") return DRAIN_TIMEOUT_MS;
  if (method === "pods.move") return POD_MOVE_TIMEOUT_MS;
  if (
    method.startsWith("helm.") ||
    method === "deployments.rollback" ||
    method === "deployments.rolloutHistory" ||
    method === "statefulsets.partition" ||
    method === "jobs.retry" ||
    method === "jobs.clone" ||
    method === "persistentvolumeclaims.expand" ||
    method.startsWith("resources.")
  ) {
    return LONG_RPC_TIMEOUT_MS;
  }
  return RPC_TIMEOUT_MS;
}
