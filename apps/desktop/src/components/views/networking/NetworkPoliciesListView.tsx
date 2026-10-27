"use client";

import * as React from "react";
import { Shield } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import type { NetworkPolicySummary } from "@kubeview/contracts";
import {
  NetworkingResourcePage,
  type NetworkingColumn,
  type NetworkingFilterOption,
} from "./NetworkingResourcePage";

function shortenPolicySelector(selector: string): string {
  return selector
    .split(",")
    .map((term) => {
      const equals = term.indexOf("=");
      if (equals < 0) return term.trim();
      const key = term.slice(0, equals).trim();
      const value = term.slice(equals + 1).trim();
      const slash = key.lastIndexOf("/");
      return `${slash >= 0 ? key.slice(slash + 1) : key}=${value}`;
    })
    .join(",");
}

function policyMatchesSearch(
  policy: NetworkPolicySummary,
  query: string,
): boolean {
  if (!query) return true;
  return (
    policy.name.toLowerCase().includes(query) ||
    policy.namespace.toLowerCase().includes(query) ||
    policy.podSelector.toLowerCase().includes(query) ||
    policy.status.toLowerCase().includes(query) ||
    policy.ingress.some((rule) => rule.toLowerCase().includes(query)) ||
    policy.egress.some((rule) => rule.toLowerCase().includes(query))
  );
}

function policyMatchesFilter(
  policy: NetworkPolicySummary,
  filter: string,
): boolean {
  const hasIngress = policy.policyTypes.includes("Ingress");
  const hasEgress = policy.policyTypes.includes("Egress");
  switch (filter) {
    case "ingress":
      return hasIngress;
    case "egress":
      return hasEgress;
    case "both":
      return hasIngress && hasEgress;
    default:
      return true;
  }
}

function policyStatus(policy: NetworkPolicySummary) {
  if (policy.policyTypes.length > 1) {
    return { label: policy.status, variant: "active" as const };
  }
  return { label: policy.status, variant: "muted" as const };
}

export function NetworkPoliciesListView() {
  const {
    networkPolicies,
    totalNetworkPoliciesCount,
    isNetworkPoliciesLoading,
    hasLoadedNetworkPoliciesOnce,
    loadNetworkPolicies,
    currentContext,
    currentNamespace,
    openInspector,
  } = useClusterStore();

  const [filter, setFilter] = React.useState("all");

  React.useEffect(() => {
    if (currentContext) loadNetworkPolicies(currentNamespace);
  }, [currentContext, currentNamespace, loadNetworkPolicies]);

  const refresh = React.useCallback(() => {
    loadNetworkPolicies(currentNamespace);
  }, [loadNetworkPolicies, currentNamespace]);

  const scopedPolicies = React.useMemo(
    () =>
      currentNamespace === "all"
        ? networkPolicies
        : networkPolicies.filter(
            (policy) =>
              policy.namespace.toLowerCase() === currentNamespace.toLowerCase(),
          ),
    [networkPolicies, currentNamespace],
  );

  const filterOptions = React.useMemo<NetworkingFilterOption[]>(
    () => [
      { id: "all", label: "All", count: scopedPolicies.length },
      {
        id: "ingress",
        label: "Ingress",
        count: scopedPolicies.filter((policy) =>
          policy.policyTypes.includes("Ingress"),
        ).length,
      },
      {
        id: "egress",
        label: "Egress",
        count: scopedPolicies.filter((policy) =>
          policy.policyTypes.includes("Egress"),
        ).length,
      },
      {
        id: "both",
        label: "Both",
        count: scopedPolicies.filter(
          (policy) =>
            policy.policyTypes.includes("Ingress") &&
            policy.policyTypes.includes("Egress"),
        ).length,
      },
    ],
    [scopedPolicies],
  );

  const columns = React.useMemo<NetworkingColumn<NetworkPolicySummary>[]>(
    () => [
      {
        key: "podSelector",
        label: "Pod Selector",
        widthClass: "w-[14%]",
        sortValue: (policy) => policy.podSelector,
        render: (policy) => (
          <span
            className="inline-flex max-w-full items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 truncate"
            title={policy.podSelector}
          >
            {shortenPolicySelector(policy.podSelector)}
          </span>
        ),
      },
      {
        key: "types",
        label: "Types",
        widthClass: "w-[12%]",
        sortValue: (policy) => policy.policyTypes.join(","),
        render: (policy) => (
          <div
            className="flex flex-nowrap items-center gap-1 overflow-hidden"
            title={policy.policyTypes.join(" + ")}
          >
            {policy.policyTypes.map((type) => (
              <span
                key={type}
                className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
              >
                {type}
              </span>
            ))}
          </div>
        ),
      },
      {
        key: "ingressRules",
        label: "Ingress Rules",
        widthClass: "w-[13%]",
        sortValue: (policy) => policy.ingressRules,
        render: (policy) =>
          policy.ingress.length === 0 ? (
            <span className="text-[10px] text-[var(--muted)] italic">
              {policy.policyTypes.includes("Ingress")
                ? "deny all ingress"
                : "not evaluated"}
            </span>
          ) : (
            <span
              className="font-mono text-[10px] text-[var(--muted)] truncate block"
              title={policy.ingress.join("\n")}
            >
              {policy.ingress[0]}
              {policy.ingress.length > 1
                ? ` +${policy.ingress.length - 1}`
                : ""}
            </span>
          ),
      },
      {
        key: "egressRules",
        label: "Egress Rules",
        widthClass: "w-[13%]",
        sortValue: (policy) => policy.egressRules,
        render: (policy) =>
          policy.egress.length === 0 ? (
            <span className="text-[10px] text-[var(--muted)] italic">
              {policy.policyTypes.includes("Egress")
                ? "deny all egress"
                : "not evaluated"}
            </span>
          ) : (
            <span
              className="font-mono text-[10px] text-[var(--muted)] truncate block"
              title={policy.egress.join("\n")}
            >
              {policy.egress[0]}
              {policy.egress.length > 1 ? ` +${policy.egress.length - 1}` : ""}
            </span>
          ),
      },
    ],
    [],
  );

  return (
    <NetworkingResourcePage
      icon={Shield}
      nounSingular="NetworkPolicy"
      nounPlural="network policies"
      items={networkPolicies}
      totalCount={totalNetworkPoliciesCount}
      isLoading={isNetworkPoliciesLoading}
      hasLoadedOnce={hasLoadedNetworkPoliciesOnce}
      onRefresh={refresh}
      searchPlaceholder="Filter policies by name, pod selector, peer, port..."
      matchesSearch={policyMatchesSearch}
      filterOptions={filterOptions}
      activeFilter={filter}
      setActiveFilter={setFilter}
      matchesFilter={policyMatchesFilter}
      columns={columns}
      getKey={(policy) => `${policy.namespace}/${policy.name}`}
      getName={(policy) => policy.name}
      getNamespace={(policy) => policy.namespace}
      getStatus={policyStatus}
      getAge={(policy) => policy.age}
      getCreationTimestamp={(policy) => policy.creationTimestamp}
      onRowClick={(policy) =>
        openInspector({
          kind: "NetworkPolicy",
          name: policy.name,
          namespace: policy.namespace,
          status: policy.status,
          data: policy as unknown as Record<string, unknown>,
        })
      }
      describeCommand={(policy) =>
        `kubectl describe networkpolicy ${policy.name} -n ${policy.namespace}`
      }
      testIdPrefix="network-policies"
      codeCommand={(namespace) => `kubectl get networkpolicies -n ${namespace}`}
      emptyDescription="NetworkPolicies select pods and declare which ingress and egress traffic is allowed."
    />
  );
}
