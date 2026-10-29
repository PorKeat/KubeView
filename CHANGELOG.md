# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [0.2.1] - 2026-10-30

### Changed

- Release KubeView 0.2.1.

### Changed

- Relicensed KubeView from BSL 1.1 to Apache-2.0. Copyright 2026 Seng Porkeat.

## [0.2.0] - 2026-10-29

### Added

- Far-left cluster rail with live health, pinned contexts, and catalog mode.
- Cluster catalog with search, filters, pins, environment tags, bulk actions, and detail drawer.
- Kubeconfigs and Web Links catalog pages.
- RC1–RC5 resource coverage: namespaces, events, replication controllers, endpoint slices, ingress classes, PVCs, HPAs, PDBs, quotas, limits, scheduling classes, leases, admission resources, and Helm.
- Helm release inventory and read-only chart repository browser.
- Settings V2: startup, safety guardrails, appearance density/accent/accessibility, polling, notifications, terminal/log defaults, integrations, and settings portability.
- YAML copy and guarded safe deletes for simple resources.

### Changed

- Removed the duplicate Settings control from the cluster rail.
- Resource coverage now tracks all 36 reference resource entries.

### Added

- Enterprise GitHub community health and governance documentation (`SECURITY.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`).
- Structured GitHub pull request and issue templates.
- Unified local development runner (`scripts/dev.sh` and `./dev.sh`).

---

## [0.1.0] - 2026-10-20

### Added

- **Core 3-Tier Architecture:** Next.js 15 App Router static export UI + Tauri 2 native desktop host + Go 1.23+ `client-go` backend sidecar.
- **Cluster Overview Matrix:** Bento-style live HUD telemetry featuring CPU/Memory allocation vs. capacity, active node condition beacons, and workload health breakdowns.
- **Real-Time Watch Streaming:** Integrated Go Informer and Watch API streams over JSON-RPC 2.0 with delta debouncing.
- **Deep Resource Inspector Drawer:** Comprehensive inspection drawer for Nodes and Pods with container state chips, environment variable viewer, historical events, and syntax-highlighted live YAML.
- **Multi-Source Kubeconfig Hub:** Automatic discovery from `~/.kube/config`, custom path drag & drop, raw YAML import, and 4-stage automated connection diagnostics (Network, Auth, TLS, RBAC).
- **Troubleshooting Workbench:** Interactive container terminal (`xterm.js`) supporting SPDY/WebSocket PTY exec and high-throughput streaming container logs.
- **Dynamic Scoping:** Instant namespace-filtered overview calculations and one-click node-to-workload routing.
- **Dark-First Design System:** Curated `#17191D` palette with WCAG AA compliance, custom typography, and reduced-motion accessibility.

### Security

- Complete agentless, local-first operational model — zero telemetry, zero in-cluster agents, zero external cloud dependencies.
- Strict process boundary isolation: credentials remain encapsulated in Go engine memory and are never exposed to the React frontend.
- Non-root sidecar supervision via private OS stdio pipes with zero open network ports on the host.
