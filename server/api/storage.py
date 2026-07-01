from flask import Blueprint, jsonify, request, send_file
from main import db
from models.models import StorageDrive, StoragePool, TrashItem, gen_id
from flask_login import login_required, current_user
import psutil, os, shutil, mimetypes, json, subprocess as sp, threading, time, re, uuid as uuid_lib, base64, hashlib
from datetime import datetime

storage_bp = Blueprint('storage', __name__)

STORAGE_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'storage')
EXTERNAL_DIR = os.path.join(STORAGE_BASE, 'external')
USERS_DIR = os.path.join(STORAGE_BASE, 'users')
SYSTEM_FILE_PATTERNS = {'.git', 'node_modules', '.venv', '__pycache__', '.trash', '.gitkeep', '.DS_Store', 'Thumbs.db', '.env', '.npm', '.cache', '*.pyc', '*.pyo', '*.egg-info'}

_external_drives_lock = threading.Lock()
_drive_watcher_started = False

# ---------------------------------------------------------------------------
# System drive detection
# ---------------------------------------------------------------------------

SYSTEM_MOUNTS = frozenset({'/', '/boot', '/boot/efi', '/home', '/var', '/usr', '/etc', '/opt', '/root'})

def _get_parent_disk(name):
    if not name:
        return None
    m = re.match(r'(nvme\d+n\d+)p\d+$', name)
    if m:
        return m.group(1)
    m = re.match(r'(mmcblk\d+)p\d+$', name)
    if m:
        return m.group(1)
    m = re.match(r'([a-z]+)\d+$', name)
    if m:
        return m.group(1)
    return name

def _get_system_disk_names():
    disks = set()
    for mp in ('/', '/boot', '/boot/efi'):
        try:
            r = sp.run(['findmnt', '-J', '-T', mp], capture_output=True, text=True, timeout=5)
            if r.returncode == 0:
                data = json.loads(r.stdout)
                src = data.get('filesystems', [{}])[0].get('source', '')
                parent = _get_parent_disk(os.path.basename(src.split('[')[0]))
                if parent:
                    disks.add(parent)
        except:
            pass
    return disks

def _is_system_drive(device_name, mountpoint):
    if mountpoint and mountpoint in SYSTEM_MOUNTS:
        return True
    parent = _get_parent_disk(device_name)
    return parent in _get_system_disk_names() if parent else False

# ---------------------------------------------------------------------------
# lsblk helpers
# ---------------------------------------------------------------------------

_LSBLK_COLS = 'NAME,SIZE,TYPE,MOUNTPOINT,MODEL,SERIAL,UUID,FSTYPE,ROTA,PKNAME,TRAN'

def _run_lsblk(device=None):
    cmd = ['lsblk', '-J', '-o', _LSBLK_COLS]
    if device:
        cmd.append(device)
    try:
        r = sp.run(cmd, capture_output=True, text=True, timeout=10)
        if r.returncode == 0:
            return json.loads(r.stdout).get('blockdevices', [])
    except:
        pass
    return []

def _parse_size(val):
    if val is None:
        return 0
    if isinstance(val, (int, float)):
        return int(val)
    val = str(val).strip()
    try:
        return int(val)
    except:
        pass
    units = {'K': 1024, 'M': 1024**2, 'G': 1024**3, 'T': 1024**4, 'P': 1024**5}
    m = re.match(r'([\d.]+)\s*([KMGTP]?)', val)
    if m:
        return int(float(m.group(1)) * units.get(m.group(2), 1))
    return 0

def _get_bool(val, default=False):
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.lower() in ('1', 'true', 'yes')
    return default

def _classify_drive_type(devname, tran):
    if not devname:
        return 'unknown'
    if tran == 'usb':
        return 'usb'
    if devname.startswith('nvme'):
        return 'nvme'
    if devname.startswith('mmcblk'):
        return 'sdcard'
    if devname.startswith('sd') and tran == 'usb':
        return 'usb'
    if devname.startswith('sd'):
        return 'sata'
    if devname.startswith('vd'):
        return 'virtio'
    if devname.startswith('loop'):
        return 'loop'
    if tran:
        return tran
    return 'unknown'

def _get_uuid(devpath):
    try:
        r = sp.run(['blkid', '-s', 'UUID', '-o', 'value', devpath], capture_output=True, text=True, timeout=5)
        if r.returncode == 0:
            val = r.stdout.strip()
            return val if val else None
    except:
        pass
    return None

def _get_drive_temperature(devpath):
    name = os.path.basename(devpath)
    try:
        r = sp.run(['smartctl', '-A', devpath], capture_output=True, text=True, timeout=10)
        for line in r.stdout.splitlines():
            if 'Temperature_Celsius' in line:
                parts = line.split()
                for p in parts:
                    try:
                        return int(p)
                    except:
                        continue
    except:
        pass
    try:
        r = sp.run(['hddtemp', devpath], capture_output=True, text=True, timeout=5)
        m = re.search(r'(\d+)°C', r.stdout)
        if m:
            return int(m.group(1))
    except:
        pass
    try:
        if 'nvme' in name:
            r = sp.run(['nvme', 'smart-log', devpath], capture_output=True, text=True, timeout=5)
            m = re.search(r'temperature\s*:\s*(\d+)\s*[CK]', r.stdout, re.I)
            if m:
                t = int(m.group(1))
                return t - 273 if t > 1000 else t
    except:
        pass
    try:
        with open(f'/sys/block/{name}/device/temperature', 'r') as f:
            val = f.read().strip()
            t = int(val)
            return t // 1000 if t > 1000 else t
    except:
        pass
    return None

# ---------------------------------------------------------------------------
# Master drive detection – combines lsblk, psutil, blkid
# ---------------------------------------------------------------------------

def _detect_all_drives():
    system_disks = _get_system_disk_names()
    blockdevices = _run_lsblk()

    # Build disk_name -> {model, serial, tran, rota} map
    disk_map = {}
    def _build_disk_map(devices, parent_info=None):
        for dev in devices:
            name = dev.get('name', '')
            dtype = dev.get('type', '')
            if dtype == 'disk':
                info = {
                    'model': dev.get('model', '') or '',
                    'serial': dev.get('serial', '') or '',
                    'tran': dev.get('tran', '') or '',
                    'rota': _get_bool(dev.get('rota', False)),
                    'disk_name': name,
                }
                disk_map[name] = info
                for child in dev.get('children', []):
                    disk_map[child.get('name', '')] = info
                    _build_disk_map([child], info)
            elif dtype == 'part' and parent_info:
                disk_map[name] = parent_info
            elif dtype == 'disk' and not dev.get('children'):
                disk_map[name] = {
                    'model': dev.get('model', '') or '',
                    'serial': dev.get('serial', '') or '',
                    'tran': dev.get('tran', '') or '',
                    'rota': _get_bool(dev.get('rota', False)),
                    'disk_name': name,
                }
    _build_disk_map(blockdevices)

    # Collect psutil mount info
    psutil_devs = {}
    for part in psutil.disk_partitions():
        dname = os.path.basename(part.device)
        try:
            usage = psutil.disk_usage(part.mountpoint)
            total_sz, used_sz = usage.total, usage.used
        except:
            total_sz, used_sz = 0, 0
        psutil_devs[dname] = {
            'device': part.device,
            'mount_point': part.mountpoint,
            'filesystem': part.fstype,
            'size': total_sz,
            'used': used_sz,
        }

    drives = []
    seen = set()

    # 1 – entries from psutil (currently mounted)
    for dname, info in psutil_devs.items():
        device = info['device']
        if device in seen:
            continue
        seen.add(device)

        di = disk_map.get(dname, {})
        disk_name = di.get('disk_name', _get_parent_disk(dname) or dname)
        is_sys = (disk_name in system_disks) or (info['mount_point'] in SYSTEM_MOUNTS)

        drives.append({
            'device': device,
            'name': di.get('model', '') or dname,
            'size': info['size'],
            'used': info['used'],
            'mount_point': info['mount_point'],
            'filesystem': info['filesystem'],
            'uuid': _get_uuid(device),
            'model': di.get('model', '') or None,
            'serial': di.get('serial', '') or None,
            'drive_type': _classify_drive_type(disk_name, di.get('tran', '')),
            'is_system_drive': is_sys,
            'is_removable': di.get('tran', '') == 'usb' or disk_name.startswith('mmcblk'),
            'is_rotational': bool(di.get('rota', False)),
            'temperature': _get_drive_temperature(device),
            'disk_name': disk_name,
        })

    # 2 – partitions from lsblk not yet seen (unmounted)
    def _add_lsblk_unmounted(devices):
        for dev in devices:
            dtype = dev.get('type', '')
            name = dev.get('name', '')
            fstype = dev.get('fstype', '') or ''
            devpath = f'/dev/{name}'

            if dtype in ('disk', 'rom'):
                if dtype == 'disk' and not fstype:
                    _add_lsblk_unmounted(dev.get('children', []))
                    continue
                if dtype == 'rom':
                    continue

            if devpath in seen:
                continue
            if not fstype:
                continue

            di = disk_map.get(name, {})
            disk_name = di.get('disk_name', _get_parent_disk(name) or name)
            is_sys = disk_name in system_disks

            drives.append({
                'device': devpath,
                'name': di.get('model', '') or name,
                'size': _parse_size(dev.get('size', '0')),
                'used': 0,
                'mount_point': None,
                'filesystem': fstype,
                'uuid': dev.get('uuid', '') or _get_uuid(devpath),
                'model': di.get('model', '') or None,
                'serial': di.get('serial', '') or None,
                'drive_type': _classify_drive_type(disk_name, di.get('tran', '')),
                'is_system_drive': is_sys or any(
                    child.get('mountpoint') in SYSTEM_MOUNTS
                    for child in dev.get('children', [])
                ) if dtype == 'disk' else is_sys,
                'is_removable': di.get('tran', '') == 'usb' or disk_name.startswith('mmcblk'),
                'is_rotational': bool(di.get('rota', False)),
                'temperature': _get_drive_temperature(devpath),
                'disk_name': disk_name,
            })
            seen.add(devpath)

    _add_lsblk_unmounted(blockdevices)

    return drives

def _enrich_db_drives(db_drives):
    """Attach live-detected metadata to DB drive dicts."""
    live = {d['device']: d for d in _detect_all_drives()}
    for d in db_drives:
        dev = d.get('device', '')
        lv = live.get(dev, {})
        d['filesystem'] = lv.get('filesystem') or d.get('filesystem')
        d['model'] = lv.get('model') or d.get('model')
        d['serial'] = lv.get('serial')
        d['drive_type'] = lv.get('drive_type', 'unknown')
        d['is_system_drive'] = lv.get('is_system_drive', False)
        d['is_removable'] = lv.get('is_removable', False)
        d['is_rotational'] = lv.get('is_rotational', False)
        d['temperature'] = lv.get('temperature')
        d['disk_name'] = lv.get('disk_name')
        mp = d.get('mount_point')
        if mp and os.path.isdir(mp):
            try:
                u = psutil.disk_usage(mp)
                d['used'] = u.used
                d['size'] = u.total
            except:
                pass
    return db_drives

# ---------------------------------------------------------------------------
# Auto-mount loop (preserved and improved)
# ---------------------------------------------------------------------------

def _auto_mount_loop():
    while True:
        try:
            _scan_and_mount_external()
        except:
            pass
        time.sleep(15)

def _scan_and_mount_external():
    os.makedirs(EXTERNAL_DIR, exist_ok=True)
    system_disks = _get_system_disk_names()

    try:
        r = sp.run(['lsblk', '-J', '-o', 'NAME,SIZE,TYPE,MOUNTPOINT,MODEL,UUID,FSTYPE,PKNAME'],
                   capture_output=True, text=True, timeout=10)
        if r.returncode != 0:
            return
        data = json.loads(r.stdout)
    except:
        return

    def walk_devices(devices, prefix=''):
        for dev in devices:
            name = dev.get('name', '')
            dtype = dev.get('type', '')
            mp = dev.get('mountpoint', '') or ''
            fstype = dev.get('fstype', '') or ''
            model = dev.get('model', '') or ''
            uuid = dev.get('uuid', '') or ''
            pkname = dev.get('pkname', '') or ''

            if dtype in ('disk', 'rom'):
                for child in dev.get('children', []):
                    walk_devices([child])
                continue

            if not fstype:
                continue

            devpath = f'/dev/{name}'
            disk_name = _get_parent_disk(name) or pkname or name
            is_system = (disk_name in system_disks) or (mp in SYSTEM_MOUNTS)

            # Skip system drives and already-mounted-in-storage drives
            if is_system:
                continue
            if mp and mp.startswith(EXTERNAL_DIR):
                continue
            if not mp:
                continue

            with _external_drives_lock:
                existing = StorageDrive.query.filter_by(device=devpath).first()
                if existing:
                    continue

            # Bind-mount the device into our storage tree
            storage_name = re.sub(r'[^a-zA-Z0-9]+', '_', model or name).lower().strip('_') or f'ext_{uuid[:8] if uuid else name}'
            mount_in_storage = os.path.join(EXTERNAL_DIR, storage_name)
            os.makedirs(mount_in_storage, exist_ok=True)
            try:
                sp.run(['mount', '--bind', mp, mount_in_storage], capture_output=True, text=True, timeout=10)
            except:
                try:
                    os.rmdir(mount_in_storage)
                except:
                    pass
                continue

            pool = StoragePool.query.first()
            with _external_drives_lock:
                while True:
                    hid = base64.urlsafe_b64encode(hashlib.md5(devpath.encode()).digest()).decode()[:12]
                    if not StorageDrive.query.get(hid):
                        break
                drive = StorageDrive(
                    id=hid, device=devpath, name=model or name, size=0, used=0,
                    mount_point=mp, health='healthy', storage_path=mount_in_storage,
                    is_external=True, uuid=uuid, pool_id=pool.id if pool else None
                )
                db.session.add(drive)
                if pool:
                    pool.total_size += drive.size or 0
                db.session.commit()

    for device in data.get('blockdevices', []):
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
            conn.commit()
            conn.close()
    except:
        pass

def start_drive_watcher(app):
    global _drive_watcher_started
    if _drive_watcher_started:
        return
    _drive_watcher_started = True
    with app.app_context():
        _migrate_storage_model()
        t = threading.Thread(target=_auto_mount_loop, daemon=True)
        t.start()

def safe_path(path, user_id=None):
    base = STORAGE_BASE
    if user_id:
        base = os.path.join(USERS_DIR, user_id)
        os.makedirs(base, exist_ok=True)
    full = os.path.abspath(os.path.join(base, path.lstrip('/')))
    if not full.startswith(base):
        return None
    return full

# ---------------------------------------------------------------------------
# Helper – guard against system-drive operations
# ---------------------------------------------------------------------------

def _guard_system_drive(device_name, mountpoint):
    """Raise ValueError if the given device is a system drive."""
    if _is_system_drive(device_name, mountpoint):
        raise ValueError(f"Operation not allowed on system drive ({mountpoint or device_name})")

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@storage_bp.route('/status')
@login_required
def status():
    usage = psutil.disk_usage('/')
    pool = StoragePool.query.first()
    ext_used = 0
    ext_total = 0
    for d in StorageDrive.query.filter_by(is_external=True):
        try:
            u = psutil.disk_usage(d.mount_point)
            ext_total += u.total
            ext_used += u.used
        except:
            pass

    all_drives = _detect_all_drives()
    sys_drives = [d for d in all_drives if d['is_system_drive']]
    safe_drives = [d for d in all_drives if not d['is_system_drive']]

    return jsonify({
        'total': usage.total + ext_total,
        'used': usage.used + ext_used,
        'free': usage.free,
        'percent': round((usage.used + ext_used) / (usage.total + ext_total) * 100, 1) if (usage.total + ext_total) > 0 else 0,
        'drives_detected': len(all_drives),
        'system_drives': len(sys_drives),
        'safe_drives': len(safe_drives),
        'os_device': f"/dev/{list(_get_system_disk_names())[0]}" if _get_system_disk_names() else None,
    })

@storage_bp.route('/drives')
@login_required
def drives():
    db_drives = StorageDrive.query.all()
    result = [{
        'id': d.id, 'device': d.device, 'name': d.name,
        'size': d.size, 'used': d.used, 'mount_point': d.mount_point,
        'health': d.health, 'pool_id': d.pool_id,
        'is_external': d.is_external, 'storage_path': d.storage_path,
        'uuid': d.uuid,
    } for d in db_drives]
    return jsonify(_enrich_db_drives(result))

@storage_bp.route('/drives/all')
@login_required
def drives_all():
    """Return ALL detected drives (including system drives, marked as unsafe)."""
    return jsonify(_detect_all_drives())

@storage_bp.route('/drives/safe')
@login_required
def drives_safe():
    """Return only drives that are safe to operate on (non-system)."""
    return jsonify([d for d in _detect_all_drives() if not d['is_system_drive']])

@storage_bp.route('/drives/scan', methods=['POST'])
@login_required
def scan_drives():
    system_disks = _get_system_disk_names()
    all_detected = _detect_all_drives()
    added = 0
    skipped_system = 0

    for detected in all_detected:
        if detected['is_system_drive']:
            skipped_system += 1
            continue
        if StorageDrive.query.filter_by(device=detected['device']).first():
            continue
        try:
            drive = StorageDrive(
                device=detected['device'],
                name=detected['name'] or os.path.basename(detected['device']),
                size=detected['size'],
                used=detected['used'],
                mount_point=detected['mount_point'] or '',
                health='healthy',
                is_external=True,
                uuid=detected['uuid'] or '',
            )
            db.session.add(drive)
            added += 1
        except:
            pass

    db.session.commit()
    return jsonify({
        'message': f'Scan complete. Added {added} drive(s), skipped {skipped_system} system drive(s).',
        'added': added,
        'skipped_system': skipped_system,
        'total_detected': len(all_detected),
    })

@storage_bp.route('/drives/<drive_id>')
@login_required
def drive_detail(drive_id):
    """Return detailed info for a specific drive, with live lsblk data."""
    drive = StorageDrive.query.get(drive_id)
    if not drive:
        return jsonify({'error': 'Drive not found'}), 404

    base = {
        'id': drive.id, 'device': drive.device, 'name': drive.name,
        'size': drive.size, 'used': drive.used, 'mount_point': drive.mount_point,
        'health': drive.health, 'pool_id': drive.pool_id,
        'is_external': drive.is_external, 'storage_path': drive.storage_path,
        'uuid': drive.uuid,
    }
    enriched = _enrich_db_drives([base])[0]

    # Extra detail
    all_drives = _detect_all_drives()
    for d in all_drives:
        if d['device'] == drive.device:
            enriched['all_partitions'] = None
            disk_name = d.get('disk_name')
            if disk_name:
                enriched['partitions'] = [
                    p for p in all_drives
                    if p.get('disk_name') == disk_name and p['device'] != drive.device
                ]
            break

    return jsonify(enriched)

@storage_bp.route('/drives/unmount', methods=['POST'])
@login_required
def unmount_drive():
    drive_id = request.json.get('drive_id', '')
    drive = StorageDrive.query.get(drive_id)
    if not drive:
        return jsonify({'error': 'Drive not found'}), 404

    # SAFETY: never unmount system drives
    if _is_system_drive(os.path.basename(drive.device), drive.mount_point):
        return jsonify({'error': 'Cannot unmount a system drive – this would break the OS'}), 403

    try:
        if drive.storage_path and os.path.ismount(drive.storage_path):
            sp.run(['umount', drive.storage_path], check=True, timeout=10)
            try:
                os.rmdir(drive.storage_path)
            except:
                pass
        if drive.mount_point and drive.is_external and drive.mount_point != '/':
            sp.run(['umount', drive.mount_point], check=True, timeout=10)
    except Exception as e:
        return jsonify({'error': f'Failed to unmount: {str(e)}'}), 500

    pool = StoragePool.query.first()
    if pool:
        pool.total_size = max(0, pool.total_size - (drive.size or 0))
        pool.used_size = max(0, pool.used_size - (drive.used or 0))

    db.session.delete(drive)
    db.session.commit()
    return jsonify({'message': 'Drive unmounted and removed'})

@storage_bp.route('/drives/format', methods=['POST'])
@login_required
def format_drive():
    drive_id = request.json.get('drive_id', '')
    filesystem = request.json.get('filesystem', 'ext4')
    drive = StorageDrive.query.get(drive_id)
    if not drive:
        return jsonify({'error': 'Drive not found'}), 404

    # SAFETY: never format system drives
    if _is_system_drive(os.path.basename(drive.device), drive.mount_point):
        return jsonify({'error': 'Cannot format a system drive – this would destroy the OS'}), 403

    # SAFETY: require confirmation
    confirm = request.json.get('confirm', False)
    if not confirm:
        return jsonify({'error': 'Format requires explicit confirmation (confirm: true)'}), 400

    try:
        if drive.mount_point and os.path.ismount(drive.mount_point):
            sp.run(['umount', drive.mount_point], check=True, timeout=10)
        sp.run(['mkfs.' + filesystem, drive.device], check=True, timeout=120)
    except Exception as e:
        return jsonify({'error': f'Format failed: {str(e)}'}), 500

    # Remove from DB since it's been reformatted
    pool = StoragePool.query.first()
    if pool:
        pool.total_size = max(0, pool.total_size - (drive.size or 0))
    db.session.delete(drive)
    db.session.commit()

    return jsonify({'message': f'Drive formatted as {filesystem}. Re-scan to detect.'})

@storage_bp.route('/pool')
@login_required
def pool():
    pool = StoragePool.query.first()
    if not pool:
        pool = StoragePool(name='ALPHA Pool')
        drives = StorageDrive.query.all()
        safe_drives = [d for d in drives if not _is_system_drive(os.path.basename(d.device), d.mount_point)]
        pool.total_size = sum(d.size for d in safe_drives) + int(psutil.disk_usage('/').total)
        pool.used_size = sum(d.used for d in safe_drives) + int(psutil.disk_usage('/').used)
        db.session.add(pool)
        for d in safe_drives:
            d.pool_id = pool.id
        db.session.commit()

    drive_count = len(pool.drives) if pool.drives else 0
    return jsonify({
        'exists': True, 'id': pool.id, 'name': pool.name,
        'total': pool.total_size, 'used': pool.used_size,
        'health': pool.health, 'drive_count': drive_count,
    })

@storage_bp.route('/pool/create', methods=['POST'])
@login_required
def create_pool():
    if StoragePool.query.first():
        return jsonify({'error': 'Pool already exists'}), 400

    name = request.json.get('name', 'ALPHA Pool')

    # SAFETY: never include system drives in pool
    all_drives = StorageDrive.query.all()
    safe_drives = []
    for d in all_drives:
        if not _is_system_drive(os.path.basename(d.device), d.mount_point):
            safe_drives.append(d)

    pool = StoragePool(name=name)
    pool.total_size = sum(d.size for d in safe_drives) + int(psutil.disk_usage('/').total)
    pool.used_size = sum(d.used for d in safe_drives) + int(psutil.disk_usage('/').used)
    db.session.add(pool)
    for d in safe_drives:
        d.pool_id = pool.id
    db.session.commit()

    return jsonify({
        'message': f'Pool "{name}" created with {len(safe_drives)} drive(s)',
        'id': pool.id,
        'drive_count': len(safe_drives),
    })

@storage_bp.route('/pool/add-drive', methods=['POST'])
@login_required
def add_drive_to_pool():
    drive_id = request.json.get('drive_id')
    pool_id = request.json.get('pool_id')
    drive = StorageDrive.query.get(drive_id)
    pool = StoragePool.query.get(pool_id)
    if not drive:
        return jsonify({'error': 'Drive not found'}), 404
    if not pool:
        return jsonify({'error': 'Pool not found'}), 404

    # SAFETY: never add system drives to pool
    if _is_system_drive(os.path.basename(drive.device), drive.mount_point):
        return jsonify({'error': 'Cannot add system drive to pool'}), 403

    drive.pool_id = pool.id
    pool.total_size = (pool.total_size or 0) + (drive.size or 0)
    pool.used_size = (pool.used_size or 0) + (drive.used or 0)
    db.session.commit()
    return jsonify({'message': 'Drive added to pool'})

@storage_bp.route('/pool/remove-drive', methods=['POST'])
@login_required
def remove_drive_from_pool():
    drive_id = request.json.get('drive_id')
    drive = StorageDrive.query.get(drive_id)
    if not drive:
        return jsonify({'error': 'Drive not found'}), 404
    if drive.pool:
        drive.pool.total_size = max(0, (drive.pool.total_size or 0) - (drive.size or 0))
        drive.pool.used_size = max(0, (drive.pool.used_size or 0) - (drive.used or 0))
        drive.pool_id = None
        db.session.commit()
    return jsonify({'message': 'Drive removed from pool'})

# ---------------------------------------------------------------------------
# File operations (unchanged logic, preserved with safety)
# ---------------------------------------------------------------------------

@storage_bp.route('/files', methods=['GET'])
@login_required
def list_files():
    path = request.args.get('path', '/')
    search = request.args.get('search', '').lower()
    full = safe_path(path, str(current_user.id))
    if not full:
        return jsonify({'error': 'Access denied'}), 403
    if not os.path.exists(full):
        return jsonify({'error': 'Path not found'}), 404
    items = []
    for f in sorted(os.listdir(full)):
        if f.startswith('.') or f in SYSTEM_FILE_PATTERNS or f.endswith('.pyc') or f.endswith('.pyo'):
            continue
        if search and search not in f.lower():
            continue
        fp = os.path.join(full, f)
        try:
            stat = os.stat(fp)
        except:
            continue
        ext = os.path.splitext(f)[1].lower()
        mime, _ = mimetypes.guess_type(f)
        items.append({
            'name': f, 'path': os.path.relpath(fp, os.path.join(USERS_DIR, str(current_user.id))),
            'type': 'directory' if os.path.isdir(fp) else 'file',
            'ext': ext, 'mime': mime or 'application/octet-stream',
            'size': stat.st_size, 'modified': stat.st_mtime,
        })
    return jsonify(sorted(items, key=lambda x: (x['type'] != 'directory', x['name'])))

@storage_bp.route('/files/info', methods=['GET'])
@login_required
@storage_bp.route('/files/download', methods=['GET'])
@login_required
def download():
    path = request.args.get('path', '')
    full = safe_path(path, str(current_user.id))
    if not full or not os.path.isfile(full):
        return jsonify({'error': 'File not found'}), 404
    return send_file(full, as_attachment=True, download_name=os.path.basename(full))

def file_info():
    path = request.args.get('path', '')
    full = safe_path(path, str(current_user.id))
    if not full or not os.path.exists(full):
        return jsonify({'error': 'File not found'}), 404
    stat = os.stat(full)
    ext = os.path.splitext(full)[1].lower()
    mime, _ = mimetypes.guess_type(full)
    return jsonify({
        'name': os.path.basename(full), 'path': path,
        'type': 'directory' if os.path.isdir(full) else 'file',
        'ext': ext, 'mime': mime,
        'size': stat.st_size, 'modified': stat.st_mtime,
        'previewable': mime and (mime.startswith('text/') or mime.startswith('image/')),
    })

@storage_bp.route('/files/preview', methods=['GET'])
@login_required
def preview():
    path = request.args.get('path', '')
    full = safe_path(path, str(current_user.id))
    if not full or not os.path.isfile(full):
        return jsonify({'error': 'File not found'}), 404
    mime, _ = mimetypes.guess_type(full)
    if mime and mime.startswith('text/'):
        return jsonify({'content': open(full).read(100000), 'mime': mime})
    if mime and mime.startswith('image/'):
        return send_file(full, mimetype=mime)
    return jsonify({'error': 'Preview not available'}), 400

@storage_bp.route('/files/upload', methods=['POST'])
@login_required
def upload():
    path = request.args.get('path', '/')
    full = safe_path(path, str(current_user.id))
    if not full:
        return jsonify({'error': 'Access denied'}), 403
    os.makedirs(full, exist_ok=True)
    request.files['file'].save(os.path.join(full, request.files['file'].filename))
    return jsonify({'message': 'File uploaded'})

@storage_bp.route('/files/delete', methods=['DELETE'])
@login_required
def delete_file():
    path = request.json.get('path', '')
    full = safe_path(path, str(current_user.id))
    if not full or not os.path.exists(full):
        return jsonify({'error': 'Not found'}), 404
    trash_dir = os.path.join(STORAGE_BASE, '.trash')
    os.makedirs(trash_dir, exist_ok=True)
    rel = os.path.relpath(full, STORAGE_BASE)
    trash_name = f"{os.path.basename(full)}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    shutil.move(full, os.path.join(trash_dir, trash_name))
    size = os.path.getsize(os.path.join(trash_dir, trash_name)) if os.path.isfile(os.path.join(trash_dir, trash_name)) else 0
    item = TrashItem(original_path=rel, storage_path=trash_name, file_name=os.path.basename(full), file_size=size, deleted_by=current_user.id)
    db.session.add(item)
    db.session.commit()
    return jsonify({'message': 'Moved to trash', 'trash_id': item.id})

@storage_bp.route('/files/mkdir', methods=['POST'])
@login_required
def mkdir():
    path = request.json.get('path', '/')
    name = request.json.get('name', '')
    uid = str(current_user.id)
    full = safe_path(os.path.join(path, name), uid)
    if not full:
        return jsonify({'error': 'Access denied'}), 403
    os.makedirs(full, exist_ok=True)
    return jsonify({'message': 'Created'})

@storage_bp.route('/files/rename', methods=['PUT'])
@login_required
def rename():
    path = request.json.get('path', '')
    new_name = request.json.get('new_name', '')
    uid = str(current_user.id)
    old = safe_path(path, uid)
    new = safe_path(os.path.join(os.path.dirname(path), new_name), uid)
    if not old or not new:
        return jsonify({'error': 'Access denied'}), 403
    os.rename(old, new)
    return jsonify({'message': 'Renamed'})

@storage_bp.route('/files/move', methods=['PUT'])
@login_required
def move():
    path = request.json.get('path', '')
    dest = request.json.get('dest', '')
    uid = str(current_user.id)
    old = safe_path(path, uid)
    new = safe_path(os.path.join(dest, os.path.basename(path)), uid)
    if not old or not new:
        return jsonify({'error': 'Access denied'}), 403
    shutil.move(old, new)
    return jsonify({'message': 'Moved'})

@storage_bp.route('/files/copy', methods=['POST'])
@login_required
def copy():
    path = request.json.get('path', '')
    dest = request.json.get('dest', '')
    uid = str(current_user.id)
    old = safe_path(path, uid)
    new = safe_path(os.path.join(dest, os.path.basename(path)), uid)
    if not old or not new:
        return jsonify({'error': 'Access denied'}), 403
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
