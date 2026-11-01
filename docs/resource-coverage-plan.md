# Resource Coverage Plan (RC1–RC5)

> Status: RC1–RC5 complete. This track closes the resource-page gap against the Freelens/Lens reference sidebar. It feeds the existing roadmap phases for the resource browser (04), networking (09), storage (10), and Helm (11).

## Current Coverage

Reference inventory: **36 resource entries** across seven groups.

- **36 implemented**
- **0 partial**
- **0 fully missing**

| Group     | Implemented                                                                                                                                                                                                                                                                  | Missing |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Workloads | Overview, Pods, Deployments, DaemonSets, StatefulSets, ReplicaSets, Replication Controllers, Jobs, CronJobs                                                                                                                                                                  | —       |
| Network   | Services, Endpoints, Endpoint Slices, Ingresses, Ingress Classes, Network Policies, Port Forwarding                                                                                                                                                                          | —       |
| Storage   | Persistent Volumes, Persistent Volume Claims, Storage Classes                                                                                                                                                                                                                | —       |
| Config    | ConfigMaps, Secrets, Resource Quotas, Limit Ranges, Horizontal Pod Autoscalers, Pod Disruption Budgets, Priority Classes, Runtime Classes, Leases, Mutating Webhook Configs, Validating Webhook Configs, Validating Admission Policies, Validating Admission Policy Bindings | —       |
| Helm      | Releases, Charts                                                                                                                                                                                                                                                             | —       |
| General   | Namespaces, global Events                                                                                                                                                                                                                                                    | —       |

KubeView also has pages not in this reference: Gateway API, CNI Observability, RBAC, Service Accounts, Permissions Checker, Custom Resources, GitOps Drift, the cluster catalog, and the Learning Center.

Vertical Pod Autoscalers are exposed under Scaling as well. VPA is an addon CRD rather than a built-in API, so the page is discovery-driven across `autoscaling.k8s.io/v1`, `v1beta2`, and `v1beta1`, and reports that the CRD is not installed instead of failing the page.

## Principles

1. One shared simple-resource layer instead of 18 bespoke vertical slices.
2. Read-only first; mutations only where they are clearly safe and tested.
3. Per-kind failures stay local: a 403 or missing API must not break the shell.
4. Discovery-driven API versions; hide kinds the cluster does not serve.
5. Consistent table shell, status tones, loading/empty/error states, and keyboard access.

## Architecture

### Engine

- `engine/internal/cluster/simple_resources.go`: one normalized row shape and typed-client list mappers for the six RC1 kinds.
- One RPC family in `engine/cmd/kubeview-engine/handlers_simple_resources.go`:
  - `simpleResources.list` — `{ kind, namespace? }`
  - `simpleResources.counts` — counts for sidebar badges.
- Rows carry name, namespace, status/tone, kind-specific details, age, labels, annotations.
- CRD-backed kinds resolve the served API version through discovery and list with the dynamic client. The VPA page reports `available: false` when no `autoscaling.k8s.io` version serves it.
- Events are capped at the latest 500 with a `truncated` flag.
- Later phases can add kind mappers without adding a new RPC or table shell.

### Contracts

- `SimpleResourceItem`, `SimpleResourceListResult`, `SimpleResourceCountsResult`.
- Helm releases and chart browsing are implemented, plus install, upgrade, rollback, and uninstall through the Helm SDK.

### Desktop

- `SimpleResourcesView`: shared toolbar, search, filters, sorting, refresh, loading/empty/403 states, a detail drawer, create/edit YAML, guarded delete, and bulk delete.
- `simpleResourceConfigs.tsx`: per-kind columns, labels, filters, and empty copy.
- Sidebar count badges load through `simpleResources.counts`.
- Helm release rows use the shared resource table; the drawer exposes upgrade, rollback, and uninstall, and Charts has install actions.

### Mutations

- Generic create is available for the mutable simple-resource kinds through `resources.apply`. Every create dialog offers a guided Form tab plus an Advanced YAML tab: form changes generate the manifest live, and YAML-only edits can be made in the second tab.
- Kind-specific form definitions live in `resourceCreateForms.ts`; the form covers common name/namespace/labels plus the fields operators need most, while Advanced YAML covers everything else.
- Job/CronJob keep their dedicated form and YAML tab; Namespace creation has the same two-mode layout.
- Edit and delete are available for every mutable simple-resource kind; namespace deletion requires typing the namespace name and is excluded from bulk actions.
- PVCs support expansion through `persistentvolumeclaims.expand`.
- Workload creation covers Pods, Deployments, ReplicaSets, StatefulSets, DaemonSets, Jobs, and CronJobs.
- RBAC creation covers Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings.
- Gateway API creation covers GatewayClass, Gateway, HTTPRoute, and GRPCRoute.
- Custom resource instances can be created, edited, and deleted from the Custom Resources page or a CRD's instance tab.
- Bulk delete is available on simple-resource pages and on services, endpoints, ingresses, network policies, configmaps, secrets, persistent volumes, storage classes, and service accounts.

### Navigation

- **Cluster:** Namespaces, Events.
- **Workloads:** add Replication Controllers.
- **Network:** add Endpoint Slices, Ingress Classes.
- **Storage:** add Persistent Volume Claims.
- **Config:** ConfigMaps, Secrets, Resource Quotas, Limit Ranges.
- **Scaling:** Horizontal Pod Autoscalers, Vertical Pod Autoscalers (optional addon CRD), Pod Disruption Budgets.
- **Scheduling & Admission** (default collapsed): Priority Classes, Runtime Classes, Leases, Mutating/Validating Webhook Configs, Validating Admission Policies and Bindings.
- **Helm:** Releases, Charts.
- Every page gets a command-palette entry, tab icon, count badge, and a short learning guide.

---

## RC1 — Foundation and core visibility ✅ Completed _(large)_

**Framework plus six pages and the Events upgrade.**

| Group     | Deliverable                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------ |
| Cluster   | Namespaces (status, age), global Events (All/Warning/Normal, message, object, count, last seen)  |
| Workloads | Replication Controllers (desired/ready, selector, age)                                           |
| Network   | Endpoint Slices (address type, endpoints, ports, service), Ingress Classes (controller, default) |
| Storage   | Persistent Volume Claims (status, capacity, access modes, storage class, bound volume)           |

Also: simple-resource engine layer, contracts, store, table shell, drawer, counts, nav groups, and mock coverage.

**Acceptance:** all six pages render live data; namespace scoping works; 403 shows an inline permission state; counts populate; existing suites pass.

## RC2 — Scaling, quota, and scheduling ✅ Completed _(medium)_

| Group      | Deliverable                                                                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config     | Resource Quotas (used/hard), Limit Ranges                                                                                                                                                                   |
| Scaling    | Horizontal Pod Autoscalers (current/desired/min/max, target, metrics), Vertical Pod Autoscalers (target, update mode, recommendations; optional CRD), Pod Disruption Budgets (allowed disruptions, min/max) |
| Scheduling | Priority Classes (value, default, preemption), Runtime Classes (handler, overhead), Leases (holder, expiry, renew)                                                                                          |

**Acceptance:** correct empty states on clusters without these objects; HPA/PDB rows expose the fields operators need without opening the drawer.

## RC3 — Admission configuration ✅ Completed _(small–medium)_

- Mutating Webhook Configs
- Validating Webhook Configs
- Validating Admission Policies
- Validating Admission Policy Bindings

Notes: discovery-based version selection; unsupported kinds are omitted from navigation; bindings resolve policy references and parameter kinds.

**Acceptance:** pages appear only on clusters serving the APIs; read-only drawer handles YAML.

## RC4 — Helm ✅ Completed _(medium–large)_

**4a. Releases**

- Decode Secrets of type `helm.sh/release.v1` (gzip + base64) in the engine.
- List: release, namespace, chart, app version, revision, status, updated.
- Detail: metadata, chart, values (redacted by default), manifest.

**4b. Charts**

- Repository settings in local storage, index fetching through the engine.
- Browse and search chart versions; no install/upgrade yet.
- Reject insecure or malformed repository URLs.

**Acceptance:** release list matches `helm list` on a test cluster; chart browsing works against a configured repository; values are not shown by default.

## RC5 — Hardening ✅ Completed _(medium)_

- Copy YAML / download manifest for simple resources.
- Delete with confirmation for safe kinds only (Leases, PDBs, HPAs, webhook configs); no bulk destructive actions.
- Live refresh aligned with auto-refresh settings; event caps and list pagination verified on large clusters.
- Learning guides and glossary entries for every new page.
- Extend `live-pages` audit to new navigation IDs.
- Update roadmap, changelog, docs screenshots.

---

## Cross-Cutting Requirements

- **RBAC:** per-kind 403 state with remediation hint; counts show `—`.
- **API availability:** discovery-driven; no dead navigation.
- **Scale:** Events capped at 500; other lists paginated; counts cached per context.
- **Accessibility:** keyboard row activation, focus-visible states, no horizontal page overflow at 390px.
- **Consistency:** shared toolbar, table density, status tones, empty/loading/error components.

## Testing Strategy

| Layer      | Coverage                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Go unit    | Row mappers, discovery fallback, event cap, Helm decode                                         |
| Go handler | Kind routing, namespace scoping, unknown kind, 403 mapping                                      |
| Contracts  | Build and typecheck                                                                             |
| Desktop    | Typecheck, production build, lint with no new warnings                                          |
| Playwright | Per-kind mock RPC; table, search, filters, counts, empty/error states, drawer YAML, phone width |
| Live audit | New nav IDs; skip cleanly when a kind is absent or forbidden                                    |

## Risks

| Risk                       | Mitigation                                               |
| -------------------------- | -------------------------------------------------------- |
| Sidebar becomes crowded    | Group splitting and collapsed-by-default admission group |
| Helm secrets are sensitive | Values hidden by default; manifest available on demand   |
| Events lists are large     | 500 cap, newest first, explicit truncation indicator     |
| API version drift          | Discovery plus per-kind version fallback                 |
| Count requests add load    | One batched endpoint, cached with context refresh        |

## Out of Scope

- Helm repository credential management and OCI chart registries.
- VolumeAttachments and other resource types not present in the reference sidebar.
- Batch label editing across arbitrary resource kinds.
