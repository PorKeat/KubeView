"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Activity,
  ArrowRight,
  Boxes,
  Clock,
  Cpu,
  Database,
  Globe,
  Layers,
  MemoryStick,
  Network,
  RefreshCw,
  Server,
  Waypoints,
} from "lucide-react";
import { toast } from "sonner";
import type {
  NodeSummary,
  ServiceSummary,
  WorkloadControllerHealth,
} from "@kubeview/contracts";
import { useClusterStore } from "@/stores/clusterStore";
import { useTabStore } from "@/stores/tabStore";
import { cn } from "@/lib/utils";
import { EmptyState, OfflineState } from "@/components/ui";

function percent(value?: number) {
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

function servicePorts(service: ServiceSummary) {
  const ports = service.ports
    .slice(0, 2)
    .map((port) => `${port.port}/${port.protocol}`);
  return ports.length > 0 ? ports.join(", ") : "—";
}

type TrafficFlowNode = Node<
  {
    key: "ingress" | "services" | "endpoints" | "pods";
    label: string;
    value: number;
    tone: string;
  },
  "traffic"
>;

const TRAFFIC_ICONS = {
  ingress: Globe,
  services: Network,
  endpoints: Waypoints,
  pods: Boxes,
};

const EXPOSURE_TONE: Record<string, string> = {
  ClusterIP: "bg-sky-500",
  LoadBalancer: "bg-amber-500",
  NodePort: "bg-emerald-500",
  ExternalName: "bg-violet-500",
};

function TrafficNodeView({ data }: NodeProps<TrafficFlowNode>) {
  const Icon = TRAFFIC_ICONS[data.key];
  return (
    <div
      data-testid={`traffic-node-${data.key}`}
      className="relative w-[104px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 shadow-sm"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-1.5 !w-1.5 !border !border-[var(--surface)] !bg-[var(--accent)]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-1.5 !w-1.5 !border !border-[var(--surface)] !bg-[var(--accent)]"
      />
      <div className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)]">
        <Icon className={cn("h-3 w-3", data.tone)} aria-hidden="true" />
        <span className="truncate">{data.label}</span>
      </div>
      <div className="mt-0.5 font-mono text-sm font-semibold text-[var(--foreground)]">
        {data.value}
      </div>
    </div>
  );
}

function TrafficSignal({
  label,
  value,
  warning,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-[9px] text-[var(--muted)]">{label}</span>
      <span
        className={cn(
          "font-mono text-[10px] font-semibold",
          warning && value > 0
            ? "text-amber-600 dark:text-amber-400"
            : "text-[var(--foreground)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

type ClusterFlowNode = Node<{ node: NodeSummary }, "cluster">;
type ApiFlowNode = Node<{ context: string; pods: number }, "api">;

function ClusterNodeView({ data }: NodeProps<ClusterFlowNode>) {
  const node = data.node;
  const cpu = percent(node.cpuUsagePercent ?? node.cpuPercent);
  const memory = percent(node.memoryUsagePercent ?? node.memoryPercent);
  const healthy = node.status === "Ready";

  return (
    <div
      data-testid="topology-node"
      className="w-[260px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg shadow-black/10 transition-colors hover:border-[var(--accent)]/50"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-2 !border-[var(--surface)] !bg-[var(--accent)]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-2 !border-[var(--surface)] !bg-[var(--accent)]"
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              healthy ? "bg-emerald-500" : "bg-amber-500",
            )}
          />
          <span className="truncate font-mono text-[11px] font-semibold text-[var(--foreground)]">
            {node.name}
          </span>
        </div>
        <span className="shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide text-[var(--muted)]">
          {node.roles.join(", ") || "worker"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
        <div className="flex items-center gap-1.5 text-[var(--muted)]">
          <Cpu className="h-3 w-3" aria-hidden="true" />
          <span className="font-mono">{node.cpuCores} cores</span>
        </div>
        <div className="flex items-center gap-1.5 text-[var(--muted)]">
          <MemoryStick className="h-3 w-3" aria-hidden="true" />
          <span className="font-mono">{node.memoryGiB} GiB</span>
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <span className="w-7 font-mono text-[9px] text-[var(--muted)]">
            CPU
          </span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--surface-active)]">
            <span
              className="block h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${cpu}%` }}
            />
          </span>
          <span className="w-7 text-right font-mono text-[9px] text-[var(--muted)]">
            {cpu}%
          </span>
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <span className="w-7 font-mono text-[9px] text-[var(--muted)]">
            MEM
          </span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--surface-active)]">
            <span
              className="block h-full rounded-full bg-sky-500"
              style={{ width: `${memory}%` }}
            />
          </span>
          <span className="w-7 text-right font-mono text-[9px] text-[var(--muted)]">
            {memory}%
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-[var(--muted)]">
        <span>{node.internalIP}</span>
        <span>
          {node.activePods}/{node.podCapacity} pods
        </span>
      </div>
    </div>
  );
}

function ApiNodeView({ data }: NodeProps<ApiFlowNode>) {
  return (
    <div className="w-[220px] rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/[0.07] p-3 shadow-lg shadow-black/10">
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-2 !border-[var(--surface)] !bg-[var(--accent)]"
      />
      <div className="flex items-center gap-2 text-[var(--accent)]">
        <Waypoints className="h-4 w-4" aria-hidden="true" />
        <span className="text-[11px] font-semibold">Kubernetes API</span>
      </div>
      <div className="mt-2 truncate font-mono text-[9px] text-[var(--muted)]">
        {data.context}
      </div>
      <div className="mt-1 font-mono text-[9px] text-[var(--muted)]">
        {data.pods} pods scheduled
      </div>
    </div>
  );
}

const nodeTypes = {
  cluster: ClusterNodeView,
  api: ApiNodeView,
  traffic: TrafficNodeView,
};

function WorkloadCard({
  label,
  health,
  icon: Icon,
  onOpen,
}: {
  label: string;
  health?: WorkloadControllerHealth;
  icon: React.ElementType;
  onOpen: () => void;
}) {
  const total = health?.total ?? 0;
  const ready = health?.ready ?? 0;
  const degraded = health?.degraded ?? 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-semibold text-[var(--foreground)]">
            {label}
          </span>
          <span className="font-mono text-[10px] text-[var(--muted)]">
            {ready}/{total}
          </span>
        </span>
        <span className="mt-0.5 block text-[9px] font-mono text-[var(--muted)]">
          {degraded > 0 ? `${degraded} degraded` : "healthy"}
        </span>
      </span>
      <ArrowRight
        className="h-3.5 w-3.5 shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
        aria-hidden="true"
      />
    </button>
  );
}

export function TopologyView() {
  const {
    currentContext,
    connectionStatus,
    clusterOverview,
    isOverviewLoading,
    loadClusterOverview,
    networkingCounts,
    loadNetworkingCounts,
    services: serviceItems,
    endpoints: endpointItems,
    ingresses: ingressItems,
    networkPolicies: networkPolicyItems,
    loadServices,
    loadEndpoints,
    loadIngresses,
    loadNetworkPolicies,
    openInspector,
    autoRefreshInterval,
  } = useClusterStore();
  const openTab = useTabStore((state) => state.openTab);
  const [isEntering, setIsEntering] = React.useState(true);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setIsEntering(false), 550);
    return () => window.clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (!currentContext) return;
    void loadClusterOverview();
    void loadNetworkingCounts("all");
    void loadServices("all");
    void loadEndpoints("all");
    void loadIngresses("all");
    void loadNetworkPolicies("all");
  }, [
    currentContext,
    loadClusterOverview,
    loadNetworkingCounts,
    loadServices,
    loadEndpoints,
    loadIngresses,
    loadNetworkPolicies,
  ]);

  React.useEffect(() => {
    if (!currentContext || autoRefreshInterval <= 0) return;
    const timer = window.setInterval(() => {
      void loadClusterOverview();
    }, autoRefreshInterval);
    return () => window.clearInterval(timer);
  }, [autoRefreshInterval, currentContext, loadClusterOverview]);

  if (isEntering || (isOverviewLoading && !clusterOverview)) {
    return (
      <div
        data-testid="topology-loading"
        className="flex h-full flex-col gap-3 p-4 sm:p-5"
      >
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[var(--surface-active)] animate-pulse" />
          <div className="h-4 w-28 rounded bg-[var(--surface-active)] animate-pulse" />
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--muted)]">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
          Mapping cluster topology...
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-20 rounded-xl border border-[var(--border)] bg-[var(--surface)] animate-pulse"
            />
          ))}
        </div>
        <div className="h-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="h-40 rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
          <div className="h-40 rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
        </div>
      </div>
    );
  }

  if (connectionStatus === "offline") return <OfflineState />;

  if (!clusterOverview) {
    return (
      <div className="flex-1 p-6">
        <EmptyState
          title="No topology available"
          description="Connect to a cluster to map its nodes and workloads."
          variant="empty"
        />
      </div>
    );
  }

  const overview = clusterOverview;
  const workloads = overview.workloads;
  const services = serviceItems ?? [];
  const endpoints = endpointItems ?? [];
  const ingresses = ingressItems ?? [];
  const policies = networkPolicyItems ?? [];
  const serviceCount = networkingCounts?.services ?? services.length;
  const endpointCount = networkingCounts?.endpoints ?? endpoints.length;
  const ingressCount =
    (networkingCounts?.ingresses ?? ingresses.length) +
    (networkingCounts?.gatewayResources ?? 0);
  const networkPolicyCount =
    networkingCounts?.networkPolicies ?? policies.length;
  const activePortForwards = networkingCounts?.activePortForwards ?? 0;
  const servicesWithoutEndpoints = services.filter(
    (service) => service.totalEndpoints === 0,
  ).length;
  const tlsIngresses = ingresses.filter((ingress) => ingress.tls.length > 0);
  const exposedServices = services
    .filter(
      (service) =>
        service.type !== "ClusterIP" || (service.externalIPs?.length ?? 0) > 0,
    )
    .slice(0, 4);
  const exposureCounts = services.reduce<Record<string, number>>(
    (counts, service) => {
      counts[service.type || "ClusterIP"] =
        (counts[service.type || "ClusterIP"] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const exposureEntries = Object.entries(exposureCounts).sort(
    (left, right) => right[1] - left[1],
  );
  const externalServiceCount = services.filter(
    (service) => service.type !== "ClusterIP",
  ).length;
  const internalServiceCount = Math.max(
    0,
    services.length - externalServiceCount,
  );
  const totalExposureCount = services.length || 1;

  const trafficNodes: TrafficFlowNode[] = [
    {
      id: "traffic-ingress",
      type: "traffic",
      position: { x: 0, y: 0 },
      data: {
        key: "ingress",
        label: "Ingress",
        value: ingressCount,
        tone: "text-sky-500",
      },
      draggable: false,
      selectable: false,
    },
    {
      id: "traffic-services",
      type: "traffic",
      position: { x: 130, y: 0 },
      data: {
        key: "services",
        label: "Services",
        value: serviceCount,
        tone: "text-emerald-500",
      },
      draggable: false,
      selectable: false,
    },
    {
      id: "traffic-endpoints",
      type: "traffic",
      position: { x: 260, y: 0 },
      data: {
        key: "endpoints",
        label: "Endpoints",
        value: endpointCount,
        tone: "text-cyan-500",
      },
      draggable: false,
      selectable: false,
    },
    {
      id: "traffic-pods",
      type: "traffic",
      position: { x: 390, y: 0 },
      data: {
        key: "pods",
        label: "Pods",
        value: overview.totalPods,
        tone: "text-[var(--accent)]",
      },
      draggable: false,
      selectable: false,
    },
  ];

  const trafficEdges: Edge[] = trafficNodes.slice(1).map((node, index) => ({
    id: `traffic-${index}`,
    source: trafficNodes[index].id,
    target: node.id,
    type: "smoothstep",
    animated: true,
    style: {
      stroke: "var(--accent)",
      strokeWidth: 1.5,
      opacity: 0.55,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "var(--accent)",
    },
  }));

  const handleTrafficNodeClick = (_event: React.MouseEvent, node: Node) => {
    const key = (node.data as { key?: TrafficFlowNode["data"]["key"] }).key;
    if (!key) return;
    const tabs = {
      ingress: { id: "ingresses", title: "Ingresses & Gateways" },
      services: { id: "services", title: "Services" },
      endpoints: { id: "endpoints", title: "Endpoints" },
      pods: { id: "pods", title: "Pods" },
    } as const;
    const tab = tabs[key];
    openTab({ ...tab, closable: true });
  };
  const workloadItems = [
    {
      id: "deployments",
      label: "Deployments",
      health: workloads?.deployments,
      icon: Layers,
    },
    {
      id: "statefulsets",
      label: "StatefulSets",
      health: workloads?.statefulSets,
      icon: Database,
    },
    {
      id: "daemonsets",
      label: "DaemonSets",
      health: workloads?.daemonSets,
      icon: Cpu,
    },
    {
      id: "jobs",
      label: "Jobs & CronJobs",
      health: {
        total: (workloads?.jobs.total ?? 0) + (workloads?.cronJobs.total ?? 0),
        ready: (workloads?.jobs.ready ?? 0) + (workloads?.cronJobs.ready ?? 0),
        degraded:
          (workloads?.jobs.degraded ?? 0) + (workloads?.cronJobs.degraded ?? 0),
      },
      icon: Clock,
    },
  ];

  const apiY =
    overview.nodes.length > 1 ? ((overview.nodes.length - 1) * 155) / 2 : 0;
  const flowNodes: Array<ClusterFlowNode | ApiFlowNode> = [
    {
      id: "api",
      type: "api",
      position: { x: 0, y: apiY },
      data: {
        context: overview.contextName || currentContext,
        pods: overview.totalPods,
      },
      draggable: false,
      selectable: false,
    },
    ...overview.nodes.map((node, index) => ({
      id: `node-${node.name}`,
      type: "cluster" as const,
      position: { x: 365, y: index * 155 },
      data: { node },
      draggable: false,
      selectable: false,
    })),
  ];

  const flowEdges: Edge[] = overview.nodes.map((node) => ({
    id: `api-${node.name}`,
    source: "api",
    target: `node-${node.name}`,
    type: "smoothstep",
    animated: true,
    style: {
      stroke: "var(--accent)",
      strokeWidth: 1.5,
      opacity: 0.55,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "var(--accent)",
    },
  }));

  const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
    const nodeData = node.data as { node?: NodeSummary };
    if (!nodeData.node) return;
    openInspector({
      kind: "Node",
      name: nodeData.node.name,
      namespace: "",
      status: nodeData.node.status,
      data: nodeData.node as unknown as Record<string, unknown>,
    });
  };

  return (
    <div
      data-testid="topology-view"
      className="flex h-full flex-col overflow-y-auto p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              Topology
            </h1>
            <span className="rounded border border-[var(--border)] bg-[var(--surface-active)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--muted)]">
              {overview.contextName || currentContext}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            Live node fabric, workload health, and traffic entry points.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadClusterOverview();
            toast.info("Refreshing topology");
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
        >
          <RefreshCw className="h-3 w-3 text-[var(--muted)]" />
          Refresh
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          {
            label: "Nodes",
            value: `${overview.readyNodes}/${overview.totalNodes} ready`,
            Icon: Server,
          },
          {
            label: "Pods",
            value: `${overview.runningPods}/${overview.totalPods} running`,
            Icon: Boxes,
          },
          {
            label: "CPU",
            value: `${percent(overview.cpuUsagePercent ?? overview.cpuPercent)}%`,
            Icon: Activity,
          },
          {
            label: "Memory",
            value: `${percent(overview.memoryUsagePercent ?? overview.memoryPercent)}%`,
            Icon: MemoryStick,
          },
        ].map(({ label, value, Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
          >
            <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
              <Icon className="h-3 w-3" aria-hidden="true" />
              {label}
            </div>
            <div className="mt-1 font-mono text-sm font-semibold text-[var(--foreground)]">
              {value}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold text-[var(--foreground)]">
              Cluster fabric
            </h2>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">
              Control plane and worker capacity
            </p>
          </div>
          <span className="font-mono text-[9px] text-[var(--muted)]">
            {overview.nodes.length}{" "}
            {overview.nodes.length === 1 ? "node" : "nodes"}
          </span>
        </div>
        <div
          data-testid="cluster-fabric-flow"
          className="topology-flow mt-3 h-[350px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]/40"
        >
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            onNodeClick={handleNodeClick}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--border)"
            />
          </ReactFlow>
        </div>
      </section>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-semibold text-[var(--foreground)]">
                Workloads
              </h2>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                Controllers by health
              </p>
            </div>
            <Layers
              className="h-4 w-4 text-[var(--muted)]"
              aria-hidden="true"
            />
          </div>
          <div className="mt-3 grid gap-2">
            {workloadItems.map((item) => (
              <WorkloadCard
                key={item.id}
                label={item.label}
                health={item.health}
                icon={item.icon}
                onOpen={() =>
                  openTab({
                    id: item.id,
                    title: item.label,
                    closable: true,
                  })
                }
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-semibold text-[var(--foreground)]">
                Traffic entry points
              </h2>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                Services, routes, and endpoint coverage
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-[var(--muted)]">
                {activePortForwards} active forwards
              </span>
              <Network
                className="h-4 w-4 text-[var(--muted)]"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="mt-3">
            <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--muted)]">
              Traffic chain
            </div>
            <div
              data-testid="traffic-chain-flow"
              className="topology-flow mt-2 h-[104px] w-full overflow-hidden"
            >
              <ReactFlow
                nodes={trafficNodes}
                edges={trafficEdges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.08 }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag={false}
                panOnScroll={false}
                zoomOnScroll={false}
                zoomOnPinch={false}
                zoomOnDoubleClick={false}
                preventScrolling={false}
                onNodeClick={handleTrafficNodeClick}
                proOptions={{ hideAttribution: true }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={16}
                  size={1}
                  color="var(--border)"
                />
              </ReactFlow>
            </div>
          </div>

          <div className="mt-4 grid gap-4 border-t border-[var(--border)] pt-3 sm:grid-cols-2 sm:divide-x sm:divide-[var(--border)]">
            <div className="sm:pr-4">
              <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--muted)]">
                Exposure mix
              </div>
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-[var(--surface-active)]">
                {exposureEntries.map(([type, count]) => (
                  <span
                    key={type}
                    className={cn(
                      "h-full",
                      EXPOSURE_TONE[type] ?? "bg-slate-500",
                    )}
                    style={{
                      width: `${(count / totalExposureCount) * 100}%`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {exposureEntries.length === 0 ? (
                  <span className="text-[9px] text-[var(--muted)]">
                    No services
                  </span>
                ) : (
                  exposureEntries.map(([type, count]) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[8px] text-[var(--muted)]"
                    >
                      {type}
                      <strong className="text-[var(--foreground)]">
                        {count}
                      </strong>
                    </span>
                  ))
                )}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-[var(--border)]/60 pt-2 font-mono text-[8px] text-[var(--muted)]">
                <span>
                  Internal{" "}
                  <strong className="text-[var(--foreground)]">
                    {internalServiceCount}
                  </strong>
                </span>
                <span>
                  External{" "}
                  <strong className="text-[var(--foreground)]">
                    {externalServiceCount}
                  </strong>
                </span>
              </div>
            </div>
            <div className="sm:pl-4">
              <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--muted)]">
                Signals
              </div>
              <div className="mt-1 divide-y divide-[var(--border)]/60">
                <TrafficSignal
                  label="Services without endpoints"
                  value={servicesWithoutEndpoints}
                  warning
                />
                <TrafficSignal
                  label="TLS-enabled ingresses"
                  value={tlsIngresses.length}
                />
                <TrafficSignal
                  label="Network policies"
                  value={networkPolicyCount}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--muted)]">
                Top exposed services
              </span>
              <button
                type="button"
                onClick={() =>
                  openTab({ id: "services", title: "Services", closable: true })
                }
                className="font-mono text-[8px] text-[var(--accent)] hover:underline"
              >
                View all
              </button>
            </div>
            {exposedServices.length === 0 ? (
              <p className="mt-2 text-[9px] text-[var(--muted)]">
                No externally exposed services. ClusterIP services are internal.
              </p>
            ) : (
              <div className="mt-1 divide-y divide-[var(--border)]">
                {exposedServices.map((service) => (
                  <button
                    key={`${service.namespace}/${service.name}`}
                    type="button"
                    onClick={() =>
                      openTab({
                        id: "services",
                        title: "Services",
                        closable: true,
                      })
                    }
                    className="flex w-full items-center gap-2 py-1.5 text-left transition-colors hover:text-[var(--accent)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-mono text-[10px] font-medium text-[var(--foreground)]">
                          {service.name}
                        </span>
                        <span className="shrink-0 rounded border border-[var(--border)] px-1 py-0.5 font-mono text-[7px] text-[var(--muted)]">
                          {service.type}
                        </span>
                      </span>
                      <span className="block truncate font-mono text-[8px] text-[var(--muted)]">
                        {service.namespace} · {servicePorts(service)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[9px] text-[var(--muted)]">
                      {service.readyEndpoints}/{service.totalEndpoints}
                    </span>
                    <ArrowRight
                      className="h-3 w-3 shrink-0 text-[var(--muted)]"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
