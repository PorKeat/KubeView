# Security Policy

The KubeView project takes the security of our Kubernetes desktop IDE and the clusters it manages extremely seriously. We adhere to **Coordinated Vulnerability Disclosure (CVD)** principles and prioritize rapid, responsible resolution of security issues.

---

## 🛡️ Core Security Architecture & Guarantees

KubeView is engineered with strict process isolation and zero-trust boundaries:

1. **100% Local-First & Zero Telemetry:**
   - KubeView never transmits kubeconfigs, cluster certificates, tokens, or resource metadata to any remote backend, cloud server, or analytics collector.
   - All network connections originate locally on your workstation directly to the target Kubernetes API server via mutual TLS.

2. **Process Boundary Isolation:**
   - **Frontend (Next.js/React):** Untrusted presentation layer. Zero access to cluster credentials, filesystem tokens, or private keys.
   - **Host (Tauri 2 / Rust):** Validates all IPC requests, enforces capabilities, and supervises the Go sidecar via private OS stdio pipes (`stdin`/`stdout`). No external network ports are opened on the host.
   - **Backend Engine (Go / client-go):** Executes Kubernetes operations in isolated OS memory. Resolves auth plugins (`aws eks`, `gke-gcloud-auth-plugin`, `kubelogin`) without invoking arbitrary shell interpreters.

3. **Strict TLS Enforcement:**
   - Insecure TLS certificate verification (`insecure-skip-tls-verify`) is rejected by default and requires explicit, audible user override confirmation.

For full architectural specifications, see [docs/SECURITY_ARCHITECTURE.md](docs/SECURITY_ARCHITECTURE.md).

---

## 📋 Supported Versions

Security patches and vulnerability updates are actively maintained for the following release branches:

| Version |     Supported      | Security Maintenance Tier            |
| :------ | :----------------: | :----------------------------------- |
| `0.1.x` | :white_check_mark: | Active Development & Current Release |
| `< 0.1` |        :x:         | Deprecated / Pre-release             |

We strongly recommend always running the latest official release.

---

## 🚨 Reporting a Vulnerability

**Please do not report security vulnerabilities via public GitHub issues, discussions, or pull requests.**

If you believe you have discovered a security vulnerability in KubeView:

### Preferred Method: GitHub Private Vulnerability Reporting

1. Navigate to the repository's [Security Advisories tab](https://github.com/PorKeat/KubeView/security/advisories).
2. Click **"Report a vulnerability"** to submit a confidential report directly to the core maintainers.

### Alternative Method: Dedicated Security Contact

If GitHub Private Reporting is unavailable, email the maintainers directly:

- **Email:** `security@kubeview.dev` (or reach out directly via maintainer PGP keys)
- **Subject:** `[SECURITY] Vulnerability in KubeView <component>`

### What to Include in Your Report

To accelerate triage and remediation, please include:

- A detailed description of the vulnerability and its potential impact.
- Affected component(s): UI, Tauri Host IPC, Go Engine Sidecar, or Credential Resolver.
- Step-by-step reproduction steps or a minimal Proof of Concept (PoC).
- Your proposed remediation or mitigation (if available).
- Whether the vulnerability has been shared with any third parties.

---

## ⏱️ Response Timelines & SLA

Our maintainers commit to the following response timeline for security disclosures:

| Milestone                       | Target SLA      | Description                                                           |
| :------------------------------ | :-------------- | :-------------------------------------------------------------------- |
| **Initial Acknowledgment**      | **< 24 Hours**  | A maintainer confirms receipt of your report.                         |
| **Triage & Classification**     | **< 48 Hours**  | Assessment of CVSS v3.1 score and severity rating.                    |
| **Patch Development**           | **< 7 Days**    | Private fix branch developed and tested across KinD/EKS/GKE matrices. |
| **Security Release & Advisory** | **Coordinated** | Coordinated public advisory and binary release publication.           |

---

## 🎯 Scope & Boundaries

### In-Scope

- Kubeconfig credential leakage or unauthorized persistence.
- Arbitrary code execution (RCE) via malicious kubeconfig `exec` providers without user consent.
- Privilege escalation or boundary bypass between Next.js UI, Rust supervisor, and Go sidecar.
- Information disclosure of Kubernetes Secrets, tokens, or private keys into logs or telemetry.
- SSRF or IPC injection attacks via crafted Kubernetes resource manifests or YAML editors.

### Out-of-Scope

- Vulnerabilities requiring physical root access or full control of the host workstation.
- Attacks requiring existing cluster-level compromise where the attacker already possesses cluster-admin RBAC credentials.
- Social engineering attacks against maintainers or contributors.
- Denial of service (DoS) attacks on local machine resources resulting from user-initiated massive cluster queries.

---

## 🏆 Bug Bounty & Recognition

While KubeView is an open-source project without a formal monetary bug bounty program, we proudly credit and acknowledge researchers in:

- Our official GitHub Security Advisory release notes.
- The project `CHANGELOG.md` and release announcements.
- The KubeView Security Hall of Fame.

Thank you for helping keep KubeView and the Kubernetes community secure!
