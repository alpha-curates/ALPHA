from flask import Blueprint, jsonify, request
from main import db
from models.models import BackupJob, TrashItem
from flask_login import login_required, current_user
from datetime import datetime, timedelta
import os, subprocess, shutil, json

sys_tools_bp = Blueprint('sys_tools', __name__)

@sys_tools_bp.route('/logs')
@login_required
def get_logs():
    lines = int(request.args.get('lines', 100))
    log_files = [
        '/var/log/syslog', '/var/log/messages',
        '/var/log/kern.log', '/var/log/auth.log'
    ]
    result = {}
    for lf in log_files:
        if os.path.exists(lf):
            try:
                r = subprocess.run(['tail', '-n', str(lines), lf], capture_output=True, text=True, timeout=5)
                result[os.path.basename(lf)] = r.stdout.split('\n')
            except:
                result[os.path.basename(lf)] = ['Error reading log']
    # Also try journalctl
    try:
        r = subprocess.run(['journalctl', '--no-pager', '-n', str(lines)], capture_output=True, text=True, timeout=5)
        result['journal'] = r.stdout.split('\n')
    except:
        pass
    return jsonify(result)

@sys_tools_bp.route('/processes')
@login_required
def get_processes():
    sort_by = request.args.get('sort', 'cpu')
    try:
        args = ['ps', 'aux', '--sort=-%' + sort_by[:3]]
        r = subprocess.run(args, capture_output=True, text=True, timeout=5)
        lines = r.stdout.strip().split('\n')
        if len(lines) < 2: return jsonify([])
        header = lines[0].split()
        procs = []
        for line in lines[1:]:
            parts = line.split(None, 10)
            if len(parts) >= 11:
                procs.append({
                    'user': parts[0], 'pid': parts[1], 'cpu': parts[2], 'mem': parts[3],
                    'vsz': parts[4], 'rss': parts[5], 'tty': parts[6], 'stat': parts[7],
                    'start': parts[8], 'time': parts[9], 'command': parts[10][:80]
                })
        return jsonify(procs[:100])
    except:
        return jsonify([])

@sys_tools_bp.route('/processes/kill', methods=['POST'])
@login_required
def kill_process():
    pid = request.json.get('pid')
    if not pid: return jsonify({'error': 'PID required'}), 400
    try:
        subprocess.run(['kill', str(pid)], timeout=5)
        return jsonify({'message': f'Killed {pid}'})
    except:
        return jsonify({'error': f'Failed to kill {pid}'}), 500

@sys_tools_bp.route('/disk-health')
@login_required
def disk_health():
    drives = []
    try:
        r = subprocess.run(['lsblk', '-J', '-o', 'NAME,SIZE,TYPE,MOUNTPOINT,MODEL'], capture_output=True, text=True, timeout=5)
        data = json.loads(r.stdout)
        for dev in data.get('blockdevices', []):
            if dev.get('type') == 'disk':
                drives.append({
                    'name': dev['name'], 'size': dev.get('size', ''),
                    'model': dev.get('model', '').strip(),
                    'mount': dev.get('mountpoint', '')
                })
    except:
        pass
    smart_data = []
    try:
        r = subprocess.run(['sudo', 'smartctl', '--scan'], capture_output=True, text=True, timeout=5)
        for line in r.stdout.strip().split('\n'):
            if line:
                parts = line.split()
                if parts:
                    dev = parts[0]
                    try:
                        sr = subprocess.run(['sudo', 'smartctl', '-H', dev], capture_output=True, text=True, timeout=5)
                        for sl in sr.stdout.split('\n'):
                            if 'PASSED' in sl or 'FAILED' in sl:
                                smart_data.append({'device': dev, 'status': 'PASSED' if 'PASSED' in sl else 'FAILED'})
                    except:
                        pass
    except:
        pass
    return jsonify({'drives': drives, 'smart': smart_data})

@sys_tools_bp.route('/ping', methods=['POST'])
@login_required
def ping_host():
    data = request.json
    host = data.get('host', '')
    count = int(data.get('count', 4))
    if not host: return jsonify({'error': 'No host'}), 400
    try:
        r = subprocess.run(['ping', '-c', str(count), '-W', '3', host], capture_output=True, text=True, timeout=30)
        return jsonify({'output': r.stdout, 'error': r.stderr, 'return_code': r.returncode})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sys_tools_bp.route('/wake', methods=['POST'])
@login_required
def wake_device():
    data = request.json
    mac = data.get('mac', '')
    if not mac: return jsonify({'error': 'No MAC'}), 400
    try:
        import socket
        mac_clean = mac.replace(':', '').replace('-', '')
        mac_bytes = bytes.fromhex(mac_clean)
        magic = b'\xff' * 6 + mac_bytes * 16
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        s.sendto(magic, ('255.255.255.255', 9))
        s.close()
        return jsonify({'message': f'Wake packet sent to {mac}'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- Backup Jobs ---
@sys_tools_bp.route('/backups')
@login_required
def list_backups():
    jobs = BackupJob.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'id': j.id, 'name': j.name, 'source_path': j.source_path, 'dest_path': j.dest_path,
        'schedule': j.schedule, 'enabled': j.enabled, 'last_run': j.last_run.isoformat() if j.last_run else None,
        'last_status': j.last_status, 'created_at': j.created_at.isoformat()
    } for j in jobs])

@sys_tools_bp.route('/backups', methods=['POST'])
@login_required
def create_backup():
    data = request.json
    job = BackupJob(
        user_id=current_user.id, name=data.get('name', 'Backup'),
        source_path=data.get('source_path', ''), dest_path=data.get('dest_path', ''),
        schedule=data.get('schedule', 'manual'), enabled=data.get('enabled', True)
    )
    db.session.add(job)
    db.session.commit()
    return jsonify({'id': job.id}), 201

@sys_tools_bp.route('/backups/<job_id>/run', methods=['POST'])
@login_required
def run_backup(job_id):
    job = BackupJob.query.get(job_id)
    if not job or job.user_id != current_user.id: return jsonify({'error': 'Not found'}), 404
    try:
        src = os.path.expanduser(job.source_path)
        dst = os.path.expanduser(job.dest_path)
        os.makedirs(dst, exist_ok=True)
        if os.path.isdir(src):
            base = os.path.basename(src.rstrip('/'))
            dest_file = os.path.join(dst, f"{base}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.tar.gz")
            r = subprocess.run(['tar', '-czf', dest_file, '-C', os.path.dirname(src), base], capture_output=True, text=True, timeout=300)
            job.last_status = 'success' if r.returncode == 0 else 'failed'
        else:
            shutil.copy2(src, dst)
            job.last_status = 'success'
        job.last_run = datetime.utcnow()
        db.session.commit()
        return jsonify({'status': job.last_status})
    except Exception as e:
        job.last_status = 'failed'
        db.session.commit()
        return jsonify({'error': str(e)}), 500

@sys_tools_bp.route('/backups/<job_id>', methods=['DELETE'])
@login_required
def delete_backup(job_id):
    job = BackupJob.query.get(job_id)
    if not job or job.user_id != current_user.id: return jsonify({'error': 'Not found'}), 404
    db.session.delete(job)
    db.session.commit()
    return jsonify({'message': 'Deleted'})

# --- File Operations Extension ---
@sys_tools_bp.route('/batch-download', methods=['POST'])
@login_required
def batch_download():
    data = request.json
    paths = data.get('paths', [])
    if not paths: return jsonify({'error': 'No paths'}), 400
    import tempfile, zipfile, io
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        for fp in paths:
            abs_path = os.path.normpath(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', fp))
            if os.path.exists(abs_path):
                zf.write(abs_path, os.path.basename(abs_path))
    buf.seek(0)
    import base64 as b64
    return jsonify({'zip': b64.b64encode(buf.getvalue()).decode(), 'filename': 'batch_download.zip'})

@sys_tools_bp.route('/disk-usage')
@login_required
def disk_usage():
    try:
        r = subprocess.run(['df', '-h'], capture_output=True, text=True, timeout=5)
        lines = r.stdout.strip().split('\n')
        mounts = []
        for line in lines[1:]:
            parts = line.split()
            if len(parts) >= 6:
                mounts.append({'filesystem': parts[0], 'size': parts[1], 'used': parts[2], 'avail': parts[3], 'use_percent': parts[4], 'mounted_on': parts[5]})
        return jsonify(mounts)
    except:
        return jsonify([])
