import * as React from "react";
import type {
  SimpleResourceItem,
  SimpleResourceKind,
} from "@kubeview/contracts";
import {
  FolderTree,
  HardDrive,
  History,
  Repeat,
  Route,
  Waypoints,
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
};

export function simpleResourceDetailRows(item: SimpleResourceItem) {
  return Object.entries(item.details).map(([label, value]) => ({
    label: label
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (char) => char.toUpperCase()),
    value,
  }));
}
