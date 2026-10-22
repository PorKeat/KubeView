#!/usr/bin/env bash
# ==============================================================================
# KubeView Unified Development Runner
# Compiles the Go Engine, builds Contracts, and launches Frontend / Tauri
# ==============================================================================

set -eo pipefail

# Robust project root directory resolution
if git rev-parse --show-toplevel >/dev/null 2>&1; then
  ROOT_DIR="$(git rev-parse --show-toplevel)"
else
  # Fallback: search upward for pnpm-workspace.yaml
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

# ANSI color codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Verify we are in the project root
if [ ! -f "pnpm-workspace.yaml" ] || [ ! -d "packages/contracts" ] || [ ! -d "engine" ]; then
  echo -e "${RED}Error: Must be run from the KubeView repository root (found: $ROOT_DIR).${NC}" >&2
  exit 1
fi

MODE="web" # default mode: web (Next.js dev server + Go sidecar)
CLEAN=false

# Parse and validate CLI arguments (accepts both flags like --tauri and subcommands like tauri)
for arg in "$@"; do
  case "$arg" in
    --tauri|-t|tauri)
      MODE="tauri"
      ;;
    --web|-w|web)
      MODE="web"
      ;;
    --clean|-c|clean)
      CLEAN=true
      ;;
    --help|-h|help)
      echo -e "${BOLD}KubeView Development Runner${NC}"
      echo ""
      echo "Usage: ./dev.sh [options]  or  pnpm dev"
      echo ""
      echo "Options:"
      echo "  --web, -w, web       Run web dev server (Next.js on :3005 with Go sidecar) [default]"
      echo "  --tauri, -t, tauri   Run Tauri desktop window + Next.js + Go sidecar"
      echo "  --clean, -c, clean   Clean contracts and recompile Go engine before running"
      echo "  --help, -h, help     Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option '$arg'. Run with --help for usage.${NC}" >&2
      exit 1
      ;;
  esac
done

# Validate core toolchain prerequisites upfront
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}Error: 'node' command not found. Node.js (v18+) is required.${NC}" >&2
  exit 1
fi

if ! command -v go >/dev/null 2>&1; then
  echo -e "${RED}Error: 'go' command not found. Please install Go (1.20+) to build the engine.${NC}" >&2
  exit 1
fi

if [ "$MODE" = "tauri" ]; then
  if ! command -v cargo >/dev/null 2>&1; then
    echo -e "${RED}Error: 'cargo' (Rust) command not found. Rust is required to run Tauri desktop mode.${NC}" >&2
    echo -e "Please install Rust via https://rustup.rs and try again." >&2
    exit 1
  fi

  # On macOS, check if Xcode license is accepted to prevent linker failure exit status 69
  if [[ "$OSTYPE" == "darwin"* ]] && command -v xcodebuild >/dev/null 2>&1; then
    if ! xcodebuild -checkFirstLaunchStatus >/dev/null 2>&1; then
      echo -e "${RED}Error: Xcode and Apple SDKs license has not been agreed to.${NC}" >&2
      echo -e "${YELLOW}macOS linker requires accepting the license. Run in your terminal:${NC}" >&2
      echo -e "  sudo xcodebuild -license accept\n" >&2
      exit 1
    fi
  fi

  # Determine Tauri CLI runner
  if [ -f "./node_modules/.bin/tauri" ]; then
    TAURI_RUNNER="./node_modules/.bin/tauri"
  elif command -v tauri >/dev/null 2>&1; then
    TAURI_RUNNER="tauri"
  elif cargo tauri --version >/dev/null 2>&1; then
    TAURI_RUNNER="cargo tauri"
  elif command -v pnpm >/dev/null 2>&1 && pnpm exec tauri --version >/dev/null 2>&1; then
    TAURI_RUNNER="pnpm exec tauri"
  else
    echo -e "${RED}Error: Tauri CLI is required for desktop mode but was not found.${NC}" >&2
    echo -e "${YELLOW}To fix this, please install the Tauri CLI using one of the following:${NC}" >&2
    echo -e "  • Via Cargo:  cargo install tauri-cli --version \"^2.0.0\" --locked" >&2
    echo -e "  • Via pnpm:   pnpm add -D -w @tauri-apps/cli@^2" >&2
    exit 1
  fi
fi

# Graceful cleanup on exit
cleanup() {
  local exit_code=$?
  local job_pids
  job_pids=$(jobs -p 2>/dev/null || true)
  if [ -n "$job_pids" ]; then
    echo -e "\n${YELLOW}Shutting down KubeView processes...${NC}"
    echo "$job_pids" | xargs kill 2>/dev/null || true
  fi
  exit "$exit_code"
}
trap cleanup SIGINT SIGTERM EXIT

echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}${BOLD}  ☸ KubeView Unified Dev Runner (Mode: ${MODE})             ${NC}"
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Clean if requested
if [ "$CLEAN" = true ]; then
  echo -e "${YELLOW}🧹 Cleaning build caches...${NC}"
  rm -rf packages/contracts/dist
  rm -f engine/bin/kubeview-engine
fi

# 1. Build Contracts package
echo -e "\n${BOLD}[1/3] Building contracts package...${NC}"
if [ -f "./node_modules/.bin/tsc" ]; then
  ./node_modules/.bin/tsc -p packages/contracts/tsconfig.json
elif command -v pnpm >/dev/null 2>&1; then
  pnpm --filter @kubeview/contracts build
elif command -v npx >/dev/null 2>&1; then
  npx tsc -p packages/contracts/tsconfig.json
else
  echo -e "${RED}Error: Neither TypeScript compiler (tsc), pnpm, nor npx was found.${NC}" >&2
  exit 1
fi

if [ ! -d "packages/contracts/dist" ]; then
  echo -e "${RED}Error: Contracts build failed. Directory 'packages/contracts/dist' was not created.${NC}" >&2
  exit 1
fi
echo -e "${GREEN}✓ Contracts ready (packages/contracts/dist)${NC}"

# 2. Build Go Engine Sidecar
echo -e "\n${BOLD}[2/3] Compiling Go engine sidecar...${NC}"
mkdir -p engine/bin

go -C engine build -ldflags="-s -w" -o bin/kubeview-engine ./cmd/kubeview-engine
chmod +x engine/bin/kubeview-engine

if [ ! -x "engine/bin/kubeview-engine" ]; then
  echo -e "${RED}Error: Go engine binary compilation failed: engine/bin/kubeview-engine not found.${NC}" >&2
  exit 1
fi
echo -e "${GREEN}✓ Go engine binary compiled (stripped): engine/bin/kubeview-engine${NC}"

# 3. Launch Frontend / Desktop
echo -e "\n${BOLD}[3/3] Launching KubeView...${NC}"

if [ "$MODE" = "tauri" ]; then
  echo -e "${GREEN}Starting Tauri 2 Desktop Shell with Go sidecar...${NC}"
  $TAURI_RUNNER dev
else
  echo -e "${GREEN}Starting Next.js App on http://localhost:3005 with Go IPC Bridge...${NC}"
  echo -e "${CYAN}Tip: Open http://localhost:3005 in your browser.${NC}"
  echo -e "${CYAN}Run with './dev.sh --tauri' to launch the native desktop window.${NC}\n"

  if [ -f "./apps/desktop/node_modules/.bin/next" ]; then
    (cd apps/desktop && ./node_modules/.bin/next dev --turbopack -p 3005)
  elif command -v pnpm >/dev/null 2>&1; then
    pnpm --filter @kubeview/desktop dev
  elif command -v npx >/dev/null 2>&1; then
    npx --workspace=@kubeview/desktop next dev --turbopack -p 3005
  else
    echo -e "${RED}Error: Next.js dev server could not be started. Run 'pnpm install' first.${NC}" >&2
    exit 1
  fi
fi
