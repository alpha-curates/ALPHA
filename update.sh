#!/bin/bash
set -e
cd "$(dirname "$0")"
git pull
.venv/bin/pip install -r requirements.txt
cd ui && npm install && npm run build
cd ..
sudo systemctl restart alpha.service
echo "Update complete!"
