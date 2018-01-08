#!/bin/sh
ssh-keyscan -H vacuumlabs.com >> ~/.ssh/known_hosts
ssh obedbot@vacuumlabs.com /bin/bash << EOF
  cd obedbot
  git fetch --all
  git reset --hard origin/production
  git pull
  yarn
  yarn run build
  sudo service obedbot restart
EOF
