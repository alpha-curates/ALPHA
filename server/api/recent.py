from flask import Blueprint, jsonify, request
from main import db
from models.models import RecentFile, Favorite
from flask_login import login_required, current_user
from datetime import datetime
import os

recent_bp = Blueprint('recent', __name__)

@recent_bp.route('/recent')
@login_required
def list_recent():
    items = RecentFile.query.filter_by(user_id=current_user.id).order_by(RecentFile.accessed_at.desc()).limit(50).all()
    return jsonify([{
        'id': i.id, 'file_path': i.file_path, 'file_name': i.file_name,
        'file_type': i.file_type, 'accessed_at': i.accessed_at.isoformat()
    } for i in items])

@recent_bp.route('/recent/track', methods=['POST'])
@login_required
def track_recent():
    data = request.json
    fp = data.get('file_path', '')
    fn = os.path.basename(fp)
    ext = os.path.splitext(fn)[1].lower().lstrip('.') if '.' in fn else 'folder'
    existing = RecentFile.query.filter_by(user_id=current_user.id, file_path=fp).first()
    if existing:
        existing.accessed_at = datetime.utcnow()
    else:
        db.session.add(RecentFile(user_id=current_user.id, file_path=fp, file_name=fn, file_type=ext))
    # keep only last 100
    count = RecentFile.query.filter_by(user_id=current_user.id).count()
    if count > 100:
        oldest = RecentFile.query.filter_by(user_id=current_user.id).order_by(RecentFile.accessed_at.asc()).first()
        if oldest: db.session.delete(oldest)
    db.session.commit()
    return jsonify({'message': 'Tracked'})

@recent_bp.route('/recent/clear', methods=['POST'])
@login_required
def clear_recent():
    RecentFile.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return jsonify({'message': 'Cleared'})

@recent_bp.route('/favorites')
@login_required
def list_favorites():
    items = Favorite.query.filter_by(user_id=current_user.id).order_by(Favorite.created_at.desc()).all()
    return jsonify([{
        'id': i.id, 'file_path': i.file_path, 'file_name': i.file_name, 'created_at': i.created_at.isoformat()
    } for i in items])

@recent_bp.route('/favorites/toggle', methods=['POST'])
@login_required
def toggle_favorite():
    data = request.json
    fp = data.get('file_path', '')
    fn = os.path.basename(fp)
    existing = Favorite.query.filter_by(user_id=current_user.id, file_path=fp).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({'favorited': False})
    else:
        db.session.add(Favorite(user_id=current_user.id, file_path=fp, file_name=fn))
        db.session.commit()
        return jsonify({'favorited': True})
