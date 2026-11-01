# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- In-app updates: KubeView checks a signed update manifest on launch and every six hours, alerts from a global banner, and installs and restarts with one click from the banner or Settings → About & Updates.
- An automatic-update toggle and manual “Check now” action in Settings.
- Release pipeline support for signed Tauri updater bundles and a `latest.json` manifest published to GitHub Releases and the landing site.

### Security

- Update downloads are signature-verified with a pinned Tauri public key.

## [0.3.2] - 2026-11-01

### Added

- Create flows for Pods, ReplicaSets, StatefulSets, DaemonSets, ConfigMaps, Secrets, PVCs, HPAs, VPAs, PDBs, quotas, limit ranges, priority/runtime classes, leases, webhooks, admission policies, RBAC resources, Gateway API resources, and custom resource instances.
- Edit, guarded delete, and typed-name namespace deletion for every mutable simple-resource kind.
- Bulk delete on simple-resource pages and on services, endpoints, ingresses, network policies, configmaps, secrets, persistent volumes, storage classes, and service accounts.
- Helm lifecycle: install from chart repositories, upgrade with values, rollback to a revision, and uninstall with confirmation.
- Node operations: cordon, uncordon, drain with eviction options, taint editing, and label editing.
- Deployment rollout history, rollback, pause, and resume.
- StatefulSet update partitioning, Job retry/clone, and PVC expansion.
- New engine RPCs: `nodes.*`, `deployments.rolloutHistory|rollback|pause|resume`, `statefulsets.partition`, `jobs.retry|clone`, `persistentvolumeclaims.expand`, and `helm.install|upgrade|rollback|uninstall|history|values`.

### Fixed

- Node, Helm, and workload-operation RPCs now preserve Kubernetes error kinds, so RBAC denials, conflicts, and invalid requests surface with the correct codes and permission guidance.
- Draining a node now waits for evicted pods to terminate and reports pods that time out, instead of returning as soon as eviction requests are accepted.
- Bulk delete runs with bounded concurrency and reports per-item failures instead of silently counting them.

### Changed

- Critical deletes (PVCs, webhook configs, admission policies, namespaces) require typing the resource name, and critical kinds are excluded from bulk delete.
- Switching from Advanced YAML back to Form now asks before discarding YAML-only edits.
- Helm remembers the chart repository for each release, installs into the selected namespace from Charts, verifies chart digests when the index provides one, and uses Helm 3.22.1 to avoid vulnerable containerd/ORAS dependencies.
- Custom resource instances can now be edited and deleted from a CRD's instance tab.
- Every create dialog now offers a guided **Form** tab and an **Advanced YAML** tab. Form changes generate the manifest live, so users can start with fields and switch to YAML for anything not surfaced.
- Namespace creation gained the same Form / Advanced YAML tabs.
- Job and CronJob creation keep their dedicated form with an Advanced YAML tab.
- Helm SDK (`helm.sh/helm/v3` v3.22.1) now backs release lifecycle operations in the Go engine.
- Resource starter manifests now cover every creatable kind.

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
