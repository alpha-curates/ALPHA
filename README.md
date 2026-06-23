# ALPHA

A private, beautiful, AI-powered personal cloud operating system that runs on your own hardware.

## Quick Install

```bash
git clone https://github.com/TheC03L/ALPHA
cd ALPHA
chmod +x installer/install.sh
./installer/install.sh
```

Then open **http://<YOUR-PI-IP>:5000** and register the first account (becomes admin).

## Manual Install

### 1. Backend

```bash
cd ALPHA
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 server/run.py
```

API runs on **http://<YOUR-PI-ADRESS>:5000**

### 2. Frontend

```bash
cd ALPHA/ui
npm install
npm run build    # production build
# OR
npm run dev      # development with hot reload
```

UI runs on **http://<YOUR-PI-ADRESS>:3000** (dev) or from the built `dist/` folder.

### 3. AI (optional)

Install Ollama for local AI features:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:1b
```

### 4. SMB Sharing (optional)

```bash
sudo apt install samba
sudo smbpasswd -a $USER
```

## Default Admin

The first user to register is automatically assigned the `admin` role.

## Architecture

```
ALPHA/
├── server/          # Flask API backend (Python)
│   ├── api/         # Route handlers
│   ├── models/      # Database models
│   ├── main.py      # App factory
│   └── run.py       # Entry point
├── ui/              # React + TypeScript frontend
│   └── src/
│       ├── pages/   # Page components
│       ├── hooks/   # React hooks
│       ├── components/  # Shared components
│       └── styles/  # CSS (Glass UI theme)
├── installer/       # Install script
├── storage/         # File storage mount point
├── remote/          # Remote access config
├── apps/            # Built-in app specs
└── extensions/      # Extension registry
```

## API Overview

| Endpoint | Description |
|----------|-------------|
| `GET /api/status` | Server status |
| `/api/auth/*` | Register, login, profile |
| `/api/storage/*` | File manager, drives, pool |
| `/api/devices/*` | Network device discovery |
| `/api/ai/*` | Chat, models, file analysis |
| `/api/extensions/*` | Extension install/management |
| `/api/apps/*` | App module management |
| `/api/system/*` | System status, updates, control |
| `/api/notifications/*` | Notifications, broadcast |
| `/api/users/*` | User management (admin) |
| `/api/remote/*` | Remote access config |

## Themes & Wallpapers

7 accent colors (Purple, Blue, Green, Orange, Pink, Teal, Red) and 7 wallpapers (None, Dots, Stripes, Grid, Glow Top, Glow Right, Glow Bottom). Configure in **Settings > Appearance**.

## Roles

- **admin** — full access, manage users/system
- **user** — standard file/ app/ AI access
- **limited** — restricted permissions (family)
- **joke** — experimental account type

## Cluster Display Node

Use a secondary Raspberry Pi as a dedicated display for ALPHA:

- **3.5" GPIO TFT** — shows the web dashboard in kiosk mode
- **16×2 I2C LCD** — live status: faults, AI health, CPU, time
- **Voice AI** — microphone input queries Ollama through the display


## Specs

- **Backend**: Python/Flask, SQLite, JWT auth, REST API
- **Frontend**: React 18, TypeScript, Vite, Glassmorphism UI
- **AI**: Ollama integration (local), OpenAI/Gemini/Claude providers
- **Cluster Display**: 16x2 I2C LCD client, 3.5" TFT kiosk dashboard
- **Deploy**: Raspberry Pi 5 (primary), RPi 3B+ (display node), any Linux server

## License

MIT
