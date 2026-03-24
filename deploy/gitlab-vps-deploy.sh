#!/usr/bin/env bash

set -euo pipefail

required_variables=(
  "DEPLOY_SSH_HOST"
  "DEPLOY_SSH_PRIVATE_KEY_B64"
  "DEPLOY_APP_IMAGE"
)

for variable_name in "${required_variables[@]}"; do
  if [[ -z "${!variable_name:-}" ]]; then
    echo "Missing required CI variable: ${variable_name}" >&2
    exit 1
  fi
done

deploy_ssh_user="${DEPLOY_SSH_USER:-deploy}"
deploy_app_dir="${DEPLOY_APP_DIR:-/opt/stork}"
deploy_compose_file="${DEPLOY_COMPOSE_FILE:-docker-compose.yml}"
deploy_remote_env_file="${DEPLOY_REMOTE_ENV_FILE:-.env}"
deploy_app_image="${DEPLOY_APP_IMAGE}"
deploy_registry="gitlab.fit.cvut.cz:5050"
deploy_registry_user="${CI_REGISTRY_USER:-}"
deploy_registry_password="${CI_REGISTRY_PASSWORD:-}"

ssh_dir="${HOME}/.ssh"
private_key_file="${ssh_dir}/deploy_key"
known_hosts_file="${ssh_dir}/known_hosts"

mkdir -p "${ssh_dir}"
chmod 700 "${ssh_dir}"

if ! printf '%s' "${DEPLOY_SSH_PRIVATE_KEY_B64}" | base64 -d > "${private_key_file}"; then
  echo "Failed to decode DEPLOY_SSH_PRIVATE_KEY_B64" >&2
  exit 1
fi
chmod 600 "${private_key_file}"

ssh-keyscan -p 22 "${DEPLOY_SSH_HOST}" > "${known_hosts_file}"
chmod 600 "${known_hosts_file}"

ssh_options=(
  -i "${private_key_file}"
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
  -o UserKnownHostsFile="${known_hosts_file}"
  -p 22
)

remote_host="${deploy_ssh_user}@${DEPLOY_SSH_HOST}"

rsync_excludes=(
  "--exclude=.git"
  "--exclude=.nuxt"
  "--exclude=.output"
  "--exclude=node_modules"
  "--exclude=.pnpm-store"
  "--exclude=.cache"
  "--exclude=coverage"
  "--exclude=dist"
  "--exclude=logs"
  "--exclude=.env"
)

echo "Syncing repository content to ${remote_host}:${deploy_app_dir}"

ssh "${ssh_options[@]}" "${remote_host}" "mkdir -p '${deploy_app_dir}'"

rsync -az --delete "${rsync_excludes[@]}" -e "ssh ${ssh_options[*]}" "./" "${remote_host}:${deploy_app_dir}/"

echo "Running remote deploy commands on ${remote_host}"

remote_env_prefix=$(
  printf "DEPLOY_APP_DIR=%q DEPLOY_COMPOSE_FILE=%q DEPLOY_REMOTE_ENV_FILE=%q DEPLOY_APP_IMAGE=%q DEPLOY_REGISTRY=%q DEPLOY_REGISTRY_USER=%q DEPLOY_REGISTRY_PASSWORD=%q " \
    "${deploy_app_dir}" "${deploy_compose_file}" "${deploy_remote_env_file}" "${deploy_app_image}" "${deploy_registry}" "${deploy_registry_user}" "${deploy_registry_password}"
)

ssh "${ssh_options[@]}" "${remote_host}" "${remote_env_prefix}bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

cd "${DEPLOY_APP_DIR}"

if [[ ! -f "${DEPLOY_REMOTE_ENV_FILE}" ]]; then
  echo "Expected env file '${DEPLOY_REMOTE_ENV_FILE}' was not found in ${DEPLOY_APP_DIR}" >&2
  exit 1
fi

compose() {
  APP_IMAGE="${DEPLOY_APP_IMAGE}" docker compose -f "${DEPLOY_COMPOSE_FILE}" --env-file "${DEPLOY_REMOTE_ENV_FILE}" "$@"
}

echo "${DEPLOY_REGISTRY_PASSWORD}" | docker login "${DEPLOY_REGISTRY}" --username "${DEPLOY_REGISTRY_USER}" --password-stdin
echo "Pulling app image"
compose pull app

echo "Ensuring database is up"
compose up -d --wait db

echo "Running Prisma migrations"
compose run --rm --no-deps -T app pnpm db:migrate:deploy < /dev/null

echo "Starting app service"
compose up -d --wait app

compose ps

echo "Cleaning up old app images"
app_repository="${DEPLOY_APP_IMAGE%:*}"
current_app_image_id="$(docker image inspect --format='{{.Id}}' "${DEPLOY_APP_IMAGE}" 2>/dev/null || true)"

if [[ -n "${current_app_image_id}" ]]; then
  while IFS= read -r image_id; do
    if [[ -n "${image_id}" && "${image_id}" != "${current_app_image_id}" ]]; then
      docker image rm -f "${image_id}" >/dev/null 2>&1 || true
    fi
  done < <(
    docker image ls --format '{{.Repository}}:{{.Tag}} {{.ID}}' |
      awk -v repo="${app_repository}" '$1 ~ ("^" repo ":") {print $2}' |
      sort -u
  )
fi

docker image prune -f >/dev/null 2>&1 || true
REMOTE_SCRIPT

echo "Deployment completed successfully"
