from flask import Blueprint, jsonify, request
from main import db, socketio
from models.models import Notification, User
from flask_login import login_required, current_user
from datetime import datetime

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/')
@login_required
def list_notifications():
    notifs = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).limit(50).all()
    unread = Notification.query.filter_by(user_id=current_user.id, read=False).count()
    return jsonify({
        'notifications': [{
            'id': n.id, 'title': n.title, 'message': n.message,
            'type': n.notification_type, 'read': n.read,
            'created_at': n.created_at.isoformat()
        } for n in notifs],
        'unread': unread
    })

@notifications_bp.route('/read/<notif_id>', methods=['POST'])
@login_required
def mark_read(notif_id):
    notif = Notification.query.get(notif_id)
    if notif and notif.user_id == current_user.id:
        notif.read = True
        db.session.commit()
    return jsonify({'message': 'Marked as read'})

@notifications_bp.route('/read-all', methods=['POST'])
@login_required
def mark_all_read():
    Notification.query.filter_by(user_id=current_user.id, read=False).update({'read': True})
    db.session.commit()
    socketio.emit('notifications_cleared', {'user_id': current_user.id}, room=current_user.id)
    return jsonify({'message': 'All marked as read'})

@notifications_bp.route('/send', methods=['POST'])
@login_required
def send():
    data = request.json
    notif = Notification(
        user_id=current_user.id,
        title=data.get('title', 'Notification'),
        message=data.get('message', ''),
        notification_type=data.get('type', 'info')
    )
    db.session.add(notif)
    db.session.commit()
    socketio.emit('new_notification', {
        'id': notif.id, 'title': notif.title, 'message': notif.message,
        'type': notif.notification_type, 'read': False,
        'created_at': notif.created_at.isoformat()
    }, room=current_user.id)
    return jsonify({'message': 'Notification sent', 'id': notif.id})

@notifications_bp.route('/broadcast', methods=['POST'])
@login_required
def broadcast():
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin required'}), 403
    data = request.json
    users = User.query.all()
    count = 0
    for u in users:
        notif = Notification(
            user_id=u.id, title=data.get('title', 'Broadcast'),
            message=data.get('message', ''),
            notification_type='broadcast'
        )
        db.session.add(notif)
        count += 1
    db.session.commit()
    return jsonify({'message': f'Broadcast sent to {count} users'})

@notifications_bp.route('/home-mode', methods=['POST'])
@login_required
def home_mode():
    data = request.json
    family_members = User.query.filter(User.role.in_(['user', 'limited'])).all()
    count = 0
    for u in family_members:
        notif = Notification(
            user_id=u.id, title=data.get('title', 'Home'),
            message=data.get('message', ''),
            notification_type='home'
        )
        db.session.add(notif)
        count += 1
    db.session.commit()
    return jsonify({'message': f'Home notification sent to {count} family members'})
