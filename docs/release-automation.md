# Release Automation

There are two layers:

- `scripts/release.sh` — the one-shot local release driver (recommended).
- `.github/workflows/release.yml` — the GitHub Actions build and publish pipeline it triggers.

## One-shot local release

Run one command from a clean `main` branch:

```bash
./scripts/release.sh            # bump patch (0.3.0 -> 0.3.1)
./scripts/release.sh minor      # bump minor
./scripts/release.sh 1.2.3      # explicit version
./scripts/release.sh --dry-run  # validate and print the plan only
./scripts/release.sh --resume   # retry distribution for the current version
```

What it does in order:

1. **Preflight** — checks `main` matches `origin/main`, the tree is clean, the version tag is unused, `gh` is authenticated, and the distribution repos/Vercel project are reachable.
2. **Verify** — builds contracts, runs the desktop typecheck and Go tests (add `--e2e` for Playwright).
3. **Version** — updates `package.json`, `apps/desktop/package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock`.
4. **Publish** — commits `release: KubeView X.Y.Z`, tags `vX.Y.Z`, and pushes both to `origin`, which triggers `.github/workflows/release.yml`.
5. **Wait** — watches the workflow, downloads the four desktop artifacts, and verifies `SHA256SUMS.txt` (creating/uploading it if an older workflow omitted it).
6. **Distribute** — updates Homebrew (`homebrew-kubeview`), Scoop (`scoop-kubeview`), and the landing repo (`KubeView-landing`) with the new version, downloads, and checksums, then deploys the landing site to Vercel production and verifies every download URL.

Options:

| Option                  | Purpose                                                                |
| ----------------------- | ---------------------------------------------------------------------- |
| `--dry-run`             | Validates the plan without changing files, tags, releases, or deploy.  |
| `--skip-tests`          | Skips contracts/typecheck/Go tests.                                    |
| `--e2e`                 | Also runs the Playwright suite.                                        |
| `--skip-distribution`   | Stops after the GitHub release; skips Homebrew/Scoop/landing.          |
| `--skip-landing-deploy` | Updates the landing repo but skips the production deploy.              |
| `--resume`              | Re-runs distribution for the current package version (tag must exist). |
| `--yes` / `-y`          | Skips the interactive confirmation.                                    |

Prerequisites: `git`, `node`, `pnpm`, `go`, `gh` (authenticated), `jq`, `curl`, and either an authenticated `vercel` CLI or `VERCEL_DEPLOY_HOOK`. `gh auth token` is used for the cross-repo pushes; the token is never printed and all clones live in a temporary directory.

The script intentionally refuses a dirty tracked tree and any `main` that is ahead of or behind `origin/main`. Commit feature work and push it before releasing.

### Failure recovery

If the workflow fails after the tag has been pushed:

1. Fix the failure and push the fix to `main`.
2. Re-run the failed workflow from GitHub Actions (or dispatch **Release desktop builds** with the existing tag).
3. Run `./scripts/release.sh --resume` to continue checksum verification and distribution without bumping the version again.

If distribution fails after a successful release, `--resume` is also safe: it detects the existing release assets and retries Homebrew, Scoop, and the landing deploy.

## GitHub Actions pipeline

1. **Verify** — frozen install, contracts, desktop typecheck, Go tests, and tag/version match.
2. **Build** — macOS universal DMG, Windows x64 NSIS, Linux x64 AppImage and Debian package.
3. **Publish** — downloads all artifacts, generates `SHA256SUMS.txt`, and creates or updates the GitHub release.
4. **Distribute** — updates the landing site downloads and version, Homebrew cask, Scoop manifest, and the winget package.

## Trigger

- Push a version tag such as `v0.3.1` (the script does this).
- Or run **Release desktop builds** manually with the existing tag.

The app version in `package.json` must match the tag without the `v` prefix.

## Required secrets

Configure these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret               | Required                   | Purpose                                                                                                                                                      |
| -------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DISTRIBUTION_TOKEN` | Yes for cross-repo updates | Fine-grained PAT with contents write access to `KubeView-landing`, `homebrew-kubeview`, and `scoop-kubeview`; public-repo/fork access for the winget update. |
| `WINGET_TOKEN`       | Optional                   | Separate token for `wingetcreate`. Falls back to `DISTRIBUTION_TOKEN`.                                                                                       |
| `VERCEL_DEPLOY_HOOK` | Optional                   | Explicit landing deploy trigger. The landing repo push normally triggers Vercel Git deployment.                                                              |

Without `DISTRIBUTION_TOKEN`, the release still builds and publishes; the distribution job logs a warning and skips cross-repo updates.

## Asset flow

- macOS, Windows, AppImage, and Debian artifacts are built in the matrix and checksummed before publishing.
- The landing job copies all four installers into `public/downloads` and updates `SITE.version`.
- Homebrew uses the DMG SHA-256; Scoop uses the NSIS SHA-256.
- Helm/GitOps settings and other local data are not part of the release.

## Winget

The winget job installs `Microsoft.WinGet.Create` and runs:

```sh
wingetcreate update KubeView.KubeView --version "$VERSION" --urls "$EXE_URL" --submit --token "$WINGET_TOKEN"
```

A winget PR still requires upstream review and cannot be merged by this workflow.
