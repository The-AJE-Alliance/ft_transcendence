#!/bin/bash

set -e

export VAULT_CACERT=/vault/ssl/cert.pem
VAULT_TOKEN="$(cat /vault/secrets/token)"
export VAULT_TOKEN
RMQ_INIT_FILE=/vault/secrets/rabbit.init
APP=$1

if [ ! -f ${RMQ_INIT_FILE} ]; then
  echo "Enabling Rabbitmq Backend..."
  vault secrets enable rabbitmq

  echo "Enabling Rabbitmq Vault Credentials..."
  vault write rabbitmq/config/connection \
    connection_uri="http://rabbitmq:15672" \
    username="vault" \
    password="carotte"

  touch "${RMQ_INIT_FILE}"
fi

APPMQ_INIT_FILE=/vault/secrets/${APP}-mq.init
if [ -f "${APPMQ_INIT_FILE}" ]; then
  echo "${APPMQ_INIT_FILE} exists. Rabbitmq already initialized for ${APP}."
else
  echo "Creating ${APP} Rabbitmq Role..."
  vault write rabbitmq/roles/"${APP}" \
      vhosts='{"/":{"write": ".*", "read": ".*", "configure": ".*"}}'

  echo "${APP} Rabbitmq creation complete."
  touch "${APPMQ_INIT_FILE}"
fi