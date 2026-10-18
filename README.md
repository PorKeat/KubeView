# KubeView

> **A next-generation Kubernetes desktop IDE and operations platform.**  
> Built to surpass legacy Kubernetes desktop tooling (Lens, Freelens, Octant) with instant startup, rock-solid cluster connectivity, high-density observability, interactive topology visualization, and guardrailed operations.

---

## 🌟 Vision & Guiding Principle

**KubeView** is engineered around a local-first, layered desktop architecture:

- **The Frontend (Next.js Static Export + React)** displays and requests operations. It must *never* own cluster credentials or execute unrestricted shell commands.
- **The Native Host (Tauri 2 + Rust)** controls process access, enforces capabilities/permissions, and supervises the Go engine. It must *never* duplicate Kubernetes business logic.
- **The Kubernetes Engine (Go Sidecar + client-go)** performs all Kubernetes API operations, watch streams, and credential resolution. It must *never* execute arbitrary frontend-controlled shell commands.
- **The Kubernetes API Server** is the authoritative gatekeeper for cluster state and RBAC authorization.

---

## 🏗️ Production Architecture Blueprint

```mermaid
flowchart TD
    subgraph UI ["Tier 1: Presentation (Next.js Static Export / React / TypeScript)"]
        Components["UI Components (shadcn/ui + Tailwind CSS 4 + Motion)"]
        Stores["State Management (Zustand + TanStack Query)"]
        Services["Typed Frontend Services (@kubeview/contracts)"]
    end

    subgraph Host ["Tier 2: Native Host & Security Boundary (Tauri 2 / Rust)"]
        CmdValidator["Command Validation & Origin Check"]
        PermEngine["Host-Enforced Permissions & Capabilities"]
        Supervisor["Go Engine Supervisor (Lifecycle, Backoff, Health)"]
        IPCGateway["JSON-RPC 2.0 Pipe Dispatcher (stdin/stdout)"]
    end

    subgraph Engine ["Tier 3: Kubernetes Engine (Go Sidecar / client-go)"]
        ClusterMgr["Cluster Manager (clientcmd & kubeconfig)"]
        ResourceAPI["Resource CRUD & Server-Side Apply Engine"]
        WatchMgr["Watch Manager (SharedInformerFactory & DeltaFIFO)"]
        StreamEngine["Streaming Engine (Logs, Exec PTY, Port-Forward)"]
        Discovery["Discovery & CRD Introspection"]
        MetricsAdapters["Metrics Server & Prometheus Adapters"]
    end

    subgraph Cluster ["Tier 4: Kubernetes Infrastructure"]
        APIServer["Kube-APIServer (REST, Watch, SPDY/WebSocket)"]
    end

    UI <-->|Typed Tauri Commands & Events| Host
    Host <-->|Versioned JSON-RPC 2.0 (stdin/stdout pipes)| Engine
    Engine <-->|HTTPS REST, Watch, SPDY (TLS Authenticated)| APIServer
```

### Layer Responsibilities

| Layer | Owns | Must NOT Own |
| :--- | :--- | :--- |
| **Next.js / React** | UI presentation, navigation, forms, local view state, table interactions, editor rendering. | Cluster credentials, direct filesystem access, unrestricted shell execution. |
| **Tauri / Rust** | IPC gateway, process lifecycle, supervisor, permission enforcement, native OS integration. | Kubernetes business logic duplicated from Go, direct Kubernetes API calls. |
| **Go Engine** | Kubernetes clients, resource operations, informers/watches, log/PTY streams, API discovery. | Arbitrary frontend-controlled command execution, desktop windowing state. |
| **Kubernetes API** | Authoritative cluster state, server-side admission, and RBAC authorization. | Desktop UI state. |

---

## 🔒 Security Architecture Highlights

1. **Zero Credential Exposure:** Tokens, client certificates, private keys, and exec-helper secrets exist **only in Go engine memory**. They are NEVER passed to the React UI, plugins, telemetry, or logs.
2. **No Local Network Sockets:** The Go engine communicates exclusively via **inherited stdio pipes (`stdin`/`stdout`)** using newline-delimited JSON-RPC 2.0. No local TCP/HTTP ports are opened.
3. **Server-Side Apply & Dry-Run Diff:** All declarative changes use Kubernetes Server-Side Apply with field manager `kubeview`. Local YAML is validated and dry-run tested (`dryRun=All`) before live mutation.
4. **Secret Masking:** Sensitive values in Secrets and environment variables are masked by default (`********`) across all views.
5. **Host-Enforced Permissions:** Plugins and external integrations are constrained by host capabilities and cannot bypass security checks.

---

## 🎨 Visual Design System & Design Tokens

KubeView is built dark-first with a high-density, accessible layout:

- **Background:** `#17191D`
- **Surface:** `#22252B`
- **Hover:** `#2C3038`
- **Subtle Borders:** `#323741`
- **Accent / Brand:** `#F08A42`
- **Status Healthy:** `#38B879`
- **Status Warning:** `#F5A623`
- **Status Critical:** `#E05252`

---

## 🚀 9-Step Implementation Sequence

1. **01. Architecture Foundation:** Monorepo (`pnpm`), contracts package, Tauri 2 host shell, and Next.js static export (`output: "export"`).
2. **02. Engine Lifecycle & Supervision:** Bundled Go sidecar, protocol handshake, stdio IPC dispatcher, and crash recovery.
3. **03. Cluster Access & Connectivity:** Kubeconfig via `clientcmd`, context switching, auth plugins, and diagnostics.
4. **04. Resource Browser & Data Grid:** API discovery, dynamic CRDs via `client-go/dynamic`, TanStack Table v8.
5. **05. Resource Operations & Monaco YAML:** Monaco Editor, server-side dry-run diffs, safe apply, deletion guardrails.
6. **06. Troubleshooting Workbench:** High-throughput live logs, `xterm.js` PTY container exec, 1-click root cause triage.
7. **07. Performance, Caching & Safety:** `SharedInformerFactory`, DeltaFIFO, concurrency limits, secret redaction.
8. **08. Integrations & Sandboxed Plugins:** Capability-based plugin SDK, Helm, Cilium, Longhorn, ArgoCD adapters.
9. **09. Production Hardening & Release:** Multi-platform CI/CD, code signing, auto-update, KinD/envtest matrix.

---

## 📚 Project Documentation

The documentation is organized in the [`docs/`](file:///Users/alexkgm/KubeView/docs) directory:

- 🏛️ [**docs/ARCHITECTURE.md**](file:///Users/alexkgm/KubeView/docs/ARCHITECTURE.md) — Comprehensive Production Architecture Blueprint, supervisor state machine, layer boundaries, and Go package architecture.
- 📜 [**docs/contracts/IPC_SPECIFICATION.md**](file:///Users/alexkgm/KubeView/docs/contracts/IPC_SPECIFICATION.md) — Versioned JSON-RPC 2.0 protocol contracts (`rpc/v1`), domain methods, envelopes, and error catalog.
- 🛠️ [**docs/TECH_STACK.md**](file:///Users/alexkgm/KubeView/docs/TECH_STACK.md) — Production tech stack reference and dependency specifications.
- 🚀 [**docs/EXECUTION_PLAN.md**](file:///Users/alexkgm/KubeView/docs/EXECUTION_PLAN.md) — 9-step implementation sequence, task breakdown, testing strategy, and risk mitigations.
- 📋 [**ROADMAP.md**](file:///Users/alexkgm/KubeView/ROADMAP.md) — 16-phase roadmap checklist and status tracking.
- 📖 [**docs/phases/**](file:///Users/alexkgm/KubeView/docs/phases) — Phase-by-phase functional and technical specifications:
  - [Phase 1: Core Desktop Application](file:///Users/alexkgm/KubeView/docs/phases/phase-01-core-desktop.md)
  - [Phase 2: Kubernetes Connection Management](file:///Users/alexkgm/KubeView/docs/phases/phase-02-connectivity.md)
  - [Phase 3: Cluster Overview & Dashboard](file:///Users/alexkgm/KubeView/docs/phases/phase-03-cluster-dashboard.md)
  - [Phase 4: Complete Kubernetes Resource Browser](file:///Users/alexkgm/KubeView/docs/phases/phase-04-resource-browser.md)
  - [Phase 5: Resource Operations & YAML Editor](file:///Users/alexkgm/KubeView/docs/phases/phase-05-resource-operations.md)
  - [Phase 6: Pod & Container Troubleshooting Workbench](file:///Users/alexkgm/KubeView/docs/phases/phase-06-troubleshooting.md)
