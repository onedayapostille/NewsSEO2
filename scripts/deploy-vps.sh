#!/usr/bin/env sh
set -eu

APP_DIR="${1:-$HOME/app}"
BRANCH="${2:-main}"

cd "$APP_DIR"

echo "[deploy] app dir: $APP_DIR"
echo "[deploy] branch: $BRANCH"

# Keep deployment independent from Portainer / GHCR availability.
git fetch --all --prune
if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
else
  echo "[deploy] branch '$BRANCH' not found on origin" >&2
  exit 1
fi

# Build image from source on VPS for deterministic rollout.
docker compose build --pull

docker compose up -d --remove-orphans

# Keep disk usage bounded.
docker image prune -f

echo "[deploy] waiting for health endpoint..."
for i in 1 2 3 4 5; do
  if curl -fsS "http://localhost:3001/health" >/dev/null; then
    echo "[deploy] health check passed"
    exit 0
  fi
  sleep 5
  echo "[deploy] retry health check ($i/5)"
done

echo "[deploy] warning: health check did not pass in time" >&2
exit 1
