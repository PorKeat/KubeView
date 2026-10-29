import * as React from "react";
import type {
  SimpleResourceItem,
  SimpleResourceKind,
} from "@kubeview/contracts";
import {
  Activity,
  ArrowUp,
  Clock,
  Cpu,
  FolderTree,
  HardDrive,
  History,
  Layers,
  Repeat,
  Route,
  Shield,
  ShieldCheck,
  ShipWheel,
  SlidersHorizontal,
  Webhook,
  Waypoints,
  FileCheck2,
  Link2,
  type LucideIcon,
} from "lucide-react";

export interface SimpleResourceColumn {
  key: string;
  label: string;
  className?: string;
  render: (item: SimpleResourceItem) => React.ReactNode;
}

export interface SimpleResourceFilter {
  options: string[];
  predicate: (item: SimpleResourceItem, value: string) => boolean;
}

export interface SimpleResourceConfig {
  kind: SimpleResourceKind;
  title: string;
  description: string;
  icon: LucideIcon;
  namespaceScoped: boolean;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  nameLabel?: string;
  primary: (item: SimpleResourceItem) => string;
  secondary?: (item: SimpleResourceItem) => string;
  columns: SimpleResourceColumn[];
  filter?: SimpleResourceFilter;
}

function detail(item: SimpleResourceItem, key: string) {
  return item.details[key] || "—";
}

function DetailValue({
  item,
  detailKey,
  mono = false,
  className,
}: {
  item: SimpleResourceItem;
  detailKey: string;
  mono?: boolean;
  className?: string;
}) {
  const value = detail(item, detailKey);
  return (
    <span
      title={value}
      className={`block truncate ${mono ? "font-mono text-[10px]" : ""} ${className ?? ""}`}
    >
      {value}
    </span>
  );
}

export const SIMPLE_RESOURCE_CONFIGS: Record<
  SimpleResourceKind,
  SimpleResourceConfig
> = {
  namespaces: {
    kind: "namespaces",
    title: "Namespaces",
    description:
      "Cluster partitions and their lifecycle state. Terminating namespaces can block resource deletion.",
    icon: FolderTree,
    namespaceScoped: false,
    searchPlaceholder: "Filter namespaces...",
    emptyTitle: "No namespaces",
    emptyDescription:
      "The cluster did not return any namespaces for this context.",
    primary: (item) => item.name,
    columns: [],
  },
  events: {
    kind: "events",
    title: "Events",
    description:
      "Recent cluster activity, newest first. Warning events explain failed scheduling, pulls, probes, and restarts.",
    icon: History,
    namespaceScoped: true,
    searchPlaceholder: "Filter events by reason, object, message...",
    emptyTitle: "No events",
    emptyDescription:
      "No recent events match this context and namespace. Events expire automatically.",
    nameLabel: "Reason",
    primary: (item) => item.details.reason || item.name,
    secondary: (item) => item.details.object || item.namespace || "",
    filter: {
      options: ["All", "Warning", "Normal"],
      predicate: (item, value) =>
        value === "All" || (item.details.type || "Normal") === value,
    },
    columns: [
      {
        key: "message",
        label: "Message",
        className: "w-[38%]",
        render: (item) => (
          <DetailValue
            item={item}
            detailKey="message"
            className="text-[10px]"
          />
        ),
      },
      {
        key: "count",
        label: "Count",
        render: (item) => (
          <span className="font-mono text-[10px] tabular-nums text-[var(--muted)]">
            {detail(item, "count")}
          </span>
        ),
      },
    ],
  },
  replicationcontrollers: {
    kind: "replicationcontrollers",
    title: "Replication Controllers",
    description:
      "Legacy replica controllers. Prefer Deployments for new workloads, but use this view to inspect older applications.",
    icon: Repeat,
    namespaceScoped: true,
    searchPlaceholder: "Filter replication controllers...",
    emptyTitle: "No replication controllers",
    emptyDescription:
      "This namespace has no ReplicationControllers. Most modern workloads use Deployments.",
    primary: (item) => item.name,
    secondary: (item) => item.namespace || "",
    columns: [
      {
        key: "replicas",
        label: "Ready",
        render: (item) => (
          <span className="font-mono text-[10px] tabular-nums">
            {detail(item, "ready")}/{detail(item, "desired")}
          </span>
        ),
      },
      {
        key: "selector",
        label: "Selector",
        render: (item) => <DetailValue item={item} detailKey="selector" mono />,
      },
    ],
  },
  endpointslices: {
    kind: "endpointslices",
    title: "Endpoint Slices",
    description:
      "The scalable endpoint model behind Services. Each slice carries addresses and ports for one Service.",
    icon: Waypoints,
    namespaceScoped: true,
    searchPlaceholder: "Filter endpoint slices by service, port...",
    emptyTitle: "No endpoint slices",
    emptyDescription:
      "No EndpointSlices are visible in this namespace, or the cluster does not serve discovery.k8s.io/v1.",
    primary: (item) => item.name,
    secondary: (item) => item.details.service || item.namespace || "",
    columns: [
      {
        key: "service",
        label: "Service",
        render: (item) => <DetailValue item={item} detailKey="service" mono />,
      },
      {
        key: "addressType",
        label: "Address type",
        render: (item) => (
          <span className="font-mono text-[10px] text-[var(--muted)]">
            {detail(item, "addressType")}
          </span>
        ),
      },
      {
        key: "endpoints",
        label: "Endpoints",
        render: (item) => (
          <span className="font-mono text-[10px] tabular-nums">
            {detail(item, "endpoints")}
          </span>
        ),
      },
      {
        key: "ports",
        label: "Ports",
        render: (item) => <DetailValue item={item} detailKey="ports" mono />,
      },
    ],
  },
  ingressclasses: {
    kind: "ingressclasses",
    title: "Ingress Classes",
    description:
      "Cluster-wide Ingress controller classes. The default class is used when an Ingress does not specify one.",
    icon: Route,
    namespaceScoped: false,
    searchPlaceholder: "Filter ingress classes by controller...",
    emptyTitle: "No ingress classes",
    emptyDescription:
      "The cluster does not serve networking.k8s.io/v1 IngressClasses.",
    primary: (item) => item.name,
    columns: [
      {
        key: "controller",
        label: "Controller",
        render: (item) => (
          <DetailValue item={item} detailKey="controller" mono />
        ),
      },
    ],
  },
  persistentvolumeclaims: {
    kind: "persistentvolumeclaims",
    title: "Persistent Volume Claims",
    description:
      "Workload storage requests and their binding state. A Pending claim usually means no matching volume or StorageClass.",
    icon: HardDrive,
    namespaceScoped: true,
    searchPlaceholder: "Filter claims by storage class, volume...",
    emptyTitle: "No persistent volume claims",
    emptyDescription:
      "No workload in this namespace has requested persistent storage.",
    primary: (item) => item.name,
    secondary: (item) => item.namespace || "",
    columns: [
      {
        key: "capacity",
        label: "Capacity",
        render: (item) => (
          <span className="font-mono text-[10px] tabular-nums">
            {detail(item, "capacity")}
          </span>
        ),
      },
      {
        key: "accessModes",
        label: "Access modes",
        render: (item) => (
          <DetailValue item={item} detailKey="accessModes" mono />
        ),
      },
      {
        key: "storageClass",
        label: "Storage class",
        render: (item) => (
          <DetailValue item={item} detailKey="storageClass" mono />
        ),
      },
      {
        key: "volume",
        label: "Volume",
        render: (item) => <DetailValue item={item} detailKey="volume" mono />,
      },
    ],
  },
  horizontalpodautoscalers: {
    kind: "horizontalpodautoscalers",
    title: "Horizontal Pod Autoscalers",
    description:
      "Autoscaling targets and current replica pressure. A warning means the controller cannot scale or the desired replicas are not met.",
    icon: Activity,
    namespaceScoped: true,
    searchPlaceholder: "Filter autoscalers by target, namespace...",
    emptyTitle: "No horizontal pod autoscalers",
    emptyDescription: "No autoscaler is configured in this namespace.",
    primary: (item) => item.name,
    secondary: (item) => item.namespace || "",
    columns: [
      {
        key: "target",
        label: "Target",
        render: (item) => <DetailValue item={item} detailKey="target" mono />,
      },
      {
        key: "replicas",
        label: "Min / Max",
        render: (item) => (
          <span className="font-mono text-[10px] tabular-nums">
            {detail(item, "min")} / {detail(item, "max")}
          </span>
        ),
      },
      {
        key: "metrics",
        label: "Metrics",
        render: (item) => (
          <span className="font-mono text-[10px] tabular-nums">
            {detail(item, "metrics")}
          </span>
        ),
      },
    ],
  },
  poddisruptionbudgets: {
    kind: "poddisruptionbudgets",
    title: "Pod Disruption Budgets",
    description:
      "Voluntary disruption limits for workloads. Zero allowed disruptions can block node drains even when the workload is healthy.",
    icon: Shield,
    namespaceScoped: true,
    searchPlaceholder: "Filter disruption budgets...",
    emptyTitle: "No pod disruption budgets",
    emptyDescription:
      "No disruption budget protects workloads in this namespace.",
    primary: (item) => item.name,
    secondary: (item) => item.namespace || "",
    columns: [
      {
        key: "minAvailable",
        label: "Min available",
        render: (item) => (
          <DetailValue item={item} detailKey="minAvailable" mono />
        ),
      },
      {
        key: "maxUnavailable",
        label: "Max unavailable",
        render: (item) => (
          <DetailValue item={item} detailKey="maxUnavailable" mono />
        ),
      },
      {
        key: "allowed",
        label: "Allowed disruptions",
        render: (item) => (
          <span className="font-mono text-[10px] tabular-nums">
            {detail(item, "allowedDisruptions")}
          </span>
        ),
      },
      {
        key: "expected",
        label: "Expected pods",
        render: (item) => (
          <span className="font-mono text-[10px] tabular-nums">
            {detail(item, "expectedPods")}
          </span>
        ),
      },
    ],
  },
  resourcequotas: {
    kind: "resourcequotas",
    title: "Resource Quotas",
    description:
      "Namespace-level hard limits and current usage. Quotas can block new Pods even when the cluster has free capacity.",
    icon: Layers,
    namespaceScoped: true,
    searchPlaceholder: "Filter quotas...",
    emptyTitle: "No resource quotas",
    emptyDescription:
      "No aggregate resource limits are enforced in this namespace.",
    primary: (item) => item.name,
    secondary: (item) => item.namespace || "",
    columns: [
      {
        key: "hard",
        label: "Hard limits",
        className: "max-w-[280px]",
        render: (item) => <DetailValue item={item} detailKey="hard" mono />,
      },
      {
        key: "used",
        label: "Used",
        className: "max-w-[280px]",
        render: (item) => <DetailValue item={item} detailKey="used" mono />,
      },
    ],
  },
  limitranges: {
    kind: "limitranges",
    title: "Limit Ranges",
    description:
      "Default and maximum resource limits applied to Pods and containers in a namespace.",
    icon: SlidersHorizontal,
    namespaceScoped: true,
    searchPlaceholder: "Filter limit ranges...",
    emptyTitle: "No limit ranges",
    emptyDescription:
      "No default or maximum resource limits apply in this namespace.",
    primary: (item) => item.name,
    secondary: (item) => item.namespace || "",
    columns: [
      {
        key: "types",
        label: "Types",
        render: (item) => <DetailValue item={item} detailKey="types" mono />,
      },
      {
        key: "limits",
        label: "Limits",
        render: (item) => (
          <span className="font-mono text-[10px] tabular-nums">
            {detail(item, "limits")}
          </span>
        ),
      },
    ],
  },
  priorityclasses: {
    kind: "priorityclasses",
    title: "Priority Classes",
    description:
      "Scheduling priority classes. Higher values win scheduling and can preempt lower-priority Pods when enabled.",
    icon: ArrowUp,
    namespaceScoped: false,
    searchPlaceholder: "Filter priority classes...",
    emptyTitle: "No priority classes",
    emptyDescription: "The cluster has no custom scheduling priority classes.",
    primary: (item) => item.name,
    columns: [
      {
        key: "value",
        label: "Value",
        render: (item) => (
          <span className="font-mono text-[10px] tabular-nums">
            {detail(item, "value")}
          </span>
        ),
      },
      {
        key: "preemption",
        label: "Preemption",
        render: (item) => (
          <DetailValue item={item} detailKey="preemptionPolicy" mono />
        ),
      },
    ],
  },
  runtimeclasses: {
    kind: "runtimeclasses",
    title: "Runtime Classes",
    description:
      "Container runtime handlers available to Pods. RuntimeClass can add overhead accounting and node selector constraints.",
    icon: Cpu,
    namespaceScoped: false,
    searchPlaceholder: "Filter runtime classes...",
    emptyTitle: "No runtime classes",
    emptyDescription:
      "The cluster exposes no alternate container runtime classes.",
    primary: (item) => item.name,
    columns: [
      {
        key: "handler",
        label: "Handler",
        render: (item) => <DetailValue item={item} detailKey="handler" mono />,
      },
      {
        key: "overhead",
        label: "Overhead",
        render: (item) => <DetailValue item={item} detailKey="overhead" mono />,
      },
    ],
  },
  leases: {
    kind: "leases",
    title: "Leases",
    description:
      "Coordination leases used by control-plane and leader-elected components. An expired holder can indicate a stalled controller.",
    icon: Clock,
    namespaceScoped: true,
    searchPlaceholder: "Filter leases by holder, namespace...",
    emptyTitle: "No leases",
    emptyDescription: "No coordination leases are visible in this namespace.",
    primary: (item) => item.name,
    secondary: (item) => item.namespace || "",
    columns: [
      {
        key: "holder",
        label: "Holder",
        render: (item) => <DetailValue item={item} detailKey="holder" mono />,
      },
      {
        key: "duration",
        label: "Duration",
        render: (item) => (
          <span className="font-mono text-[10px]">
            {detail(item, "duration")}
          </span>
        ),
      },
      {
        key: "renew",
        label: "Renewed",
        render: (item) => (
          <DetailValue item={item} detailKey="renewTime" mono />
        ),
      },
    ],
  },
  mutatingwebhookconfigurations: {
    kind: "mutatingwebhookconfigurations",
    title: "Mutating Webhook Configs",
    description:
      "Admission webhooks that can rewrite objects before persistence. A failing mutating webhook can block every matching write.",
    icon: Webhook,
    namespaceScoped: false,
    searchPlaceholder: "Filter mutating webhooks...",
    emptyTitle: "No mutating webhook configs",
    emptyDescription:
      "The cluster has no mutating admission webhooks configured.",
    primary: (item) => item.name,
    columns: [
      {
        key: "webhooks",
        label: "Webhooks",
        render: (item) => (
          <span className="font-mono text-[10px] tabular-nums">
            {detail(item, "webhooks")}
          </span>
        ),
      },
      {
        key: "failurePolicy",
        label: "Failure policy",
        render: (item) => (
          <DetailValue item={item} detailKey="failurePolicy" mono />
        ),
      },
      {
        key: "sideEffects",
        label: "Side effects",
        render: (item) => (
          <DetailValue item={item} detailKey="sideEffects" mono />
        ),
      },
    ],
  },
  validatingwebhookconfigurations: {
    kind: "validatingwebhookconfigurations",
    title: "Validating Webhook Configs",
    description:
      "Admission webhooks that reject invalid objects. A Fail policy can make an unavailable webhook block changes.",
    icon: ShieldCheck,
    namespaceScoped: false,
    searchPlaceholder: "Filter validating webhooks...",
    emptyTitle: "No validating webhook configs",
    emptyDescription:
      "The cluster has no validating admission webhooks configured.",
    primary: (item) => item.name,
    columns: [
      {
        key: "webhooks",
        label: "Webhooks",
        render: (item) => (
          <span className="font-mono text-[10px] tabular-nums">
            {detail(item, "webhooks")}
          </span>
        ),
      },
      {
        key: "failurePolicy",
        label: "Failure policy",
        render: (item) => (
          <DetailValue item={item} detailKey="failurePolicy" mono />
        ),
      },
      {
        key: "sideEffects",
        label: "Side effects",
        render: (item) => (
          <DetailValue item={item} detailKey="sideEffects" mono />
        ),
      },
    ],
  },
  validatingadmissionpolicies: {
    kind: "validatingadmissionpolicies",
    title: "Validating Admission Policies",
    description:
      "CEL-based admission rules evaluated by the API server. Policies stay inert until a binding targets them.",
    icon: FileCheck2,
    namespaceScoped: false,
    searchPlaceholder: "Filter admission policies...",
    emptyTitle: "No validating admission policies",
    emptyDescription:
      "The cluster does not serve validating admission policies.",
    primary: (item) => item.name,
    columns: [
      {
        key: "validations",
        label: "Validations",
        render: (item) => (
          <span className="font-mono text-[10px] tabular-nums">
            {detail(item, "validations")}
          </span>
        ),
      },
      {
        key: "failurePolicy",
        label: "Failure policy",
        render: (item) => (
          <DetailValue item={item} detailKey="failurePolicy" mono />
        ),
      },
      {
        key: "paramKind",
        label: "Param kind",
        render: (item) => (
          <DetailValue item={item} detailKey="paramKind" mono />
        ),
      },
    ],
  },
  validatingadmissionpolicybindings: {
    kind: "validatingadmissionpolicybindings",
    title: "Admission Policy Bindings",
    description:
      "Bindings activate a validating admission policy and choose which requests it evaluates.",
    icon: Link2,
    namespaceScoped: false,
    searchPlaceholder: "Filter policy bindings...",
    emptyTitle: "No admission policy bindings",
    emptyDescription:
      "No binding activates a validating admission policy on this cluster.",
    primary: (item) => item.name,
    columns: [
      {
        key: "policy",
        label: "Policy",
        render: (item) => <DetailValue item={item} detailKey="policy" mono />,
      },
      {
        key: "actions",
        label: "Actions",
        render: (item) => <DetailValue item={item} detailKey="actions" mono />,
      },
      {
        key: "parameter",
        label: "Parameter",
        render: (item) => (
          <DetailValue item={item} detailKey="parameter" mono />
        ),
      },
    ],
  },
  helmreleases: {
    kind: "helmreleases",
    title: "Helm Releases",
    description:
      "Releases stored in this cluster's Helm release secrets. Revision, chart, and status come from the release payload.",
    icon: ShipWheel,
    namespaceScoped: true,
    searchPlaceholder: "Filter releases by chart, namespace...",
    emptyTitle: "No Helm releases",
    emptyDescription: "No Helm release secrets are visible in this namespace.",
    primary: (item) => item.name,
    secondary: (item) => item.namespace || "",
    columns: [
      {
        key: "chart",
        label: "Chart",
        render: (item) => <DetailValue item={item} detailKey="chart" mono />,
      },
      {
        key: "chartVersion",
        label: "Chart version",
        render: (item) => (
          <DetailValue item={item} detailKey="chartVersion" mono />
        ),
      },
      {
        key: "appVersion",
        label: "App version",
        render: (item) => (
          <DetailValue item={item} detailKey="appVersion" mono />
        ),
      },
      {
        key: "revision",
        label: "Revision",
        render: (item) => (
          <span className="font-mono text-[10px] tabular-nums">
            {detail(item, "revision")}
          </span>
        ),
      },
    ],
  },
};

export function simpleResourceDetailRows(item: SimpleResourceItem) {
  return Object.entries(item.details).map(([label, value]) => ({
    label: label
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (char) => char.toUpperCase()),
    value,
  }));
}
