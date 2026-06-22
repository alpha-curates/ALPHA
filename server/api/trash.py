from flask import Blueprint, jsonify, request
from main import db
from models.models import TrashItem, User
from flask_login import login_required, current_user
from datetime import datetime, timedelta
import os, shutil

trash_bp = Blueprint('trash', __name__)
STORAGE_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'storage'))

@trash_bp.route('/')
@login_required
def list_trash():
    items = TrashItem.query.order_by(TrashItem.deleted_at.desc()).all()
    return jsonify([{
        'id': i.id, 'file_name': i.file_name, 'original_path': i.original_path,
        'file_size': i.file_size, 'deleted_at': i.deleted_at.isoformat()
    } for i in items])

@trash_bp.route('/restore/<item_id>', methods=['POST'])
@login_required
def restore(item_id):
    item = TrashItem.query.get(item_id)
    if not item: return jsonify({'error': 'Not found'}), 404
    src = os.path.join(STORAGE_DIR, '.trash', item.storage_path)
    dst = os.path.join(STORAGE_DIR, item.original_path)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(src):
        shutil.move(src, dst)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Restored'})

@trash_bp.route('/<item_id>', methods=['DELETE'])
@login_required
def delete_permanent(item_id):
    item = TrashItem.query.get(item_id)
    if not item: return jsonify({'error': 'Not found'}), 404
    src = os.path.join(STORAGE_DIR, '.trash', item.storage_path)
    if os.path.exists(src):
        os.remove(src)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Deleted permanently'})

@trash_bp.route('/empty', methods=['POST'])
@login_required
def empty_trash():
    items = TrashItem.query.all()
    for item in items:
        src = os.path.join(STORAGE_DIR, '.trash', item.storage_path)
        if os.path.exists(src):
            os.remove(src)
        db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Trash emptied'})
