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

MODE="web" # default mode: web (Next.js dev server + Go sidecar)

# Parse CLI arguments
for arg in "$@"; do
  case "$arg" in
    --tauri|-t)
      MODE="tauri"
      ;;
    --web|-w)
      MODE="web"
      ;;
    --clean|-c)
      CLEAN=true
      ;;
    --help|-h)
      echo -e "${BOLD}KubeView Development Runner${NC}"
      echo ""
      echo "Usage: ./dev.sh [options]  or  pnpm dev"
      echo ""
      echo "Options:"
      echo "  --web, -w     Run web dev server (Next.js on :3005 with Go sidecar) [default]"
      echo "  --tauri, -t   Run Tauri desktop window + Next.js + Go sidecar"
      echo "  --clean, -c   Clean contracts and recompile Go engine before running"
      echo "  --help, -h    Show this help message"
      exit 0
      ;;
    *)
      echo -e "${YELLOW}Unknown option: $arg. Run with --help for usage.${NC}"
      ;;
  esac
done

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
else
  npx tsc -p packages/contracts/tsconfig.json
fi
echo -e "${GREEN}✓ Contracts ready (packages/contracts/dist)${NC}"

# 2. Build Go Engine Sidecar
echo -e "\n${BOLD}[2/3] Compiling Go engine sidecar...${NC}"
mkdir -p engine/bin
if ! command -v go >/dev/null 2>&1; then
  echo -e "${RED}Error: 'go' command not found. Please install Go to build the engine.${NC}"
  exit 1
fi

go -C engine build -ldflags="-s -w" -o bin/kubeview-engine ./cmd/kubeview-engine
chmod +x engine/bin/kubeview-engine
echo -e "${GREEN}✓ Go engine binary compiled (stripped): engine/bin/kubeview-engine${NC}"

# Graceful cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down KubeView processes...${NC}"
  # Kill any child processes in current process group
  jobs -p | xargs -r kill 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 3. Launch Frontend / Desktop
echo -e "\n${BOLD}[3/3] Launching KubeView...${NC}"

if [ "$MODE" = "tauri" ]; then
  echo -e "${GREEN}Starting Tauri 2 Desktop Shell with Go sidecar...${NC}"
  if command -v cargo >/dev/null 2>&1; then
    cargo tauri dev
  else
    pnpm tauri:dev
  fi
else
  echo -e "${GREEN}Starting Next.js App on http://localhost:3005 with Go IPC Bridge...${NC}"
  echo -e "${CYAN}Tip: Open http://localhost:3005 in your browser.${NC}"
  echo -e "${CYAN}Run with './dev.sh --tauri' to launch the native desktop window.${NC}\n"

  if [ -f "./apps/desktop/node_modules/.bin/next" ]; then
    (cd apps/desktop && ./node_modules/.bin/next dev --turbopack -p 3005)
  elif command -v pnpm >/dev/null 2>&1; then
    pnpm --filter @kubeview/desktop dev
  else
    npx --workspace=@kubeview/desktop next dev --turbopack -p 3005
  fi
fi
