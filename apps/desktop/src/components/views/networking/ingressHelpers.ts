import type {
  GatewayResourceSummary,
  IngressSummary,
} from "@kubeview/contracts";

export type IngressMode = "ingresses" | "gateways";

export const GATEWAY_KINDS = [
  "GatewayClass",
  "Gateway",
  "HTTPRoute",
  "GRPCRoute",
] as const;

export function ingressMatchesSearch(
  ingress: IngressSummary,
  query: string,
): boolean {
  if (!query) return true;
  return (
    ingress.name.toLowerCase().includes(query) ||
    ingress.namespace.toLowerCase().includes(query) ||
    (ingress.className ?? "").toLowerCase().includes(query) ||
    ingress.status.toLowerCase().includes(query) ||
    ingress.hosts.some((host) => host.toLowerCase().includes(query)) ||
    ingress.addresses.some((address) =>
      address.toLowerCase().includes(query),
    ) ||
    ingress.paths.some((path) =>
      `${path.host ?? ""} ${path.path} ${path.serviceName ?? ""} ${path.servicePort ?? ""}`
        .toLowerCase()
        .includes(query),
    ) ||
    ingress.tls.some((tls) =>
      `${tls.secretName ?? ""} ${tls.hosts.join(" ")}`
        .toLowerCase()
        .includes(query),
    )
  );
}

export function ingressMatchesFilter(ingress: IngressSummary, filter: string) {
  return filter === "all" || ingress.status.toLowerCase() === filter;
}

export function ingressStatus(ingress: IngressSummary) {
  if (ingress.status === "Ready") {
    return { label: "Ready", variant: "healthy" as const };
  }
  if (ingress.status === "Terminating") {
    return { label: "Terminating", variant: "muted" as const };
  }
  return { label: "Pending", variant: "warning" as const, pulse: true };
}

export function gatewayMatchesSearch(
  resource: GatewayResourceSummary,
  query: string,
): boolean {
  if (!query) return true;
  return (
    resource.kind.toLowerCase().includes(query) ||
    resource.name.toLowerCase().includes(query) ||
    (resource.namespace ?? "").toLowerCase().includes(query) ||
    (resource.class ?? "").toLowerCase().includes(query) ||
    resource.status.toLowerCase().includes(query) ||
    resource.hosts.some((host) => host.toLowerCase().includes(query)) ||
    resource.addresses.some((address) => address.toLowerCase().includes(query))
  );
}

export function gatewayMatchesFilter(
  resource: GatewayResourceSummary,
  filter: string,
) {
  return filter === "all" || resource.kind === filter;
}

export const GATEWAY_KIND_TONES: Record<string, string> = {
  GatewayClass:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  Gateway: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  HTTPRoute:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  GRPCRoute:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
};

export function gatewayStatus(resource: GatewayResourceSummary) {
  switch (resource.status) {
    case "Programmed":
    case "Accepted":
      return { label: resource.status, variant: "healthy" as const };
    case "Not Accepted":
    case "Not Programmed":
      return {
        label: resource.status,
        variant: "critical" as const,
        pulse: true,
      };
    case "Unknown":
      return { label: resource.status, variant: "muted" as const };
    default:
      return {
        label: resource.status,
        variant: "warning" as const,
        pulse: true,
      };
  }
}
