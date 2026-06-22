from flask import Blueprint, jsonify, request
from flask_login import login_required
import psutil
import platform
import subprocess
import os
import datetime
import requests
import shutil
import tarfile
import io

system_bp = Blueprint('system', __name__)

ALPHA_VERSION = '1.0.0'
ALPHA_REPO = 'TheC03L/ALPHA'
BACKUP_DIR = '/tmp/alpha-backup'

@system_bp.route('/status')
@login_required
def status():
    cpu = psutil.cpu_percent(interval=1)
    cpu_count = psutil.cpu_count()
    mem = psutil.virtual_memory()
    temp = 'N/A'
    try:
        if os.path.exists('/sys/class/thermal/thermal_zone0/temp'):
            with open('/sys/class/thermal/thermal_zone0/temp') as f:
                temp = round(int(f.read().strip()) / 1000, 1)
    except:
        pass
    uptime_seconds = int(datetime.datetime.now().timestamp() - psutil.boot_time())
    days = uptime_seconds // 86400
    hours = (uptime_seconds % 86400) // 3600
    minutes = (uptime_seconds % 3600) // 60
    return jsonify({
        'version': ALPHA_VERSION,
        'platform': platform.platform(),
        'hostname': platform.node(),
        'cpu': {'percent': cpu, 'cores': cpu_count},
        'memory': {'total': mem.total, 'used': mem.used, 'percent': mem.percent},
        'temperature': temp,
        'uptime': f'{days}d {hours}h {minutes}m',
        'python': platform.python_version(),
        'time': datetime.datetime.now().isoformat()
    })

@system_bp.route('/restart', methods=['POST'])
@login_required
def restart():
    subprocess.Popen(['sudo', 'systemctl', 'restart', 'alpha'], start_new_session=True)
    return jsonify({'message': 'Restarting ALPHA...'})

@system_bp.route('/shutdown', methods=['POST'])
@login_required
def shutdown():
    subprocess.Popen(['sudo', 'shutdown', '-h', 'now'], start_new_session=True)
    return jsonify({'message': 'Shutting down...'})

@system_bp.route('/update/check')
@login_required
def check_update():
    try:
        r = requests.get(f'https://api.github.com/repos/{ALPHA_REPO}/releases/latest', timeout=10)
        if r.status_code == 200:
            data = r.json()
            latest = data.get('tag_name', '').lstrip('v')
            return jsonify({
                'current': ALPHA_VERSION,
                'latest': latest,
                'update_available': latest > ALPHA_VERSION,
                'release_url': data.get('html_url', ''),
                'body': data.get('body', '')
            })
        return jsonify({'current': ALPHA_VERSION, 'latest': ALPHA_VERSION, 'update_available': False, 'error': 'Could not fetch release'})
    except Exception as e:
        return jsonify({'current': ALPHA_VERSION, 'latest': ALPHA_VERSION, 'update_available': False, 'error': str(e)})

@system_bp.route('/update/apply', methods=['POST'])
@login_required
def apply_update():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    backup_path = f'{BACKUP_DIR}-{datetime.datetime.now().strftime("%Y%m%d%H%M%S")}'
    try:
        shutil.copytree(base_dir, backup_path, ignore=shutil.ignore_patterns('.venv', 'node_modules', '__pycache__', '.git', '*.db', 'storage'))
        r = requests.get(f'https://api.github.com/repos/{ALPHA_REPO}/tarball/main', stream=True, timeout=30)
        if r.status_code != 200:
            return jsonify({'error': 'Failed to download update'}), 500
        with tarfile.open(fileobj=io.BytesIO(r.content), mode='r:gz') as tar:
            top_dir = tar.getnames()[0].split('/')[0]
            for member in tar.getmembers():
                if member.name.startswith(top_dir + '/'):
                    member.name = member.name[len(top_dir) + 1:]
                    if member.name and not any(member.name.startswith(p) for p in ['.venv/', 'node_modules/', 'ui/node_modules/', 'storage/']):
                        tar.extract(member, base_dir)
        return jsonify({'message': 'Update applied. Restarting...', 'backup': backup_path})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
