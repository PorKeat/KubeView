#!/usr/bin/env bash
#
# KubeView one-shot release automation.
#
# Bumps the version, runs checks, commits, tags, pushes, waits for the GitHub
# Actions desktop build, verifies the artifacts, and updates the distribution
# repos (Homebrew, Scoop, landing site) plus the production landing deploy.
#
# Usage:
#   ./scripts/release.sh                    # bump patch, e.g. 0.3.0 -> 0.3.1
#   ./scripts/release.sh minor              # bump minor
#   ./scripts/release.sh 1.2.3              # explicit version
#   ./scripts/release.sh --dry-run          # validate and print the plan only
#   ./scripts/release.sh --resume           # re-run distribution for the current version
#
# Requirements: git, node, pnpm, go, gh (authenticated), jq, curl, and vercel
# (authenticated) unless VERCEL_DEPLOY_HOOK or --skip-landing-deploy is used.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

RELEASE_REPO="${RELEASE_REPO:-PorKeat/KubeView}"
HOMEBREW_REPO="${HOMEBREW_REPO:-PorKeat/homebrew-kubeview}"
SCOOP_REPO="${SCOOP_REPO:-PorKeat/scoop-kubeview}"
LANDING_REPO="${LANDING_REPO:-PorKeat/KubeView-landing}"
LANDING_URL="${LANDING_URL:-https://kubeview.sengporkeat.com}"
VERCEL_PROJECT="${VERCEL_PROJECT:-kubeview-landing}"
VERCEL_SCOPE="${VERCEL_SCOPE:-porkeats-projects}"
VERCEL_DEPLOY_HOOK="${VERCEL_DEPLOY_HOOK:-}"

DRY_RUN=0
ASSUME_YES=0
SKIP_TESTS=0
RUN_E2E=0
RESUME=0
SKIP_DISTRIBUTION=0
SKIP_LANDING_DEPLOY=0
VERSION_ARG=""
CURRENT_VERSION=""
VERSION=""
GH_TOKEN="${GH_TOKEN:-}"
ASSET_DIR=""
DMG_SHA=""
EXE_SHA=""

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/kubeview-release.XXXXXX")"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [[ -t 1 ]]; then
  C_INFO=$'\033[36m'
  C_OK=$'\033[32m'
  C_WARN=$'\033[33m'
  C_ERR=$'\033[31m'
  C_RESET=$'\033[0m'
else
  C_INFO=""
  C_OK=""
  C_WARN=""
  C_ERR=""
  C_RESET=""
fi

info() { printf '%s›%s %s\n' "$C_INFO" "$C_RESET" "$*"; }
ok() { printf '%s✔%s %s\n' "$C_OK" "$C_RESET" "$*"; }
warn() { printf '%s!%s %s\n' "$C_WARN" "$C_RESET" "$*" >&2; }
die() {
  printf '%s✖%s %s\n' "$C_ERR" "$C_RESET" "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
KubeView one-shot release

Usage:
  scripts/release.sh [version|patch|minor|major] [options]

Options:
  --dry-run               Validate and print the plan without changing anything
  --skip-tests            Skip local contracts build, typecheck, and Go tests
  --e2e                   Also run the Playwright suite before releasing
  --resume                Continue distribution for the current package version
  --skip-distribution     Do not update Homebrew, Scoop, or the landing repo
  --skip-landing-deploy   Update the landing repo but do not deploy it
  --yes, -y               Do not ask for confirmation
  -h, --help              Show this help

Environment overrides:
  RELEASE_REPO            Default: PorKeat/KubeView
  HOMEBREW_REPO           Default: PorKeat/homebrew-kubeview
  SCOOP_REPO              Default: PorKeat/scoop-kubeview
  LANDING_REPO            Default: PorKeat/KubeView-landing
  LANDING_URL             Default: https://kubeview.sengporkeat.com
  VERCEL_PROJECT          Default: kubeview-landing
  VERCEL_SCOPE            Default: porkeats-projects
  VERCEL_DEPLOY_HOOK      Optional deploy hook; used instead of the Vercel CLI
EOF
}

need() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run) DRY_RUN=1 ;;
      --skip-tests) SKIP_TESTS=1 ;;
      --e2e) RUN_E2E=1 ;;
      --resume) RESUME=1 ;;
      --skip-distribution) SKIP_DISTRIBUTION=1 ;;
      --skip-landing-deploy) SKIP_LANDING_DEPLOY=1 ;;
      --yes | -y) ASSUME_YES=1 ;;
      -h | --help)
        usage
        exit 0
        ;;
      -*)
        die "Unknown option: $1 (use --help)"
        ;;
      *)
        [[ -z "$VERSION_ARG" ]] || die "Multiple version arguments supplied."
        VERSION_ARG="$1"
        ;;
    esac
    shift
  done
}

bump_version_string() {
  node -e '
    const [major, minor, patch] = process.argv[1].split(".").map(Number);
    const kind = process.argv[2];
    if (kind === "major") console.log(`${major + 1}.0.0`);
    else if (kind === "minor") console.log(`${major}.${minor + 1}.0`);
    else console.log(`${major}.${minor}.${patch + 1}`);
  ' "$CURRENT_VERSION" "$1"
}

version_is_greater() {
  node -e '
    const current = process.argv[1].split(".").map(Number);
    const next = process.argv[2].split(".").map(Number);
    for (let i = 0; i < 3; i += 1) {
      if (next[i] > current[i]) process.exit(0);
      if (next[i] < current[i]) process.exit(1);
    }
    process.exit(1);
  ' "$CURRENT_VERSION" "$1"
}

preflight() {
  need git
  need node
  need pnpm
  need go
  need gh
  need jq
  need curl

  gh auth status >/dev/null 2>&1 ||
    die "GitHub CLI is not authenticated. Run: gh auth login"
  if [[ -z "$GH_TOKEN" ]]; then
    GH_TOKEN="$(gh auth token)"
  fi

  if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    git status --short --untracked-files=no >&2
    die "Commit or stash tracked changes before releasing."
  fi

  [[ "$(git branch --show-current)" == "main" ]] ||
    die "Releases must run from main."

  git fetch origin main --tags >/dev/null 2>&1 ||
    die "Could not fetch origin."

  [[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]] ||
    die "Local main must match origin/main. Pull or push first."

  gh repo view "$RELEASE_REPO" >/dev/null 2>&1 ||
    die "Cannot access release repo: $RELEASE_REPO"

  if (( ! SKIP_DISTRIBUTION )); then
    gh repo view "$HOMEBREW_REPO" >/dev/null 2>&1 ||
      die "Cannot access Homebrew repo: $HOMEBREW_REPO"
    gh repo view "$SCOOP_REPO" >/dev/null 2>&1 ||
      die "Cannot access Scoop repo: $SCOOP_REPO"
    gh repo view "$LANDING_REPO" >/dev/null 2>&1 ||
      die "Cannot access landing repo: $LANDING_REPO"
  fi

  if (( ! SKIP_DISTRIBUTION && ! SKIP_LANDING_DEPLOY )) && [[ -z "$VERCEL_DEPLOY_HOOK" ]]; then
    need vercel
    vercel whoami >/dev/null 2>&1 ||
      die "Vercel CLI is not authenticated. Run: vercel login"
  fi
}

resolve_version() {
  CURRENT_VERSION="$(node -p "require('./package.json').version")"

  if (( RESUME )); then
    VERSION="$CURRENT_VERSION"
    if ! git rev-parse -q --verify "refs/tags/v$VERSION" >/dev/null; then
      die "--resume needs the current version tag v$VERSION to exist."
    fi
    return
  fi

  if [[ -z "$VERSION_ARG" ]]; then
    VERSION="$(bump_version_string patch)"
  elif [[ "$VERSION_ARG" == "patch" || "$VERSION_ARG" == "minor" || "$VERSION_ARG" == "major" ]]; then
    VERSION="$(bump_version_string "$VERSION_ARG")"
  else
    VERSION="${VERSION_ARG#v}"
  fi

  [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
    die "Invalid version '$VERSION' (expected X.Y.Z)."

  version_is_greater "$VERSION" ||
    die "New version v$VERSION must be greater than v$CURRENT_VERSION."

  if git rev-parse -q --verify "refs/tags/v$VERSION" >/dev/null; then
    die "Tag v$VERSION already exists locally."
  fi
  if git ls-remote --exit-code --tags origin "refs/tags/v$VERSION" >/dev/null 2>&1; then
    die "Tag v$VERSION already exists on origin."
  fi
}

confirm_plan() {
  if (( DRY_RUN || ASSUME_YES )); then
    return
  fi
  if [[ ! -t 0 ]]; then
    die "Non-interactive shell: pass --yes to release without confirmation."
  fi

  cat <<EOF

Release plan
  version    v$VERSION (current v$CURRENT_VERSION)
  release    $RELEASE_REPO
  installers $HOMEBREW_REPO
             $SCOOP_REPO
  landing    $LANDING_REPO
             ${LANDING_URL}

This will commit, tag, push, build via GitHub Actions, publish a release, and
update the distribution repositories. Continue? [y/N]
EOF
  printf 'Proceed? [y/N] '
  local reply
  read -r reply
  if [[ "$reply" != "y" && "$reply" != "Y" ]]; then
    info "Aborted."
    exit 0
  fi
}

run_checks() {
  if (( SKIP_TESTS )); then
    warn "Skipping local tests (--skip-tests)."
    return
  fi
  info "Building contracts"
  pnpm build:contracts
  info "Typechecking desktop"
  pnpm --filter @kubeview/desktop typecheck
  info "Running engine tests"
  go -C engine test ./...
  if (( RUN_E2E )); then
    info "Running Playwright suite"
    pnpm --filter @kubeview/desktop exec playwright test
  fi
}

write_versions() {
  VERSION="$VERSION" node <<'NODE'
const fs = require("fs");
const version = process.env.VERSION;

for (const file of ["package.json", "apps/desktop/package.json"]) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  json.version = version;
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}

const tauriFile = "src-tauri/tauri.conf.json";
const tauri = JSON.parse(fs.readFileSync(tauriFile, "utf8"));
tauri.version = version;
fs.writeFileSync(tauriFile, `${JSON.stringify(tauri, null, 2)}\n`);

const cargoFile = "src-tauri/Cargo.toml";
const cargo = fs.readFileSync(cargoFile, "utf8").split("\n");
let inPackage = false;
let bumpedCargo = false;
for (let i = 0; i < cargo.length; i += 1) {
  const line = cargo[i];
  if (line.trim() === "[package]") inPackage = true;
  else if (line.startsWith("[")) inPackage = false;
  if (inPackage && !bumpedCargo && /^version = "/.test(line)) {
    cargo[i] = `version = "${version}"`;
    bumpedCargo = true;
  }
}
if (!bumpedCargo) throw new Error(`Could not update version in ${cargoFile}`);
fs.writeFileSync(cargoFile, cargo.join("\n"));

const lockFile = "src-tauri/Cargo.lock";
const lock = fs.readFileSync(lockFile, "utf8").split("\n");
let inKubeview = false;
let bumpedLock = false;
for (let i = 0; i < lock.length; i += 1) {
  const line = lock[i];
  if (line === "[[package]]") inKubeview = false;
  if (line === 'name = "kubeview"') inKubeview = true;
  if (inKubeview && !bumpedLock && /^version = "/.test(line)) {
    lock[i] = `version = "${version}"`;
    bumpedLock = true;
    inKubeview = false;
  }
}
if (!bumpedLock) throw new Error(`Could not update version in ${lockFile}`);
fs.writeFileSync(lockFile, lock.join("\n"));
NODE
}

commit_and_tag() {
  info "Writing v$VERSION to package metadata"
  write_versions

  info "Formatting version metadata"
  pnpm exec prettier --write \
    package.json \
    apps/desktop/package.json \
    src-tauri/tauri.conf.json >/dev/null

  git add package.json apps/desktop/package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
  git commit -m "release: KubeView $VERSION" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
  git tag -a "v$VERSION" -m "KubeView $VERSION"

  info "Pushing main and v$VERSION"
  git push origin main
  git push origin "v$VERSION"
}

release_is_complete() {
  gh release view "v$VERSION" --repo "$RELEASE_REPO" --json assets \
    --jq '.assets[].name' 2>/dev/null |
    grep -q "KubeView_${VERSION}_universal.dmg"
}

wait_for_release() {
  if (( RESUME )) && release_is_complete; then
    ok "Release v$VERSION already has assets; continuing."
    return
  fi

  info "Waiting for the release workflow to start"
  local run_id=""
  local attempt=0
  while [[ -z "$run_id" && "$attempt" -lt 60 ]]; do
    run_id="$(
      gh run list --workflow=release.yml --limit 30 \
        --json databaseId,headBranch,event,displayTitle \
        --jq ".[] | select(.event == \"push\" and (.headBranch == \"v$VERSION\" or .displayTitle == \"release: KubeView $VERSION\")) | .databaseId" \
        2>/dev/null | head -n 1 || true
    )"
    if [[ -n "$run_id" ]]; then
      break
    fi
    attempt=$((attempt + 1))
    sleep 10
  done

  [[ -n "$run_id" ]] || die "Release workflow did not start for v$VERSION."
  info "Watching workflow run $run_id"
  gh run watch "$run_id" --exit-status --interval 30

  release_is_complete ||
    die "Release v$VERSION is missing the expected desktop assets."
}

download_assets() {
  ASSET_DIR="$REPO_ROOT/.artifacts/releases/v$VERSION"
  mkdir -p "$ASSET_DIR"

  info "Downloading release assets"
  gh release download "v$VERSION" --repo "$RELEASE_REPO" \
    --dir "$ASSET_DIR" --clobber

  local expected
  for expected in \
    "KubeView_${VERSION}_universal.dmg" \
    "KubeView_${VERSION}_x64-setup.exe" \
    "KubeView_${VERSION}_amd64.AppImage" \
    "KubeView_${VERSION}_amd64.deb"; do
    [[ -f "$ASSET_DIR/$expected" ]] ||
      die "Release is missing asset: $expected"
  done

  if [[ ! -f "$ASSET_DIR/SHA256SUMS.txt" ]]; then
    warn "Release has no SHA256SUMS.txt; generating and uploading it."
    (
      cd "$ASSET_DIR"
      for expected in KubeView_${VERSION}_*; do
        printf '%s  %s\n' "$(sha256_file "$expected")" "$(basename "$expected")"
      done > SHA256SUMS.txt
    )
    gh release upload "v$VERSION" "$ASSET_DIR/SHA256SUMS.txt" \
      --repo "$RELEASE_REPO" --clobber
  fi

  info "Verifying SHA256 checksums"
  tr -d '\r' < "$ASSET_DIR/SHA256SUMS.txt" > "$ASSET_DIR/SHA256SUMS.check"
  while read -r hash filename; do
    if [[ -z "$hash" || "$hash" == \#* ]]; then
      continue
    fi
    filename="$(basename "$filename")"
    [[ -f "$ASSET_DIR/$filename" ]] ||
      die "Checksum file references missing asset: $filename"
    local actual
    actual="$(sha256_file "$ASSET_DIR/$filename")"
    [[ "$actual" == "$hash" ]] ||
      die "Checksum mismatch for $filename"
  done < "$ASSET_DIR/SHA256SUMS.check"
  ok "Checksums verified."

  DMG_SHA="$(sha256_file "$ASSET_DIR/KubeView_${VERSION}_universal.dmg")"
  EXE_SHA="$(sha256_file "$ASSET_DIR/KubeView_${VERSION}_x64-setup.exe")"
}

authed_url() {
  printf 'https://x-access-token:%s@github.com/%s.git' "$GH_TOKEN" "$1"
}

clone_repo() {
  local repo="$1"
  local destination="$2"
  git clone --depth 1 "$(authed_url "$repo")" "$destination" >/dev/null 2>&1 ||
    die "Failed to clone $repo"
}

commit_and_push() {
  local dir="$1"
  local message="$2"
  local label="$3"

  git -C "$dir" config user.name "KubeView Release"
  git -C "$dir" config user.email "release@kubeview.local"

  if [[ -z "$(git -C "$dir" status --porcelain)" ]]; then
    warn "No changes to commit in $label."
    return
  fi

  git -C "$dir" add -A
  git -C "$dir" commit -m "$message" -m "Co-Authored-By: Claude <noreply@anthropic.com>" >/dev/null
  git -C "$dir" push origin HEAD:main >/dev/null
  ok "$label updated"
}

update_homebrew() {
  info "Updating Homebrew cask"
  local dir="$TMP_DIR/homebrew-kubeview"
  clone_repo "$HOMEBREW_REPO" "$dir"

  VERSION="$VERSION" DMG_SHA="$DMG_SHA" RELEASE_REPO="$RELEASE_REPO" \
    node - "$dir/Casks/kubeview.rb" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
let text = fs.readFileSync(file, "utf8");
const version = process.env.VERSION;
const sha = process.env.DMG_SHA;
const repo = process.env.RELEASE_REPO;

const replacements = [
  [/^  version "[^"]+"$/m, `  version "${version}"`],
  [/^  sha256 "[a-f0-9]+"$/m, `  sha256 "${sha}"`],
  [
    /^  url ".*"$/m,
    `  url "https://github.com/${repo}/releases/download/v#{version}/KubeView_#{version}_universal.dmg"`,
  ],
];
for (const [pattern, replacement] of replacements) {
  if (!pattern.test(text)) throw new Error(`Missing cask field: ${pattern}`);
  text = text.replace(pattern, replacement);
}
fs.writeFileSync(file, text);
NODE

  commit_and_push "$dir" "release: KubeView $VERSION" "Homebrew cask"
}

update_scoop() {
  info "Updating Scoop manifest"
  local dir="$TMP_DIR/scoop-kubeview"
  clone_repo "$SCOOP_REPO" "$dir"

  local url="https://github.com/${RELEASE_REPO}/releases/download/v${VERSION}/KubeView_${VERSION}_x64-setup.exe"
  jq --arg version "$VERSION" --arg url "$url" --arg hash "$EXE_SHA" \
    --arg license "Apache-2.0" \
    '.version = $version | .url = $url | .hash = $hash | .license = $license' \
    "$dir/bucket/kubeview.json" > "$dir/bucket/kubeview.json.tmp"
  mv "$dir/bucket/kubeview.json.tmp" "$dir/bucket/kubeview.json"

  commit_and_push "$dir" "release: KubeView $VERSION" "Scoop manifest"
}

deploy_landing() {
  local dir="$1"

  if (( SKIP_LANDING_DEPLOY )); then
    warn "Landing deploy skipped (--skip-landing-deploy)."
    return
  fi

  if [[ -n "$VERCEL_DEPLOY_HOOK" ]]; then
    info "Triggering Vercel deploy hook"
    curl -fsS -X POST "$VERCEL_DEPLOY_HOOK" >/dev/null ||
      die "Vercel deploy hook failed."
    ok "Vercel deploy hook triggered"
    return
  fi

  info "Deploying landing site to Vercel production"
  (
    cd "$dir"
    vercel link --yes --project "$VERCEL_PROJECT" --scope "$VERCEL_SCOPE" >/dev/null
    vercel --prod --yes
  ) || die "Vercel production deploy failed."
  ok "Landing site deployed"
}

verify_downloads() {
  if (( SKIP_LANDING_DEPLOY )); then
    return
  fi

  local suffix
  for suffix in \
    "universal.dmg" \
    "x64-setup.exe" \
    "amd64.AppImage" \
    "amd64.deb"; do
    local url="${LANDING_URL}/downloads/KubeView_${VERSION}_${suffix}"
    local attempt=0
    local ready=0
    while [[ "$attempt" -lt 60 ]]; do
      if curl -fsI --max-time 20 "$url" >/dev/null 2>&1; then
        ready=1
        break
      fi
      attempt=$((attempt + 1))
      sleep 5
    done
    [[ "$ready" -eq 1 ]] || die "Download did not go live: $url"
    ok "Live: $url"
  done
}

update_landing() {
  info "Updating landing site"
  local dir="$TMP_DIR/KubeView-landing"
  clone_repo "$LANDING_REPO" "$dir"

  VERSION="$VERSION" node - "$dir/src/lib/site.ts" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const version = process.env.VERSION;
let text = fs.readFileSync(file, "utf8");
const pattern = /version:\s*"[^"]+"/;
if (!pattern.test(text)) throw new Error("Could not find SITE.version");
text = text.replace(pattern, `version: "${version}"`);
fs.writeFileSync(file, text);
NODE

  mkdir -p "$dir/public/downloads"
  cp "$ASSET_DIR/KubeView_${VERSION}_universal.dmg" "$dir/public/downloads/"
  cp "$ASSET_DIR/KubeView_${VERSION}_x64-setup.exe" "$dir/public/downloads/"
  cp "$ASSET_DIR/KubeView_${VERSION}_amd64.AppImage" "$dir/public/downloads/"
  cp "$ASSET_DIR/KubeView_${VERSION}_amd64.deb" "$dir/public/downloads/"

  commit_and_push "$dir" "release: KubeView $VERSION" "Landing site"
  deploy_landing "$dir"
  verify_downloads
}

print_winget_note() {
  if command -v wingetcreate >/dev/null 2>&1; then
    warn "winget skipped: no KubeView package exists in microsoft/winget-pkgs yet."
  else
    warn "winget skipped: wingetcreate is unavailable and no KubeView package exists."
  fi
}

print_dry_run() {
  cat <<EOF

Dry run complete — no files, commits, tags, releases, or deploys were changed.

Planned release
  version      v$VERSION (current v$CURRENT_VERSION)
  release      $RELEASE_REPO
  Homebrew     $HOMEBREW_REPO
  Scoop        $SCOOP_REPO
  landing      $LANDING_REPO -> $LANDING_URL
  deploy       $([[ -n "$VERCEL_DEPLOY_HOOK" ]] && echo "deploy hook" || echo "vercel --prod ($VERCEL_PROJECT)")

Next run without --dry-run to execute.
EOF
}

print_summary() {
  cat <<EOF

${C_OK}Release complete${C_RESET}

  Release      https://github.com/$RELEASE_REPO/releases/tag/v$VERSION
  Homebrew     brew upgrade --cask kubeview
  Scoop        scoop update kubeview
  Landing      $LANDING_URL
  Assets       $ASSET_DIR

  Version files, main, and tag v$VERSION were pushed.
  The desktop build and distribution repositories are updated.
EOF
}

main() {
  parse_args "$@"
  preflight
  resolve_version
  confirm_plan

  if (( DRY_RUN )); then
    print_dry_run
    exit 0
  fi

  info "Releasing KubeView v$VERSION (current v$CURRENT_VERSION)"
  run_checks
  commit_and_tag
  wait_for_release
  download_assets

  if (( SKIP_DISTRIBUTION )); then
    warn "Distribution updates skipped (--skip-distribution)."
  else
    update_homebrew
    update_scoop
    update_landing
    print_winget_note
  fi

  print_summary
}

main "$@"
