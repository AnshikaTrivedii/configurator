#!/usr/bin/env bash
set -Eeuo pipefail

tag="${1:?Usage: deploy-lightsail.sh COMMIT_SHA}"
if [[ ! "$tag" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Expected a full 40-character commit SHA" >&2
  exit 2
fi

app_dir=/opt/configurator/app
release_dir=/opt/configurator/config
compose_file="$app_dir/compose.prod.yml"
release_file="$release_dir/current-release"
domain=configurator.orion-led.com
cd "$app_dir"

test -s "$release_dir/backend.env"
test -s "/etc/letsencrypt/live/$domain/fullchain.pem"
test -s "/etc/letsencrypt/live/$domain/privkey.pem"

previous=""
if [[ -f "$release_file" ]]; then
  previous="$(<"$release_file")"
fi
if [[ -n "$previous" && ! "$previous" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Invalid current-release file" >&2
  exit 2
fi

health_check() {
  local attempt
  for attempt in {1..12}; do
    if curl --silent --show-error --fail --max-time 8 \
      --resolve "$domain:443:127.0.0.1" \
      "https://$domain/health" | grep -q '"success":true'; then
      return 0
    fi
    sleep 5
  done
  return 1
}

rollback() {
  local result=$?
  trap - ERR
  echo "Deployment $tag failed (status $result)." >&2
  if [[ -n "$previous" ]]; then
    echo "Restoring release $previous" >&2
    IMAGE_TAG="$previous" docker compose -f "$compose_file" up -d --no-build --remove-orphans --wait || true
    health_check || echo "Rollback health check failed; inspect containers immediately" >&2
  else
    echo "No previous release recorded; inspect containers immediately" >&2
  fi
  exit "$result"
}

# Pulling happens before the running release is changed.
IMAGE_TAG="$tag" docker compose -f "$compose_file" pull
trap rollback ERR
IMAGE_TAG="$tag" docker compose -f "$compose_file" up -d --no-build --remove-orphans --wait
health_check
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
install -m 755 "$app_dir/certbot-renew-hook.sh" /etc/letsencrypt/renewal-hooks/deploy/reload-configurator
printf '%s\n' "$tag" > "$release_file.tmp"
mv "$release_file.tmp" "$release_file"
trap - ERR
docker image prune -af --filter 'until=336h' || echo "Image cleanup failed; release is still healthy" >&2
echo "Release $tag is healthy"
