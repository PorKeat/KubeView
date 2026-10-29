# KubeView Roadmap — Building a Better Freelens

> **Status:** 6 of 16 Phases Completed (Milestone 1 Core IDE Complete)  
> **Guiding Principle:** Build KubeView as a high-performance Kubernetes desktop IDE first, then evolve it into an advanced operations and intelligence platform. Prioritize rock-solid cluster connectivity, safe resource mutations, and instant troubleshooting before broadening scope.

---

## 🎯 Production Tech Stack Alignment

KubeView is engineered with a **three-tier decoupled architecture**:

- **Desktop Host:** **Tauri 2 (Rust)** — Ultra-lightweight native host (<80MB RAM), system tray, and host-enforced security sandbox.
- **Frontend UI:** **Next.js (Static Export) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + Motion + Lucide + cmdk + Sonner + next-themes + Geist**.
- **Data & Tables:** **TanStack Query + Zustand + TanStack Table + Monaco Editor & Monaco Diff Editor + Precision SVG Telemetry Charts + date-fns**.
- **Kubernetes Engine:** **Go 1.23+ Sidecar with official `k8s.io/client-go` + `clientcmd` + `log/slog`**, communicating via versioned JSON-RPC over local stdio pipes.
- **Quality & Testing:** **`pnpm` + Lefthook + Vitest + Testing Library + Playwright + Go `testify` + `envtest`**.

---

## 🗺️ Milestone Strategy

```
Phase 01 ──► Phase 02 ──► Phase 03 ──► Phase 04 ──► Phase 05 ──► Phase 06
[ Desktop Shell ] [ Go Engine / Conn ] [ Live Dashboard ] [ Resource Browser ] [ Live YAML & Ops ] [ Triage Workbench ]
      ✓                  ✓                  ✓                   ✓                     ✓                    ✓
      └─── MILESTONE 1 (v0.1 - v0.5): Daily-Driver Usable IDE [COMPLETE] ───┘

Phase 07 ──► Phase 08 ──► Phase 09 ──► Phase 10 ──► Phase 11
[ Topology ] [ Prometheus Metrics ] [ Networking/Cilium ] [ Storage/Longhorn ] [ Helm Releases ]
                               ▲
                               └─── MILESTONE 2 (v0.6 - v0.9): Deep Operations Platform ───┘

Phase 12 ──► Phase 13 ──► Phase 14 ──► Phase 15 ──► Phase 16
[ Security/RBAC ] [ Plugin SDK ] [ Productivity/Tabs ] [ AI Operations ] [ Distribution/Hardening ]
                               ▲
                               └─── MILESTONE 3 (v1.0 Production): Ecosystem & Enterprise ───┘
```

---

## 📊 Phase Progress Tracker

|   #    | Phase Name                                                                             | Primary Stack & Focus                                       | Target Milestone |    Status    |
| :----: | :------------------------------------------------------------------------------------- | :---------------------------------------------------------- | :--------------: | :----------: |
| **01** | [Core desktop application](#phase-1--core-desktop-application)                         | Tauri 2, Next.js static, Tailwind 4, shadcn/ui, cmdk, Geist |   Milestone 1    | ✅ Completed |
| **02** | [Kubernetes connection management](#phase-2--kubernetes-connection-management)         | Go `client-go`, `clientcmd`, JSON-RPC IPC, auth plugins     |   Milestone 1    | ✅ Completed |
| **03** | [Cluster overview and dashboard](#phase-3--cluster-overview-and-dashboard)             | Precision SVG Charts, cluster health, Bento matrix, events  |   Milestone 1    | ✅ Completed |
| **04** | [Complete Kubernetes resource browser](#phase-4--complete-kubernetes-resource-browser) | Real-time watcher streams, sorting, batch operations        |   Milestone 1    | ✅ Completed |
| **05** | [Resource operations and YAML editor](#phase-5--resource-operations-and-yaml-editor)   | Live YAML viewer, dry-run diffs, safe restart/delete        |   Milestone 1    | ✅ Completed |
| **06** | [Pod and container troubleshooting](#phase-6--pod-and-container-troubleshooting)       | Live log streaming, xterm PTY exec, deep inspector          |   Milestone 1    | ✅ Completed |
| **07** | [Workload topology and relationships](#phase-7--workload-topology-and-relationships)   | React Flow / @xyflow graph, live dependency badges          |   Milestone 2    |  ⏳ Pending  |
| **08** | [Metrics and monitoring](#phase-8--metrics-and-monitoring)                             | Apache ECharts, Metrics API, Prometheus PromQL queries      |   Milestone 2    |  ⏳ Pending  |
| **09** | [Networking and connectivity](#phase-9--networking-and-connectivity)                   | Port-forwarding engine, Gateway API, Cilium Hubble          |   Milestone 2    |  ⏳ Pending  |
| **10** | [Storage management](#phase-10--storage-management)                                    | PV/PVC triage, StorageClasses, Longhorn integration         |   Milestone 2    |  ⏳ Pending  |
| **11** | [Helm and application deployment](#phase-11--helm-and-application-deployment)          | Helm release lifecycle, revision history, values diff       |   Milestone 2    |  ⏳ Pending  |
| **12** | [Security and access control](#phase-12--security-and-access-control)                  | RBAC `auth can-i`, secret masking, Trivy scanner            |   Milestone 3    |  ⏳ Pending  |
| **13** | [Plugin and extension system](#phase-13--plugin-and-extension-system)                  | TypeScript SDK, JSON Schema manifests, host sandbox         |   Milestone 3    |  ⏳ Pending  |
| **14** | [Advanced productivity](#phase-14--advanced-productivity)                              | cmdk palette, multi-tab inspection, cross-cluster diff      |   Milestone 3    |  ⏳ Pending  |
| **15** | [AI-assisted operations](#phase-15--ai-assisted-operations)                            | Root cause diagnosis, log summarizer, privacy guard         |   Milestone 3    |  ⏳ Pending  |
| **16** | [Production quality and distribution](#phase-16--production-quality-and-distribution)  | Playwright E2E, Go `envtest`, code signing, auto-update     |   Milestone 3    |  ⏳ Pending  |

> **GitOps integration track:** Local raw-YAML drift detection, shared diff review, and RBAC-aware apply are implemented. Remote Git, Kustomize/Helm rendering, Argo CD and Flux status/sync, multi-cluster target mappings, and CI visibility remain planned. See [docs/gitops-integration.md](docs/gitops-integration.md).

---

## 🧩 Resource Coverage Track (RC1–RC5)

> The reference sidebar lists 36 resource entries. **36 are implemented**, **0 are partial**, and **0 remain**. This track closes the gap with one shared simple-resource layer instead of a bespoke slice per kind. It feeds Phases 04, 09, 10, and 11. Full plan: [resource-coverage-plan.md](docs/resource-coverage-plan.md).

|  Phase  | Focus                        | Resources                                                                                                                                        |     Size     |    Status    |
| :-----: | :--------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- | :----------: | :----------: |
| **RC1** | Foundation + core visibility | Shared engine/contracts/UI layer; Namespaces, global Events, Replication Controllers, Endpoint Slices, Ingress Classes, Persistent Volume Claims |    Large     | ✅ Completed |
| **RC2** | Scaling, quota, scheduling   | Horizontal Pod Autoscalers, Pod Disruption Budgets, Resource Quotas, Limit Ranges, Priority Classes, Runtime Classes, Leases                     |    Medium    | ✅ Completed |
| **RC3** | Admission configuration      | Mutating and Validating Webhook Configs, Validating Admission Policies and Bindings                                                              | Small–Medium | ✅ Completed |
| **RC4** | Helm                         | Releases (decode Helm release Secrets), Charts (repository browsing)                                                                             | Medium–Large | ✅ Completed |
| **RC5** | Hardening                    | Safe deletes, YAML copy, learning guides, live-page audit, large-list caps                                                                       |    Medium    | ✅ Completed |

---

## 🚀 Detailed Phase Breakdown

### Phase 1 — Core Desktop Application

_Establish the application shell before implementing complex Kubernetes workflows._

- [ ] Desktop application for macOS (Universal), Windows, and Linux via Tauri 2.
- [ ] Next.js static export (`output: 'export'`) with React 19 and TypeScript.
- [ ] Tailwind CSS 4 design tokens with dark-first theme (`#17191D` bg, `#22252B` surface, `#F08A42` accent, `#38B879` healthy).
- [ ] Theme engine using `next-themes` for zero-flash switching between dark and light modes.
- [ ] Collapsible sidebar navigation for cluster resources with smooth transitions.
- [ ] Command palette framework using `cmdk` with global keyboard shortcuts (`Cmd+K` / `Ctrl+K`).
- [ ] Global search input across active cluster resources.
- [ ] Application settings and user preferences storage with `tauri-plugin-store`.
- [ ] Persistent local application state (window size, layout splits, active context).
- [ ] Toast notification system with `Sonner` for async tasks, warnings, and errors.
- [ ] Resizable panels (`react-resizable-panels`) and tabbed resource views.
- [ ] Secure handling and sandboxing of local Kubernetes configuration files.

---

### Phase 2 — Kubernetes Connection Management

_Make cluster connections reliable and resilient before expanding the resource browser._

- [ ] Dedicated Go 1.23+ engine sidecar running official `k8s.io/client-go`.
- [ ] Versioned JSON-RPC protocol over local IPC between Tauri 2 host and Go engine.
- [ ] Load and parse kubeconfig files using `clientcmd` from `~/.kube/config`, custom paths, and `$KUBECONFIG`.
- [ ] Support seamless switching between multiple clusters and contexts.
- [ ] Real-time switching between namespaces (with "All Namespaces" support).
- [ ] Add, remove, rename, and refresh cluster connections with hot reload on file changes.
- [ ] Display connection status indicators, server latency, and Kubernetes version.
- [ ] Show cluster API endpoint, CA data, and authentication method in cluster info panel.
- [ ] Support kubeconfig file changes and automatic file-watcher reloads via Go `fsnotify`.
- [ ] Handle expired credentials, OIDC token refreshes, and auth errors with clear hints.
- [ ] Support external credential plugins (`aws-iam-authenticator`, `kubelogin`, `gke-gcloud-auth-plugin`).
- [ ] Provide connection diagnostics and human-readable error messages for network/firewall timeouts.

---

### Phase 3 — Cluster Overview and Dashboard

_A configurable dashboard that immediately highlights what is broken and lets users navigate directly to the affected resource._

- [ ] Cluster health overview gauge (Control plane, API server, node conditions).
- [ ] Node count and readiness status (Ready, NotReady, SchedulingDisabled).
- [ ] Pod counts categorized by status (Running, Pending, Failed, CrashLoopBackOff).
- [ ] Deployment, StatefulSet, and DaemonSet workload health summaries.
- [ ] Real-time CPU and memory utilization using **Apache ECharts** gauges.
- [ ] Namespace resource summaries and quota consumption.
- [ ] Warning events ticker highlighting failing workloads and scheduling issues.
- [ ] Cluster-wide storage capacity and PersistentVolume claim overview.
- [ ] Recent cluster activity timeline.
- [ ] Customizable and reorderable dashboard widgets.

---

### Phase 4 — Complete Kubernetes Resource Browser

_Every resource page must feature consistent tables, filtering, sorting, pagination, status indicators, detail slide-overs, and YAML inspection._

> Product-level browser is complete. Unchecked items below are future hardening beyond the current 36-page coverage track.

- [ ] **Data Grid:** TanStack Table v8 with compact row heights (32px) and virtualization.
- [x] **Core Workloads:** Pods, Deployments, ReplicaSets, StatefulSets, DaemonSets, Jobs, CronJobs.
- [ ] **Cluster Structure:** Namespaces, Nodes, ResourceQuotas, LimitRanges.
- [x] **Networking:** Services, Endpoints, EndpointSlices, Ingresses, Gateway API (`GatewayClass`, `Gateway`, `HTTPRoute`).
- [x] **Config & Secrets:** ConfigMaps, Secrets (with masked values by default).
- [ ] **Storage:** PersistentVolumes, PersistentVolumeClaims, StorageClasses, VolumeAttachments.
- [x] **Access Control & RBAC:** ServiceAccounts, Roles, RoleBindings, ClusterRoles, ClusterRoleBindings.
- [x] **Scaling & Reliability:** HorizontalPodAutoscalers (HPA), PodDisruptionBudgets (PDB).
- [x] **Policies:** NetworkPolicies.
- [x] **Extensibility:** Dynamic Custom Resource Definitions (CRDs) via `client-go/dynamic` with `additionalPrinterColumns`.
- [ ] Virtualized grid capable of rendering 10,000+ items at 60 FPS.

---

### Phase 5 — Resource Operations and YAML Editor

_Add Git-style diff, validation feedback, and explicit previews before destructive or impactful operations._

- [ ] Integrated **Monaco Editor** with Kubernetes JSONSchema auto-completion matching cluster version.
- [ ] **Monaco Diff Editor:** Side-by-side and inline visual diff comparing local/edited YAML against live admitted state.
- [ ] Server-side dry-run preview (`dryRun=All`) before any live mutation.
- [ ] Create Kubernetes resources from templates, scratch, or samples.
- [ ] Edit resources through forms (React Hook Form + Zod) and raw YAML.
- [ ] Strategic patch and update for supported resources (`kubectl patch` equivalent).
- [ ] Safe deletion with typed confirmation for production/critical namespaces.
- [ ] Restart Deployments, StatefulSets, and DaemonSets (`rollout restart`).
- [ ] Scale workloads up or down via visual slider or direct replica count.
- [ ] Suspend and resume CronJobs.
- [ ] Roll out, pause, resume, and undo Deployments (`rollout undo`).
- [ ] View rollout revision history with manifest differences between revisions.
- [ ] Copy resource YAML, clean metadata (strip `managedFields`), and copy `kubectl` CLI commands.
- [ ] Display granular RBAC permission errors with remediation guidance.

---

### Phase 6 — Pod and Container Troubleshooting (Core Differentiator)

_A single-click troubleshooting view that unifies logs, events, conditions, recent restarts, and related resources._

- [ ] **Live Container Logs:** High-throughput streaming via Go engine and local IPC.
- [ ] Multi-container selector and unified pod log view.
- [ ] Instant search, regex filtering, and line highlighting in logs.
- [ ] Pause, resume, autoscroll-toggle, and clear log streams.
- [ ] Download complete logs or copy selected line ranges to clipboard.
- [ ] Tail lines selection (100, 500, 1000, all) and `date-fns` time range filtering (`--since`).
- [ ] Chronological Kubernetes event feed correlated directly with pod lifecycle.
- [ ] Container exit codes, termination reasons, and restart counter badges.
- [ ] Pod condition inspector (PodScheduled, Initialized, ContainersReady, Ready).
- [ ] Plain-English diagnostic explanations for `ImagePullBackOff`, `CrashLoopBackOff`, `OOMKilled`, and `Pending`.
- [ ] Container resource requests and limits vs live utilization.
- [ ] Exec interactive command execution inside containers using `xterm.js` and SPDY PTY streaming.
- [ ] Environment variable inspector with sensitive secrets masked by default.
- [ ] Breadcrumb navigation to related ReplicaSet, Deployment, Service, and Node.
- [ ] Automated diagnostics for failed readiness/liveness probes and image pull credentials.
- [ ] One-click export of complete troubleshooting bundle (logs, describe, events).

---

### Phase 7 — Workload Topology and Relationships

_Interactive topology with live health indicators to identify where a request path or workload is failing without manual navigation._

- [ ] React Flow / @xyflow graph engine with animated health indicators.
- [ ] Visualize `Deployment → ReplicaSet → Pod` hierarchy and rolling update transitions.
- [ ] Map Services to their matching Pod endpoints via label selector resolution.
- [ ] Show Ingress and Gateway API routes linked to backend Services and Pods.
- [ ] Node-to-Pod placement visualizer showing resource distribution and pod affinity/anti-affinity.
- [ ] Visualize `PVC → PV → StorageClass` bindings and underlying volume attachments.
- [ ] Bidirectional navigation: jump from any graph node directly to the resource inspector.
- [ ] Real-time visual failure propagation: highlight broken dependencies in red/amber.
- [ ] Smart graph filtering by namespace, workload type, or label selector.

---

### Phase 8 — Metrics and Monitoring

_Current metrics via Metrics Server, plus optional deep historical observability through Prometheus and Thanos._

- [ ] Apache ECharts cluster-wide CPU and memory usage graphs.
- [ ] Node CPU, memory, disk pressure, and PID pressure indicators.
- [ ] Real-time Pod and container CPU/Memory charts.
- [ ] Visual indicators comparing actual usage against requested CPU/Memory and hard limits.
- [ ] Historical trend charts when Prometheus or Thanos backends are detected.
- [ ] Namespace-level resource consumption breakdown.
- [ ] Pod restart frequency trends over 1h, 24h, and 7d.
- [ ] Metrics availability diagnostics (detecting Metrics Server or Prometheus).
- [ ] Direct deep-linking to external Grafana dashboards.

---

### Phase 9 — Networking and Connectivity

_Explain how network policies and service selectors affect connectivity, rather than simply displaying configuration._

- [ ] Service discovery, ClusterIP/NodePort/LoadBalancer status, and active Endpoints inspection.
- [ ] Ingress resource management and TLS certificate status inspection.
- [ ] Gateway API resource management (`GatewayClass`, `Gateway`, `HTTPRoute`, `GRPCRoute`).
- [ ] Interactive NetworkPolicy inspector and visual matrix (Allowed Ingress vs Egress).
- [ ] Built-in TCP/HTTP Port Forwarding manager with active connection counters.
- [ ] Service connectivity troubleshooting helper (DNS resolution and port reachability).
- [ ] Pod IP and Node IP inspection with CIDR subnet indicators.
- [ ] Cilium CNI integration: `CiliumNetworkPolicy`, `CiliumEndpoints`, and Hubble flow visibility.

---

### Phase 10 — Storage Management

_Modular storage-provider integration that keeps generic Kubernetes storage clean while providing deep Longhorn visibility._

- [ ] PersistentVolume (PV) and PersistentVolumeClaim (PVC) status tracking.
- [ ] StorageClass configuration, provisioner detection, and volume binding mode.
- [ ] Automated pending PVC diagnosis (unbound claims, storage class mismatch, quota exhaustion).
- [ ] Volume attachment visibility across cluster nodes.
- [ ] Cluster-wide storage capacity and usage summaries.
- [ ] Longhorn integration module: Longhorn volume state, replica health, and disk scheduling.
- [ ] Longhorn snapshot and backup status inspection.

---

### Phase 11 — Helm and Application Deployment

_Secure Helm management without exposing credentials to unvetted subprocesses._

> Read-only release inventory and chart repository browsing are implemented under RC4. Install, upgrade, rollback, values diffing, and manifest rendering remain pending.

- [x] List all installed Helm releases across namespaces. Read-only release browsing is implemented.
- [ ] Inspect release status, revision numbers, and historical release logs.
- [ ] View active chart values and compare user-supplied values against default chart values.
- [ ] View rendered Kubernetes manifests generated by the Helm template engine.
- [ ] Add, search, update, and manage Helm chart repositories.
- [ ] Install charts directly with a visual configuration wizard.
- [ ] Upgrade releases with interactive values YAML diff.
- [ ] Roll back releases to any previous revision with a single click.
- [ ] Uninstall releases with explicit confirmation.

---

### Phase 12 — Security and Access Control

_Never store raw cluster credentials in plaintext logs; keep destructive actions explicit and permission-aware._

- [ ] Display active Kubernetes identity and authentication context (`whoami`).
- [ ] Check effective permissions using Kubernetes `SelfSubjectAccessReview` / `auth can-i`.
- [ ] Human-readable explanations for RBAC authorization denials.
- [ ] Automatic masking of Secret values (`base64` decode on explicit click only).
- [ ] Zero plaintext credential logging via Go `log/slog`.
- [ ] Secure sandboxed terminal command execution.
- [ ] Dedicated Read-Only mode to prevent accidental production mutations.
- [ ] Workload security hygiene checks (Privileged containers, root execution, missing securityContext).
- [ ] Trivy integration for container image vulnerability and misconfiguration scanning.

---

### Phase 13 — Plugin and Extension System

_Design the extension API early so third-party and community integrations remain decoupled and safe._

- [ ] TypeScript Plugin SDK with JSON Schema manifests (`plugin.json`).
- [ ] Runtime validation of plugin configurations and messages using Zod.
- [ ] Host-enforced permission model (no unrestricted access to Tauri commands, filesystem, or K8s credentials).
- [ ] Process isolation: plugins execute in Web Workers or isolated subprocesses.
- [ ] Extension points: custom resource pages, dashboard widgets, and contextual actions.
- [ ] Semantic version compatibility checks with KubeView core.

---

### Phase 14 — Advanced Productivity

_Built for keyboard-first power users managing multiple enterprise clusters._

- [ ] Global Command Palette (`cmdk`) supporting actions, navigation, and fuzzy search.
- [ ] Multi-tab resource workbench: open multiple pods, logs, and YAML files side-by-side.
- [ ] "Recently Viewed Resources" quick history.
- [ ] Saved custom filters and JSONPath/label queries.
- [ ] Pinned namespaces for instant switching.
- [ ] Cross-cluster resource comparison (compare deployments between Staging and Production).
- [ ] One-click copy for equivalent `kubectl` CLI commands.
- [ ] Bulk operations (restart, delete, label) with explicit batch confirmation.

---

### Phase 15 — AI-Assisted Operations

_Read-only diagnosis and guided remediation with strict privacy and user confirmation._

- [ ] Plain-language explanations for complex Kubernetes error messages and event codes.
- [ ] AI-powered failure log summarization (extracting error traces and fatal exceptions).
- [ ] Automatic correlation between Kubernetes warning events and pod crash loops.
- [ ] Intelligent suggestion of targeted diagnostic commands.
- [ ] Automated generation of step-by-step incident troubleshooting checklists.
- [ ] Strict safety rule: AI may never mutate live cluster state without explicit user review.
- [ ] Privacy guard: configurable redaction of secrets, IPs, and internal hostnames before AI analysis.

---

### Phase 16 — Production Quality and Distribution

_Enterprise-grade reliability, performance profiling, and reproducible builds._

- [ ] Unit test suite using Vitest (Frontend) and Go testing + `testify` (Engine).
- [ ] Integration testing with Go `envtest` (real etcd + API server) and KinD clusters.
- [ ] End-to-end tests for critical user journeys using Playwright.
- [ ] Git pre-commit verification using `Lefthook`.
- [ ] Large-cluster performance testing (10,000+ pods).
- [ ] Code signing and notarization for macOS (Apple Developer ID), Windows, and Linux.
- [ ] Built-in automatic updates via Tauri updater.
- [ ] CI/CD release automation via GitHub Actions.
