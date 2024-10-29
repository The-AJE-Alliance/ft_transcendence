#!/usr/bin/env bash

if [ -f "./vault/ca/transcendence.crt" ]; then
  if [ "$(uname)" == "Darwin" ]; then
    sudo security delete-certificate -c 'transcendence.local' -t /Library/Keychains/System.keychain
    sudo security delete-certificate -c 'TranscendenceLocalIntermediateAuthority' -t /Library/Keychains/System.keychain
  elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    sudo rm /usr/local/share/ca-certificates/transcendence_ca.crt
    sudo rm /usr/local/share/ca-certificates/transcendence.crt
    sudo update-ca-certificates
  fi
  sudo rm ./vault/ca/transcendence_ca.crt
  sudo rm ./vault/ca/transcendence.crt
  sudo rm ./vault/ca/init
fi