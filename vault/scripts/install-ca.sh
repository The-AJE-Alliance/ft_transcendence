#!/usr/bin/env bash

if [ ! -f "./vault/ca/init" ]; then
    if [ "$(uname)" == "Darwin" ]; then
    sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./vault/ca/transcendence_ca.crt
    sudo security add-trusted-cert -d -r trustAsRoot -k /Library/Keychains/System.keychain ./vault/ca/transcendence.crt
  elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    sudo cp ./vault/ca/transcendence_ca.crt /usr/local/share/ca-certificates/
    sudo cp ./vault/ca/transcendence.crt /usr/local/share/ca-certificates/
    sudo update-ca-certificates
  fi
  touch ./vault/ca/init
fi

