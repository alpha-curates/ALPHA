#!/bin/bash
set -e

echo "================================"
echo "  ALPHA - Personal Cloud OS"
echo "  Installer v1.0.0"
echo "================================"
echo ""

# Check platform
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "armv7l" ]; then
    echo "[✓] Raspberry Pi detected ($ARCH)"
else
    echo "[!] Non-ARM platform detected ($ARCH). Continuing anyway."
fi

# Dependencies
echo "[...] Installing dependencies..."
if command -v apt &>/dev/null; then
    sudo apt update
    sudo apt install -y python3 python3-pip python3-venv nodejs npm curl
elif command -v pacman &>/dev/null; then
    sudo pacman -Sy --noconfirm python python-pip nodejs npm curl
elif command -v dnf &>/dev/null; then
    sudo dnf install -y python3 python3-pip nodejs npm curl
fi

# Clone (or use current dir)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Backend setup
echo "[...] Setting up backend..."
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend setup
echo "[...] Setting up frontend..."
cd ui
npm install
cd ..

# Create storage directory
mkdir -p storage
touch storage/.gitkeep

# Create systemd service
echo "[...] Creating service..."
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

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable alpha.service
sudo systemctl start alpha.service

echo ""
echo "================================"
echo "  ALPHA installed successfully!"
echo "  Dashboard: http://$(hostname -I | awk '{print $1}'):3000"
echo "  API:       http://$(hostname -I | awk '{print $1}'):5000"
echo "================================"
