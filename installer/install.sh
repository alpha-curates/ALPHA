#!/bin/bash
set -e

echo "================================"
echo "  ALPHA - Personal Cloud OS"
echo "  Installer v1.0.0"
echo "================================"
echo ""

ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "armv7l" ]; then
    echo "[✓] Raspberry Pi detected ($ARCH)"
else
    echo "[!] Platform: $ARCH"
fi

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "[...] Installing system dependencies..."
if command -v apt &>/dev/null; then
    sudo apt update -qq
    sudo apt install -y -qq python3 python3-pip python3-venv python3-dev \
      build-essential libffi-dev libjpeg-dev zlib1g-dev nodejs npm curl
elif command -v pacman &>/dev/null; then
    sudo pacman -Sy --noconfirm python python-pip python-setuptools \
      base-devel nodejs npm curl
elif command -v dnf &>/dev/null; then
    sudo dnf install -y python3 python3-pip python3-devel \
      gcc gcc-c++ make libffi-devel libjpeg-turbo-devel nodejs npm curl
fi

echo "[...] Setting up Python backend..."
python3 -m venv .venv
source .venv/bin/activate
pip install -q --upgrade pip setuptools wheel
pip install -q --only-binary ':all:' -r requirements.txt \
  || pip install -q -r requirements.txt

echo "[...] Setting up frontend..."
cd ui
npm install --silent
npm run build
cd ..

echo "[...] Creating storage directory..."
mkdir -p storage

echo "[...] Installing systemd service..."
sudo tee /etc/systemd/system/alpha.service > /dev/null <<EOF
[Unit]
Description=ALPHA - Personal Cloud OS
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$SCRIPT_DIR
ExecStart=$SCRIPT_DIR/.venv/bin/python server/run.py
Restart=always
RestartSec=5
Environment=PYTHONPATH=$SCRIPT_DIR/server

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable alpha.service
sudo systemctl start alpha.service

echo ""
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
echo "[✓] ALPHA is running!"
    echo "    Dashboard: http://$IP:5000"
    echo ""
    echo "    Open the dashboard, register the first account (becomes admin)."
    echo ""
    echo "    To install AI (optional):"
    echo "      curl -fsSL https://ollama.com/install.sh | sh"
    echo "      ollama pull llama3.2:1b"
    echo ""
    echo "    To rebuild frontend after updates: cd ui && npm run build"
    echo "    To view logs: sudo journalctl -u alpha -f"
    echo "================================"
