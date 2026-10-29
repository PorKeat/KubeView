"use client";

import * as React from "react";
import { Command } from "cmdk";
import {
  Box,
  Layers,
  Repeat,
  Cpu,
  Clock,
  Network,
  Radio,
  Globe,
  ArrowLeftRight,
  Radar,
  Database,
  HardDrive,
  LayoutDashboard,
  Sun,
  Moon,
  FolderLock,
  Server,
  PanelLeftClose,
  Activity,
  Terminal,
  FileCode,
  Shield,
  Settings,
  Users,
  Key,
  ShieldCheck,
  Boxes,
  GraduationCap,
  FolderTree,
  History,
  Waypoints,
  Route,
  ArrowUp,
  SlidersHorizontal,
  Webhook,
  FileCheck2,
  Link2,
  ShipWheel,
} from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import { useTabStore } from "@/stores/tabStore";
import { useClusterStore } from "@/stores/clusterStore";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { GitOpsCommandItem } from "./GitOpsCommandItem";

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, toggleSidebar } =
    useLayoutStore();
  const { openTab } = useTabStore();
  const { resolvedTheme, setTheme } = useTheme();
  const {
    setCurrentContext,
    setCurrentNamespace,
    openInspector,
    availableContexts,
    availableNamespaces,
    openKubeconfigModal,
  } = useClusterStore();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  React.useEffect(() => {
    if (!commandPaletteOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const navigateTo = (id: string, title: string) => {
    openTab({ id, title, closable: id !== "overview" });
    setCommandPaletteOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 dark:bg-black/65 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-20 select-none animate-in fade-in duration-100"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-[calc(100%-1.5rem)] max-w-xl bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full">
          {/* Header Search Input */}
          <div className="flex items-center border-b border-[var(--border)] px-3.5 gap-2.5">
            <Logo variant="mark" size="sm" />
            <Command.Input
              autoFocus
              placeholder="Type a command, jump to resource, or switch context..."
              className="w-full py-3 text-xs bg-transparent text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] font-mono"
            />
            <kbd className="px-1.5 py-0.5 text-[10px] bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--muted)] font-mono shrink-0">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
            <Command.Empty className="py-8 text-center text-xs text-[var(--muted)]">
              No matching resources, commands, or clusters found.
            </Command.Empty>

            {/* Quick Navigation */}
            <Command.Group
              heading="Navigation"
              className="text-[10px] font-semibold text-[var(--muted)] px-2 py-1 uppercase tracking-wider"
            >
              <Command.Item
                onSelect={() => navigateTo("fleet", "All Clusters")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Server className="w-4 h-4 text-[var(--accent)]" />
                <span>All Clusters</span>
                <span className="ml-auto font-mono text-[10px] text-[var(--muted)]">
                  {availableContexts.length}
                </span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("overview", "Cluster Overview")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-[var(--accent)]" />
                <span>Cluster Overview</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("topology", "Topology")}
                value="Topology cluster nodes workloads services map graph"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Network className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span>Topology</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("learning", "Learning Center")}
                value="Learning Center learn tutorial glossary beginner Kubernetes guidance"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <GraduationCap className="w-4 h-4 text-[var(--accent)]" />
                <span>Learning Center</span>
              </Command.Item>
              <GitOpsCommandItem
                onSelect={() => navigateTo("gitops", "GitOps Drift")}
              />
              <Command.Item
                onSelect={() => navigateTo("pods", "Pods")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Box className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>Pods & Containers</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("deployments", "Deployments")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Layers className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span>Deployments</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("replicasets", "ReplicaSets")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Repeat className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span>ReplicaSets</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("statefulsets", "StatefulSets")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Database className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>StatefulSets</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("daemonsets", "DaemonSets")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Cpu className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                <span>DaemonSets</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("jobs", "Jobs & CronJobs")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Clock className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                <span>Jobs &amp; CronJobs</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("services", "Services")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Network className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                <span>Services</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("endpoints", "Endpoints")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Radio className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span>Endpoints</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("ingresses", "Ingresses & Gateways")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Globe className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>Ingresses &amp; Gateways</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  navigateTo("networkpolicies", "Network Policies")
                }
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Shield className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span>Network Policies</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("portforwards", "Port Forwards")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Port Forwards</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("cilium", "Network Observability")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
                value="Network Observability Cilium Hubble Calico Antrea Flannel"
              >
                <Radar className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>Network Observability</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo("configmaps", "ConfigMaps");
                }}
                value="ConfigMaps config maps configuration"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <FileCode className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>ConfigMaps</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo("secrets", "Secrets");
                }}
                value="Secrets redacted credentials"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <FolderLock className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span>Secrets (Redacted)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo("persistentvolumes", "Persistent Volumes");
                }}
                value="Persistent Volumes storage pv"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <HardDrive className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                <span>Persistent Volumes</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo("storageclasses", "Storage Classes");
                }}
                value="Storage Classes storageclass provisioning"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Database className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                <span>Storage Classes</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo("serviceaccounts", "Service Accounts");
                }}
                value="Service Accounts identity workload"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Users className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                <span>Service Accounts</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo("rbac", "Roles & Bindings");
                }}
                value="Roles Bindings RBAC permissions ClusterRole"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Key className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Roles &amp; Bindings</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  navigateTo("permissions", "Permissions Checker")
                }
                value="Permissions Checker RBAC access review allowed denied service account"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>Permissions Checker</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("crds", "Custom Resources")}
                value="Custom Resources CRD definitions API"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Boxes className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                <span>Custom Resources</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("namespaces", "Namespaces")}
                value="Namespaces namespace partitions cluster structure"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <FolderTree className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Namespaces</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo("events", "Events");
                }}
                value="Events event warnings cluster activity"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <History className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>Events</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo(
                    "replicationcontrollers",
                    "Replication Controllers",
                  );
                }}
                value="Replication Controllers legacy workload"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Repeat className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span>Replication Controllers</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo("endpointslices", "Endpoint Slices");
                }}
                value="Endpoint Slices endpoints discovery service"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Waypoints className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                <span>Endpoint Slices</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("ingressclasses", "Ingress Classes")}
                value="Ingress Classes ingress class controller"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Route className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                <span>Ingress Classes</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo(
                    "persistentvolumeclaims",
                    "Persistent Volume Claims",
                  );
                }}
                value="Persistent Volume Claims PVC storage"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <HardDrive className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>Persistent Volume Claims</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo(
                    "horizontalpodautoscalers",
                    "Horizontal Pod Autoscalers",
                  );
                }}
                value="Horizontal Pod Autoscalers HPA autoscaling replicas"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span>Horizontal Pod Autoscalers</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo("poddisruptionbudgets", "Pod Disruption Budgets");
                }}
                value="Pod Disruption Budgets PDB disruption availability"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Shield className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Pod Disruption Budgets</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo("resourcequotas", "Resource Quotas");
                }}
                value="Resource Quotas quota namespace limits"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Layers className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                <span>Resource Quotas</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo("limitranges", "Limit Ranges");
                }}
                value="Limit Ranges limits defaults namespace"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                <span>Limit Ranges</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  navigateTo("priorityclasses", "Priority Classes")
                }
                value="Priority Classes scheduling preemption"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <ArrowUp className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span>Priority Classes</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("runtimeclasses", "Runtime Classes")}
                value="Runtime Classes runtime handler container"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Cpu className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>Runtime Classes</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo("leases", "Leases");
                }}
                value="Leases leader election coordination renew"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                <span>Leases</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  navigateTo(
                    "mutatingwebhookconfigurations",
                    "Mutating Webhook Configs",
                  )
                }
                value="Mutating Webhook Configs admission"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Webhook className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span>Mutating Webhook Configs</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  navigateTo(
                    "validatingwebhookconfigurations",
                    "Validating Webhook Configs",
                  )
                }
                value="Validating Webhook Configs admission"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>Validating Webhook Configs</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  navigateTo(
                    "validatingadmissionpolicies",
                    "Validating Admission Policies",
                  )
                }
                value="Validating Admission Policies CEL admission"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <FileCheck2 className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                <span>Validating Admission Policies</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  navigateTo(
                    "validatingadmissionpolicybindings",
                    "Admission Policy Bindings",
                  )
                }
                value="Admission Policy Bindings activation parameter"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Link2 className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Admission Policy Bindings</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentNamespace("all");
                  navigateTo("helmreleases", "Helm Releases");
                }}
                value="Helm Releases charts releases cluster"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <ShipWheel className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span>Helm Releases</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("helmcharts", "Charts")}
                value="Helm Charts repository charts browse"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Boxes className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                <span>Charts</span>
              </Command.Item>
            </Command.Group>

            {/* Clusters & Contexts */}
            <Command.Group
              heading="Clusters & Contexts"
              className="text-[10px] font-semibold text-[var(--muted)] px-2 py-1 uppercase tracking-wider"
            >
              <Command.Item
                onSelect={() => {
                  openKubeconfigModal("browse");
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[#F08A42] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Server className="w-4 h-4 text-[#F08A42]" />
                  <span className="font-medium">
                    + Import Kubeconfig File...
                  </span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F08A42]/10 text-[#F08A42]">
                  Add
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  openKubeconfigModal("paste");
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[#F08A42] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileCode className="w-4 h-4 text-[#F08A42]" />
                  <span className="font-medium">
                    + Paste Kubeconfig YAML...
                  </span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F08A42]/10 text-[#F08A42]">
                  YAML
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  openKubeconfigModal("manage");
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-[var(--muted)]" />
                  <span>Manage Configured Clusters...</span>
                </div>
                <span className="text-[10px] text-[var(--muted)] font-mono">
                  {availableContexts.length} clusters
                </span>
              </Command.Item>

              {availableContexts.map((ctx) => (
                <Command.Item
                  key={ctx.name}
                  onSelect={() => {
                    setCurrentContext(ctx.name);
                    toast.success(`Switched to context: ${ctx.name}`);
                    setCommandPaletteOpen(false);
                  }}
                  className="flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Server className="w-4 h-4 text-[var(--muted)]" />
                    <span className="font-mono">{ctx.name}</span>
                  </div>
                  <span className="text-[10px] text-[var(--muted)] font-mono">
                    {ctx.latencyMs}ms
                  </span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Namespaces */}
            <Command.Group
              heading="Switch Namespace"
              className="text-[10px] font-semibold text-[var(--muted)] px-2 py-1 uppercase tracking-wider"
            >
              {availableNamespaces.map((ns) => (
                <Command.Item
                  key={ns}
                  onSelect={() => {
                    setCurrentNamespace(ns);
                    toast.info(`Active namespace: ${ns}`);
                    setCommandPaletteOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors font-mono"
                >
                  <Layers className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>ns: {ns}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Diagnostics & Operations */}
            <Command.Group
              heading="Diagnostics & Actions"
              className="text-[10px] font-semibold text-[var(--muted)] px-2 py-1 uppercase tracking-wider"
            >
              <Command.Item
                onSelect={() => {
                  toast.success(
                    "Running 4-stage automated connection diagnostics...",
                  );
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Run Connection Diagnostics (4-Stage Probe)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  openInspector({
                    kind: "Pod",
                    name: "api-gateway-7f8d-x9q",
                    namespace: "production",
                    status: "CrashLoopBackOff",
                  });
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Inspect Problem Pod: api-gateway-7f8d-x9q</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setTheme(resolvedTheme === "dark" ? "light" : "dark");
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-blue-400" />
                )}
                <span>Toggle Dark / Light Theme</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  toggleSidebar();
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <PanelLeftClose className="w-4 h-4 text-[var(--muted)]" />
                <span>Toggle Sidebar Navigation</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("settings", "Settings")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Settings className="w-4 h-4 text-[var(--accent)]" />
                <span>Settings &amp; Preferences</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer Hints */}
          <div className="h-8 border-t border-[var(--border)] px-3 flex items-center justify-between text-[10px] text-[var(--muted)] bg-[var(--surface)]">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="font-mono">↑↓</kbd> navigate
              </span>
              <span>
                <kbd className="font-mono">↵</kbd> select
              </span>
              <span>
                <kbd className="font-mono">esc</kbd> close
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono">
              <span>KubeView IDE</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
