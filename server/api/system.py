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
                raw = round(int(f.read().strip()) / 1000, 1)
                if raw > 0:
                    temp = raw
    except:
        pass
    try:
        uptime_seconds = int(datetime.datetime.now().timestamp() - psutil.Process().create_time())
    except:
        uptime_seconds = 0
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
    try:
        result = subprocess.run(['git', 'pull'], capture_output=True, text=True, cwd=base_dir, timeout=30)
        if result.returncode == 0:
            subprocess.run(['npm', 'run', 'build'], cwd=os.path.join(base_dir, 'ui'), capture_output=True, text=True, timeout=120)
            return jsonify({'message': 'Update applied. Restarting...'})
        return jsonify({'error': result.stderr or 'Git pull failed'}), 500
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Update timed out'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@system_bp.route('/dev-update', methods=['POST'])
def dev_update():
    import threading, time as _time
    out_lines = []
    def log(msg):
        out_lines.append(msg)
        print(msg, flush=True)
    log("=== Dev Update ===")
    log("Running: bash update.sh")
    try:
        r = subprocess.run(['bash', 'update.sh'], capture_output=True, text=True, cwd='/home/pi/ALPHA', timeout=600)
        if r.stdout: log(r.stdout[-3000:])
        if r.stderr: log(r.stderr[-1000:])
        if r.returncode != 0:
            log('Warning: update.sh returned non-zero, but continuing...')
        log("=== Update Complete ===")
        log("Server will restart in 3 seconds...")
        def _restart():
            _time.sleep(3)
            import os, signal
            subprocess.run(['sudo', 'systemctl', 'restart', 'alpha.service'], capture_output=True, timeout=30)
        threading.Thread(target=_restart, daemon=True).start()
        return jsonify({'output': chr(10).join(out_lines)})
    except subprocess.TimeoutExpired:
        return jsonify({'output': chr(10).join(out_lines) if out_lines else '', 'error': 'Timed out'}), 500
    except Exception as e:
        import traceback
        return jsonify({'output': chr(10).join(out_lines) if out_lines else '', 'error': str(e), 'traceback': traceback.format_exc()}), 500