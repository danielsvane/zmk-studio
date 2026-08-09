#!/bin/bash
set -e

sudo su - daniel <<'EOF'
set -e

export PATH="/home/daniel/.nvm/versions/node/v20.19.0/bin:$PATH"

# reset --hard, not pull: npm install rewrites package-lock.json in place, and a
# dirty lockfile makes pull abort. That failure used to pass silently, so the
# build shipped whatever stale commit the server happened to be sitting on.
cd /home/daniel/zmk-studio-ts-client
git fetch --prune
git reset --hard @{u}
npm install

cd /home/daniel/zmk-studio
git fetch --prune
git reset --hard origin/customkeyboards
npm install
npm run build
/home/daniel/.nvm/versions/node/v20.8.0/bin/pm2 restart zmk-studio

EOF
