#!/usr/bin/env bash

set -e

ENVS=()
SERVICE_APPS=("auth pong")

decl_secrets () {
  local APP=$1
  ENVS+=( "${APP^^}"_RID="$(docker --log-level ERROR compose run --rm vault-init "sh" "-c" "/vault/scripts/get-secret.sh ${APP} rid")" )
  ENVS+=( "${APP^^}"_SID="$(docker --log-level ERROR compose run --rm vault-init "sh" "-c" "/vault/scripts/get-secret.sh ${APP} sid")" )
}

init_db () {
  for app in "${apps[@]}"; do
    if [[ ${SERVICE_APPS[*]} =~ ${app} ]]; then
      docker --log-level ERROR compose run --rm vault-init "bash" "-c" "/vault/scripts/databases.sh $app"
    fi
  done
}

db_isready() {
  local APP=$1
  docker logs "${APP}" |& grep -Pzl '(?s)init process complete.*\n.*ready to accept connections'
  if [ $? -eq 0 ]; then
    return 0
  fi
  return 1
}

IFS=' ' read -r -a apps <<< "$1"

for app in "${apps[@]}"; do
  decl_secrets "$app" &> /dev/null
done

docker --log-level ERROR compose up -d auth-db pong-db

until db_isready auth-db &> /dev/null && db_isready pong-db &>/dev/null; do
  true
done

init_db &> /dev/null

env "${ENVS[@]}" docker compose up -d