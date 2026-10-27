"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import type { IngressSummary } from "@kubeview/contracts";
import {
  NetworkingResourcePage,
  type NetworkingColumn,
  type NetworkingFilterOption,
} from "./NetworkingResourcePage";
import {
  ingressMatchesFilter,
  ingressMatchesSearch,
  ingressStatus,
} from "./ingressHelpers";

export function IngressTable({
  filter,
  setFilter,
}: {
  filter: string;
  setFilter: (filter: string) => void;
}) {
  const {
    ingresses,
    totalIngressesCount,
    isIngressesLoading,
    hasLoadedIngressesOnce,
    loadIngresses,
    currentNamespace,
    openInspector,
    openResourceEditor,
    openDeleteResource,
  } = useClusterStore();

  const refresh = React.useCallback(() => {
    loadIngresses(currentNamespace);
  }, [loadIngresses, currentNamespace]);

  const scopedIngresses = React.useMemo(
    () =>
      currentNamespace === "all"
        ? ingresses
        : ingresses.filter(
            (ingress) =>
              ingress.namespace.toLowerCase() ===
              currentNamespace.toLowerCase(),
          ),
    [ingresses, currentNamespace],
  );

  const filterOptions = React.useMemo<NetworkingFilterOption[]>(
    () => [
      { id: "all", label: "All", count: scopedIngresses.length },
      {
        id: "ready",
        label: "Ready",
        count: scopedIngresses.filter((ingress) => ingress.status === "Ready")
          .length,
      },
      {
        id: "pending",
        label: "Pending",
        count: scopedIngresses.filter((ingress) => ingress.status === "Pending")
          .length,
        warn: true,
      },
    ],
    [scopedIngresses],
  );

  const columns = React.useMemo<NetworkingColumn<IngressSummary>[]>(
    () => [
      {
        key: "class",
        label: "Class",
        widthClass: "w-[8%]",
        sortValue: (ingress) => ingress.className ?? "",
        render: (ingress) =>
          ingress.className ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              {ingress.className}
            </span>
          ) : (
            <span className="text-[10px] text-[var(--muted)] italic">—</span>
          ),
      },
      {
        key: "hosts",
        label: "Hosts",
        widthClass: "w-[11%]",
        sortValue: (ingress) => ingress.hosts.join(","),
        render: (ingress) => (
          <div className="flex flex-nowrap items-center gap-1 overflow-hidden">
            {ingress.hosts.slice(0, 1).map((host) => (
              <span
                key={host}
                className="inline-flex max-w-full items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 truncate"
                title={host}
              >
                {host}
              </span>
            ))}
            {ingress.hosts.length > 1 && (
              <span className="text-[10px] font-mono text-[var(--muted)]">
                +{ingress.hosts.length - 1}
              </span>
            )}
            {ingress.hosts.length === 0 && (
              <span className="text-[10px] text-[var(--muted)] italic">
                wildcard
              </span>
            )}
          </div>
        ),
      },
      {
        key: "tls",
        label: "TLS",
        widthClass: "w-[10%]",
        render: (ingress) =>
          ingress.tls.length === 0 ? (
            <span className="text-[10px] text-[var(--muted)] italic">—</span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border truncate",
                ingress.tls[0].status === "Valid" &&
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                ingress.tls[0].status === "Expiring" &&
                  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
                (ingress.tls[0].status === "Expired" ||
                  ingress.tls[0].status === "Invalid" ||
                  ingress.tls[0].status === "Unreadable") &&
                  "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
                (!ingress.tls[0].status ||
                  ingress.tls[0].status === "Missing") &&
                  "bg-black/5 dark:bg-white/5 text-[var(--muted)] border-[var(--border)]",
              )}
              title={ingress.tls
                .map(
                  (tls) =>
                    `${tls.status || "TLS"}: ${tls.secretName || tls.hosts.join(", ")}${tls.notAfter ? ` (expires ${tls.notAfter})` : ""}${tls.issuer ? `\nissuer: ${tls.issuer}` : ""}${tls.dnsNames?.length ? `\ndns: ${tls.dnsNames.join(", ")}` : ""}`,
                )
                .join("\n")}
            >
              <Globe className="w-2.5 h-2.5 shrink-0" />
              <span>{ingress.tls[0].status || "TLS"}</span>
              <span className="opacity-60 truncate max-w-[120px]">
                {ingress.tls[0].secretName ||
                  `${ingress.tls[0].hosts.length} hosts`}
              </span>
              {ingress.tls.length > 1 ? ` +${ingress.tls.length - 1}` : ""}
            </span>
          ),
      },
      {
        key: "addresses",
        label: "Addresses",
        widthClass: "w-[8%]",
        render: (ingress) =>
          ingress.addresses.length === 0 ? (
            <span className="text-[10px] text-amber-500 font-mono">
              pending
            </span>
          ) : (
            <span
              className="font-mono text-[10px] text-[var(--foreground)] truncate block"
              title={ingress.addresses.join(", ")}
            >
              {ingress.addresses.slice(0, 2).join(", ")}
              {ingress.addresses.length > 2
                ? ` +${ingress.addresses.length - 2}`
                : ""}
            </span>
          ),
      },
      {
        key: "paths",
        label: "Paths",
        widthClass: "w-[10%]",
        sortValue: (ingress) => ingress.paths.length,
        render: (ingress) => {
          if (ingress.paths.length === 0) {
            return (
              <span className="text-[10px] text-[var(--muted)] italic">
                no rules
              </span>
            );
          }
          const first = ingress.paths[0];
          return (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] truncate max-w-full"
              title={ingress.paths
                .map(
                  (path) =>
                    `${path.host ?? "*"}${path.path} → ${path.serviceName ?? "?"}:${path.servicePort ?? "?"}`,
                )
                .join("\n")}
            >
              <span className="text-[var(--foreground)] truncate">
                {first.path}
              </span>
              <span className="opacity-50">→</span>
              <span className="text-[var(--muted)] truncate">
                {first.serviceName ?? "?"}:{first.servicePort ?? "?"}
              </span>
              {ingress.paths.length > 1 && (
                <span className="text-[var(--muted)]">
                  +{ingress.paths.length - 1}
                </span>
              )}
            </span>
          );
        },
      },
    ],
    [],
  );

  return (
    <NetworkingResourcePage
      key="ingresses"
      icon={Globe}
      nounSingular="Ingress"
      nounPlural="ingresses"
      items={ingresses}
      totalCount={totalIngressesCount}
      isLoading={isIngressesLoading}
      hasLoadedOnce={hasLoadedIngressesOnce}
      onRefresh={refresh}
      searchPlaceholder="Filter ingresses by name, class, host, address, backend..."
      matchesSearch={ingressMatchesSearch}
      filterOptions={filterOptions}
      activeFilter={filter}
      setActiveFilter={setFilter}
      matchesFilter={ingressMatchesFilter}
      columns={columns}
      getKey={(ingress) => `${ingress.namespace}/${ingress.name}`}
      getName={(ingress) => ingress.name}
      getNamespace={(ingress) => ingress.namespace}
      getStatus={ingressStatus}
      getAge={(ingress) => ingress.age}
      getCreationTimestamp={(ingress) => ingress.creationTimestamp}
      onRowClick={(ingress) =>
        openInspector({
          kind: "Ingress",
          name: ingress.name,
          namespace: ingress.namespace,
          status: ingress.status,
          data: ingress as unknown as Record<string, unknown>,
        })
      }
      describeCommand={(ingress) =>
        `kubectl describe ingress ${ingress.name} -n ${ingress.namespace}`
      }
      onEdit={(ingress) =>
        void openResourceEditor({
          kind: "Ingress",
          name: ingress.name,
          namespace: ingress.namespace,
        })
      }
      onDelete={(ingress) =>
        openDeleteResource({
          kind: "Ingress",
          name: ingress.name,
          namespace: ingress.namespace,
        })
      }
      testIdPrefix="ingresses"
      codeCommand={(namespace) => `kubectl get ingress -n ${namespace}`}
      emptyDescription="Ingresses route external HTTP and HTTPS traffic to Services inside the cluster."
    />
  );
}
