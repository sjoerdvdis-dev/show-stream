#!/usr/bin/env bash
# Runs the browser tests in their own Compose project, and removes it afterwards.
# Set COMPOSE_PROJECT_NAME to run beside another copy.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

# Images are built from an export with no ignored files, so that no real .env is even near
# them. The fake ones planted below show that .dockerignore stops them (audit finding 5).
E2E_CONTEXT=$(mktemp -d)
E2E_USER="$(id -u):$(id -g)"
export E2E_CONTEXT E2E_USER

# Images are removed afterwards only if this run was the one to fetch them.
new_images=()
while read -r image; do
  docker image inspect "$image" >/dev/null 2>&1 || new_images+=("$image")
done < <(docker compose config --images)

clean_up() {
  docker compose down --volumes --rmi local --remove-orphans >/dev/null 2>&1 || true
  if [ "${#new_images[@]}" -gt 0 ]; then
    docker image rm "${new_images[@]}" >/dev/null 2>&1 || true
  fi
  rm -rf "$E2E_CONTEXT"
}
trap clean_up EXIT
trap 'exit 130' INT TERM

rm -rf test-results
mkdir test-results

git -C ../.. ls-files -z --cached --others --exclude-standard |
  tar -C ../.. --null --files-from=- --ignore-failed-read -cf - |
  tar -C "$E2E_CONTEXT" -xf -

# Every one of these names must be excluded by .dockerignore. The tracked .env.production and
# .env.development hold no secrets, and stay out of this list.
fake_secret=fake-secret-that-must-not-reach-an-image
for file in .env .env.local apps/api/.env apps/api/.env.local apps/api/.env.backup \
  apps/worker/.env apps/web/.env apps/web/.env.local apps/web/.env.production.local \
  packages/db/.env packages/logger/.env; do
  echo "TMDB_API_READ_ACCESS_TOKEN=$fake_secret" >"$E2E_CONTEXT/$file"
done

# Reads every file of each image built, then its environment and build history.
check_images() {
  local project=${COMPOSE_PROJECT_NAME:-show-stream-browser-tests}
  local contents="$E2E_CONTEXT/image.tar" details="$E2E_CONTEXT/image-details.txt"
  local service image container
  for service in api worker caddy seed; do
    image="$project-$service"
    container=$(docker create "$image") || return 1
    docker export -o "$contents" "$container" || return 1
    docker rm "$container" >/dev/null || return 1
    docker image inspect "$image" >"$details" || return 1
    docker history --no-trunc "$image" >>"$details" || return 1
    if grep -qaF "$fake_secret" "$contents" "$details"; then
      echo "A planted secret reached the $service image." >&2
      return 1
    fi
    echo "No planted secret in the $service image."
  done
}

status=0
docker compose up --build --attach playwright --exit-code-from playwright || status=$?
check_images || status=1

if [ "$status" -ne 0 ]; then
  docker compose logs --tail 50 caddy api worker || true
fi

exit "$status"
