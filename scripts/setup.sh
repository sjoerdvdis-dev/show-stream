#!/usr/bin/env bash
# Prepares a clone for development. Safe to run again: it only adds what is missing.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

api_env=apps/api/.env
has_docker=false

ok() { echo "✓ $1"; }

fail() {
  echo "✗ $1" >&2
  shift
  printf '  %s\n' "$@" >&2
  exit 1
}

as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null; then
    sudo "$@"
  else
    fail "Root access is needed to run: $*" "Install sudo, or run that command as root."
  fi
}

check_node() {
  local required found
  required=$(cat .nvmrc)
  command -v node >/dev/null || fail "Node.js is not installed." "Install Node.js $required, for example with: nvm install"
  found=$(node -p 'process.versions.node.split(".")[0]')
  [ "$found" = "$required" ] || fail "Node.js $required is required, found $found." "Switch with: nvm install"
  ok "Node.js $found"
}

# Only the full stack and the browser tests need Docker, so a missing one is not fatal.
check_docker() {
  if ! command -v docker >/dev/null; then
    echo "! Docker is not installed. pnpm dev and pnpm test work without it, but the full stack and pnpm test:browser need Docker with Compose."
  elif ! docker info >/dev/null 2>&1; then
    echo "! Docker is not running. Start it for the full stack and pnpm test:browser. On WSL, start Docker Desktop on Windows."
  else
    has_docker=true
    ok "Docker"
  fi
}

install_pnpm() {
  if ! command -v pnpm >/dev/null; then
    npm install -g "pnpm@$(node -p 'require("./package.json").packageManager.split("@")[1]')"
  fi
  ok "pnpm"
}

install_dependencies() {
  pnpm install --frozen-lockfile
  ok "Dependencies"
}

install_ffmpeg() {
  if ! command -v ffmpeg >/dev/null; then
    if command -v apt-get >/dev/null; then
      as_root apt-get update
      as_root apt-get install -y ffmpeg
    elif command -v dnf >/dev/null; then
      as_root dnf install -y ffmpeg
    elif command -v pacman >/dev/null; then
      as_root pacman -S --noconfirm ffmpeg
    elif command -v brew >/dev/null; then
      brew install ffmpeg
    else
      fail "ffmpeg is not installed." "Install it with your package manager, then run this again."
    fi
  fi
  ok "ffmpeg"
}

# The browser must match the Playwright inside the MCP server pinned in .mcp.json.
install_browser() {
  local mcp_package browser
  mcp_package=$(node -p 'JSON.parse(require("fs").readFileSync(".mcp.json")).mcpServers.playwright.args.find((a) => a.startsWith("@playwright/mcp@"))')
  if [ "$(uname -s)" = "Linux" ] && [ "$(id -u)" -eq 0 ]; then
    npx -y -p "$mcp_package" playwright install --with-deps chromium
  else
    npx -y -p "$mcp_package" playwright install chromium
  fi
  if command -v ldd >/dev/null; then
    browser=$(find "$HOME/.cache/ms-playwright" -type f -name chrome -path '*chromium-*' 2>/dev/null | head -n 1)
    if [ -n "$browser" ] && ldd "$browser" | grep -q 'not found'; then
      fail "Chromium is missing system libraries." "Install them with: npx -y -p $mcp_package playwright install --with-deps chromium"
    fi
  fi
  ok "Chromium for Playwright"
}

create_folders() {
  # Docker uses ./media and pnpm dev uses apps/api/media. ./data holds the pnpm dev database.
  mkdir -p media/movies media/shows apps/api/media/movies apps/api/media/shows data
  ok "Media and data folders"
  if [ "$has_docker" = true ]; then
    docker network inspect show_stream_network >/dev/null 2>&1 || docker network create show_stream_network >/dev/null
    ok "Docker network"
    if [ "$(id -u)" -ne 1000 ]; then
      echo "! Containers run as UID 1000, so ./media must be writable by that user."
    fi
  fi
}

# Never overwrites an existing .env, and never prints its values.
create_env() {
  local secret
  if [ -f "$api_env" ]; then
    ok "$api_env already exists, left unchanged"
    return
  fi
  secret=$(node -p 'require("crypto").randomBytes(32).toString("hex")')
  sed "s/^JWT_SECRET=.*/JWT_SECRET=$secret/" apps/api/.env.example > "$api_env"
  chmod 600 "$api_env"
  ok "$api_env created with a generated JWT_SECRET"
}

check_tmdb_token() {
  if grep -q '^TMDB_API_READ_ACCESS_TOKEN=.' "$api_env"; then
    ok "TMDB token"
  else
    echo "! TMDB_API_READ_ACCESS_TOKEN is empty in $api_env. Library scans need it."
    echo "  Create a free token at https://developer.themoviedb.org/docs/getting-started"
  fi
}

check_node
check_docker
install_pnpm
install_dependencies
install_ffmpeg
install_browser
create_folders
create_env
check_tmdb_token

echo
echo "Done. Start the apps with pnpm dev. See docs/guides/local-development.md."
