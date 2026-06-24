from flask import Blueprint, jsonify, request, send_file
from main import db
from models.models import StorageDrive, StoragePool, TrashItem
from flask_login import login_required, current_user
import psutil, os, shutil, mimetypes, json, subprocess as sp, threading, time, re
from datetime import datetime

storage_bp = Blueprint('storage', __name__)

STORAGE_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'storage')
EXTERNAL_DIR = os.path.join(STORAGE_BASE, 'external')

# Auto-detect + mount external drives in background
_external_drives_lock = threading.Lock()
_drive_watcher_started = False

def _auto_mount_loop():
    while True:
        try:
            _scan_and_mount_external()
        except: pass
        time.sleep(15)

def _scan_and_mount_external():
    os.makedirs(EXTERNAL_DIR, exist_ok=True)
    # Get all block devices via lsblk
    try:
        r = sp.run(['lsblk', '-J', '-o', 'NAME,SIZE,TYPE,MOUNTPOINT,MODEL,UUID,FSTYPE'], capture_output=True, text=True, timeout=10)
        if r.returncode != 0: return
        data = json.loads(r.stdout)
    except: return

    def walk_devices(devices, prefix=''):
        for dev in devices:
            name = dev.get('name', '')
            dtype = dev.get('type', '')
            mp = dev.get('mountpoint', '') or ''
            fstype = dev.get('fstype', '') or ''
            size = dev.get('size', '0')
            model = dev.get('model', '')
            uuid = dev.get('uuid', '') or ''
            if dtype in ('disk', 'rom'): continue
            if not fstype: continue
            if mp and mp.startswith('/boot'): continue
            if mp and mp.startswith('/'): continue
            if not mp: continue
            devpath = f'/dev/{name}'
            with _external_drives_lock:
                existing = StorageDrive.query.filter_by(device=devpath).first()
                if existing: continue
            size_bytes = 0
            try:
                s = sp.run(['lsblk', '-b', '-J', '-o', 'NAME,SIZE', devpath], capture_output=True, text=True, timeout=5)
                if s.returncode == 0:
                    sd = json.loads(s.stdout)
                    for bd in sd.get('blockdevices', []):
                        sz = bd.get('size', '0').replace('B','').strip()
                        try: size_bytes = int(float(sz))
                        except: pass
            except: pass
            if size_bytes < 1024*1024*1024: continue  # skip <1GB

            from models.models import gen_id
            storage_name = re.sub(r'[^a-zA-Z0-9]+', '_', model or name or 'drive').lower().strip('_') or f'ext_{uuid[:8]}' if uuid else f'ext_{name}'
            if not storage_name: storage_name = f'ext_{name}'
            mount_in_storage = os.path.join(EXTERNAL_DIR, storage_name)
            os.makedirs(mount_in_storage, exist_ok=True)
            try:
                sp.run(['mount', '--bind', mp, mount_in_storage], capture_output=True, text=True, timeout=10)
            except: continue
            pool = StoragePool.query.first()
            with _external_drives_lock:
                while True:
                    import hashlib, base64
                    hid = base64.urlsafe_b64encode(hashlib.md5(devpath.encode()).digest()).decode()[:12]
                    if not StorageDrive.query.get(hid):
                        break
                drive = StorageDrive(
                    id=hid, device=devpath, name=model or name, size=size_bytes, used=0,
                    mount_point=mp, health='healthy', storage_path=mount_in_storage,
                    is_external=True, uuid=uuid, pool_id=pool.id if pool else None
                )
                db.session.add(drive)
                if pool:
                    pool.total_size += size_bytes
                db.session.commit()

    for device in data.get('blockdevices', []):
        children = device.get('children', [])
        if children:
            walk_devices(children)
        else:
            walk_devices([device])

def _migrate_storage_model():
    try:
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'instance', 'alpha.db')
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            c = conn.cursor()
            for col in ['storage_path', 'is_external', 'uuid']:
                c.execute("PRAGMA table_info(storage_drive)")
                cols = [row[1] for row in c.fetchall()]
                if col not in cols:
                    c.execute(f"ALTER TABLE storage_drive ADD COLUMN {col} TEXT")
                    print(f'DB: added {col} to storage_drive')
            conn.commit(); conn.close()
    except: pass

def start_drive_watcher(app):
    global _drive_watcher_started
    if _drive_watcher_started: return
    _drive_watcher_started = True
    with app.app_context():
        _migrate_storage_model()
        t = threading.Thread(target=_auto_mount_loop, daemon=True)
        t.start()

def safe_path(path):
    full = os.path.abspath(os.path.join(STORAGE_BASE, path.lstrip('/')))
    if not full.startswith(STORAGE_BASE):
        return None
    return full

@storage_bp.route('/status')
@login_required
def status():
    usage = psutil.disk_usage('/')
    # Also scan external
    pool = StoragePool.query.first()
    ext_used = 0; ext_total = 0
    for d in StorageDrive.query.filter_by(is_external=True):
        try:
            u = psutil.disk_usage(d.mount_point)
            ext_total += u.total; ext_used += u.used
        except: pass
    return jsonify({
        'total': usage.total + ext_total,
        'used': usage.used + ext_used,
        'free': usage.free,
        'percent': round((usage.used + ext_used) / (usage.total + ext_total) * 100, 1) if (usage.total + ext_total) > 0 else 0
    })

@storage_bp.route('/drives')
@login_required
def drives():
    pool = StoragePool.query.first()
    drives = StorageDrive.query.all()
    return jsonify([{
        'id': d.id, 'device': d.device, 'name': d.name,
        'size': d.size, 'used': d.used, 'mount_point': d.mount_point,
        'health': d.health, 'pool_id': d.pool_id,
        'is_external': d.is_external, 'storage_path': d.storage_path,
        'uuid': d.uuid
    } for d in drives])

@storage_bp.route('/drives/scan', methods=['POST'])
@login_required
def scan_drives():
    partitions = psutil.disk_partitions()
    for p in partitions:
        if not StorageDrive.query.filter_by(device=p.device).first():
            try:
                usage = psutil.disk_usage(p.mountpoint)
                if usage.total < 1024*1024*1024: continue
                from models.models import gen_id
                drive = StorageDrive(
                    device=p.device, name=os.path.basename(p.device),
                    size=usage.total, used=usage.used,
                    mount_point=p.mountpoint, health='healthy', is_external=True
                )
                db.session.add(drive)
            except: pass
    db.session.commit()
    return jsonify({'message': 'Scan complete'})

@storage_bp.route('/drives/unmount', methods=['POST'])
@login_required
def unmount_drive():
    drive_id = request.json.get('drive_id', '')
    drive = StorageDrive.query.get(drive_id)
    if not drive: return jsonify({'error': 'Not found'}), 404
    try:
        if drive.storage_path and os.path.ismount(drive.storage_path):
            sp.run(['umount', drive.storage_path], check=True, timeout=10)
            os.rmdir(drive.storage_path)
        if drive.mount_point and drive.is_external and drive.mount_point != '/':
            sp.run(['umount', drive.mount_point], check=True, timeout=10)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    pool = StoragePool.query.first()
    if pool:
        pool.total_size = max(0, pool.total_size - (drive.size or 0))
    db.session.delete(drive)
    db.session.commit()
    return jsonify({'message': 'Drive unmounted and removed'})

@storage_bp.route('/pool')
@login_required
def pool():
    pool = StoragePool.query.first()
    if not pool:
        # Auto-create pool
        pool = StoragePool(name='ALPHA Pool')
        drives = StorageDrive.query.all()
        pool.total_size = sum(d.size for d in drives if d.is_external) + int(psutil.disk_usage('/').total)
        pool.used_size = sum(d.used for d in drives if d.is_external) + int(psutil.disk_usage('/').used)
        db.session.add(pool)
        for d in drives:
            d.pool_id = pool.id
        db.session.commit()
    return jsonify({
        'exists': True, 'id': pool.id, 'name': pool.name,
        'total': pool.total_size, 'used': pool.used_size,
        'health': pool.health, 'drive_count': len(pool.drives) if pool.drives else 0
    })

@storage_bp.route('/pool/create', methods=['POST'])
@login_required
def create_pool():
    if StoragePool.query.first():
        return jsonify({'error': 'Pool already exists'}), 400
    pool = StoragePool(name=request.json.get('name', 'ALPHA Pool'))
    drives = StorageDrive.query.all()
    pool.total_size = sum(d.size for d in drives if d.is_external) + int(psutil.disk_usage('/').total)
    pool.used_size = sum(d.used for d in drives if d.is_external) + int(psutil.disk_usage('/').used)
    db.session.add(pool)
    for d in drives:
        d.pool_id = pool.id
    db.session.commit()
    return jsonify({'message': 'Pool created', 'id': pool.id})

@storage_bp.route('/pool/add-drive', methods=['POST'])
@login_required
def add_drive_to_pool():
    drive_id = request.json.get('drive_id')
    pool_id = request.json.get('pool_id')
    drive = StorageDrive.query.get(drive_id)
    pool = StoragePool.query.get(pool_id)
    if drive and pool:
        drive.pool_id = pool.id
        pool.total_size += drive.size
        pool.used_size += drive.used
        db.session.commit()
    return jsonify({'message': 'Drive added to pool'})

@storage_bp.route('/pool/remove-drive', methods=['POST'])
@login_required
def remove_drive_from_pool():
    drive_id = request.json.get('drive_id')
    drive = StorageDrive.query.get(drive_id)
    if drive and drive.pool:
        drive.pool.total_size -= drive.size
        drive.pool.used_size -= drive.used
        drive.pool_id = None
        db.session.commit()
    return jsonify({'message': 'Drive removed from pool'})

# --- File operations (unchanged) ---
@storage_bp.route('/files', methods=['GET'])
@login_required
def list_files():
    path = request.args.get('path', '/')
    search = request.args.get('search', '').lower()
    full = safe_path(path);
    if not full: return jsonify({'error': 'Access denied'}), 403
    if not os.path.exists(full): return jsonify({'error': 'Path not found'}), 404
    items = []
    for f in sorted(os.listdir(full)):
        if search and search not in f.lower(): continue
        fp = os.path.join(full, f)
        stat = os.stat(fp)
        ext = os.path.splitext(f)[1].lower()
        mime, _ = mimetypes.guess_type(f)
        items.append({'name': f, 'path': os.path.relpath(fp, STORAGE_BASE), 'type': 'directory' if os.path.isdir(fp) else 'file', 'ext': ext, 'mime': mime or 'application/octet-stream', 'size': stat.st_size, 'modified': stat.st_mtime})
    return jsonify(sorted(items, key=lambda x: (x['type'] != 'directory', x['name'])))

@storage_bp.route('/files/info', methods=['GET'])
@login_required
def file_info():
    path = request.args.get('path', '')
    full = safe_path(path)
    if not full or not os.path.exists(full): return jsonify({'error': 'File not found'}), 404
    stat = os.stat(full); ext = os.path.splitext(full)[1].lower(); mime, _ = mimetypes.guess_type(full)
    return jsonify({'name': os.path.basename(full), 'path': path, 'type': 'directory' if os.path.isdir(full) else 'file', 'ext': ext, 'mime': mime, 'size': stat.st_size, 'modified': stat.st_mtime, 'previewable': mime and (mime.startswith('text/') or mime.startswith('image/'))})

@storage_bp.route('/files/preview', methods=['GET'])
@login_required
def preview():
    path = request.args.get('path', ''); full = safe_path(path)
    if not full or not os.path.isfile(full): return jsonify({'error': 'File not found'}), 404
    mime, _ = mimetypes.guess_type(full)
    if mime and mime.startswith('text/'): return jsonify({'content': open(full).read(100000), 'mime': mime})
    if mime and mime.startswith('image/'): return send_file(full, mimetype=mime)
    return jsonify({'error': 'Preview not available'}), 400

@storage_bp.route('/files/upload', methods=['POST'])
@login_required
def upload():
    path = request.args.get('path', '/'); full = safe_path(path)
    if not full: return jsonify({'error': 'Access denied'}), 403
    os.makedirs(full, exist_ok=True)
    request.files['file'].save(os.path.join(full, request.files['file'].filename))
    return jsonify({'message': 'File uploaded'})

@storage_bp.route('/files/delete', methods=['DELETE'])
@login_required
def delete_file():
    path = request.json.get('path', ''); full = safe_path(path)
    if not full or not os.path.exists(full): return jsonify({'error': 'Not found'}), 404
    trash_dir = os.path.join(STORAGE_BASE, '.trash'); os.makedirs(trash_dir, exist_ok=True)
    rel = os.path.relpath(full, STORAGE_BASE)
    trash_name = f"{os.path.basename(full)}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    shutil.move(full, os.path.join(trash_dir, trash_name))
    size = os.path.getsize(os.path.join(trash_dir, trash_name)) if os.path.isfile(os.path.join(trash_dir, trash_name)) else 0
    item = TrashItem(original_path=rel, storage_path=trash_name, file_name=os.path.basename(full), file_size=size, deleted_by=current_user.id)
    db.session.add(item); db.session.commit()
    return jsonify({'message': 'Moved to trash', 'trash_id': item.id})

@storage_bp.route('/files/mkdir', methods=['POST'])
@login_required
def mkdir():
    path = request.json.get('path', '/'); name = request.json.get('name', ''); full = safe_path(os.path.join(path, name))
    if not full: return jsonify({'error': 'Access denied'}), 403
    os.makedirs(full, exist_ok=True); return jsonify({'message': 'Created'})

@storage_bp.route('/files/rename', methods=['PUT'])
@login_required
def rename():
    path = request.json.get('path', ''); new_name = request.json.get('new_name', '')
    old = safe_path(path); new = safe_path(os.path.join(os.path.dirname(path), new_name))
    if not old or not new: return jsonify({'error': 'Access denied'}), 403
    os.rename(old, new); return jsonify({'message': 'Renamed'})

@storage_bp.route('/files/move', methods=['PUT'])
@login_required
def move():
    path = request.json.get('path', ''); dest = request.json.get('dest', '')
    old = safe_path(path); new = safe_path(os.path.join(dest, os.path.basename(path)))
    if not old or not new: return jsonify({'error': 'Access denied'}), 403
    shutil.move(old, new); return jsonify({'message': 'Moved'})

@storage_bp.route('/files/copy', methods=['POST'])
@login_required
def copy():
    path = request.json.get('path', ''); dest = request.json.get('dest', '')
    old = safe_path(path); new = safe_path(os.path.join(dest, os.path.basename(path)))
    if not old or not new: return jsonify({'error': 'Access denied'}), 403
    (shutil.copy2 if os.path.isfile(old) else shutil.copytree)(old, new)
    return jsonify({'message': 'Copied'})

@storage_bp.route('/smb/status')
@login_required
def smb_status():
    return jsonify({'enabled': os.path.exists('/etc/samba/smb.conf'), 'shares': ['storage']})

@storage_bp.route('/smb/enable', methods=['POST'])
@login_required
def smb_enable():
    return jsonify({'message': 'SMB sharing setup requires samba configuration on the server'})
