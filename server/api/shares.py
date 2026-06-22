from flask import Blueprint, jsonify, request, send_file
from main import db
from models.models import ShareLink, User
from flask_login import login_required, current_user
from datetime import datetime, timedelta
import uuid, os, hashlib, mimetypes

shares_bp = Blueprint('shares', __name__)

def gen_token():
    return uuid.uuid4().hex + uuid.uuid4().hex

@shares_bp.route('/')
@login_required
def list_shares():
    shares = ShareLink.query.filter_by(created_by=current_user.id, active=True).order_by(ShareLink.created_at.desc()).all()
    return jsonify([{
        'id': s.id, 'file_name': s.file_name, 'file_path': s.file_path,
        'token': s.token, 'has_password': bool(s.password),
        'expires_at': s.expires_at.isoformat() if s.expires_at else None,
        'max_downloads': s.max_downloads, 'download_count': s.download_count,
        'created_at': s.created_at.isoformat()
    } for s in shares])

@shares_bp.route('/create', methods=['POST'])
@login_required
def create_share():
    data = request.json
    file_path = data.get('file_path', '')
    file_name = os.path.basename(file_path)
    expires_in = data.get('expires_in', 24)
    max_downloads = data.get('max_downloads', 0)
    password = data.get('password', '')
    expires_at = datetime.utcnow() + timedelta(hours=int(expires_in)) if expires_in > 0 else None
    share = ShareLink(
        file_path=file_path, file_name=file_name, token=gen_token(),
        password=hashlib.sha256(password.encode()).hexdigest() if password else '',
        expires_at=expires_at, max_downloads=int(max_downloads),
        created_by=current_user.id
    )
    db.session.add(share)
    db.session.commit()
    return jsonify({'id': share.id, 'token': share.token, 'url': f'/api/shares/access/{share.token}'}), 201

@shares_bp.route('/access/<token>')
def access_share(token):
    share = ShareLink.query.filter_by(token=token, active=True).first()
    if not share:
        return jsonify({'error': 'Share not found'}), 404
    if share.expires_at and share.expires_at < datetime.utcnow():
        share.active = False
        db.session.commit()
        return jsonify({'error': 'Share expired'}), 410
    if share.max_downloads > 0 and share.download_count >= share.max_downloads:
        return jsonify({'error': 'Download limit reached'}), 410
    share.download_count += 1
    db.session.commit()
    abs_path = os.path.normpath(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', share.file_path))
    if not os.path.exists(abs_path):
        return jsonify({'error': 'File not found'}), 404
    mime, _ = mimetypes.guess_type(abs_path)
    return send_file(abs_path, mimetype=mime or 'application/octet-stream', as_attachment=True, download_name=share.file_name)

@shares_bp.route('/info/<token>')
def share_info(token):
    share = ShareLink.query.filter_by(token=token, active=True).first()
    if not share:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'file_name': share.file_name, 'has_password': bool(share.password)})

@shares_bp.route('/<share_id>/delete', methods=['DELETE'])
@login_required
def delete_share(share_id):
    share = ShareLink.query.get(share_id)
    if not share or share.created_by != current_user.id:
        return jsonify({'error': 'Not found'}), 404
    share.active = False
    db.session.commit()
    return jsonify({'message': 'Deleted'})
