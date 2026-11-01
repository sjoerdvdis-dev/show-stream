#!/usr/bin/env bash
# Prepares a clone for development. Safe to run again: it only adds what is missing.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

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

check_docker() {
  command -v docker >/dev/null || fail "Docker is not installed." "Install Docker Desktop or Docker Engine with Compose."
  docker info >/dev/null 2>&1 || fail "Docker is not running." "Start Docker. On WSL, start Docker Desktop on Windows."
  ok "Docker"
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
  local mcp deps=()
  mcp=$(node -p 'JSON.parse(require("fs").readFileSync(".mcp.json")).mcpServers.playwright.args.find((a) => a.startsWith("@playwright/mcp@"))')
  if [ "$(uname -s)" = "Linux" ] && [ "$(id -u)" -eq 0 ]; then
    deps=(--with-deps)
  fi
  npx -y -p "$mcp" playwright install "${deps[@]}" chromium
  ok "Chromium for Playwright"
}

create_folders() {
  mkdir -p media/movies media/shows data
  docker network inspect show_stream_network >/dev/null 2>&1 || docker network create show_stream_network >/dev/null
  ok "Media folders and Docker network"
}

# Never overwrites an existing .env, and never prints its values.
create_env() {
  local env=apps/api-server/.env secret
  if [ -f "$env" ]; then
    ok "$env already exists, left unchanged"
    return
  fi
  secret=$(node -p 'require("crypto").randomBytes(32).toString("hex")')
  sed "s/^JWT_SECRET=.*/JWT_SECRET=$secret/" apps/api-server/.env.example > "$env"
  chmod 600 "$env"
  ok "$env created with a generated JWT_SECRET"
}

check_tmdb_token() {
  if grep -q '^TMDB_API_READ_ACCESS_TOKEN=.' apps/api-server/.env; then
    ok "TMDB token"
  else
    echo "! TMDB_API_READ_ACCESS_TOKEN is empty in apps/api-server/.env. Library scans need it."
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
echo "Done. Start MongoDB and the apps with the steps in docs/guides/local-development.md."
