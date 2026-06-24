#!/bin/bash
set -e
cd "$(dirname "$0")"
git pull
.venv/bin/pip install -r requirements.txt
cd ui && npm install && npm run build
cd ..
if ! command -v ollama &>/dev/null; then
  echo "Installing Ollama..."
  if command -v wget &>/dev/null; then
    wget -qO- https://ollama.com/install.sh | sudo sh
  else
    curl -fsSL https://ollama.com/install.sh | sudo sh
  fi
  sudo systemctl enable ollama
  sudo systemctl start ollama
  for i in $(seq 1 30); do
    if curl -s http://localhost:11434/api/tags &>/dev/null; then break; fi
    sleep 2
  done
fi
if ! ollama list 2>/dev/null | grep -q llama3.2; then
  echo "Pulling llama3.2:1b model..."
  ollama pull llama3.2:1b
fi
sudo systemctl restart alpha.service
echo "Update complete!"
