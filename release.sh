#!/usr/bin/env bash
# ==============================================================================
# KubeView Release Runner
# Bumps the app version, updates release metadata, commits, tags, and pushes.
# Pushing the tag triggers .github/workflows/release.yml.
# ==============================================================================

set -eo pipefail

if git rev-parse --show-toplevel >/dev/null 2>&1; then
  ROOT_DIR="$(git rev-parse --show-toplevel)"
else
  CURR_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  while [ "$CURR_DIR" != "/" ]; do
    if [ -f "$CURR_DIR/pnpm-workspace.yaml" ]; then
      ROOT_DIR="$CURR_DIR"
      break
    fi
    CURR_DIR="$(dirname "$CURR_DIR")"
  done
  ROOT_DIR="${ROOT_DIR:-$(pwd)}"
fi
cd "$ROOT_DIR"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

MODE="patch"
EXPLICIT_VERSION=""
DRY_RUN=false
NO_PUSH=false
YES=false
ALLOW_DIRTY=false
ALLOW_BRANCH=false

usage() {
  cat <<'USAGE'
KubeView Release Runner

Usage:
  ./release.sh                 Bump patch; 0.2.9 rolls to 0.3.0
  ./release.sh minor           Bump minor from the current version
  ./release.sh major           Bump major from the current version
  ./release.sh 0.2.1           Use an explicit version

Options:
  --dry-run        Show the computed version without changing files
  --no-push        Update files, commit, and tag locally; do not push
  --yes            Skip the confirmation prompt
  --allow-dirty    Allow tracked changes in the worktree
  --allow-branch   Allow running from a branch other than main
  --help           Show this help

A successful push of the tag starts the release workflow, which builds the
DMG, Windows installer, AppImage, and Debian package, then publishes the
release. Cross-repo distribution requires DISTRIBUTION_TOKEN in repository
secrets.
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    patch|minor|major)
      MODE="$1"
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --no-push)
      NO_PUSH=true
      shift
      ;;
    --yes|-y)
      YES=true
      shift
      ;;
    --allow-dirty)
      ALLOW_DIRTY=true
      shift
      ;;
    --allow-branch)
      ALLOW_BRANCH=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    [0-9]*.[0-9]*.[0-9]*)
      EXPLICIT_VERSION="$1"
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}" >&2
      echo "Run ./release.sh --help for usage." >&2
      exit 1
      ;;
  esac
done

if [ ! -f package.json ] || [ ! -d apps/desktop ] || [ ! -d src-tauri ]; then
  echo -e "${RED}Error: run this from the KubeView repository.${NC}" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}Error: node is required.${NC}" >&2
  exit 1
fi
if ! command -v git >/dev/null 2>&1; then
  echo -e "${RED}Error: git is required.${NC}" >&2
  exit 1
fi

CURRENT="$(node -p "require('./package.json').version")"
if [ -n "$EXPLICIT_VERSION" ]; then
  NEXT="$EXPLICIT_VERSION"
else
  NEXT="$(node -e '
    const [current, mode] = process.argv.slice(1);
    const [major, minor, patch] = current.split(".").map(Number);
    if (![major, minor, patch].every(Number.isInteger)) process.exit(2);
    const next = mode === "major" ? [major + 1, 0, 0]
      : mode === "minor" ? [major, minor + 1, 0]
      : patch === 9 ? [major, minor + 1, 0]
      : [major, minor, patch + 1];
    process.stdout.write(next.join("."));
  ' "$CURRENT" "$MODE")"
fi

if ! [[ "$NEXT" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}Error: invalid version '$NEXT'. Use MAJOR.MINOR.PATCH.${NC}" >&2
  exit 1
fi
if [ "$NEXT" = "$CURRENT" ]; then
  echo -e "${RED}Error: next version is the same as current ($CURRENT).${NC}" >&2
  exit 1
fi
if git rev-parse -q --verify "refs/tags/v$NEXT" >/dev/null; then
  echo -e "${RED}Error: tag v$NEXT already exists.${NC}" >&2
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [ -z "$BRANCH" ]; then
  echo -e "${RED}Error: detached HEAD; check out a branch first.${NC}" >&2
  exit 1
fi
if [ "$BRANCH" != "main" ] && [ "$ALLOW_BRANCH" != true ]; then
  echo -e "${RED}Error: current branch is '$BRANCH', not main.${NC}" >&2
  echo "Use --allow-branch if you intentionally release from this branch." >&2
  exit 1
fi
if ! $DRY_RUN && [ "$ALLOW_DIRTY" != true ] && [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo -e "${RED}Error: tracked changes are present. Commit or stash them first.${NC}" >&2
  echo "Run with --allow-dirty only if you know those changes belong in this release." >&2
  exit 1
fi

TAG="v$NEXT"
TODAY="$(date +%F)"

echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}${BOLD}  ☸ KubeView Release Runner${NC}"
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Current: ${BOLD}${CURRENT}${NC}"
echo -e "  Next:    ${GREEN}${BOLD}${NEXT}${NC}  (${TAG})"
echo -e "  Branch:  ${BRANCH}"
echo -e "  Mode:    ${MODE}"
echo

if $DRY_RUN; then
  echo -e "${YELLOW}Dry run: no files changed.${NC}"
  exit 0
fi

if ! $YES; then
  read -r -p "Create the release commit and tag? [y/N] " answer
  case "$answer" in
    y|Y|yes|YES) ;;
    *) echo "Cancelled."; exit 0 ;;
  esac
fi

node - "$NEXT" "$TODAY" <<'NODE'
const fs = require("fs");
const next = process.argv[2];
const today = process.argv[3];

for (const file of ["package.json", "apps/desktop/package.json", "src-tauri/tauri.conf.json"]) {
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  pkg.version = next;
  fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
}

let cargo = fs.readFileSync("src-tauri/Cargo.toml", "utf8");
cargo = cargo.replace(/^version = "[^"]+"/m, `version = "${next}"`);
fs.writeFileSync("src-tauri/Cargo.toml", cargo);

let lock = fs.readFileSync("src-tauri/Cargo.lock", "utf8");
lock = lock.replace(
  /(\[\[package\]\]\nname = "kubeview"\nversion = ")[^"]+(")/,
  `$1${next}$2`,
);
fs.writeFileSync("src-tauri/Cargo.lock", lock);

let changelog = fs.readFileSync("CHANGELOG.md", "utf8");
if (!changelog.includes(`## [${next}]`)) {
  changelog = changelog.replace(
    "## [Unreleased]\n",
    `## [Unreleased]\n\n## [${next}] - ${today}\n\n### Changed\n\n- Release KubeView ${next}.\n`,
  );
  fs.writeFileSync("CHANGELOG.md", changelog);
}

const workflow = ".github/workflows/linux-deb.yml";
if (fs.existsSync(workflow)) {
  const updated = fs.readFileSync(workflow, "utf8").replace(
    /default: v[0-9]+\.[0-9]+\.[0-9]+/,
    `default: v${next}`,
  );
  fs.writeFileSync(workflow, updated);
}
NODE

echo -e "\n${BOLD}Updated files:${NC}"
git diff --stat -- package.json apps/desktop/package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock CHANGELOG.md .github/workflows/linux-deb.yml

git add package.json apps/desktop/package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock CHANGELOG.md .github/workflows/linux-deb.yml
git commit -m "release: KubeView ${NEXT}"
git tag -a "$TAG" -m "KubeView ${TAG}"

echo -e "\n${GREEN}✓ Created commit and tag ${TAG}${NC}"

if $NO_PUSH; then
  echo -e "${YELLOW}Push skipped. When ready:${NC}"
  echo "  git push origin ${BRANCH}"
  echo "  git push origin ${TAG}"
  exit 0
fi

git push origin "$BRANCH"
git push origin "$TAG"

echo -e "\n${GREEN}✓ Pushed ${BRANCH} and ${TAG}${NC}"
echo -e "${CYAN}Release workflow:${NC} https://github.com/PorKeat/KubeView/actions/workflows/release.yml"
echo -e "${YELLOW}Cross-repo distribution requires DISTRIBUTION_TOKEN.${NC}"
echo -e "Landing, Homebrew, Scoop, and winget update after the build if it is configured."
