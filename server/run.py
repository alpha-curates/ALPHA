#!/usr/bin/env python3
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import create_app, socketio
from config import Config

try:
    app = create_app()
except Exception as e:
    import traceback
    print(f'ALPHA startup failed: {e}', flush=True)
    traceback.print_exc()
    sys.exit(1)

if __name__ == '__main__':
    print(f'ALPHA ready on 0.0.0.0:{Config.CORE_PORT}', flush=True)
    socketio.run(app, host='0.0.0.0', port=Config.CORE_PORT, debug=False)
