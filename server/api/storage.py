from flask import Blueprint, jsonify, request, send_file
from main import db
from models.models import StorageDrive, StoragePool, TrashItem
from flask_login import login_required, current_user
import psutil
import os
import shutil
import mimetypes
import json
from datetime import datetime

storage_bp = Blueprint('storage', __name__)

STORAGE_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'storage')

def safe_path(path):
    full = os.path.abspath(os.path.join(STORAGE_BASE, path.lstrip('/')))
    if not full.startswith(STORAGE_BASE):
        return None
    return full

@storage_bp.route('/status')
@login_required
def status():
    usage = psutil.disk_usage('/')
    return jsonify({
        'total': usage.total,
        'used': usage.used,
        'free': usage.free,
        'percent': usage.percent
    })

@storage_bp.route('/drives')
@login_required
def drives():
    drives = StorageDrive.query.all()
    return jsonify([{
        'id': d.id, 'device': d.device, 'name': d.name,
        'size': d.size, 'used': d.used, 'mount_point': d.mount_point,
        'health': d.health, 'pool_id': d.pool_id
    } for d in drives])

@storage_bp.route('/drives/scan', methods=['POST'])
@login_required
def scan_drives():
    partitions = psutil.disk_partitions()
    for p in partitions:
        if not StorageDrive.query.filter_by(device=p.device).first():
            try:
                usage = psutil.disk_usage(p.mountpoint)
                drive = StorageDrive(
                    device=p.device, name=os.path.basename(p.device),
                    size=usage.total, used=usage.used,
                    mount_point=p.mountpoint, health='healthy'
                )
                db.session.add(drive)
            except:
                pass
    db.session.commit()
    return jsonify({'message': 'Scan complete'})

@storage_bp.route('/pool')
@login_required
def pool():
    pool = StoragePool.query.first()
    if not pool:
        return jsonify({'exists': False, 'name': 'No pool', 'total': 0, 'used': 0, 'health': 'unknown'})
    return jsonify({
        'exists': True, 'id': pool.id, 'name': pool.name,
        'total': pool.total_size, 'used': pool.used_size,
        'health': pool.health
    })

@storage_bp.route('/pool/create', methods=['POST'])
@login_required
def create_pool():
    if StoragePool.query.first():
        return jsonify({'error': 'Pool already exists'}), 400
    pool = StoragePool(name=request.json.get('name', 'ALPHA Pool'))
    drives = StorageDrive.query.all()
    pool.total_size = sum(d.size for d in drives)
    pool.used_size = sum(d.used for d in drives)
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

@storage_bp.route('/files', methods=['GET'])
@login_required
def list_files():
    path = request.args.get('path', '/')
    search = request.args.get('search', '').lower()
    full = safe_path(path)
    if not full:
        return jsonify({'error': 'Access denied'}), 403
    if not os.path.exists(full):
        return jsonify({'error': 'Path not found'}), 404
    items = []
    for f in os.listdir(full):
        if search and search not in f.lower():
            continue
        fp = os.path.join(full, f)
        stat = os.stat(fp)
        ext = os.path.splitext(f)[1].lower()
        mime, _ = mimetypes.guess_type(f)
        items.append({
            'name': f, 'path': os.path.relpath(fp, STORAGE_BASE),
            'type': 'directory' if os.path.isdir(fp) else 'file',
            'ext': ext, 'mime': mime or 'application/octet-stream',
            'size': stat.st_size, 'modified': stat.st_mtime
        })
    return jsonify(sorted(items, key=lambda x: (x['type'] != 'directory', x['name'])))

@storage_bp.route('/files/info', methods=['GET'])
@login_required
def file_info():
    path = request.args.get('path', '')
    full = safe_path(path)
    if not full or not os.path.exists(full):
        return jsonify({'error': 'File not found'}), 404
    stat = os.stat(full)
    ext = os.path.splitext(full)[1].lower()
    mime, _ = mimetypes.guess_type(full)
    previewable = mime and (mime.startswith('text/') or mime.startswith('image/'))
    return jsonify({
        'name': os.path.basename(full),
        'path': path, 'type': 'directory' if os.path.isdir(full) else 'file',
        'ext': ext, 'mime': mime,
        'size': stat.st_size, 'modified': stat.st_mtime,
        'previewable': previewable
    })

@storage_bp.route('/files/preview', methods=['GET'])
@login_required
def preview():
    path = request.args.get('path', '')
    full = safe_path(path)
    if not full or not os.path.isfile(full):
        return jsonify({'error': 'File not found'}), 404
    mime, _ = mimetypes.guess_type(full)
    if mime and mime.startswith('text/'):
        with open(full, 'r', errors='replace') as f:
            return jsonify({'content': f.read(100000), 'mime': mime})
    if mime and mime.startswith('image/'):
        return send_file(full, mimetype=mime)
    return jsonify({'error': 'Preview not available'}), 400

@storage_bp.route('/files/upload', methods=['POST'])
@login_required
def upload():
    path = request.args.get('path', '/')
    full = safe_path(path)
    if not full:
        return jsonify({'error': 'Access denied'}), 403
    os.makedirs(full, exist_ok=True)
    file = request.files['file']
    file.save(os.path.join(full, file.filename))
    return jsonify({'message': 'File uploaded'})

@storage_bp.route('/files/delete', methods=['DELETE'])
@login_required
def delete_file():
    path = request.json.get('path', '')
    full = safe_path(path)
    if not full:
        return jsonify({'error': 'Access denied'}), 403
    if not os.path.exists(full):
        return jsonify({'error': 'Not found'}), 404
    # Move to trash instead of permanent delete
    trash_dir = os.path.join(STORAGE_BASE, '.trash')
    os.makedirs(trash_dir, exist_ok=True)
    rel = os.path.relpath(full, STORAGE_BASE)
    trash_name = f"{os.path.basename(full)}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    trash_path = os.path.join(trash_dir, trash_name)
    shutil.move(full, trash_path)
    size = 0
    if os.path.isfile(trash_path):
        size = os.path.getsize(trash_path)
    elif os.path.isdir(trash_path):
        size = sum(os.path.getsize(os.path.join(dp, f)) for dp, dn, fn in os.walk(trash_path) for f in fn) if os.path.exists(trash_path) else 0
    item = TrashItem(original_path=rel, storage_path=trash_name, file_name=os.path.basename(full), file_size=size, deleted_by=current_user.id)
    db.session.add(item)
    db.session.commit()
    return jsonify({'message': 'Moved to trash', 'trash_id': item.id})

@storage_bp.route('/files/mkdir', methods=['POST'])
@login_required
def mkdir():
    path = request.json.get('path', '')
    name = request.json.get('name', '')
    full = safe_path(os.path.join(path, name))
    if not full:
        return jsonify({'error': 'Access denied'}), 403
    os.makedirs(full, exist_ok=True)
    return jsonify({'message': 'Directory created'})

@storage_bp.route('/files/rename', methods=['PUT'])
@login_required
def rename():
    path = request.json.get('path', '')
    new_name = request.json.get('new_name', '')
    old_full = safe_path(path)
    new_full = safe_path(os.path.join(os.path.dirname(path), new_name))
    if not old_full or not new_full:
        return jsonify({'error': 'Access denied'}), 403
    os.rename(old_full, new_full)
    return jsonify({'message': 'Renamed'})

@storage_bp.route('/files/move', methods=['PUT'])
@login_required
def move():
    path = request.json.get('path', '')
    dest = request.json.get('dest', '')
    old_full = safe_path(path)
    new_full = safe_path(os.path.join(dest, os.path.basename(path)))
    if not old_full or not new_full:
        return jsonify({'error': 'Access denied'}), 403
    shutil.move(old_full, new_full)
    return jsonify({'message': 'Moved'})

@storage_bp.route('/files/copy', methods=['POST'])
@login_required
def copy():
    path = request.json.get('path', '')
    dest = request.json.get('dest', '')
    old_full = safe_path(path)
    new_full = safe_path(os.path.join(dest, os.path.basename(path)))
    if not old_full or not new_full:
        return jsonify({'error': 'Access denied'}), 403
    if os.path.isfile(old_full):
        shutil.copy2(old_full, new_full)
    else:
        shutil.copytree(old_full, new_full)
    return jsonify({'message': 'Copied'})

@storage_bp.route('/smb/status')
@login_required
def smb_status():
    enabled = os.path.exists('/etc/samba/smb.conf')
    return jsonify({'enabled': enabled, 'shares': ['storage']})

@storage_bp.route('/smb/enable', methods=['POST'])
@login_required
def smb_enable():
    return jsonify({'message': 'SMB sharing setup requires samba configuration on the server'})
