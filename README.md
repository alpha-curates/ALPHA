# ALPHA

A private, beautiful, AI-powered personal cloud operating system that runs on your own hardware.

## Quick Start

```bash
curl -fsSL https://alpha-os.org/install.sh | bash
```

Or manually:

```bash
git clone https://github.com/TheC03L/ALPHA
cd ALPHA
./installer/install.sh
```

## Development

### Backend

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
python run.py
```

### Frontend

```bash
cd ui
npm install
npm run dev
```

## Architecture

```
ALPHA/
├── server/        # Flask API backend
├── ui/            # React + TypeScript frontend
├── storage/       # File storage root
├── installer/     # Installation scripts
├── extensions/    # Extension registry
├── apps/          # Built-in apps
└── remote/        # Remote access config
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Server status |
| `/api/auth/*` | - | Authentication |
| `/api/storage/*` | - | Storage management |
| `/api/devices/*` | - | Device management |
| `/api/ai/*` | - | AI Studio |
| `/api/extensions/*` | - | Extension system |
| `/api/system/*` | - | System control |
| `/api/notifications/*` | - | Notifications |
| `/api/users/*` | - | User management |

## Default Admin

First registered user automatically becomes admin.

## License

MIT
