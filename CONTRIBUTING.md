# Contributing to KubeView

First off, thank you for your interest in contributing to KubeView! As a local-first Kubernetes desktop IDE, we welcome contributions, bug fixes, and improvements from cloud-native practitioners and engineers under our [License Agreement](LICENSE).

This document outlines the engineering standards, architecture guardrails, and pull request workflow for the project.

---

## 📜 Code of Conduct

All contributors and maintainers are expected to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to `conduct@kubeview.dev`.

---

## 🏗️ Architecture & Boundaries

Before writing code, please review the [Production Architecture Blueprint](docs/ARCHITECTURE.md) and [Security Architecture](docs/SECURITY_ARCHITECTURE.md).

KubeView enforces a strict 3-tier boundary:

| Layer                  | Technologies                                  | Responsibilities                                             | Security Rules                                                           |
| :--------------------- | :-------------------------------------------- | :----------------------------------------------------------- | :----------------------------------------------------------------------- |
| **1. UI Presentation** | Next.js 15, React 19, Tailwind CSS 4, Zustand | Rendering, table grids, view state, user interactions.       | **Zero credentials.** Never store tokens or private keys in React state. |
| **2. Native Host**     | Tauri 2, Rust, tokio                          | Process supervisor, capability enforcement, window controls. | Supervise Go engine via private stdio pipes. No open host TCP ports.     |
| **3. Engine Sidecar**  | Go 1.23+, client-go, informers                | Kubernetes API calls, watches, metrics, credential plugins.  | Direct mutual TLS to Kubernetes API. Sensitive data redacting on stderr. |

> **Rule:** Features requiring Kubernetes operations must be defined as typed JSON-RPC methods in `packages/contracts`, implemented in Go (`engine/`), and invoked from the UI via typed IPC callers.

---

## 🛠️ Local Development Setup

### Prerequisites

- **Node.js** >= 20.x
- **pnpm** >= 9.x
- **Go** >= 1.23+
- **Rust & Cargo** (latest stable, for native Tauri builds)
- A local Kubernetes cluster (e.g., KinD, Minikube, or k3s) and a valid `~/.kube/config`.

### Getting Started

```bash
# 1. Clone repository
git clone https://github.com/PorKeat/KubeView.git
cd KubeView

# 2. Install workspace dependencies
pnpm install

# 3. Start unified dev runner (Go Engine + Next.js App)
./dev.sh
# or: pnpm dev

# 4. (Optional) Run native Tauri desktop window
./dev.sh --tauri
```

The Next.js application will be available at `http://localhost:3005` with full Go sidecar connectivity.

---

## 🌿 Git & Commit Standards

We strictly follow **[Conventional Commits v1.0.0](https://www.conventionalcommits.org/)**:

```
<type>(<scope>): <short description in present tense>

[optional body explaining motivation and architectural tradeoffs]

[optional footer: Closes #123]
```

### Allowed Types

- `feat`: A new user-facing feature or capability.
- `fix`: A bug fix or runtime patch.
- `perf`: Code change that improves performance, memory footprint, or bundle size.
- `refactor`: Code change that neither fixes a bug nor adds a feature.
- `style`: Changes to formatting, white-space, or design polish.
- `test`: Adding missing tests or correcting existing tests.
- `docs`: Documentation updates or architecture diagrams.
- `chore`: Build scripts, CI workflow, or dependency updates.

### Common Scopes

`overview`, `pods`, `nodes`, `inspector`, `terminal`, `logs`, `engine`, `ipc`, `contracts`, `security`, `a11y`

### Example

```bash
git commit -m "feat(telemetry): add live pod memory usage gauge to node inspector"
```

---

## 🧪 Quality Gates & Verification

Before submitting a Pull Request, verify that all quality checks pass locally:

```bash
# 1. TypeScript contracts & workspace type check
pnpm build:contracts
pnpm lint

# 2. Build Go engine sidecar
go -C engine build ./...
go -C engine test -v ./...

# 3. Tauri host verification (if modifying src-tauri)
cargo check --manifest-path src-tauri/Cargo.toml

# 4. Formatting check
pnpm format
```

---

## 📬 Pull Request Process

1. **Fork the repo** and create your branch from `main`:
   ```bash
   git checkout -b feat/node-filter-improvements
   ```
2. **Implement your changes** adhering to our UI design guidelines and backend contracts.
3. **Write tests** for any new IPC commands or cluster queries.
4. **Update documentation** in `docs/` or `README.md` if user-facing behavior changes.
5. **Push to your fork** and submit a Pull Request targeting `main`.
6. Use the provided [PR Template](.github/pull_request_template.md) to explain:
   - What problem this solves.
   - Any architectural tradeoffs or performance impacts.
   - Manual testing steps or screenshots/GIFs for UI changes.

### PR Review SLA

Maintainers review new PRs within **48–72 hours**. Once approved by at least one core maintainer and all CI checks pass, your PR will be squash-merged into `main`.

---

## 💬 Community & Questions

- **GitHub Discussions:** General questions, ideas, and architecture proposals.
- **GitHub Issues:** Bug reports and accepted feature roadmaps.
- **Security Disclosures:** Please review [SECURITY.md](SECURITY.md) for private reporting.

Thank you for building the future of Kubernetes developer tooling with us! ☸
