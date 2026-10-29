# Release Automation

The desktop release is one orchestrated GitHub Actions workflow: `.github/workflows/release.yml`.

## Pipeline

1. **Verify** — frozen install, contracts, desktop typecheck, Go tests, and tag/version match.
2. **Build** — macOS universal DMG, Windows x64 NSIS, Linux x64 AppImage and Debian package.
3. **Publish** — downloads all artifacts, generates `SHA256SUMS.txt`, and creates or updates the GitHub release.
4. **Distribute** — updates the landing site downloads and version, Homebrew cask, Scoop manifest, and the winget package.

## Trigger

- Push a version tag such as `v0.2.0`.
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
