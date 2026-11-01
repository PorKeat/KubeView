"use client";

import * as React from "react";
import { Shield, Users, X } from "lucide-react";
import type {
  RBACResourceSummary,
  ServiceAccountSummary,
} from "@kubeview/contracts";
import { useClusterStore } from "@/stores/clusterStore";
import { useResourceActions } from "../shared/useResourceActions";
import {
  NetworkingResourcePage,
  type NetworkingColumn,
  type NetworkingFilterOption,
} from "../networking/NetworkingResourcePage";

function saMatches(item: ServiceAccountSummary, query: string): boolean {
  if (!query) return true;
  return (
    item.name.toLowerCase().includes(query) ||
    item.namespace.toLowerCase().includes(query) ||
    item.secretNames.some((name) => name.toLowerCase().includes(query)) ||
    item.imagePullSecretNames.some((name) => name.toLowerCase().includes(query))
  );
}

function stringList(values: string[] | null | undefined): string[] {
  return Array.isArray(values) ? values : [];
}

function rbacMatches(item: RBACResourceSummary, query: string): boolean {
  if (!query) return true;
  const rules = item.rules ?? [];
  const subjects = item.subjects ?? [];
  return (
    item.name.toLowerCase().includes(query) ||
    (item.namespace ?? "").toLowerCase().includes(query) ||
    item.kind.toLowerCase().includes(query) ||
    (item.roleRef ?? "").toLowerCase().includes(query) ||
    rules.some((rule) =>
      [
        ...stringList(rule.verbs),
        ...stringList(rule.apiGroups),
        ...stringList(rule.resources),
        ...stringList(rule.resourceNames),
        ...stringList(rule.nonResourceURLs),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    ) ||
    subjects.some((subject) =>
      `${subject.kind} ${subject.name} ${subject.namespace ?? ""}`
        .toLowerCase()
        .includes(query),
    )
  );
}

export function ServiceAccountsView() {
  const [filter, setFilter] = React.useState("all");
  const { editResource, deleteResource, createResource } = useResourceActions();
  const {
    serviceAccounts,
    totalServiceAccountsCount,
    isServiceAccountsLoading,
    hasLoadedServiceAccountsOnce,
    loadServiceAccounts,
    currentContext,
    currentNamespace,
    openInspector,
  } = useClusterStore();

  React.useEffect(() => {
    if (currentContext) void loadServiceAccounts(currentNamespace);
  }, [currentContext, currentNamespace, loadServiceAccounts]);

  const refresh = React.useCallback(() => {
    void loadServiceAccounts(currentNamespace);
  }, [currentNamespace, loadServiceAccounts]);

  const scoped = React.useMemo(
    () =>
      currentNamespace === "all"
        ? serviceAccounts
        : serviceAccounts.filter(
            (item) =>
              item.namespace.toLowerCase() === currentNamespace.toLowerCase(),
          ),
    [serviceAccounts, currentNamespace],
  );

  const filterOptions = React.useMemo<NetworkingFilterOption[]>(
    () => [
      { id: "all", label: "All", count: scoped.length },
      {
        id: "on",
        label: "Automount on",
        count: scoped.filter((item) => item.automount !== false).length,
      },
      {
        id: "off",
        label: "Automount off",
        count: scoped.filter((item) => item.automount === false).length,
      },
    ],
    [scoped],
  );

  const columns = React.useMemo<NetworkingColumn<ServiceAccountSummary>[]>(
    () => [
      {
        key: "secrets",
        label: "Secrets",
        widthClass: "w-[10%]",
        sortValue: (item) => item.secretNames.length,
        render: (item) => (
          <span
            className="font-mono text-[11px] tabular-nums text-[var(--foreground)]"
            title={item.secretNames.join(", ")}
          >
            {item.secretNames.length}
          </span>
        ),
      },
      {
        key: "imagePullSecrets",
        label: "Image pulls",
        widthClass: "w-[10%]",
        sortValue: (item) => item.imagePullSecretNames.length,
        render: (item) => (
          <span
            className="font-mono text-[11px] tabular-nums text-[var(--muted)]"
            title={item.imagePullSecretNames.join(", ")}
          >
            {item.imagePullSecretNames.length}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <NetworkingResourcePage
      icon={Users}
      nounSingular="ServiceAccount"
      nounPlural="service accounts"
      items={serviceAccounts}
      totalCount={totalServiceAccountsCount}
      isLoading={isServiceAccountsLoading}
      hasLoadedOnce={hasLoadedServiceAccountsOnce}
      onRefresh={refresh}
      searchPlaceholder="Filter service accounts by name, namespace, secret..."
      matchesSearch={saMatches}
      filterOptions={filterOptions}
      activeFilter={filter}
      setActiveFilter={setFilter}
      matchesFilter={(item, value) =>
        value === "all" ||
        (value === "on" ? item.automount !== false : item.automount === false)
      }
      columns={columns}
      getKey={(item) => `${item.namespace}/${item.name}`}
      getName={(item) => item.name}
      getNamespace={(item) => item.namespace}
      getStatus={(item) =>
        item.automount === false
          ? { label: "Automount off", variant: "muted" }
          : { label: "Automount on", variant: "healthy" }
      }
      getAge={(item) => item.age}
      getCreationTimestamp={(item) => item.creationTimestamp}
      onRowClick={(item) =>
        openInspector({
          kind: "ServiceAccount",
          name: item.name,
          namespace: item.namespace,
          status: item.automount === false ? "Automount off" : "Automount on",
          data: item as unknown as Record<string, unknown>,
        })
      }
      describeCommand={(item) =>
        `kubectl describe serviceaccount ${item.name} -n ${item.namespace}`
      }
      onEdit={(item) =>
        editResource(
          "ServiceAccount",
          item.name,
          item.namespace,
          item.automount === false ? "Automount off" : "Automount on",
          item as unknown as Record<string, unknown>,
        )
      }
      onDelete={(item) =>
        deleteResource("ServiceAccount", item.name, item.namespace)
      }
      onCreate={() => createResource("ServiceAccount", currentNamespace)}
      bulkDeleteKind="ServiceAccount"
      testIdPrefix="serviceaccounts"
      autoRefresh={false}
      codeCommand={(namespace) => `kubectl get serviceaccounts -n ${namespace}`}
      emptyDescription="ServiceAccounts provide identity for workloads running in a namespace."
    />
  );
}

const RBAC_CREATE_KINDS = [
  {
    kind: "Role",
    description: "Namespaced permission rules for resources in one namespace.",
  },
  {
    kind: "ClusterRole",
    description: "Cluster-wide permission rules and aggregation.",
  },
  {
    kind: "RoleBinding",
    description: "Grant a Role to subjects in a namespace.",
  },
  {
    kind: "ClusterRoleBinding",
    description: "Grant a ClusterRole to subjects cluster-wide.",
  },
] as const;

export function RBACView() {
  const [filter, setFilter] = React.useState("all");
  const [showCreatePicker, setShowCreatePicker] = React.useState(false);
  const { editResource, deleteResource, createResource } = useResourceActions();
  const {
    rbacResources,
    totalRBACResourcesCount,
    isRBACResourcesLoading,
    hasLoadedRBACResourcesOnce,
    loadRBACResources,
    currentContext,
    currentNamespace,
    openInspector,
  } = useClusterStore();

  React.useEffect(() => {
    if (currentContext) void loadRBACResources(currentNamespace);
  }, [currentContext, currentNamespace, loadRBACResources]);

  const refresh = React.useCallback(() => {
    void loadRBACResources(currentNamespace);
  }, [currentNamespace, loadRBACResources]);

  const kinds = ["Role", "ClusterRole", "RoleBinding", "ClusterRoleBinding"];
  const filterOptions = React.useMemo<NetworkingFilterOption[]>(
    () => [
      { id: "all", label: "All", count: rbacResources.length },
      ...kinds.map((kind) => ({
        id: kind,
        label: kind,
        count: rbacResources.filter((item) => item.kind === kind).length,
      })),
    ],
    [rbacResources],
  );

  const columns = React.useMemo<NetworkingColumn<RBACResourceSummary>[]>(
    () => [
      {
        key: "kind",
        label: "Kind",
        widthClass: "w-[12%]",
        sortValue: (item) => item.kind,
        render: (item) => (
          <span className="font-mono text-[10px] text-[var(--foreground)]">
            {item.kind}
          </span>
        ),
      },
      {
        key: "roleRef",
        label: "Role reference",
        widthClass: "w-[15%]",
        sortValue: (item) => item.roleRef ?? "",
        render: (item) => (
          <span
            className="block truncate font-mono text-[10px] text-[var(--muted)]"
            title={item.roleRef}
          >
            {item.roleRef || "—"}
          </span>
        ),
      },
      {
        key: "rules",
        label: "Rules",
        widthClass: "w-[8%]",
        sortValue: (item) => item.rules?.length ?? 0,
        render: (item) => (
          <span className="font-mono text-[11px] tabular-nums text-[var(--foreground)]">
            {item.rules?.length ?? 0}
          </span>
        ),
      },
      {
        key: "subjects",
        label: "Subjects",
        widthClass: "w-[9%]",
        sortValue: (item) => item.subjects?.length ?? 0,
        render: (item) => (
          <span className="font-mono text-[11px] tabular-nums text-[var(--muted)]">
            {item.subjects?.length ?? 0}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <NetworkingResourcePage
        icon={Shield}
        nounSingular="RBAC resource"
        nounPlural="RBAC resources"
        items={rbacResources}
        totalCount={totalRBACResourcesCount}
        isLoading={isRBACResourcesLoading}
        hasLoadedOnce={hasLoadedRBACResourcesOnce}
        onRefresh={refresh}
        searchPlaceholder="Filter RBAC by kind, name, role, subject..."
        matchesSearch={rbacMatches}
        filterOptions={filterOptions}
        activeFilter={filter}
        setActiveFilter={setFilter}
        matchesFilter={(item, value) => value === "all" || item.kind === value}
        columns={columns}
        getKey={(item) => `${item.kind}/${item.namespace ?? ""}/${item.name}`}
        getName={(item) => item.name}
        getNamespace={(item) => item.namespace ?? ""}
        getStatus={(item) =>
          item.kind === "Role" || item.kind === "ClusterRole"
            ? { label: "Role", variant: "muted" }
            : { label: "Binding", variant: "pending" }
        }
        getAge={(item) => item.age}
        getCreationTimestamp={(item) => item.creationTimestamp}
        onRowClick={(item) =>
          openInspector({
            kind: item.kind,
            name: item.name,
            namespace: item.namespace ?? "",
            status: item.kind.includes("Binding") ? "Binding" : "Role",
            data: item as unknown as Record<string, unknown>,
          })
        }
        describeCommand={(item) =>
          `kubectl describe ${item.kind.toLowerCase()} ${item.name}${item.namespace ? ` -n ${item.namespace}` : ""}`
        }
        onEdit={(item) =>
          editResource(
            item.kind,
            item.name,
            item.namespace ?? "",
            item.kind.includes("Binding") ? "Binding" : "Role",
            item as unknown as Record<string, unknown>,
          )
        }
        onDelete={(item) =>
          deleteResource(item.kind, item.name, item.namespace ?? "")
        }
        onCreate={() => setShowCreatePicker(true)}
        testIdPrefix="rbac"
        includeClusterScoped
        autoRefresh={false}
        codeCommand={(namespace) =>
          `kubectl get roles,rolebindings -n ${namespace}`
        }
        emptyDescription="Roles and bindings define who can perform which actions in the cluster."
      />

      {showCreatePicker && (
        <div
          data-testid="rbac-create-picker"
          role="dialog"
          aria-modal="true"
          aria-label="Create RBAC resource"
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md animate-in fade-in duration-150 sm:items-center sm:p-4"
        >
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setShowCreatePicker(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:rounded-2xl">
            <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Create RBAC resource
              </h2>
              <button
                type="button"
                onClick={() => setShowCreatePicker(false)}
                aria-label="Close create picker"
                className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="space-y-1.5 p-3">
              {RBAC_CREATE_KINDS.map((option) => (
                <button
                  key={option.kind}
                  type="button"
                  data-testid={`rbac-create-${option.kind}`}
                  onClick={() => {
                    setShowCreatePicker(false);
                    createResource(option.kind, currentNamespace);
                  }}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-left transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  <span className="block text-xs font-semibold text-[var(--foreground)]">
                    {option.kind}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-[var(--muted)]">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { CustomResourcesView } from "./CustomResourcesView";
