#!/bin/bash
set +e
cd "$(dirname "$0")"
git pull
# Ensure virtual environment exists
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install -r requirements.txt

# Auto-migrate database (add missing columns)
DB="server/instance/alpha.db"
if [ -f "$DB" ]; then
  python3 -c "
import sqlite3
conn = sqlite3.connect('$DB')
c = conn.cursor()
# Add conversation_id to chat_message if missing
c.execute('PRAGMA table_info(chat_message)')
cols = [row[1] for row in c.fetchall()]
if 'conversation_id' not in cols:
    c.execute('ALTER TABLE chat_message ADD COLUMN conversation_id VARCHAR(64) REFERENCES conversation(id)')
    print('DB: added conversation_id')
# Add permissions column to user if missing
c.execute('PRAGMA table_info(user)')
cols = [row[1] for row in c.fetchall()]
if 'permissions' not in cols:
    c.execute('ALTER TABLE user ADD COLUMN permissions TEXT DEFAULT \'{}\'')
    print('DB: added permissions to user')
conn.commit()
conn.close()
"
fi
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
if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
  echo "Starting Ollama service..."
  sudo systemctl enable ollama 2>/dev/null || true
  sudo systemctl start ollama 2>/dev/null || true
  for i in $(seq 1 15); do
    if curl -s http://localhost:11434/api/tags &>/dev/null; then break; fi
    sleep 2
  done
fi
echo "Pulling Ollama models..."
ollama list 2>/dev/null | grep -q llama3.2 || ollama pull llama3.2:1b 2>&1 || true
ollama list 2>/dev/null | grep -q mistral || ollama pull mistral:7b 2>&1 || true
echo "Build complete. Server restart is handled by dev-update endpoint."
