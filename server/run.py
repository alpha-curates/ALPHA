#!/usr/bin/env python3
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import create_app, socketio
from config import Config

app = create_app()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=Config.CORE_PORT, debug=True)
