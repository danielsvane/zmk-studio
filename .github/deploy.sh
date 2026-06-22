#!/bin/bash

sudo su - daniel <<'EOF'

export PATH="/home/daniel/.nvm/versions/node/v20.19.0/bin:$PATH"

cd /home/daniel/zmk-studio
git pull
npm install
npm run build
/home/daniel/.nvm/versions/node/v20.8.0/bin/pm2 restart zmk-studio

EOF
