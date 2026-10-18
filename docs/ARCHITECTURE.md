# KubeView Technical Architecture

> **Design Objective:** Build a lightning-fast, resource-efficient, and secure Kubernetes desktop IDE that surpasses existing tools (Lens, Freelens) in speed, stability, troubleshooting ergonomics, and safety.

---

## 1. High-Level Architecture: Three-Tier Decoupled System

KubeView adopts a **three-tier decoupled desktop architecture** with strictly defined and versioned IPC boundaries:

```mermaid
graph TD
    subgraph UI ["Tier 1: Presentation (Next.js Static Export / React / TypeScript)"]
        Shell["Desktop Shell (Window, Sidebar, Tabs, Command Palette cmdk)"]
        Components["shadcn/ui + Tailwind CSS 4 + Motion + Sonner"]
        Stores["State Management (Zustand + TanStack Query)"]
        Grid["Data Grid (TanStack Table + Virtualization)"]
        Monaco["Monaco Editor & Diff Viewer"]
        Charts["Apache ECharts (Metrics & Graphs)"]
        Xterm["Terminal & Logs (xterm.js + WebGL)"]
    end

    subgraph Host ["Tier 2: Native Desktop Host (Tauri 2 / Rust)"]
        WindowMgr["Window Lifecycle, System Tray & Native Menus"]
        SidecarSup["Go Engine Process Supervisor & Health Monitor"]
        HostSecurity["Host-Enforced Permissions & Sandbox Guard"]
        IPCBridge["Type-Safe IPC & JSON-RPC Protocol Dispatcher"]
    end

    subgraph Engine ["Tier 3: Kubernetes Engine (Go Sidecar / client-go)"]
        ClientGo["Official Kubernetes client-go (Typed & Dynamic Clients)"]
        Discovery["API Resource Discovery & CRD Introspection"]
        ConfigMgr["clientcmd Kubeconfig Parser, Merger & Watcher"]
        Informers["SharedInformerFactory & In-Memory DeltaFIFO"]
        StreamEngine["Log Chunk Streamer & PTY Terminal Multiplexer"]
        PortFwd["TCP / HTTP Port-Forwarding Tunnel Manager"]
        DiffEngine["Server-Side Dry-Run & Git Diff Generator"]
        Logger["Structured Diagnostic Logging (log/slog)"]
    end

    subgraph Cluster ["Kubernetes Infrastructure"]
        APIServer["Kube-APIServer (REST, Watch, SPDY/WebSockets)"]
        MetricsServer["Metrics API Server / Prometheus"]
    end

    Shell --> Stores
    Stores --> IPCBridge
    IPCBridge <-->|Tauri IPC Commands & Events| Host
    Host <-->|Versioned JSON-RPC over Local IPC (stdin/stdout)| Engine

    Engine <-->|HTTPS REST & Watch| APIServer
    Engine <-->|SPDY / WebSockets (Exec & Port-Forward)| APIServer
    Engine <-->|HTTP PromQL / Metrics API| MetricsServer
```

---

## 2. Multi-Tier Technology Evaluation & Rationale

### 2.1 Why the Three-Tier Split? (Tauri 2 + Go `client-go` + Next.js)

1. **Official Kubernetes Reliability (`client-go` in Go):**
   - The official Kubernetes ecosystem is written in Go. By running a Go-powered engine with official `client-go`, `clientcmd`, and dynamic clients, KubeView achieves 100% compatibility with all cloud authenticators (AWS IAM, Azure kubelogin, GCP, OIDC), complex CRD schemas, and informer caching patterns without third-party translation quirks.
2. **Minimal Desktop Overhead (Tauri 2 in Rust):**
   - Electron apps easily consume 500 MB – 1 GB of memory at idle. Tauri 2 uses the native OS webview (WKWebView on macOS, WebView2 on Windows) and lightweight Rust bindings, keeping idle memory under 70–90 MB.
3. **World-Class Frontend Velocity (Next.js Static Export + React + TypeScript):**
   - Using Next.js configured with `output: 'export'`, the UI compiles to an ultra-fast, static client bundle loaded directly into the webview with zero node server runtime.
   - Combines `shadcn/ui`, Tailwind CSS 4, Lucide icons, Geist typography, and Motion with full TypeScript safety.
4. **Independent Evolution & Versioning:**
   - Defining a strict, versioned JSON-RPC contract between the UI, Host, and Engine allows independent updates, mock testing with `envtest`, and bulletproof unit testing.

---

## 3. Core Subsystems

### 3.1 Kubernetes Engine (Go + `client-go`)
- **Kubeconfig & Discovery:** Uses `k8s.io/client-go/tools/clientcmd` to parse standard multi-path `$KUBECONFIG` environments, execute credential helper plugins, and watch filesystem events for automatic reload.
- **Dynamic & Typed Clients:** Uses standard clientsets for core resources and `k8s.io/client-go/dynamic` for CRDs, rendering custom resources with their `additionalPrinterColumns`.
- **Informer Caching & Delta FIFO:** Implements `SharedInformerFactory` to maintain an in-memory resource cache, debouncing rapid cluster changes before emitting JSON-RPC events to the desktop host.
- **Structured Logging:** Employs Go's `log/slog` for high-throughput diagnostic logs, strictly filtering and redacting auth tokens, bearer credentials, and private keys.

### 3.2 Desktop Host Shell (Tauri 2 / Rust)
- **Sidecar Lifecycle Management:** Spawns and supervises the Go engine binary on app launch, monitoring its health and gracefully terminating it on app exit.
- **IPC Protocol Dispatcher:** Bridges JSON-RPC requests from the Next.js frontend to the Go engine over local standard I/O or named pipes.
- **Host-Enforced Permissions:** Enforces that UI plugins and external calls cannot bypass security checks to access the local filesystem or run arbitrary shell commands.

### 3.3 Presentation Layer (Next.js Static Export + React 19)
- **High-Performance Data Grid:** TanStack Table v8 with TanStack Virtual for 60 FPS rendering of 10,000+ pods with column persistence and custom sorting/filtering.
- **Monaco YAML & Diff Editor:** Full Monaco Editor configured with Kubernetes JSONSchema validation and Monaco Diff Editor for comparing local manifests against live server-admitted resources.
- **Metrics & Visualization:** Apache ECharts rendering responsive CPU/Memory gauges, node pressure meters, and Prometheus historical charts.
- **Interactive Terminal:** `xterm.js` with WebGL acceleration for interactive container `exec` sessions and high-frequency live log streaming.
- **State Management:** Zustand for client state (active context, tabs, layout) and TanStack Query for server cache invalidation and queries.

---

## 4. Visual Design System & Design Tokens

KubeView features a developer-centric, dark-first design system with high-contrast accessibility and crisp Geist typography.

### Design Tokens
- **Background:** `#17191D` (Main application canvas, tab bar background)
- **Surface:** `#22252B` (Cards, drawers, modal sheets, table rows)
- **Surface Hover:** `#2C3038` (Interactive hover states)
- **Border / Divider:** `#323741` (Subtle dividers, table borders)
- **Accent / Brand:** `#F08A42` (Primary actions, selection indicators)
- **Status Healthy:** `#38B879` (Running pods, ready nodes, active services)
- **Status Warning:** `#F5A623` (Pending workloads, restarting containers)
- **Status Critical:** `#E05252` (CrashLoopBackOff, OOMKilled, failed probes)
- **Status Muted:** `#8A919E` (Completed jobs, suspended cronjobs)

### Design Guidelines
1. **Compact Density:** Optimized row heights (32px) and clean typography for scanning large resource counts.
2. **Subtle Borders over Glass Effects:** Avoid blurry backdrop filters that compromise contrast and degrade rendering during heavy log output.
3. **Restrained Animation:** Motion is used strictly for slide-overs, dialogs, and tab switches; disabled for frequently updating dashboard metrics to eliminate CPU waste.

---

## 5. Security & Safety Model

1. **Host-Enforced Plugin Permissions:** Plugins run in isolated Web Workers and cannot directly invoke Tauri commands, access the local filesystem, or read Kubernetes credentials.
2. **Zero Plaintext Secrets:** Sensitive values in Secrets and environment variables are masked by default (`********`), unmaskable only upon explicit user click with RBAC verification.
3. **Server-Side Dry-Run & Git Diff:** All resource mutations (`apply`, `patch`, `delete`) execute a server-side dry run (`dryRun=All`), computing a side-by-side visual diff before committing to the cluster.
4. **RBAC Pre-Flight Verification:** Action buttons are dynamically enabled or disabled based on `SelfSubjectAccessReview` results against the live cluster.

---

## 6. Project Directory Layout

```
KubeView/
├── .github/workflows/        # CI/CD pipelines (GitHub Actions)
├── docs/                     # Specifications & architectural documentation
│   ├── ARCHITECTURE.md       # This document
│   ├── TECH_STACK.md         # Production-ready tech stack reference
│   ├── EXECUTION_PLAN.md     # Implementation plan and task breakdown
│   ├── ROADMAP.md            # 16-phase roadmap and checklists
│   └── phases/               # Phase-by-phase specifications (Phases 1-6)
├── engine/                   # Kubernetes Engine (Go 1.23+ / client-go)
│   ├── cmd/engine/           # Sidecar binary entrypoint
│   │   └── main.go           # JSON-RPC listener & dispatcher
│   ├── pkg/
│   │   ├── k8s/              # client-go clientsets, dynamic client & informers
│   │   ├── config/           # clientcmd kubeconfig parser & file watcher
│   │   ├── stream/           # Log streamer & PTY exec multiplexer
│   │   ├── ops/              # Dry-run apply, diff & rollout operations
│   │   ├── metrics/          # Metrics API & Prometheus client
│   │   └── rpc/              # Versioned JSON-RPC protocol schemas & handlers
│   ├── go.mod                # Go module dependencies
│   └── go.sum
├── src-tauri/                # Desktop Host (Tauri 2 / Rust)
│   ├── src/
│   │   ├── main.rs           # Tauri entrypoint & window configuration
│   │   ├── sidecar.rs        # Go engine process supervisor
│   │   ├── ipc.rs            # IPC bridge & JSON-RPC proxy
│   │   └── security.rs       # Host permission validator
│   ├── Cargo.toml            # Rust dependencies (tauri, tokio, etc.)
│   └── tauri.conf.json       # Tauri window, sidecar & permission config
├── src/                      # Frontend Application (Next.js Static Export)
│   ├── app/                  # Next.js App Router (exported statically)
│   │   ├── layout.tsx        # Root layout (next-themes, Geist font, Sonner)
│   │   ├── page.tsx          # Main IDE shell
│   │   └── globals.css       # Tailwind CSS 4 theme tokens
│   ├── components/           # shadcn/ui & custom KubeView design system
│   │   ├── ui/               # Base shadcn/ui primitives
│   │   ├── layout/           # AppHeader, Sidebar, TabBar, StatusBar
│   │   ├── grid/             # TanStack Table virtualized resource tables
│   │   ├── editor/           # Monaco Editor & Monaco Diff Editor
│   │   ├── charts/           # Apache ECharts metric widgets
│   │   ├── terminal/         # xterm.js terminal & log streaming viewport
│   │   └── triage/           # One-click troubleshooting workbench
│   ├── stores/               # Zustand state stores (context, tabs, layout)
│   ├── hooks/                # Custom hooks (useK8sQuery, useLogs, useExec)
│   ├── lib/                  # JSON-RPC client, formatters, utilities
│   └── types/                # TypeScript interfaces (K8s API & RPC contracts)
├── package.json              # Frontend dependencies (pnpm)
├── pnpm-lock.yaml            # Pinned dependency lockfile
├── tailwind.config.ts        # Tailwind CSS 4 configuration
├── tsconfig.json             # TypeScript strict configuration
└── next.config.ts            # Next.js configuration (output: 'export')
```
