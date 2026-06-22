from flask import Blueprint, jsonify, request
from main import db
from models.models import User
from flask_login import login_required, current_user
from werkzeug.security import generate_password_hash

users_bp = Blueprint('users', __name__)

def admin_required(f):
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin required'}), 403
        return f(*args, **kwargs)
    return wrapper

@users_bp.route('/')
@login_required
@admin_required
def list_users():
    users = User.query.all()
    return jsonify([{
        'id': u.id, 'username': u.username, 'email': u.email,
        'role': u.role, 'is_active': u.is_active,
        'created_at': u.created_at.isoformat()
    } for u in users])

@users_bp.route('/create', methods=['POST'])
@login_required
@admin_required
def create_user():
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username exists'}), 400
    role = data.get('role', 'user')
    if role not in ['admin', 'user', 'limited', 'joke']:
        role = 'user'
    user = User(
        username=data['username'],
        email=data.get('email', ''),
        password_hash=generate_password_hash(data['password']),
        role=role
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': f'User {user.username} created with role {role}'}), 201

@users_bp.route('/<user_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_user(user_id):
    user = User.query.get(user_id)
    if user and user.role != 'admin':
        db.session.delete(user)
        db.session.commit()
    return jsonify({'message': 'User deleted'})

@users_bp.route('/<user_id>/role', methods=['PUT'])
@login_required
@admin_required
def set_role(user_id):
    user = User.query.get(user_id)
    new_role = request.json.get('role', 'user')
    if user and new_role in ['admin', 'user', 'limited', 'joke']:
        user.role = new_role
        db.session.commit()
    return jsonify({'message': 'Role updated'})

@users_bp.route('/settings', methods=['GET'])
@login_required
def get_settings():
    return jsonify(current_user.settings or {})

@users_bp.route('/settings', methods=['PUT'])
@login_required
def update_settings():
    data = request.json
    current_user.settings = {**(current_user.settings or {}), **data}
    db.session.commit()
    return jsonify({'message': 'Settings updated', 'settings': current_user.settings})
