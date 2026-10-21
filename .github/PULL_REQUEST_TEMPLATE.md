## 📝 Description

<!-- Briefly describe what this PR does, why it is needed, and link any related issues. -->

Fixes / Closes #(issue)

---

## 🔍 Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to change)
- [ ] ⚡ Performance improvement
- [ ] 🎨 UI / Style polish (design systems, animations, layout)
- [ ] ♿ Accessibility (a11y) improvement
- [ ] 🔒 Security fix or hardening
- [ ] 📖 Documentation update
- [ ] 🏗️ Architecture / Refactoring

---

## 🛡️ Security & Architecture Checklist

- [ ] **Credential Isolation:** No credentials, tokens, or private keys are exposed to the React UI or logged.
- [ ] **Process Boundaries:** Any new Kubernetes operations are typed in `packages/contracts` and executed in the Go engine.
- [ ] **IPC Security:** New IPC handlers validate all parameters and enforce capability checks.
- [ ] **No Arbitrary Shell:** External tools use direct binary execution (`exec.Command`) without invoking shell interpreters.

---

## 🧪 Testing & Verification

<!-- Describe how you verified your changes. Include details of your testing environment (e.g. KinD, EKS, Minikube). -->

- [ ] Unit tests pass: `go -C engine test ./...`
- [ ] Type checks pass: `pnpm build:contracts && pnpm lint`
- [ ] Verified locally in development: `./dev.sh`
- [ ] Verified in native desktop shell (if applicable): `./dev.sh --tauri`

### Screenshots / Recordings (if UI change)

<!-- Attach before / after screenshots or short screen captures if applicable -->

---

## 📋 Contributor Checklist

- [ ] My code adheres to the project's [Coding Standards](CONTRIBUTING.md).
- [ ] I have read and agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
- [ ] I have added documentation in `docs/` or updated `README.md` if necessary.
- [ ] My commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
