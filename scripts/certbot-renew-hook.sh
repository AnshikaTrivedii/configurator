#!/usr/bin/env bash
set -euo pipefail

container_id="$(docker ps --quiet \
  --filter label=com.docker.compose.project=configurator \
  --filter label=com.docker.compose.service=frontend)"
if [[ -z "$container_id" ]]; then
  echo "Configurator frontend is not running; cannot reload certificate" >&2
  exit 1
fi
docker kill --signal=HUP "$container_id" >/dev/null
