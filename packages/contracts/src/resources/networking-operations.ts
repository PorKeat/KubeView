import type { ServiceSummary } from "./networking-core.js";
// ---------------------------------------------------------------------------
// Phase 9 Completion: Management, Diagnostics, Port Forwarding, Cilium
// ---------------------------------------------------------------------------

export interface ApplyIngressParams {
  contextName?: string;
  namespace: string;
  yaml: string;
}

export interface DeleteIngressParams {
  contextName?: string;
  namespace: string;
  name: string;
}

export interface ApplyGatewayResourceParams {
  contextName?: string;
  namespace: string;
  yaml: string;
}

export interface DeleteGatewayResourceParams {
  contextName?: string;
  namespace: string;
  kind: string;
  name: string;
}

export interface ServiceDiagnosticCheck {
  id: string;
  label: string;
  status: "pass" | "warning" | "fail" | "skipped" | string;
  message: string;
  details?: string[];
}

export interface DiagnoseServiceParams {
  contextName?: string;
  namespace: string;
  serviceName: string;
  probePort?: string;
  probePath?: string;
  probeScheme?: "http" | "https" | string;
}

export interface DiagnoseServiceResult {
  service: ServiceSummary;
  dnsName: string;
  checks: ServiceDiagnosticCheck[];
  summary: string;
  generatedAt: string;
}

export interface PortForwardRequest {
  contextName?: string;
  namespace: string;
  targetKind: "service" | "pod" | string;
  targetName: string;
  remotePort: number;
  localPort?: number;
  address?: string;
}

export interface PortForwardSession {
  id: string;
  contextName: string;
  namespace: string;
  targetKind: string;
  targetName: string;
  targetPod: string;
  remotePort: number;
  localPort: number;
  address: string;
  status: string;
  startedAt: string;
  activeConnections: number;
  totalConnections: number;
  bytesSent: number;
  bytesReceived: number;
  lastError?: string;
}

export interface ListPortForwardsResult {
  items: PortForwardSession[];
}

export interface CiliumStatus {
  installed: boolean;
  version?: string;
  networkPolicyCount: number;
  endpointCount: number;
  hubbleAvailable: boolean;
  hubbleRelayService?: string;
  hubbleRelayPort?: number;
  message?: string;
}

export interface CiliumNetworkPolicySummary {
  name: string;
  namespace: string;
  endpointSelector: string;
  ingressRules: number;
  egressRules: number;
  status: string;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface CiliumEndpointSummary {
  name: string;
  namespace: string;
  podName: string;
  identityId: number;
  state: string;
  ipv4?: string;
  ipv6?: string;
  ingressPolicy?: string;
  egressPolicy?: string;
  age: string;
  creationTimestamp: string;
}

export interface ListCiliumResourcesResult {
  policies: CiliumNetworkPolicySummary[];
  endpoints: CiliumEndpointSummary[];
  status: CiliumStatus;
}

export interface ListHubbleFlowsParams {
  contextName?: string;
  namespace?: string;
  number?: number;
}

export interface HubbleFlowSummary {
  time: string;
  verdict: string;
  type: string;
  sourceNamespace?: string;
  sourcePod?: string;
  sourceIp?: string;
  destinationNamespace?: string;
  destinationPod?: string;
  destinationIp?: string;
  protocol?: string;
  sourcePort?: string;
  destinationPort?: string;
  nodeName?: string;
  dropReason?: string;
  summary: string;
  rawJson?: string;
}

export interface ListHubbleFlowsResult {
  flows: HubbleFlowSummary[];
}

export interface NetworkingCountsResult {
  services: number;
  endpoints: number;
  ingresses: number;
  gatewayResources: number;
  networkPolicies: number;
  ciliumPolicies: number;
  ciliumEndpoints: number;
  activePortForwards: number;
  configMaps: number;
  secrets: number;
  persistentVolumes: number;
  storageClasses: number;
  serviceAccounts: number;
  roles: number;
  clusterRoles: number;
  roleBindings: number;
  clusterRoleBindings: number;
  crds: number;
}

export interface CNIInfo {
  provider: string;
  displayName: string;
  version?: string;
  detected: boolean;
  detectionSource?: string;
  capabilities: string[];
}

export interface NetworkObservabilityResult {
  cni: CNIInfo;
  nodeCount: number;
  readyNodeCount: number;
  podCount: number;
  runningPodCount: number;
  serviceCount: number;
  networkPolicyCount: number;
  endpointSliceCount: number;
  podCidrs: string[];
  ipFamilies: string[];
}
