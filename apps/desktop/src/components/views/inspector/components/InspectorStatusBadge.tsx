"use client";

export function InspectorStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Running":
    case "Active":
    case "Ready":
    case "Healthy":
    case "Automount on":
    case "Role":
    case "Complete":
    case "Programmed":
    case "Accepted":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
          {status}
        </span>
      );
    case "Pending":
    case "ContainerCreating":
    case "Terminating":
    case "Progressing":
    case "Paused":
    case "Suspended":
    case "Not Ready":
    case "No Endpoints":
    case "Immutable":
    case "Released":
    case "Available":
    case "Unknown":
    case "Automount off":
    case "Binding":
    case "Namespaced":
    case "Cluster":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
          {status}
        </span>
      );
    case "Completed":
    case "Succeeded":
    case "Scaled Down":
    case "Idle":
    case "Empty":
    case "Ingress":
    case "Egress":
    case "Ingress + Egress":
    case "ClusterIP":
    case "NodePort":
    case "LoadBalancer":
    case "ExternalName":
    case "Bound":
    case "Default":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-black/[0.04] dark:bg-white/[0.06] text-[var(--muted)] border border-[var(--border)] shrink-0">
          {status}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 shrink-0">
          {status}
        </span>
      );
  }
}
