// ---------------------------------------------------------------------------
// Networking Resources (Phase 9)
// ---------------------------------------------------------------------------

export interface ServicePortSummary {
  name?: string;
  protocol: string;
  port: number;
  targetPort?: string;
  nodePort?: number;
}

export interface ServiceSummary {
  name: string;
  namespace: string;
  type: string;
  status: string;
  readyEndpoints: number;
  totalEndpoints: number;
  clusterIP?: string;
  clusterIPs?: string[];
  externalName?: string;
  externalIPs?: string[];
  loadBalancerIPs?: string[];
  ports: ServicePortSummary[];
  selector?: Record<string, string>;
  sessionAffinity?: string;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListServicesParams {
  contextName?: string;
  namespace?: string;
}

export interface ListServicesResult {
  items: ServiceSummary[];
  totalCount: number;
}

export interface EndpointAddressSummary {
  ip: string;
  hostname?: string;
  nodeName?: string;
  targetKind?: string;
  targetName?: string;
  ready: boolean;
}

export interface EndpointPortSummary {
  name?: string;
  protocol: string;
  port: number;
}

export interface EndpointsSummary {
  name: string;
  namespace: string;
  status: string;
  addresses: EndpointAddressSummary[];
  ports: EndpointPortSummary[];
  readyCount: number;
  notReadyCount: number;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListEndpointsParams {
  contextName?: string;
  namespace?: string;
}

export interface ListEndpointsResult {
  items: EndpointsSummary[];
  totalCount: number;
}

export interface IngressPathSummary {
  host?: string;
  path: string;
  pathType: string;
  serviceName?: string;
  servicePort?: string;
}

export interface IngressTLSSummary {
  hosts: string[];
  secretName?: string;
  status: string;
  subject?: string;
  issuer?: string;
  notBefore?: string;
  notAfter?: string;
  dnsNames?: string[];
  message?: string;
}

export interface IngressSummary {
  name: string;
  namespace: string;
  className?: string;
  status: string;
  hosts: string[];
  addresses: string[];
  paths: IngressPathSummary[];
  tls: IngressTLSSummary[];
  defaultBackend?: string;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListIngressesParams {
  contextName?: string;
  namespace?: string;
}

export interface ListIngressesResult {
  items: IngressSummary[];
  totalCount: number;
}

export interface GatewayResourceSummary {
  kind: string;
  name: string;
  namespace?: string;
  status: string;
  class?: string;
  hosts: string[];
  addresses: string[];
  ruleCount: number;
  listenerCount: number;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListGatewayResourcesParams {
  contextName?: string;
  namespace?: string;
}

export interface ListGatewayResourcesResult {
  items: GatewayResourceSummary[];
  totalCount: number;
  available: boolean;
}

export interface NetworkPolicyRuleDetail {
  direction: string;
  peers: string[];
  ports: string[];
  description: string;
}

export interface NetworkPolicySummary {
  name: string;
  namespace: string;
  status: string;
  podSelector: string;
  policyTypes: string[];
  ingressRules: number;
  egressRules: number;
  ingress: string[];
  egress: string[];
  ingressDetails: NetworkPolicyRuleDetail[];
  egressDetails: NetworkPolicyRuleDetail[];
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListNetworkPoliciesParams {
  contextName?: string;
  namespace?: string;
}

export interface ListNetworkPoliciesResult {
  items: NetworkPolicySummary[];
  totalCount: number;
}
