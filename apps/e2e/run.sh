#!/usr/bin/env bash
# Runs the browser tests in their own Compose project, and removes it afterwards.
# Set COMPOSE_PROJECT_NAME to run beside another copy.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

# Images are built from an export with no ignored files, because the API image would
# otherwise take in a real apps/api/.env (audit finding 5).
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

rm -rf test-results
mkdir test-results

git -C ../.. ls-files -z --cached --others --exclude-standard |
  tar -C ../.. --null --files-from=- --ignore-failed-read -cf - |
  tar -C "$E2E_CONTEXT" -xf -

status=0
docker compose up --build --attach playwright --exit-code-from playwright || status=$?

if [ "$status" -ne 0 ]; then
  docker compose logs --tail 50 api next-client || true
fi

exit "$status"
