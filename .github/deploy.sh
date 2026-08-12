#!/bin/bash
set -e

sudo su - daniel <<'EOF'
set -e

export PATH="/home/daniel/.nvm/versions/node/v20.19.0/bin:$PATH"

# reset --hard, not pull: npm install rewrites package-lock.json in place, and a
# dirty lockfile makes pull abort. That failure used to pass silently, so the
# build shipped whatever stale commit the server happened to be sitting on.
#
# Name the branch rather than @{u}: the ts-client supplies the combos and custom
# behaviour types, so a checkout left on another branch would build the web app
# against upstream's client and fail on imports that look unrelated to the deploy.
cd /home/daniel/zmk-studio-ts-client
git fetch --prune
git reset --hard origin/customkeyboards
npm install

cd /home/daniel/zmk-studio
git fetch --prune
git reset --hard origin/customkeyboards
npm install
npm run build
/home/daniel/.nvm/versions/node/v20.8.0/bin/pm2 restart zmk-studio

EOF
