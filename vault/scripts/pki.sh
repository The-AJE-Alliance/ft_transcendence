#!/bin/bash

set -e

PKI_INIT_FILE=/vault/pki/pki.init
if [ -f "${PKI_INIT_FILE}" ]; then
  echo "${PKI_INIT_FILE} exists. Vault pki already initialized."
else
  vault secrets enable pki
  vault secrets tune -max-lease-ttl=876000h pki
  vault write -field=certificate pki/root/generate/internal common_name="${HOSTNAME}" \
    issuer_name="vault-pki" ttl=876000h > /vault/pki/vault_root_ca.crt
  vault write pki/roles/"${HOSTNAME}" allow_any_name=true
  vault write pki/config/urls issuing_certificates="https://vault:8200/v1/pki/ca" \
    crl_distribution_points="https://vault:8200/v1/pki/crl"
  vault secrets enable -path=pki_int pki
  vault secrets tune -max-lease-ttl=876000h pki_int
  vault pki issue --issuer_name=transcendence-local-intermediate \
    /pki/issuer/"$(vault list -format=json pki/issuers/ | jq -r '.[]')" /pki_int/ \
    common_name="Transcendence Local Intermediate Authority" \
    o="Transcendence" ou="Ecole 42" key_type="rsa" key_bits="4096" max_depth_len=1 \
    permitted_dns_domains="${HOSTNAME},localhost,127.0.0.1" ttl="876000h"
  vault write pki_int/roles/domain issuer_ref="$(vault read -field=default pki_int/config/issuers)" \
    allowed_domains="${HOSTNAME}",localhost,127.0.0.1,host.docker.internal \
    allow_subdomains=true allow_bare_domains=true require_cn=false server_flag=true max_ttl=8670h
  vault policy write domain /vault/policies/domain.hcl
  touch ${PKI_INIT_FILE}
fi