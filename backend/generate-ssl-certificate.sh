#!/bin/bash

set -e

HOSTNAME=${APP_NAME}.api.${HOSTNAME}

if [ -f "/certs/${HOSTNAME}.crt" ] && openssl x509 -checkend 86400 -noout -in /certs/"${HOSTNAME}.crt"; then
  echo "Certificate is present and valid"
  return
fi

APP_TOKEN=$(curl --cacert /ca/ca.pem -s --request POST \
  --data "{\"role_id\": \"${VAULT_ROLEID}\", \"secret_id\": \"${VAULT_SECRETID}\"}" \
  "$VAULT_ADDR"/v1/auth/approle/login | jq -r .auth.client_token)

echo "Certificate expired or missing, generating new certificate..."
RESULT="$(curl --cacert /ca/ca.pem -s --header "X-Vault-Token: $APP_TOKEN" \
  --request POST \
  --data "{\"common_name\":\"${HOSTNAME}\",\"ttl\":\"450h\"}" \
  "$VAULT_ADDR/v1/pki_int/issue/domain")"

echo "$RESULT" | jq -r .data.certificate | tee /certs/"${HOSTNAME}".crt &> /dev/null
echo "$RESULT" | jq -r .data.private_key | tee /certs/"${HOSTNAME}".key &> /dev/null