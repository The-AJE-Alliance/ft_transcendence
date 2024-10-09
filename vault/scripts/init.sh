#!/bin/sh
set -ex
apk add --no-cache jq

INIT_FILE=/vault/secrets/vault.init
export VAULT_CACERT=/vault/ssl/cert.pem
if [ -f "${INIT_FILE}" ]; then
  echo "${INIT_FILE} exists. Vault already initialized."
else
  echo "Initializing Vault..."
  sleep 5
  vault operator init -key-shares=1 -key-threshold=1 | tee ${INIT_FILE} > /dev/null
  cat ${INIT_FILE} | grep '^Unseal' | awk '{print $4}' | tee /vault/secrets/key > /dev/null
  cat ${INIT_FILE}| grep '^Initial Root Token' | awk '{print $4}' | tee /vault/secrets/token > /dev/null
  echo "Vault setup complete."
fi

if [ ! -s /vault/secrets/token ] || [ ! -s /vault/secrets/key ]; then
  echo "Vault is initialized, but unseal keys or token are missing"
  return
fi

echo "Unsealing Vault"
VAULT_TOKEN="$(cat /vault/secrets/token)"
export VAULT_TOKEN
vault operator unseal "$(cat /vault/secrets/key)"

. "/vault/scripts/pki.sh"

APP=nginx . "/vault/scripts/roles.sh"

vault status