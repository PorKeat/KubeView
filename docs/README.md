<p align="center">
  <img src="../apps/desktop/public/logo-full.png" width="160" alt="KubeView Logo" />
</p>

# KubeView Documentation

> **Complete architectural blueprints, security policies, IPC contracts, and engineering roadmaps for KubeView.**

---

## 🧭 Documentation Navigator

### 1. Architecture & Security Blueprints
- [**ARCHITECTURE.md**](file:///Users/alexkgm/KubeView/docs/ARCHITECTURE.md)  
  *Production Architecture Blueprint*: Layer ownership boundaries (Next.js vs Tauri vs Go vs K8s API), Go engine supervisor state machine, stdio IPC transport, and internal modular monolith layout.
- [**SECURITY_ARCHITECTURE.md**](file:///Users/alexkgm/KubeView/docs/SECURITY_ARCHITECTURE.md)  
  *Production Security Architecture*: Process trust boundaries, kubeconfig validation, external exec plugin approval policy, secret masking, RBAC advisory checks, threat model, and 16-point security checklist.
- [**contracts/IPC_SPECIFICATION.md**](file:///Users/alexkgm/KubeView/docs/contracts/IPC_SPECIFICATION.md)  
  *Versioned JSON-RPC 2.0 Protocol Contract (`rpc/v1`)*: Wire framing, handshake negotiation, standardized envelopes (`ResourceRef`, `StreamEvent`), all 10 RPC domains, and error catalog with redaction rules.

### 2. User Experience & Connectivity
- [**FIRST_RUN_EXPERIENCE.md**](file:///Users/alexkgm/KubeView/docs/FIRST_RUN_EXPERIENCE.md)  
  *Agentless Onboarding & Diagnostic Pipeline*: Zero-touch onboarding, what users need vs don't need, and the 4-stage automated connection diagnostics (Network → Auth/Plugins → TLS/API → RBAC).

### 3. Engineering Implementation & Stack
- [**TECH_STACK.md**](file:///Users/alexkgm/KubeView/docs/TECH_STACK.md)  
  *Ratified Production Tech Stack*: Exact library roles (Tauri 2, Next.js static export, Tailwind CSS 4, shadcn/ui, Apache ECharts, Monaco Diff Editor, Go `client-go`, `pnpm`, `Lefthook`).
- [**EXECUTION_PLAN.md**](file:///Users/alexkgm/KubeView/docs/EXECUTION_PLAN.md)  
  *9-Step Implementation Sequence*: Step-by-step engineering work breakdown structure (WBS), testing strategy (`envtest`, `testify`, `Vitest`, `Playwright`), and quality gates.
- [**ROADMAP.md**](file:///Users/alexkgm/KubeView/docs/ROADMAP.md)  
  *16-Phase Feature Roadmap*: Detailed task checklists, status tracker (0/16 completed), and milestone progression (Core IDE → Deep Ops → Ecosystem).

### 4. Phase Specifications (Milestone 1)
- [**phases/phase-01-core-desktop.md**](file:///Users/alexkgm/KubeView/docs/phases/phase-01-core-desktop.md) — Core Desktop Application Shell
- [**phases/phase-02-connectivity.md**](file:///Users/alexkgm/KubeView/docs/phases/phase-02-connectivity.md) — Kubernetes Connection Management
- [**phases/phase-03-cluster-dashboard.md**](file:///Users/alexkgm/KubeView/docs/phases/phase-03-cluster-dashboard.md) — Cluster Overview & Dashboard
- [**phases/phase-04-resource-browser.md**](file:///Users/alexkgm/KubeView/docs/phases/phase-04-resource-browser.md) — Complete Kubernetes Resource Browser
- [**phases/phase-05-resource-operations.md**](file:///Users/alexkgm/KubeView/docs/phases/phase-05-resource-operations.md) — Resource Operations & YAML Editor
- [**phases/phase-06-troubleshooting.md**](file:///Users/alexkgm/KubeView/docs/phases/phase-06-troubleshooting.md) — Pod & Container Troubleshooting Workbench

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
