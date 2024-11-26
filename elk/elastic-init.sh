#!/bin/bash
set -ex

# Files created by Elasticsearch should always be group writable too
umask 0002

HOSTNAME=elastic.${HOSTNAME}
CERTPATH="/certs/elastic"
VAULT_CA="/certs/vault-ca/ca.pem"
CA="/certs/ca/transcendence.crt"

if [ -f "${CERTPATH}/elastic.crt" ] && openssl x509 -checkend 86400 -noout -in "${CERTPATH}/elastic.crt"; then
  echo "Certificate is present and valid"
else
  APP_TOKEN=$(curl --cacert ${VAULT_CA} -s --request POST --data "{\"role_id\": \"${APP_RID}\", \"secret_id\": \"${APP_SID}\"}" "$VAULT_ADDR"/v1/auth/approle/login | jq -r .auth.client_token)

  echo "Certificate expired or missing, generating new certificate..."
  RESULT="$(curl --cacert ${VAULT_CA} -s --header "X-Vault-Token: $APP_TOKEN" \
    --request POST \
    --data "{\"common_name\":\"${HOSTNAME}\", \"alt_names\":\"elastic\", \"ttl\":\"450h\"}" \
    "$VAULT_ADDR/v1/pki_int/issue/domain")"

  echo "$RESULT" | jq -r .data.certificate | tee "${CERTPATH}"/elastic.crt &> /dev/null
  echo "$RESULT" | jq -r .data.private_key | tee "${CERTPATH}"/elastic.key &> /dev/null
fi

echo "Waiting for Elasticsearch availability";
until curl -s --cacert ${CA} https://elastic:9200/_cat/nodes?v | \
  grep -q "missing authentication credentials"; do true; done;

echo "Setting kibana_system password";
until curl -v -X POST --cacert ${CA} -u "elastic:${ELASTIC_PASSWORD}" \
  -H "Content-Type: application/json" https://elastic:9200/_security/user/kibana_system/_password \
  -d "{\"password\":\"${KIBANA_PASSWORD}\"}" | grep -q "^{}"; do true; done;

echo "Init completed successfully"