from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from main import db
import json
import os

remote_bp = Blueprint('remote', __name__)

REMOTE_CONFIG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'remote', 'config.json')

def get_config():
    if os.path.exists(REMOTE_CONFIG):
        try:
            with open(REMOTE_CONFIG) as f:
                return json.load(f)
        except:
            pass
    return {'enabled': False, 'url': None, 'tunnel': None, 'auto_connect': False}

def save_config(cfg):
    os.makedirs(os.path.dirname(REMOTE_CONFIG), exist_ok=True)
    with open(REMOTE_CONFIG, 'w') as f:
        json.dump(cfg, f, indent=2)

@remote_bp.route('/status')
@login_required
def status():
    cfg = get_config()
    return jsonify({
        'enabled': cfg.get('enabled', False),
        'url': cfg.get('url'),
        'tunnel': cfg.get('tunnel'),
        'auto_connect': cfg.get('auto_connect', False),
        'message': 'Configure tunnels via remote settings' if not cfg.get('enabled') else 'Remote access active'
    })

@remote_bp.route('/enable', methods=['POST'])
@login_required
def enable():
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin required'}), 403
    cfg = get_config()
    cfg['enabled'] = True
    cfg['tunnel'] = request.json.get('tunnel', 'local')
    save_config(cfg)
    return jsonify({'message': 'Remote access enabled', 'config': cfg})

@remote_bp.route('/disable', methods=['POST'])
@login_required
def disable():
    cfg = get_config()
    cfg['enabled'] = False
    save_config(cfg)
    return jsonify({'message': 'Remote access disabled'})
