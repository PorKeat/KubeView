"use client";

import * as React from "react";
import { Boxes, Key, Shield, Users } from "lucide-react";
import { StatusBeacon, type StatusBeaconVariant } from "@/components/ui";
import type {
  CRDSummary,
  RBACResourceSummary,
  ServiceAccountSummary,
} from "@kubeview/contracts";
import type { SelectedResource } from "@/stores/clusterStore";

export type AccessResourceData =
  ServiceAccountSummary | RBACResourceSummary | CRDSummary;

function variant(status: string): StatusBeaconVariant {
  if (status === "Automount on" || status === "Role") return "healthy";
  if (status === "Automount off" || status === "Binding") return "muted";
  if (status === "Namespaced") return "pending";
  return "muted";
}

function Icon({ kind }: { kind: string }) {
  if (kind === "ServiceAccount") return <Users className="h-3.5 w-3.5" />;
  if (kind === "CustomResourceDefinition")
    return <Boxes className="h-3.5 w-3.5" />;
  return <Shield className="h-3.5 w-3.5" />;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 break-words text-[11px] font-mono text-[var(--foreground)]">
        {value || "—"}
      </div>
    </div>
  );
}

export function InspectorAccessOverview({
  currentResource,
  data,
}: {
  currentResource: SelectedResource;
  data: AccessResourceData;
}) {
  const created = data.creationTimestamp
    ? new Date(data.creationTimestamp).toLocaleString()
    : "—";
  const serviceAccount =
    currentResource.kind === "ServiceAccount"
      ? (data as ServiceAccountSummary)
      : undefined;
  const rbac = [
    "Role",
    "ClusterRole",
    "RoleBinding",
    "ClusterRoleBinding",
  ].includes(currentResource.kind)
    ? (data as RBACResourceSummary)
    : undefined;
  const crd =
    currentResource.kind === "CustomResourceDefinition"
      ? (data as CRDSummary)
      : undefined;
  const labels = data.labels ?? {};
  const annotations = data.annotations ?? {};
  const rbacRules = rbac?.rules ?? [];
  const rbacSubjects = rbac?.subjects ?? [];

  return (
    <div className="space-y-4 text-xs" data-testid="access-resource-overview">
      <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              <Icon kind={currentResource.kind} />
              {currentResource.kind} detail
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBeacon
                variant={variant(currentResource.status)}
                label={currentResource.status}
                size="sm"
              />
              <span className="font-mono text-[11px] text-[var(--muted)]">
                {currentResource.namespace || "Cluster Scope"} · created{" "}
                {created}
              </span>
            </div>
          </div>
        </div>

        {serviceAccount && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Detail
                label="Automount"
                value={
                  serviceAccount.automount === false
                    ? "Disabled"
                    : serviceAccount.automount === true
                      ? "Enabled"
                      : "Default"
                }
              />
              <Detail
                label="Secrets"
                value={serviceAccount.secretNames.length}
              />
              <Detail
                label="Image pull secrets"
                value={serviceAccount.imagePullSecretNames.length}
              />
            </div>
            <Chips
              label="Secret references"
              values={serviceAccount.secretNames}
              empty="No projected secret references."
            />
            <Chips
              label="Image pull secrets"
              values={serviceAccount.imagePullSecretNames}
              empty="No image pull secrets."
            />
          </div>
        )}

        {rbac && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Kind" value={rbac.kind} />
              <Detail label="Role reference" value={rbac.roleRef} />
              <Detail label="Rules" value={rbacRules.length} />
              <Detail label="Subjects" value={rbacSubjects.length} />
            </div>
            {rbacRules.length > 0 && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                  Rules
                </div>
                <div className="mt-2 space-y-2">
                  {rbacRules.map((rule, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-[var(--border)] bg-black/[0.02] p-2.5 font-mono text-[10px] leading-relaxed text-[var(--muted)] dark:bg-white/[0.02]"
                    >
                      <div>
                        <span className="text-[var(--foreground)]">verbs:</span>{" "}
                        {(rule.verbs ?? []).join(", ") || "—"}
                      </div>
                      <div>
                        <span className="text-[var(--foreground)]">
                          resources:
                        </span>{" "}
                        {(rule.resources ?? []).join(", ") ||
                          (rule.nonResourceURLs ?? []).join(", ") ||
                          "—"}
                      </div>
                      <div>
                        <span className="text-[var(--foreground)]">
                          apiGroups:
                        </span>{" "}
                        {(rule.apiGroups ?? []).join(", ") || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {rbacSubjects.length > 0 && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                  Subjects
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rbacSubjects.map((subject, index) => (
                    <span
                      key={`${subject.kind}-${subject.name}-${index}`}
                      className="rounded border border-[var(--border)] bg-black/5 px-1.5 py-0.5 font-mono text-[10px] text-[var(--foreground)] dark:bg-white/5"
                    >
                      {subject.kind}:{subject.name}
                      {subject.namespace ? `/${subject.namespace}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {crd && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Group" value={crd.group} />
              <Detail label="Kind" value={crd.kind} />
              <Detail label="Plural" value={crd.plural} />
              <Detail label="Scope" value={crd.scope} />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                Versions
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {crd.versions.map((version) => (
                  <span
                    key={version.name}
                    className="rounded border border-[var(--border)] bg-black/5 px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)] dark:bg-white/5"
                  >
                    {version.name}
                    {version.storage ? " · storage" : ""}
                    {!version.served ? " · unserved" : ""}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {(Object.keys(labels).length > 0 ||
        Object.keys(annotations).length > 0) && (
        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs">
          <Chips
            label="Labels"
            values={Object.entries(labels).map(([k, v]) => `${k}=${v}`)}
            empty="No labels."
          />
          {Object.keys(annotations).length > 0 && (
            <div className="font-mono text-[10px] text-[var(--muted)]">
              {Object.keys(annotations).length} annotations
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chips({
  label,
  values,
  empty,
}: {
  label: string;
  values: string[];
  empty: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.length > 0 ? (
          values.map((value) => (
            <span
              key={value}
              className="rounded border border-[var(--border)] bg-black/5 px-1.5 py-0.5 font-mono text-[10px] text-[var(--foreground)] dark:bg-white/5"
            >
              {value}
            </span>
          ))
        ) : (
          <span className="font-mono text-[10px] text-[var(--muted)]">
            {empty}
          </span>
        )}
      </div>
    </div>
  );
}
