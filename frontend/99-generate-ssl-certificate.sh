#!/bin/bash

set -e

if [ -f "/etc/ssl/${HOSTNAME}.crt" ] && openssl x509 -checkend 86400 -noout -in /etc/ssl/"${HOSTNAME}.crt"; then
  echo "Certificate is present and valid"
else
  APP_TOKEN=$(curl --cacert /ca/ca.pem -s --request POST --data "{\"role_id\": \"${APP_RID}\", \"secret_id\": \"${APP_SID}\"}" "$VAULT_ADDR"/v1/auth/approle/login | jq -r .auth.client_token)

  echo "Certificate expired or missing, generating new certificate..."
  RESULT="$(curl --cacert /ca/ca.pem -s --header "X-Vault-Token: $APP_TOKEN" \
    --request POST \
    --data "{\"common_name\":\"${HOSTNAME}\", \"alt_names\":\"*.${HOSTNAME}, *.api.${HOSTNAME}\", \"ttl\":\"450h\"}" \
    "$VAULT_ADDR/v1/pki_int/issue/domain")"

  echo "$RESULT" | jq -r .data.certificate | tee /etc/ssl/"${HOSTNAME}".crt &> /dev/null
  echo "$RESULT" | jq -r .data.private_key | tee /etc/ssl/"${HOSTNAME}".key &> /dev/null
fi