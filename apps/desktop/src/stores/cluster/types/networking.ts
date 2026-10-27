import type {
  ServiceSummary,
  EndpointsSummary,
  IngressSummary,
  GatewayResourceSummary,
  NetworkPolicySummary,
  NetworkingCountsResult,
  NetworkObservabilityResult,
  DiagnoseServiceResult,
  PortForwardRequest,
  PortForwardSession,
  ListCiliumResourcesResult,
  HubbleFlowSummary,
} from "@kubeview/contracts";

export interface ResourceEditorTarget {
  kind: "Ingress" | "GatewayClass" | "Gateway" | "HTTPRoute" | "GRPCRoute";
  name: string;
  namespace: string;
}

export interface ServiceDiagnosticsTarget {
  serviceName: string;
  namespace: string;
  probePort?: string;
}

export interface NetworkingSlice {
  // Networking resources
  services: ServiceSummary[];
  totalServicesCount: number;
  isServicesLoading: boolean;
  hasLoadedServicesOnce: boolean;

  endpoints: EndpointsSummary[];
  totalEndpointsCount: number;
  isEndpointsLoading: boolean;
  hasLoadedEndpointsOnce: boolean;

  ingresses: IngressSummary[];
  totalIngressesCount: number;
  isIngressesLoading: boolean;
  hasLoadedIngressesOnce: boolean;

  gatewayResources: GatewayResourceSummary[];
  totalGatewayResourcesCount: number;
  isGatewayResourcesLoading: boolean;
  hasLoadedGatewayResourcesOnce: boolean;
  gatewayApiAvailable: boolean;

  networkPolicies: NetworkPolicySummary[];
  totalNetworkPoliciesCount: number;
  isNetworkPoliciesLoading: boolean;
  hasLoadedNetworkPoliciesOnce: boolean;

  loadServices: (namespace?: string, contextName?: string) => Promise<void>;
  loadEndpoints: (namespace?: string, contextName?: string) => Promise<void>;
  loadIngresses: (namespace?: string, contextName?: string) => Promise<void>;
  loadGatewayResources: (
    namespace?: string,
    contextName?: string,
  ) => Promise<void>;
  loadNetworkPolicies: (
    namespace?: string,
    contextName?: string,
  ) => Promise<void>;
}

export interface NetworkObservabilitySlice {
  networkingCounts: NetworkingCountsResult | null;
  isNetworkingCountsLoading: boolean;
  hasLoadedNetworkingCountsOnce: boolean;

  // CNI and provider-neutral network observability
  networkObservability: NetworkObservabilityResult | null;
  isNetworkObservabilityLoading: boolean;
  hasLoadedNetworkObservabilityOnce: boolean;
  networkObservabilityError: string | null;

  // Cilium and Hubble
  ciliumResources: ListCiliumResourcesResult | null;
  isCiliumLoading: boolean;
  hasLoadedCiliumOnce: boolean;
  hubbleFlows: HubbleFlowSummary[];
  isHubbleFlowsLoading: boolean;
  hubbleFlowsError: string | null;

  loadCiliumResources: (
    namespace?: string,
    contextName?: string,
  ) => Promise<void>;
  loadNetworkObservability: (contextName?: string) => Promise<void>;
  loadNetworkingCounts: (
    namespace?: string,
    contextName?: string,
  ) => Promise<void>;
  loadHubbleFlows: (number?: number) => Promise<void>;
}

export interface NetworkingActionsSlice {
  // Networking resource management
  resourceEditorTarget: ResourceEditorTarget | null;
  resourceEditorYaml: string;
  isResourceEditorLoading: boolean;
  isResourceEditorSaving: boolean;
  resourceEditorError: string | null;
  deleteResourceTarget: ResourceEditorTarget | null;

  // Service diagnostics
  diagnosticsTarget: ServiceDiagnosticsTarget | null;
  diagnosticsResult: DiagnoseServiceResult | null;
  isDiagnosticsLoading: boolean;
  diagnosticsError: string | null;

  // Port forwarding
  portForwards: PortForwardSession[];
  isPortForwardsLoading: boolean;
  portForwardsError: string | null;

  openResourceEditor: (target: ResourceEditorTarget) => Promise<void>;
  closeResourceEditor: () => void;
  setResourceEditorYaml: (yaml: string) => void;
  applyResourceEditor: () => Promise<void>;
  openDeleteResource: (target: ResourceEditorTarget) => void;
  closeDeleteResource: () => void;
  confirmDeleteResource: () => Promise<void>;
  openServiceDiagnostics: (target: ServiceDiagnosticsTarget) => void;
  closeServiceDiagnostics: () => void;
  runServiceDiagnostics: (target?: ServiceDiagnosticsTarget) => Promise<void>;
  loadPortForwards: () => Promise<void>;
  startPortForward: (
    request: PortForwardRequest,
  ) => Promise<PortForwardSession | null>;
  stopPortForward: (id: string) => Promise<void>;
}
