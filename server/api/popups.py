from flask import Blueprint, jsonify, request
from main import db
from models.models import Popup, PopupView, User
from flask_login import login_required, current_user
from datetime import datetime

popups_bp = Blueprint('popups', __name__)

@popups_bp.route('/')
@login_required
def list_popups():
    popups = Popup.query.filter_by(active=True).order_by(Popup.created_at.desc()).all()
    views = {pv.popup_id for pv in PopupView.query.filter_by(user_id=current_user.id).all()}
    return jsonify([{
        'id': p.id, 'title': p.title, 'message': p.message,
        'type': p.popup_type, 'created_at': p.created_at.isoformat(),
        'seen': p.id in views
    } for p in popups])

@popups_bp.route('/pending')
@login_required
def pending():
    popups = Popup.query.filter_by(active=True).order_by(Popup.created_at.desc()).all()
    views = {pv.popup_id for pv in PopupView.query.filter_by(user_id=current_user.id).all()}
    pending = [p for p in popups if p.id not in views]
    return jsonify([{
        'id': p.id, 'title': p.title, 'message': p.message,
        'type': p.popup_type, 'created_at': p.created_at.isoformat()
    } for p in pending])

@popups_bp.route('/create', methods=['POST'])
@login_required
def create():
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin required'}), 403
    data = request.json
    popup = Popup(
        title=data.get('title', 'Announcement'),
        message=data.get('message', ''),
        popup_type=data.get('type', 'info'),
        created_by=current_user.id
    )
    db.session.add(popup)
    db.session.commit()

    # Auto-create PopupView for all other users so it only shows for target user
    target_user_id = data.get('target_user_id')
    if target_user_id:
        from models.models import User
        all_users = User.query.filter(User.id != target_user_id).all()
        for u in all_users:
            view = PopupView(popup_id=popup.id, user_id=u.id)
            db.session.add(view)
        db.session.commit()

    return jsonify({'message': 'Popup created', 'id': popup.id}), 201

@popups_bp.route('/<popup_id>/dismiss', methods=['POST'])
@login_required
def dismiss(popup_id):
    if not PopupView.query.filter_by(popup_id=popup_id, user_id=current_user.id).first():
        view = PopupView(popup_id=popup_id, user_id=current_user.id)
        db.session.add(view)
        db.session.commit()
    return jsonify({'message': 'Dismissed'})

@popups_bp.route('/<popup_id>/delete', methods=['DELETE'])
@login_required
def delete(popup_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin required'}), 403
    popup = Popup.query.get(popup_id)
    if popup:
        popup.active = False
        db.session.commit()
    return jsonify({'message': 'Popup removed'})
