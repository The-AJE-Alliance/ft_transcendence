#!/usr/bin/env bash

set -e

ENVS=()
SERVICE_APPS=("auth chat pong")

decl_secrets () {
  local APP=$1
  ENVS+=( "${APP^^}"_RID="$(docker --log-level ERROR compose run --rm vault-init "sh" "-c" "/vault/scripts/get-secret.sh ${APP} rid")" )
  ENVS+=( "${APP^^}"_SID="$(docker --log-level ERROR compose run --rm vault-init "sh" "-c" "/vault/scripts/get-secret.sh ${APP} sid")" )
}

init_db () {
  for app in "${apps[@]}"; do
    if [[ ${SERVICE_APPS[*]} =~ ${app} ]]; then
      docker --log-level ERROR compose run --rm vault-init "bash" "-c" "/vault/scripts/databases.sh $app"
      docker --log-level ERROR compose run --rm vault-init "bash" "-c" "/vault/scripts/rabbitmq.sh $app"
    fi
  done
}

db_ready() {
  local APP=$1
  if docker logs "${APP}" |& grep -Pzl '(?s)init process complete.*\n.*ready to accept connections'; then
    return 0
  elif docker logs "${APP}" |& grep -Pzl '(?s)Skipping initialization.*\n.*ready to accept connections'; then
    return 0
  fi
  return 1
}

rmq_ready() {
  if docker logs rabbitmq |& grep -Pzl 'Time to start RabbitMQ'; then
    return 0
  fi
  return 1
}

elastic-init_ready() {
  if docker logs elastic-init |& grep -Pzl 'Waiting for Elasticsearch availability'; then
    return 0
  fi
  return 1
}

elastic_ready() {
  if docker logs elastic-init |& grep -Pzl 'Init completed successfully'; then
    return 0
  fi
  return 1
}

IFS=' ' read -r -a apps <<< "$1"

for app in "${apps[@]}"; do
  decl_secrets "$app" &> /dev/null
done

env "${ENVS[@]}" docker compose up -d elastic-init
until elastic-init_ready &>/dev/null; do
  true
done

env "${ENVS[@]}" docker compose up -d elastic
until elastic_ready &>/dev/null; do
  true
done
docker --log-level ERROR compose up -d kibana logstash

docker --log-level ERROR compose up -d auth-db chat-db pong-db
docker --log-level ERROR compose up -d rabbitmq

until db_ready auth-db &> /dev/null && db_ready chat-db &>/dev/null && db_ready pong-db &>/dev/null && rmq_ready &>/dev/null; do
  true
done

init_db &> /dev/null

env "${ENVS[@]}" docker compose up --watch