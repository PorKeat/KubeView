# KubeView Roadmap — Building a Better Freelens

> **Status:** 0 of 16 Phases Completed (Initiating Milestone 1)  
> **Guiding Principle:** Build KubeView as a high-performance Kubernetes desktop IDE first, then evolve it into an advanced operations and intelligence platform. Prioritize rock-solid cluster connectivity, safe resource mutations, and instant troubleshooting before broadening scope.

---

## 🎯 Production Tech Stack Alignment

KubeView is engineered with a **three-tier decoupled architecture**:

- **Desktop Host:** **Tauri 2 (Rust)** — Ultra-lightweight native host (<80MB RAM), system tray, and host-enforced security sandbox.
- **Frontend UI:** **Next.js (Static Export) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + Motion + Lucide + cmdk + Sonner + next-themes + Geist**.
- **Data & Tables:** **TanStack Query + Zustand + TanStack Table + Monaco Editor & Monaco Diff Editor + Apache ECharts + date-fns**.
- **Kubernetes Engine:** **Go 1.23+ Sidecar with official `k8s.io/client-go` + `clientcmd` + `log/slog`**, communicating via versioned JSON-RPC over local stdio pipes.
- **Quality & Testing:** **`pnpm` + Lefthook + Vitest + Testing Library + Playwright + Go `testify` + `envtest`**.

---

## 🗺️ Milestone Strategy

```
Phase 01 ──► Phase 02 ──► Phase 03 ──► Phase 04 ──► Phase 05 ──► Phase 06
[ Desktop Shell ] [ Go Engine / Conn ] [ ECharts Dashboard ] [ Resource Browser ] [ Monaco Diff & Ops ] [ Triage Workbench ]
                               ▲
                               └─── MILESTONE 1 (v0.1 - v0.5): Daily-Driver Usable IDE ───┘

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

| # | Phase Name | Primary Stack & Focus | Target Milestone | Status |
| :---: | :--- | :--- | :---: | :---: |
| **01** | [Core desktop application](#phase-1--core-desktop-application) | Tauri 2, Next.js static, Tailwind 4, shadcn/ui, cmdk, Geist | Milestone 1 | ⏳ Pending |
| **02** | [Kubernetes connection management](#phase-2--kubernetes-connection-management) | Go `client-go`, `clientcmd`, JSON-RPC IPC, auth plugins | Milestone 1 | ⏳ Pending |
| **03** | [Cluster overview and dashboard](#phase-3--cluster-overview-and-dashboard) | Apache ECharts, cluster health, warning events ticker | Milestone 1 | ⏳ Pending |
| **04** | [Complete Kubernetes resource browser](#phase-4--complete-kubernetes-resource-browser) | TanStack Table, `client-go/dynamic` CRDs, virtualized grid | Milestone 1 | ⏳ Pending |
| **05** | [Resource operations and YAML editor](#phase-5--resource-operations-and-yaml-editor) | Monaco Editor, Monaco Diff Editor, server dry-run diff | Milestone 1 | ⏳ Pending |
| **06** | [Pod and container troubleshooting](#phase-6--pod-and-container-troubleshooting) | Live log streaming, xterm.js PTY exec, 1-click triage | Milestone 1 | ⏳ Pending |
| **07** | [Workload topology and relationships](#phase-7--workload-topology-and-relationships) | React Flow / @xyflow graph, live dependency badges | Milestone 2 | ⏳ Pending |
| **08** | [Metrics and monitoring](#phase-8--metrics-and-monitoring) | Apache ECharts, Metrics API, Prometheus PromQL queries | Milestone 2 | ⏳ Pending |
| **09** | [Networking and connectivity](#phase-9--networking-and-connectivity) | Port-forwarding engine, Gateway API, Cilium Hubble | Milestone 2 | ⏳ Pending |
| **10** | [Storage management](#phase-10--storage-management) | PV/PVC triage, StorageClasses, Longhorn integration | Milestone 2 | ⏳ Pending |
| **11** | [Helm and application deployment](#phase-11--helm-and-application-deployment) | Helm release lifecycle, revision history, values diff | Milestone 2 | ⏳ Pending |
| **12** | [Security and access control](#phase-12--security-and-access-control) | RBAC `auth can-i`, secret masking, Trivy scanner | Milestone 3 | ⏳ Pending |
| **13** | [Plugin and extension system](#phase-13--plugin-and-extension-system) | TypeScript SDK, JSON Schema manifests, host sandbox | Milestone 3 | ⏳ Pending |
| **14** | [Advanced productivity](#phase-14--advanced-productivity) | cmdk palette, multi-tab inspection, cross-cluster diff | Milestone 3 | ⏳ Pending |
| **15** | [AI-assisted operations](#phase-15--ai-assisted-operations) | Root cause diagnosis, log summarizer, privacy guard | Milestone 3 | ⏳ Pending |
| **16** | [Production quality and distribution](#phase-16--production-quality-and-distribution) | Playwright E2E, Go `envtest`, code signing, auto-update | Milestone 3 | ⏳ Pending |

---

## 🚀 Detailed Phase Breakdown

### Phase 1 — Core Desktop Application
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

### Phase 2 — Kubernetes Connection Management
- [ ] Dedicated Go 1.23+ engine sidecar running official `k8s.io/client-go`.
- [ ] Versioned JSON-RPC protocol over private stdio pipes between Tauri 2 host and Go engine.
- [ ] Load and parse kubeconfig files using `clientcmd` from `~/.kube/config`, custom paths, and `$KUBECONFIG`.
- [ ] Support seamless switching between multiple clusters and contexts.
- [ ] Real-time switching between namespaces (with "All Namespaces" support).
- [ ] Add, remove, rename, and refresh cluster connections with hot reload on file changes.
- [ ] Display connection status indicators, server latency, and Kubernetes version.
- [ ] Show cluster API endpoint, CA data, and authentication method in cluster info panel.
- [ ] Support kubeconfig file changes and automatic file-watcher reloads via Go `fsnotify`.
- [ ] Handle expired credentials, OIDC token refreshes, and auth errors with clear hints.
- [ ] Support external credential plugins with explicit user approval (`aws-iam-authenticator`, `kubelogin`, `gke-gcloud-auth-plugin`).
- [ ] Provide connection diagnostics and human-readable error messages for network/firewall timeouts.

### Phase 3 — Cluster Overview and Dashboard
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

### Phase 4 — Complete Kubernetes Resource Browser
- [ ] **Data Grid:** TanStack Table v8 with compact row heights (32px) and virtualization.
- [ ] **Core Workloads:** Pods, Deployments, ReplicaSets, StatefulSets, DaemonSets, Jobs, CronJobs.
- [ ] **Cluster Structure:** Namespaces, Nodes, ResourceQuotas, LimitRanges.
- [ ] **Networking:** Services, Endpoints, EndpointSlices, Ingresses, Gateway API (`GatewayClass`, `Gateway`, `HTTPRoute`).
- [ ] **Config & Secrets:** ConfigMaps, Secrets (with masked values by default).
- [ ] **Storage:** PersistentVolumes, PersistentVolumeClaims, StorageClasses, VolumeAttachments.
- [ ] **Access Control & RBAC:** ServiceAccounts, Roles, RoleBindings, ClusterRoles, ClusterRoleBindings.
- [ ] **Scaling & Reliability:** HorizontalPodAutoscalers (HPA), PodDisruptionBudgets (PDB).
- [ ] **Policies:** NetworkPolicies.
- [ ] **Extensibility:** Dynamic Custom Resource Definitions (CRDs) via `client-go/dynamic` with `additionalPrinterColumns`.
- [ ] Virtualized grid capable of rendering 10,000+ items at 60 FPS.

### Phase 5 — Resource Operations and YAML Editor
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

### Phase 6 — Pod and Container Troubleshooting
- [ ] **Live Container Logs:** High-throughput streaming via Go engine and local stdio IPC.
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

### Phases 7–16 (Milestones 2 & 3)
- [ ] **Phase 7: Workload Topology:** React Flow / @xyflow graph with animated health edges.
- [ ] **Phase 8: Metrics & Monitoring:** Apache ECharts, Metrics Server, Prometheus PromQL.
- [ ] **Phase 9: Networking & Connectivity:** Port-forwarding engine, Gateway API, Cilium Hubble.
- [ ] **Phase 10: Storage Management:** PV/PVC triage, StorageClasses, Longhorn integration.
- [ ] **Phase 11: Helm Management:** Helm chart browser, install, upgrade, rollback.
- [ ] **Phase 12: Security & Access Control:** RBAC `auth can-i`, secret masking, Trivy scanner.
- [ ] **Phase 13: Plugin & Extension System:** TypeScript SDK, JSON Schema manifests, host sandbox.
- [ ] **Phase 14: Advanced Productivity:** Global cmdk palette, multi-tab inspection, cross-cluster diff.
- [ ] **Phase 15: AI-Assisted Operations:** Root cause diagnosis, log summarizer, privacy guard.
- [ ] **Phase 16: Production Quality & Distribution:** Playwright E2E, Go `envtest`, code signing, auto-update.
