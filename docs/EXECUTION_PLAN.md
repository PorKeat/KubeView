# KubeView Implementation & Execution Plan

> **Plan Objective:** Provide an actionable, phased engineering execution plan to build KubeView from scratch using the ratified production tech stack: **Tauri 2 (Rust Host) + Go `client-go` (Kubernetes Engine Sidecar) + Next.js Static Export (React, TypeScript, Tailwind CSS 4, shadcn/ui)**.

---

## 1. Phased Delivery Roadmap & Milestones

```mermaid
gantt
    title KubeView Development Roadmap
    dateFormat  YYYY-MM-DD
    section Milestone 1 (Core IDE)
    Phase 01: Core Desktop Shell          :active, p1, 2026-11-01, 14d
    Phase 02: Kubeconfig & Connectivity   :p2, after p1, 14d
    Phase 03: Cluster Dashboard           :p3, after p2, 10d
    Phase 04: Resource Browser            :p4, after p3, 21d
    Phase 05: Resource Ops & Monaco YAML  :p5, after p4, 18d
    Phase 06: Troubleshooting Workbench   :p6, after p5, 21d
    section Milestone 2 (Deep Ops)
    Phase 07: Workload Topology           :p7, after p6, 21d
    Phase 08: Metrics & ECharts           :p8, after p7, 14d
    Phase 09: Networking & Port-Forward   :p9, after p8, 18d
    Phase 10: Storage & Longhorn          :p10, after p9, 14d
    Phase 11: Helm Management             :p11, after p10, 14d
    section Milestone 3 (Ecosystem & Release)
    Phase 12: Security & RBAC             :p12, after p11, 14d
    Phase 13: Sandboxed Plugin SDK        :p13, after p12, 21d
    Phase 14: Advanced Productivity       :p14, after p13, 14d
    Phase 15: AI Diagnostics              :p15, after p14, 18d
    Phase 16: Hardening & Distribution    :p16, after p15, 21d
```

---

## 2. Milestone 1: Daily-Driver Desktop IDE (Phases 1–6)

---

### Sprint 1: Phase 1 — Core Desktop Application Shell
**Duration:** 2 Weeks  
**Primary Deliverable:** High-performance desktop shell running Tauri 2 with Next.js static export, Tailwind CSS 4, shadcn/ui, Geist typography, dark/light themes, and `cmdk` command palette.

#### Work Breakdown Structure (WBS)
- [ ] **1.1 Project Setup & Quality Tooling:**
  - Initialize monorepo structure with `pnpm` workspace.
  - Setup `Lefthook` pre-commit hooks for Prettier, ESLint (v9 flat config), and TypeScript checking.
  - Setup Next.js with `output: 'export'`, Tailwind CSS 4, and `@next/font` (Geist Sans & Geist Mono).
  - Configure Tauri 2 with Rust desktop runner and system tray integration.
- [ ] **1.2 Layout & Design Tokens:**
  - Implement KubeView dark-first theme tokens (`#17191D` bg, `#22252B` surface, `#F08A42` accent, `#38B879` healthy).
  - Configure `next-themes` for instantaneous zero-flash theme toggling.
  - Implement resizable multi-panel layout (`react-resizable-panels`).
  - Implement collapsible sidebar and tabbed workspace bar.
- [ ] **1.3 Command Palette & Toast Notifications:**
  - Integrate `cmdk` command palette triggered by `Cmd+K` / `Ctrl+K`.
  - Integrate `Sonner` toast notifications with action buttons and dismiss timers.
- [ ] **1.4 Client State Persistence:**
  - Setup Zustand stores with `tauri-plugin-store` for saving window geometry, open tabs, active context, and sidebar state.

#### Acceptance Criteria
- [x] Cold application launch in < 800ms with idle memory consumption < 70MB.
- [x] Fluid 60 FPS panel resizing without layout stutter.
- [x] Themes persist across restarts with no flash of unstyled content.

---

### Sprint 2: Phase 2 — Kubernetes Engine & Connection Management
**Duration:** 2 Weeks  
**Primary Deliverable:** Dedicated Go engine sidecar utilizing official `client-go` and `clientcmd`, supervised by Tauri 2 host via versioned JSON-RPC.

#### Work Breakdown Structure (WBS)
- [ ] **2.1 Go Sidecar Scaffold & JSON-RPC Protocol:**
  - Scaffold Go 1.23+ engine in `engine/` with `client-go`, `clientcmd`, and structured logging via Go `log/slog`.
  - Define versioned JSON-RPC protocol specification (`rpc/v1`) over standard input/output.
  - Rust Tauri supervisor to spawn, monitor health, and gracefully terminate the Go sidecar.
- [ ] **2.2 Kubeconfig Parsing & Aggregation:**
  - Ingest `$KUBECONFIG` paths and standard `~/.kube/config` via `clientcmd`.
  - Support multi-cluster context switching and namespace listing.
- [ ] **2.3 Exec Credential Plugin Runner:**
  - Support AWS IAM (`aws eks get-token`), Azure `kubelogin`, GCP `gke-gcloud-auth-plugin`, and custom OIDC helpers.
  - In-memory credential caching based on expiration timestamps.
- [ ] **2.4 Hot-Reloading File Watcher:**
  - Monitor kubeconfig files for out-of-band updates using `fsnotify` in Go.
  - Silently invalidate and refresh cluster pools without requiring an app reboot.
- [ ] **2.5 Connection Diagnostics & UI Feedback:**
  - Pre-flight connection probes checking `/readyz`, `/livez`, and version.
  - Structured diagnostic error reporting to frontend Sonner toasts.

#### Acceptance Criteria
- [x] Connects reliably to local KinD/Minikube and cloud EKS/AKS/GKE clusters.
- [x] Switching context re-establishes API connectivity in < 300ms.
- [x] Modifying `~/.kube/config` externally refreshes cluster contexts within 500ms.

---

### Sprint 3: Phase 3 — Cluster Overview & Dashboard
**Duration:** 1.5 Weeks  
**Primary Deliverable:** High-impact cluster control center with Apache ECharts telemetry widgets, health summaries, and direct 1-click triage.

#### Work Breakdown Structure (WBS)
- [ ] **3.1 Cluster Health Telemetry Aggregation:**
  - Ingest API server status, node conditions, and control plane readiness in Go engine.
  - Expose cluster health rollup (Healthy, Degraded, Critical).
- [ ] **3.2 Node & Workload Overview Cards:**
  - Node summary: Total, Ready, NotReady, Cordoned.
  - Pod breakdown: Running, Pending, CrashLoopBackOff, Succeeded.
  - Workload rollups: Deployment, StatefulSet, and DaemonSet replica health.
- [ ] **3.3 Resource Utilization with Apache ECharts:**
  - Render real-time CPU and Memory gauges comparing live usage against allocatable cluster capacity using Apache ECharts.
  - Graceful fallback when Metrics Server is not detected.
- [ ] **3.4 Warning Events Feed & Problem Workloads (Better than Freelens):**
  - Real-time watcher for `Warning` events across the cluster.
  - Problem Workloads card highlighting pods in `CrashLoopBackOff`, `OOMKilled`, or `ImagePullBackOff`.
  - 1-click navigation directly to Phase 6's Troubleshooting Workbench.

#### Acceptance Criteria
- [x] Telemetry renders in under 500ms upon selecting a context.
- [x] Apache ECharts renders responsive charts with zero animation jank.
- [x] Clicking any broken workload card jumps directly to its troubleshooting view.

---

### Sprint 4: Phase 4 — Complete Kubernetes Resource Browser
**Duration:** 3 Weeks  
**Primary Deliverable:** High-performance, virtualized resource browser supporting all standard Kubernetes resources and dynamic CRDs using TanStack Table v8.

#### Work Breakdown Structure (WBS)
- [ ] **4.1 Generic Informer Engine & Dynamic CRD Client:**
  - Setup Go `client-go` `SharedInformerFactory` for standard workloads, networking, config, storage, and RBAC.
  - Setup `client-go/dynamic` client for Custom Resource Definitions.
  - Implement discovery engine extracting `additionalPrinterColumns` for dynamic CRD table generation.
- [ ] **4.2 High-Performance Data Grid (TanStack Table):**
  - Integrate TanStack Table v8 with virtualized row rendering.
  - Compact row height (32px), clean Geist typography, and color-coded status pills.
  - Multi-column sorting, fuzzy search, and column visibility/reordering persistence.
- [ ] **4.3 Resource Detail Drawer:**
  - Slide-over panel displaying metadata, annotations, labels, spec, status, and related resources.

#### Acceptance Criteria
- [x] Tables render smoothly at 60 FPS even with 10,000 active pods.
- [x] CRDs are discovered automatically and rendered with their specific table columns.
- [x] Filter searches update visible rows in < 16ms.

---

### Sprint 5: Phase 5 — Resource Operations & Monaco YAML Editor
**Duration:** 2.5 Weeks  
**Primary Deliverable:** Monaco YAML editor, Monaco Diff Editor, server-side dry-run diffs, and safe workload mutation workflows.

#### Work Breakdown Structure (WBS)
- [ ] **5.1 Monaco YAML Editor & Schema Validation:**
  - Embedded Monaco Editor pre-configured with Kubernetes JSONSchema validation matching cluster version.
  - Inline schema error squigglies and autocompletion for fields.
- [ ] **5.2 Server-Side Dry-Run & Monaco Diff Editor:**
  - Perform mutations with `dryRun=All` via Go engine.
  - Side-by-side visual diff using Monaco Diff Editor comparing live cluster state against proposed admitted manifest.
  - Highlight destructive or immutable changes before user confirms.
- [ ] **5.3 First-Class Workload Controls:**
  - Scale workloads: interactive slider and input for replicas.
  - Restart workloads: trigger rolling restart (`kubectl rollout restart`).
  - Rollout rollback: inspect revision history and perform 1-click undo.
  - CronJob controls: suspend, resume, and trigger immediate run.
- [ ] **5.4 Safe Deletion & Guardrails:**
  - Typed confirmation dialogs for critical/production namespaces.
  - Pre-flight RBAC checks (`SelfSubjectAccessReview`) to disable unauthorized action buttons.
  - Clean YAML export (stripping `managedFields`, `resourceVersion`, `uid`).

#### Acceptance Criteria
- [x] Inline Monaco schema validation warns of YAML errors before submission.
- [x] Server-side dry-run diff displays exact mutations before committing to the cluster.
- [x] Rollout restart provides real-time visual feedback on pod rolling transitions.

---

### Sprint 6: Phase 6 — Pod & Container Troubleshooting Workbench
**Duration:** 3 Weeks  
**Primary Deliverable:** Core differentiator — single-click troubleshooting view with live log streaming, xterm.js container exec, probe diagnostics, and 1-click triage.

#### Work Breakdown Structure (WBS)
- [ ] **6.1 High-Throughput Live Log Streaming:**
  - Stream logs from Kubernetes API via Go engine through local IPC to virtualized viewport.
  - Multi-container selection, merged color-coded streams, and previous container logs (`previous: true`).
  - Instant regex search, keyword filtering, autoscroll toggle, and tail line options (100, 500, 1000, all).
  - Time-range filtering using `date-fns` (`--since=5m`, `1h`, `24h`).
- [ ] **6.2 Interactive Container Exec Terminal:**
  - Integrated `xterm.js` terminal with WebGL acceleration.
  - SPDY/WebSocket PTY multiplexing in Go engine with window resize (`SIGWINCH`) support.
  - Shell detection (`/bin/bash`, fallback to `/bin/sh`).
- [ ] **6.3 One-Click Triage & Root Cause Correlator:**
  - Synthesize failure state: exit code, termination reason, restart counts.
  - Plain-English diagnostic breakdown explaining `CrashLoopBackOff`, `OOMKilled` (Exit 137), `ImagePullBackOff`, and `Pending`.
  - Correlate Liveness/Readiness probe failures with container restarts.
  - Chronological event feed filtered for the pod over the last 2 hours.
- [ ] **6.4 Environment & Secret Inspector:**
  - View container environment variables with sensitive values masked by default.
  - Click-to-unmask with base64 decoding.
- [ ] **6.5 Troubleshooting Bundle Export:**
  - 1-click export of pod describe, events, and tail logs into a markdown/zip incident report.

#### Acceptance Criteria
- [x] Log streams render 25,000 lines/second without freezing the UI.
- [x] Interactive terminal connects in < 400ms with full ANSI color and shortcut support.
- [x] Clicking an `OOMKilled` pod immediately flags memory limits vs usage and fatal exit code 137.

---

## 3. Milestones 2 & 3 Roadmap (Phases 7–16)

| Milestone | Phase | Scope | Key Technology |
| :--- | :--- | :--- | :--- |
| **Milestone 2** | **Phase 7** | Workload Topology Graph | React Flow / @xyflow with animated health edges |
| | **Phase 8** | Deep Metrics & Historical Monitoring | Apache ECharts + Prometheus PromQL integration |
| | **Phase 9** | Networking, Gateway API & Cilium | TCP/HTTP Port-Forwarding tunnel + Cilium Hubble |
| | **Phase 10** | Storage & Longhorn Management | PV/PVC triage + Longhorn storage engine visibility |
| | **Phase 11** | Helm Application Lifecycle | Helm chart repository browser, install/upgrade/rollback |
| **Milestone 3** | **Phase 12** | Security & RBAC Guard | RBAC `auth can-i` matrix, secret masking, Trivy audit |
| | **Phase 13** | Sandboxed Plugin SDK | TypeScript SDK, JSON Schema manifests, host permissions |
| | **Phase 14** | Advanced Productivity | Global cmdk palette, multi-tab inspection, saved queries |
| | **Phase 15** | AI-Assisted Operations | Root cause diagnosis, log summarizer, strict privacy guard |
| | **Phase 16** | Hardening & Distribution | Multi-platform GitHub Actions CI, code signing, auto-update |

---

## 4. Testing & Quality Assurance Strategy

1. **Frontend Tests:**
   - `Vitest` for fast unit tests of stores, formatters, and utilities.
   - `Testing Library` for React component and interaction tests.
   - `Playwright` for cross-platform desktop end-to-end workflows.
2. **Go Engine Tests:**
   - Go standard `testing` + `testify` for unit tests.
   - `envtest` (real etcd + kube-apiserver) for testing informers, CRD dynamic clients, and dry-run diffs without live cloud clusters.
3. **Local Quality Gates:**
   - `Lefthook` runs ESLint, Prettier, and Go tests before any git commit.
