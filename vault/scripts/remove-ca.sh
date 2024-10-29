#!/usr/bin/env bash

if [ -f "./vault/ca/transcendence.crt" ]; then
  if [ "$(uname)" == "Darwin" ]; then
    sudo security delete-certificate -c 'transcendence.local' -t /Library/Keychains/System.keychain
    sudo security delete-certificate -c 'Transcendence Local Intermediate Authority' -t /Library/Keychains/System.keychain
  elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    sudo rm /usr/local/share/ca-certificates/transcendence_ca.crt
    sudo rm /usr/local/share/ca-certificates/transcendence.crt
    sudo update-ca-certificates
  fi
  rm ./vault/ca/transcendence.crt
  rm ./vault/ca/transcendence_ca.crt
  rm ./vault/ca/init
fi