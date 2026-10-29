import type * as React from "react";
import {
  LayoutDashboard,
  Box,
  Layers,
  Repeat,
  Database,
  Cpu,
  Clock,
  Network,
  Radio,
  Shield,
  Globe,
  ArrowLeftRight,
  Radar,
  FileCode,
  HardDrive,
  Users,
  Key,
  ShieldCheck,
  GitBranch,
  FolderLock,
  Boxes,
  Server,
  FolderTree,
  History,
  Waypoints,
  Route,
  Activity,
  ArrowUp,
  SlidersHorizontal,
  Webhook,
  FileCheck2,
  Link2,
  ShipWheel,
  Monitor,
  Keyboard,
  Timer,
  GraduationCap,
} from "lucide-react";
import type { SettingsSection } from "@/stores/settingsStore";

export interface NavItem {
  id: string;
  title: string;
  shortTitle?: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeVariant?: "default" | "warning" | "accent" | "soon";
  disabled?: boolean;
  desktopHidden?: boolean;
}

export interface NavGroup {
  category: string;
  items: NavItem[];
}

export interface SettingsNavItem {
  id: string;
  testId: string;
  section: SettingsSection;
  title: string;
  description: string;
  icon: React.ElementType;
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    id: "settings-appearance",
    testId: "appearance",
    section: "appearance",
    title: "Appearance",
    description: "Theme, text, motion",
    icon: Monitor,
  },
  {
    id: "settings-data-refresh",
    testId: "data-refresh",
    section: "data-refresh",
    title: "Data & Refresh",
    description: "Polling and table rows",
    icon: Timer,
  },
  {
    id: "settings-learning",
    testId: "learning",
    section: "learning",
    title: "Learning",
    description: "Guided help and depth",
    icon: GraduationCap,
  },
  {
    id: "settings-shortcuts",
    testId: "shortcuts",
    section: "shortcuts",
    title: "Shortcuts",
    description: "Keyboard reference",
    icon: Keyboard,
  },
];

export interface SidebarCounts {
  contextCount: number;
  pods: number;
  deployments: number;
  replicaSets: number;
  statefulSets: number;
  daemonSets: number;
  jobsAndCronJobs: number;
  services: number;
  endpoints: number;
  ingressGateway: number;
  networkPolicies: number;
  activePortForwards: number;
  configMaps: number;
  secrets: number;
  persistentVolumes: number;
  storageClasses: number;
  serviceAccounts: number;
  rbac: number;
  crds: number;
  namespaces: number;
  events: number;
  replicationControllers: number;
  endpointSlices: number;
  ingressClasses: number;
  persistentVolumeClaims: number;
  horizontalPodAutoscalers: number;
  podDisruptionBudgets: number;
  resourceQuotas: number;
  limitRanges: number;
  priorityClasses: number;
  runtimeClasses: number;
  leases: number;
  mutatingWebhookConfigurations: number;
  validatingWebhookConfigurations: number;
  validatingAdmissionPolicies: number;
  validatingAdmissionPolicyBindings: number;
  helmReleases: number;
}

export function buildNavigationGroups(counts: SidebarCounts): NavGroup[] {
  const {
    contextCount,
    pods,
    deployments,
    replicaSets,
    statefulSets,
    daemonSets,
    jobsAndCronJobs,
    services,
    endpoints,
    ingressGateway,
    networkPolicies,
    activePortForwards,
    configMaps,
    secrets,
    persistentVolumes,
    storageClasses,
    serviceAccounts,
    rbac,
    crds,
    namespaces,
    events,
    replicationControllers,
    endpointSlices,
    ingressClasses,
    persistentVolumeClaims,
    horizontalPodAutoscalers,
    podDisruptionBudgets,
    resourceQuotas,
    limitRanges,
    priorityClasses,
    runtimeClasses,
    leases,
    mutatingWebhookConfigurations,
    validatingWebhookConfigurations,
    validatingAdmissionPolicies,
    validatingAdmissionPolicyBindings,
    helmReleases,
  } = counts;

  return [
    {
      category: "Overview",
      items: [
        {
          id: "fleet",
          title: "All Clusters",
          icon: Server,
          badge: contextCount > 0 ? contextCount : undefined,
          badgeVariant: "accent",
          desktopHidden: true,
        },
        { id: "overview", title: "Cluster Overview", icon: LayoutDashboard },
        {
          id: "gitops",
          title: "GitOps Drift",
          shortTitle: "GitOps",
          icon: GitBranch,
        },
      ],
    },
    {
      category: "Cluster",
      items: [
        {
          id: "namespaces",
          title: "Namespaces",
          icon: FolderTree,
          badge: namespaces > 0 ? namespaces : undefined,
          badgeVariant: "accent",
        },
        {
          id: "events",
          title: "Events",
          icon: History,
          badge: events > 0 ? events : undefined,
          badgeVariant: "accent",
        },
      ],
    },
    {
      category: "Workloads",
      items: [
        {
          id: "pods",
          title: "Pods",
          icon: Box,
          badge: pods > 0 ? pods : undefined,
          badgeVariant: "accent",
        },
        {
          id: "deployments",
          title: "Deployments",
          icon: Layers,
          badge: deployments > 0 ? deployments : undefined,
          badgeVariant: "accent",
        },
        {
          id: "replicasets",
          title: "ReplicaSets",
          icon: Repeat,
          badge: replicaSets > 0 ? replicaSets : undefined,
          badgeVariant: "accent",
        },
        {
          id: "replicationcontrollers",
          title: "Replication Controllers",
          shortTitle: "Replication Ctrls",
          icon: Repeat,
          badge:
            replicationControllers > 0 ? replicationControllers : undefined,
          badgeVariant: "accent",
        },
        {
          id: "statefulsets",
          title: "StatefulSets",
          icon: Database,
          badge: statefulSets > 0 ? statefulSets : undefined,
          badgeVariant: "accent",
        },
        {
          id: "daemonsets",
          title: "DaemonSets",
          icon: Cpu,
          badge: daemonSets > 0 ? daemonSets : undefined,
          badgeVariant: "accent",
        },
        {
          id: "jobs",
          title: "Jobs & CronJobs",
          icon: Clock,
          badge: jobsAndCronJobs > 0 ? jobsAndCronJobs : undefined,
          badgeVariant: "accent",
        },
      ],
    },
    {
      category: "Scaling",
      items: [
        {
          id: "horizontalpodautoscalers",
          title: "Horizontal Pod Autoscalers",
          shortTitle: "HPAs",
          icon: Activity,
          badge:
            horizontalPodAutoscalers > 0 ? horizontalPodAutoscalers : undefined,
          badgeVariant: "accent",
        },
        {
          id: "poddisruptionbudgets",
          title: "Pod Disruption Budgets",
          shortTitle: "PDBs",
          icon: Shield,
          badge: podDisruptionBudgets > 0 ? podDisruptionBudgets : undefined,
          badgeVariant: "accent",
        },
      ],
    },
    {
      category: "Networking",
      items: [
        {
          id: "services",
          title: "Services",
          icon: Network,
          badge: services > 0 ? services : undefined,
          badgeVariant: "accent",
        },
        {
          id: "endpoints",
          title: "Endpoints",
          icon: Radio,
          badge: endpoints > 0 ? endpoints : undefined,
          badgeVariant: "accent",
        },
        {
          id: "endpointslices",
          title: "Endpoint Slices",
          icon: Waypoints,
          badge: endpointSlices > 0 ? endpointSlices : undefined,
          badgeVariant: "accent",
        },
        {
          id: "ingresses",
          title: "Ingresses & Gateways",
          icon: Globe,
          badge: ingressGateway > 0 ? ingressGateway : undefined,
          badgeVariant: "accent",
        },
        {
          id: "ingressclasses",
          title: "Ingress Classes",
          icon: Route,
          badge: ingressClasses > 0 ? ingressClasses : undefined,
          badgeVariant: "accent",
        },
        {
          id: "networkpolicies",
          title: "Network Policies",
          icon: Shield,
          badge: networkPolicies > 0 ? networkPolicies : undefined,
          badgeVariant: "accent",
        },
        {
          id: "portforwards",
          title: "Port Forwards",
          icon: ArrowLeftRight,
          badge: activePortForwards > 0 ? activePortForwards : undefined,
          badgeVariant: "accent",
        },
        {
          id: "cilium",
          title: "Network Observability",
          shortTitle: "CNI Observability",
          icon: Radar,
        },
      ],
    },
    {
      category: "Config & Storage",
      items: [
        {
          id: "configmaps",
          title: "ConfigMaps",
          icon: FileCode,
          badge: configMaps > 0 ? configMaps : undefined,
          badgeVariant: "accent",
        },
        {
          id: "secrets",
          title: "Secrets",
          icon: FolderLock,
          badge: secrets > 0 ? secrets : undefined,
          badgeVariant: "accent",
        },
        {
          id: "resourcequotas",
          title: "Resource Quotas",
          icon: Layers,
          badge: resourceQuotas > 0 ? resourceQuotas : undefined,
          badgeVariant: "accent",
        },
        {
          id: "limitranges",
          title: "Limit Ranges",
          icon: SlidersHorizontal,
          badge: limitRanges > 0 ? limitRanges : undefined,
          badgeVariant: "accent",
        },
        {
          id: "persistentvolumes",
          title: "Persistent Volumes",
          icon: HardDrive,
          badge: persistentVolumes > 0 ? persistentVolumes : undefined,
          badgeVariant: "accent",
        },
        {
          id: "persistentvolumeclaims",
          title: "Persistent Volume Claims",
          shortTitle: "Volume Claims",
          icon: HardDrive,
          badge:
            persistentVolumeClaims > 0 ? persistentVolumeClaims : undefined,
          badgeVariant: "accent",
        },
        {
          id: "storageclasses",
          title: "Storage Classes",
          icon: HardDrive,
          badge: storageClasses > 0 ? storageClasses : undefined,
          badgeVariant: "accent",
        },
      ],
    },
    {
      category: "Scheduling",
      items: [
        {
          id: "priorityclasses",
          title: "Priority Classes",
          icon: ArrowUp,
          badge: priorityClasses > 0 ? priorityClasses : undefined,
          badgeVariant: "accent",
        },
        {
          id: "runtimeclasses",
          title: "Runtime Classes",
          icon: Cpu,
          badge: runtimeClasses > 0 ? runtimeClasses : undefined,
          badgeVariant: "accent",
        },
        {
          id: "leases",
          title: "Leases",
          icon: Clock,
          badge: leases > 0 ? leases : undefined,
          badgeVariant: "accent",
        },
      ],
    },
    {
      category: "Admission",
      items: [
        {
          id: "mutatingwebhookconfigurations",
          title: "Mutating Webhook Configs",
          shortTitle: "Mutating Webhooks",
          icon: Webhook,
          badge:
            mutatingWebhookConfigurations > 0
              ? mutatingWebhookConfigurations
              : undefined,
          badgeVariant: "accent",
        },
        {
          id: "validatingwebhookconfigurations",
          title: "Validating Webhook Configs",
          shortTitle: "Validating Webhooks",
          icon: ShieldCheck,
          badge:
            validatingWebhookConfigurations > 0
              ? validatingWebhookConfigurations
              : undefined,
          badgeVariant: "accent",
        },
        {
          id: "validatingadmissionpolicies",
          title: "Validating Admission Policies",
          shortTitle: "Admission Policies",
          icon: FileCheck2,
          badge:
            validatingAdmissionPolicies > 0
              ? validatingAdmissionPolicies
              : undefined,
          badgeVariant: "accent",
        },
        {
          id: "validatingadmissionpolicybindings",
          title: "Admission Policy Bindings",
          shortTitle: "Policy Bindings",
          icon: Link2,
          badge:
            validatingAdmissionPolicyBindings > 0
              ? validatingAdmissionPolicyBindings
              : undefined,
          badgeVariant: "accent",
        },
      ],
    },
    {
      category: "Helm",
      items: [
        {
          id: "helmreleases",
          title: "Releases",
          shortTitle: "Releases",
          icon: ShipWheel,
          badge: helmReleases > 0 ? helmReleases : undefined,
          badgeVariant: "accent",
        },
        {
          id: "helmcharts",
          title: "Charts",
          icon: Boxes,
        },
      ],
    },
    {
      category: "Access & Custom",
      items: [
        {
          id: "serviceaccounts",
          title: "Service Accounts",
          icon: Users,
          badge: serviceAccounts > 0 ? serviceAccounts : undefined,
          badgeVariant: "accent",
        },
        {
          id: "rbac",
          title: "Roles & Bindings",
          icon: Key,
          badge: rbac > 0 ? rbac : undefined,
          badgeVariant: "accent",
        },
        {
          id: "permissions",
          title: "Permissions Checker",
          shortTitle: "Permissions",
          icon: ShieldCheck,
        },
        {
          id: "crds",
          title: "Custom Resources",
          icon: Boxes,
          badge: crds > 0 ? crds : undefined,
          badgeVariant: "accent",
        },
      ],
    },
  ];
}
