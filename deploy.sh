#!/bin/sh
ssh obedbot@vacuumlabs.com /bin/bash << EOF
  cd obedbot
  git fetch --all
  git reset --hard origin/master
  git pull
  npm install
  npm run build
EOF
ssh ubuntu@vacuumlabs.com -C "sudo service obedbot restart"
