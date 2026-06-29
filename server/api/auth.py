from flask import Blueprint, jsonify, request
from main import db
from models.models import User
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required, current_user
import jwt
import datetime
from config import Config

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username exists'}), 400
    user_count = User.query.count()
    role = 'admin' if user_count == 0 else 'user'
    user = User(
        username=data['username'],
        email=data.get('email', ''),
        password_hash=generate_password_hash(data['password']),
        role=role
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User created', 'role': role}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    import traceback as _tb
    try:
        data = request.get_json(force=True, silent=False)
        username = data.get('username', '')
        password = data.get('password', '')
        user = User.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Invalid credentials'}), 401
        login_user(user)
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
        }, Config.JWT_SECRET, algorithm='HS256')
        return jsonify({
            'token': token,
            'user': {'id': user.id, 'username': user.username, 'role': user.role, 'email': user.email}
        })
    except Exception as e:
        tb = _tb.format_exc()
        print("LOGIN CRASH:", tb, flush=True)
        try:
            with open('/tmp/alpha-crash.txt', 'w') as f:
                f.write(tb)
        except:
            pass
        return jsonify({'error': str(e), 'traceback': tb}), 500

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out'})

@auth_bp.route('/me')
@login_required
def me():
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'role': current_user.role,
        'email': current_user.email,
        'avatar': current_user.avatar,
        'created_at': current_user.created_at.isoformat()
    })
