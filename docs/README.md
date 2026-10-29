<p align="center">
  <img src="../apps/desktop/public/logo-full.png" width="160" alt="KubeView Logo" />
</p>

# KubeView Documentation

> **Complete architectural blueprints, security policies, IPC contracts, and engineering roadmaps for KubeView.**

---

## 🧭 Documentation Navigator

### 1. Architecture & Security Blueprints

- [**ARCHITECTURE.md**](ARCHITECTURE.md)
  _Production Architecture Blueprint_: Layer ownership boundaries (Next.js vs. Tauri vs. Go vs. K8s API), Go engine supervisor state machine, stdio IPC transport, and internal modular monolith layout.
- [**SECURITY_ARCHITECTURE.md**](SECURITY_ARCHITECTURE.md)
  _Production Security Architecture_: Process trust boundaries, kubeconfig validation, external exec plugin approval policy, secret masking, RBAC advisory checks, threat model, and 16-point security checklist.
- [**contracts/IPC_SPECIFICATION.md**](contracts/IPC_SPECIFICATION.md)
  _Versioned JSON-RPC 2.0 Protocol Contract (`rpc/v1`)_: Wire framing, handshake negotiation, standardized envelopes (`ResourceRef`, `StreamEvent`), all RPC domains, and error catalog with redaction rules.

### 2. User Experience & Connectivity

- [**FIRST_RUN_EXPERIENCE.md**](FIRST_RUN_EXPERIENCE.md)
  _Agentless Onboarding & Diagnostic Pipeline_: Zero-touch onboarding, multi-source kubeconfig detection (`~/.kube`), what users need vs. don't need, and the 4-stage automated connection diagnostics (Network → Auth/Plugins → TLS/API → RBAC).

### 3. Engineering Implementation & Stack

- [**TECH_STACK.md**](TECH_STACK.md)
  _Ratified Production Tech Stack_: Exact library roles (Tauri 2, Next.js static export, Tailwind CSS 4, shadcn/ui, Go `client-go`, `pnpm`, `Lefthook`).
- [**EXECUTION_PLAN.md**](EXECUTION_PLAN.md)
  _9-Step Implementation Sequence_: Step-by-step engineering work breakdown structure (WBS), testing strategy (`envtest`, `testify`, `Playwright`), and quality gates.
- [**ROADMAP.md**](ROADMAP.md)
  _16-Phase Feature Roadmap_: Detailed task checklists, status tracker, and milestone progression (Core IDE → Deep Ops → Ecosystem).
- [**resource-coverage-plan.md**](resource-coverage-plan.md)
  _Resource Coverage Track (RC1–RC5)_: Gap inventory against the Freelens/Lens sidebar and the shared simple-resource architecture for closing it.
- [**gitops-integration.md**](gitops-integration.md)
  _GitOps Drift Integration_: Local manifest scanning, desired-versus-live drift, safe reviewed applies, security boundaries, and the Argo CD, Flux, multi-cluster, and CI roadmap.

### 4. Phase Specifications (Milestone 1)

- [**phases/phase-01-core-desktop.md**](phases/phase-01-core-desktop.md) — Core Desktop Application Shell
- [**phases/phase-02-connectivity.md**](phases/phase-02-connectivity.md) — Kubernetes Connection Management
- [**phases/phase-03-cluster-dashboard.md**](phases/phase-03-cluster-dashboard.md) — Cluster Overview & Dashboard
- [**phases/phase-04-resource-browser.md**](phases/phase-04-resource-browser.md) — Complete Kubernetes Resource Browser
- [**phases/phase-05-resource-operations.md**](phases/phase-05-resource-operations.md) — Resource Operations & YAML Editor
- [**phases/phase-06-troubleshooting.md**](phases/phase-06-troubleshooting.md) — Pod & Container Troubleshooting Workbench

---

## 🏛️ Implemented Capabilities & Production Subsystems

| Module                  | Location                                             | Description                                                                                                                               |
| :---------------------- | :--------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **Go Engine Sidecar**   | `engine/`                                            | Headless Go 1.23+ process communicating via stdio JSON-RPC 2.0. Native `client-go` informers, watch streams, and multi-kubeconfig parser. |
| **Cluster Overview**    | `apps/desktop/src/components/views/overview/`        | Bento metric cards, precision SVG charts, node matrix grid, workload controller status, warning event feed, and namespace filtering.      |
| **Resource Inspector**  | `apps/desktop/src/components/views/inspector/`       | Drawer with Node & Pod detail views, container states, env var viewer, conditions timeline, live events, and formatted YAML.              |
| **Resource Browser**    | `apps/desktop/src/components/views/resources/`       | Real-time streaming pod list, multi-column sort, status filter pills, and batch restart/delete actions.                                   |
| **Troubleshooting Hub** | `apps/desktop/src/components/modals/`                | Streaming live logs with search & download, and interactive container terminal PTY exec.                                                  |
| **Kubeconfig Hub**      | `apps/desktop/src/components/onboarding/kubeconfig/` | System OS scanner, multi-file/folder drag & drop, raw YAML parser, and internal host IP override.                                         |
| **GitOps Drift**        | `apps/desktop/src/components/views/gitops/`          | Local raw-YAML manifest scanning, desired-versus-live drift classification, shared YAML diff viewer, and RBAC-aware reviewed apply.       |

---

## 📁 Directory Layout

```
docs/
├── README.md                      # This master index
├── ARCHITECTURE.md                # Production Architecture Blueprint
├── SECURITY_ARCHITECTURE.md       # Production Security Architecture
├── TECH_STACK.md                  # Ratified production tech stack
├── FIRST_RUN_EXPERIENCE.md        # Agentless onboarding & diagnostic probes
├── EXECUTION_PLAN.md              # 9-step implementation sequence
├── ROADMAP.md                     # 16-phase roadmap & checklists
├── gitops-integration.md           # Local drift foundation and controller roadmap
├── contracts/
│   └── IPC_SPECIFICATION.md       # JSON-RPC 2.0 protocol contract (rpc/v1)
└── phases/
    ├── phase-01-core-desktop.md
    ├── phase-02-connectivity.md
    ├── phase-03-cluster-dashboard.md
    ├── phase-04-resource-browser.md
    ├── phase-05-resource-operations.md
    └── phase-06-troubleshooting.md
```
