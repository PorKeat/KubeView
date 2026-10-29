# GitOps Drift

KubeView's GitOps integration starts with a deliberately narrow, local-first drift workflow.

## Current Status

Implemented:

- Local repository or manifest-directory scanning.
- Recursive `.yaml` and `.yml` discovery.
- Multi-document manifest parsing.
- Live resource lookup through the Kubernetes dynamic client.
- Desired-versus-live classification: in sync, changed, missing, and error.
- Desired/live YAML inspection with the shared diff renderer.
- RBAC-aware apply of a reviewed desired manifest, with server-side dry-run before mutation.
- Cluster-scoped and namespaced resource handling.
- A GitOps Drift page, command palette entry, tab, and live-page audit.
- Native folder picker and drag-and-drop support in the desktop app.
- Recent source history and automatic scan after selecting a source.
- A browser-preview manual path fallback.

Not implemented yet:

- Remote Git clone and pull.
- Private repository credentials.
- Kustomize and Helm rendering.
- Argo CD and Flux status or sync actions.
- Multi-cluster control-plane and target-cluster mapping.
- GitHub Actions or GitLab CI visibility.
- Extra-resource detection for live resources not present in the repository.

The current source is a local directory. This is intentional: it avoids storing Git credentials in the desktop webview while the drift and apply path is validated.

## Usage

1. Open **GitOps Drift** in the sidebar.
2. Choose a repository folder, drop one onto the source panel, or pick a recent source.
3. KubeView scans automatically after a folder is selected.
4. Review the summary and select a changed or missing resource.
5. Inspect the desired/live diff.
6. Use **Apply desired** after reviewing the confirmation.

In the browser preview, use **Enter path manually** because browsers do not expose an absolute local folder path.

The page does not commit, push, or modify the source directory. Applying changes only affects the selected Kubernetes context.

## Drift Semantics

The backend treats the desired manifest as a subset of the live resource.

- `status`, `metadata.managedFields`, and runtime metadata are ignored.
- Server-added defaults do not produce drift.
- Desired maps must match the corresponding live values.
- Desired lists are compared element by element.
- Missing live resources are classified as `missing`.
- Resolution or API failures are classified as `error` for that manifest.
- Duplicate manifests are de-duplicated by API version, kind, namespace, and name.
- Secret manifests are excluded from this phase and reported as `error` until value redaction is implemented.

Kustomize and Helm repositories should export rendered manifests before scanning. A rendered-manifest source will be added in a later phase.

## RPC

`gitops.scan` accepts:

```json
{
  "contextName": "my-context",
  "path": "/path/to/manifests"
}
```

It returns a `GitOpsDriftReport`:

```json
{
  "contextName": "my-context",
  "path": "/path/to/manifests",
  "scannedAt": "2026-10-28T08:00:00Z",
  "total": 3,
  "clean": 1,
  "changed": 1,
  "missing": 1,
  "errors": 0,
  "resources": []
}
```

Each resource entry includes its identity, source file, status, desired YAML, and optional live YAML.

## Safety and Security

- The source directory is read locally by the Go sidecar.
- Manifest contents are not uploaded to a remote service.
- Apply uses the existing resource service and is still authorized by the Kubernetes API server.
- A dry-run is performed before the actual apply.
- The existing resource editor and diff guardrails remain separate; GitOps apply is an explicit reviewed action.
- Credentials for remote Git and CI providers are not part of this phase and must not be stored in the frontend.

## Architecture

The implementation follows the existing Ports and Adapters structure:

```text
domain/gitops
  types and desired-subset comparison

application/gitops
  scan orchestration, validation, de-duplication, summary

adapters/outbound/filesystem
  local manifest discovery and YAML parsing

adapters/outbound/kubernetes
  live resource reading and scope resolution

adapters/inbound/rpc/gitops
  gitops.scan JSON-RPC handler

bootstrap
  composition root
```

The frontend uses `GitOpsView`, `useGitOps`, and the shared `ResourceDiffView`. The page is intentionally separate from the safe YAML editor so a future controller integration can reuse the same drift and diff surface.

## Next Phases

### Remote Git and rendered sources

Add a source adapter for remote repositories, branch and revision pinning, and a secure credential provider. Add Kustomize and Helm rendering so manifests can be compared before they are applied.

### Argo CD and Flux

Read controller CRDs and show source revision, sync status, health, and last applied revision. For Argo CD, model the control-plane context separately from target workload contexts. If a target context is not connected, show controller status but mark live drift and apply as unavailable.

### Controlled sync

Request an Argo CD sync or Flux reconciliation after explicit user confirmation. The controller remains the reconciler; KubeView does not become an always-on deployment engine.

### CI visibility

Add GitHub Actions and GitLab CI status, jobs, logs, and optional workflow triggers. Store provider tokens in an OS keychain, never in the Tauri store or local storage.

## Non-Goals

KubeView does not replace a GitOps controller or a CI system. It does not build images, run test suites, store Git credentials in the webview, or reconcile continuously while the desktop app is closed.
